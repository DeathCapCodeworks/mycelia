#!/usr/bin/env node
// Staking package for Mycelia - validator and delegation management

import { SupplyLedger } from '@mycelia/shared-kernel';
import { ReserveFeed, assertCanMint } from '@mycelia/tokenomics';
import { logEvent, counter, gauge } from '@mycelia/observability';

export interface Validator {
  pubkey: string;
  stake: bigint;
  isActive: boolean;
  registeredAt: number;
  totalDelegations: bigint;
}

export interface Delegation {
  delegator: string;
  validator: string;
  amount: bigint;
  createdAt: number;
  lastUpdated: number;
}

export interface EpochRewards {
  epoch: number;
  totalMinted: bigint;
  validatorRewards: Record<string, bigint>;
  delegatorRewards: Record<string, bigint>;
  blocked: boolean;
  reason?: string;
}

export interface ValidatorStats {
  pubkey: string;
  totalStake: bigint;
  delegationCount: number;
  delegators: string[];
  isActive: boolean;
}

export class StakingEngine {
  private validators = new Map<string, Validator>();
  private delegations = new Map<string, Delegation>();
  private currentEpoch = 0;
  private stakingCounter = counter('staking_operations');
  private validatorGauge = gauge('active_validators');
  private delegationGauge = gauge('total_delegations');

  constructor(
    private supplyLedger: SupplyLedger,
    private reserveFeed: ReserveFeed
  ) {}

  /**
   * Register a new validator
   */
  registerValidator(pubkey: string, stake: bigint): Validator {
    if (this.validators.has(pubkey)) {
      throw new Error('Validator already registered');
    }

    const validator: Validator = {
      pubkey,
      stake,
      isActive: true,
      registeredAt: Date.now(),
      totalDelegations: 0n
    };

    this.validators.set(pubkey, validator);
    
    // Log validator registration
    logEvent('validator_registered', {
      pubkey,
      stake: stake.toString(),
      timestamp: validator.registeredAt
    });
    
    this.stakingCounter.inc();
    this.validatorGauge.set(this.validators.size);
    
    return validator;
  }

  /**
   * Create or update a delegation
   */
  delegate(delegator: string, validatorPubkey: string, amount: bigint): Delegation {
    const validator = this.validators.get(validatorPubkey);
    if (!validator) {
      throw new Error('Validator not found');
    }

    if (!validator.isActive) {
      throw new Error('Validator is not active');
    }

    const delegationKey = `${delegator}:${validatorPubkey}`;
    const existingDelegation = this.delegations.get(delegationKey);
    
    let delegation: Delegation;
    if (existingDelegation) {
      // Update existing delegation
      delegation = {
        ...existingDelegation,
        amount: existingDelegation.amount + amount,
        lastUpdated: Date.now()
      };
    } else {
      // Create new delegation
      delegation = {
        delegator,
        validator: validatorPubkey,
        amount,
        createdAt: Date.now(),
        lastUpdated: Date.now()
      };
    }

    this.delegations.set(delegationKey, delegation);
    
    // Update validator total delegations
    validator.totalDelegations += amount;
    
    // Log delegation
    logEvent('delegation_created', {
      delegator,
      validator: validatorPubkey,
      amount: amount.toString(),
      totalAmount: delegation.amount.toString(),
      timestamp: delegation.lastUpdated
    });
    
    this.stakingCounter.inc();
    this.delegationGauge.set(this.delegations.size);
    
    return delegation;
  }

  /**
   * Tick epoch and mint rewards
   */
  async tickEpoch(): Promise<EpochRewards> {
    this.currentEpoch++;
    
    const rewards: EpochRewards = {
      epoch: this.currentEpoch,
      totalMinted: 0n,
      validatorRewards: {},
      delegatorRewards: {},
      blocked: false
    };

    try {
      // Calculate total rewards to mint (simplified: 1% of total stake)
      const totalStake = this.getTotalStake();
      const rewardAmount = totalStake / 100n; // 1% reward rate
      
      if (rewardAmount === 0n) {
        rewards.blocked = true;
        rewards.reason = 'No stake to reward';
        return rewards;
      }

      // Check if we can mint without breaking peg
      const feeds = {
        reserve: this.reserveFeed,
        supply: this.supplyLedger
      };
      
      await assertCanMint(rewardAmount, feeds);
      
      // Distribute rewards
      const validatorRewards = this.calculateValidatorRewards(rewardAmount);
      const delegatorRewards = this.calculateDelegatorRewards(rewardAmount);
      
      // Mint rewards
      this.supplyLedger.recordMint(rewardAmount);
      
      rewards.totalMinted = rewardAmount;
      rewards.validatorRewards = validatorRewards;
      rewards.delegatorRewards = delegatorRewards;
      
      // Log epoch tick
      logEvent('epoch_ticked', {
        epoch: this.currentEpoch,
        totalMinted: rewardAmount.toString(),
        validatorCount: Object.keys(validatorRewards).length,
        delegatorCount: Object.keys(delegatorRewards).length
      });
      
    } catch (error) {
      rewards.blocked = true;
      rewards.reason = (error as Error).message;
      
      // Log blocked epoch
      logEvent('epoch_blocked', {
        epoch: this.currentEpoch,
        reason: rewards.reason,
        totalStake: this.getTotalStake().toString()
      });
    }
    
    return rewards;
  }

  /**
   * Get validator statistics
   */
  getValidatorStats(pubkey: string): ValidatorStats | null {
    const validator = this.validators.get(pubkey);
    if (!validator) {
      return null;
    }

    const delegators: string[] = [];
    let totalDelegations = validator.stake;
    
    for (const [key, delegation] of this.delegations) {
      if (delegation.validator === pubkey) {
        delegators.push(delegation.delegator);
        totalDelegations += delegation.amount;
      }
    }

    return {
      pubkey,
      totalStake: totalDelegations,
      delegationCount: delegators.length,
      delegators,
      isActive: validator.isActive
    };
  }

  /**
   * Get all validators
   */
  getAllValidators(): Validator[] {
    return Array.from(this.validators.values());
  }

  /**
   * Get all delegations
   */
  getAllDelegations(): Delegation[] {
    return Array.from(this.delegations.values());
  }

  /**
   * Get delegations for a specific delegator
   */
  getDelegatorDelegations(delegator: string): Delegation[] {
    return Array.from(this.delegations.values())
      .filter(d => d.delegator === delegator);
  }

  /**
   * Get current epoch
   */
  getCurrentEpoch(): number {
    return this.currentEpoch;
  }

  /**
   * Calculate total stake across all validators and delegations
   */
  private getTotalStake(): bigint {
    let total = 0n;
    
    for (const validator of this.validators.values()) {
      total += validator.stake;
      total += validator.totalDelegations;
    }
    
    return total;
  }

  /**
   * Calculate validator rewards based on stake
   */
  private calculateValidatorRewards(totalRewards: bigint): Record<string, bigint> {
    const totalStake = this.getTotalStake();
    const rewards: Record<string, bigint> = {};
    
    for (const validator of this.validators.values()) {
      const validatorStake = validator.stake + validator.totalDelegations;
      const validatorReward = (totalRewards * validatorStake) / totalStake;
      rewards[validator.pubkey] = validatorReward;
    }
    
    return rewards;
  }

  /**
   * Calculate delegator rewards based on delegation amounts
   */
  private calculateDelegatorRewards(totalRewards: bigint): Record<string, bigint> {
    const totalStake = this.getTotalStake();
    const rewards: Record<string, bigint> = {};
    
    for (const delegation of this.delegations.values()) {
      const delegatorReward = (totalRewards * delegation.amount) / totalStake;
      rewards[delegation.delegator] = (rewards[delegation.delegator] || 0n) + delegatorReward;
    }
    
    return rewards;
  }
}

// Global staking engine instance
let globalStakingEngine: StakingEngine | null = null;

export function getStakingEngine(): StakingEngine {
  if (!globalStakingEngine) {
    const supplyLedger = new SupplyLedger();
    const reserveFeed = new StaticReserveFeed(1_000_000_000_000n); // 10 BTC default
    globalStakingEngine = new StakingEngine(supplyLedger, reserveFeed);
  }
  return globalStakingEngine;
}

// Convenience functions
export function registerValidator(pubkey: string, stake: bigint): Validator {
  return getStakingEngine().registerValidator(pubkey, stake);
}

export function delegate(delegator: string, validator: string, amount: bigint): Delegation {
  return getStakingEngine().delegate(delegator, validator, amount);
}

export function tickEpoch(): Promise<EpochRewards> {
  return getStakingEngine().tickEpoch();
}
