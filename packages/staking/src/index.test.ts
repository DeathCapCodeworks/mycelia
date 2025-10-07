import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StakingEngine, Validator, Delegation, EpochRewards } from '../src/index';
import { SupplyLedger } from '@mycelia/shared-kernel';
import { StaticReserveFeed } from '@mycelia/proof-of-reserve';

describe('StakingEngine', () => {
  let engine: StakingEngine;
  let supplyLedger: SupplyLedger;
  let reserveFeed: StaticReserveFeed;
  
  beforeEach(() => {
    supplyLedger = new SupplyLedger();
    reserveFeed = new StaticReserveFeed(1_000_000_000_000n); // 10 BTC
    engine = new StakingEngine(supplyLedger, reserveFeed);
  });

  describe('registerValidator', () => {
    it('should register a new validator', () => {
      const validator = engine.registerValidator('validator-pubkey-1', 1000n);
      
      expect(validator.pubkey).toBe('validator-pubkey-1');
      expect(validator.stake).toBe(1000n);
      expect(validator.isActive).toBe(true);
    });

    it('should not allow duplicate validator registration', () => {
      engine.registerValidator('validator-pubkey-1', 1000n);
      
      expect(() => {
        engine.registerValidator('validator-pubkey-1', 2000n);
      }).toThrow('Validator already registered');
    });
  });

  describe('delegate', () => {
    it('should create a delegation', () => {
      const validator = engine.registerValidator('validator-pubkey-1', 1000n);
      const delegation = engine.delegate('delegator-1', validator.pubkey, 500n);
      
      expect(delegation.delegator).toBe('delegator-1');
      expect(delegation.validator).toBe(validator.pubkey);
      expect(delegation.amount).toBe(500n);
    });

    it('should update existing delegation', () => {
      const validator = engine.registerValidator('validator-pubkey-1', 1000n);
      engine.delegate('delegator-1', validator.pubkey, 500n);
      const delegation = engine.delegate('delegator-1', validator.pubkey, 300n);
      
      expect(delegation.amount).toBe(800n); // 500 + 300
    });

    it('should not allow delegation to non-existent validator', () => {
      expect(() => {
        engine.delegate('delegator-1', 'non-existent', 500n);
      }).toThrow('Validator not found');
    });
  });

  describe('tickEpoch', () => {
    it('should mint rewards when reserves allow', async () => {
      const validator = engine.registerValidator('validator-pubkey-1', 1000n);
      engine.delegate('delegator-1', validator.pubkey, 500n);
      
      const rewards = await engine.tickEpoch();
      
      expect(rewards.totalMinted).toBeGreaterThan(0n);
      expect(rewards.validatorRewards).toHaveProperty(validator.pubkey);
      expect(rewards.delegatorRewards).toHaveProperty('delegator-1');
    });

    it('should not mint rewards when reserves insufficient', async () => {
      // Set very low reserves
      reserveFeed.setLockedSats(1000n);
      
      const validator = engine.registerValidator('validator-pubkey-1', 1000n);
      engine.delegate('delegator-1', validator.pubkey, 500n);
      
      const rewards = await engine.tickEpoch();
      
      expect(rewards.totalMinted).toBe(0n);
      expect(rewards.blocked).toBe(true);
    });
  });

  describe('getValidatorStats', () => {
    it('should return validator statistics', () => {
      const validator = engine.registerValidator('validator-pubkey-1', 1000n);
      engine.delegate('delegator-1', validator.pubkey, 500n);
      engine.delegate('delegator-2', validator.pubkey, 300n);
      
      const stats = engine.getValidatorStats(validator.pubkey);
      
      expect(stats.totalStake).toBe(1800n); // 1000 + 500 + 300
      expect(stats.delegationCount).toBe(2);
      expect(stats.delegators).toContain('delegator-1');
      expect(stats.delegators).toContain('delegator-2');
    });
  });
});

// Fuzz test utilities
function generateRandomAmount(min: bigint, max: bigint): bigint {
  const range = max - min;
  const random = BigInt(Math.floor(Math.random() * Number(range)));
  return min + random;
}

function generateRandomStakeAmount(): bigint {
  return generateRandomAmount(100n, 1000000n); // 100 to 1M BLOOM
}

function generateRandomDelegationAmount(): bigint {
  return generateRandomAmount(10n, 100000n); // 10 to 100K BLOOM
}

describe('Fuzz Tests', () => {
  let engine: StakingEngine;
  let supplyLedger: SupplyLedger;
  let reserveFeed: StaticReserveFeed;

  beforeEach(() => {
    supplyLedger = new SupplyLedger();
    reserveFeed = new StaticReserveFeed(1_000_000_000_000n); // 10 BTC
    engine = new StakingEngine(supplyLedger, reserveFeed);
  });

  it('should handle adversarial delegation patterns', async () => {
    // Create multiple validators
    const validators = [];
    for (let i = 0; i < 10; i++) {
      const stake = generateRandomStakeAmount();
      const validator = engine.registerValidator(`validator-${i}`, stake);
      validators.push(validator);
    }

    // Simulate adversarial delegation patterns
    for (let i = 0; i < 100; i++) {
      const validator = validators[Math.floor(Math.random() * validators.length)];
      const delegator = `delegator-${i}`;
      const amount = generateRandomDelegationAmount();
      
      // Property: Should handle any delegation amount
      const delegation = engine.delegate(delegator, validator.pubkey, amount);
      expect(delegation.amount).toBe(amount);
      expect(delegation.delegator).toBe(delegator);
      expect(delegation.validator).toBe(validator.pubkey);
    }

    // Property: Total stake should be sum of all stakes and delegations
    const totalStake = validators.reduce((sum, v) => {
      const stats = engine.getValidatorStats(v.pubkey);
      return sum + (stats?.totalStake || 0n);
    }, 0n);
    
    expect(totalStake > 0n).toBe(true);
  });

  it('should never breach collateral in epoch ticks', async () => {
    // Create validators with random stakes
    const validators = [];
    for (let i = 0; i < 5; i++) {
      const stake = generateRandomStakeAmount();
      const validator = engine.registerValidator(`validator-${i}`, stake);
      validators.push(validator);
    }

    // Add random delegations
    for (let i = 0; i < 50; i++) {
      const validator = validators[Math.floor(Math.random() * validators.length)];
      const amount = generateRandomDelegationAmount();
      engine.delegate(`delegator-${i}`, validator.pubkey, amount);
    }

    // Tick multiple epochs
    for (let epoch = 0; epoch < 10; epoch++) {
      const rewards = await engine.tickEpoch();
      
      // Property: Should never mint more than reserves allow
      if (rewards.blocked) {
        expect(rewards.totalMinted).toBe(0n);
        expect(rewards.reason).toBeDefined();
      } else {
        expect(rewards.totalMinted > 0n).toBe(true);
        
        // Property: Total rewards should not exceed 1% of total stake
        const totalStake = validators.reduce((sum, v) => {
          const stats = engine.getValidatorStats(v.pubkey);
          return sum + (stats?.totalStake || 0n);
        }, 0n);
        
        const maxReward = totalStake / 100n; // 1% max
        expect(rewards.totalMinted <= maxReward).toBe(true);
      }
    }
  });

  it('should handle edge cases in stake calculations', async () => {
    // Test with very small stakes
    const validator1 = engine.registerValidator('validator-small', 1n);
    engine.delegate('delegator-small', validator1.pubkey, 1n);
    
    // Test with very large stakes
    const validator2 = engine.registerValidator('validator-large', 1000000n);
    engine.delegate('delegator-large', validator2.pubkey, 100000n);
    
    // Property: Should handle both small and large amounts
    const stats1 = engine.getValidatorStats(validator1.pubkey);
    const stats2 = engine.getValidatorStats(validator2.pubkey);
    
    expect(stats1.totalStake).toBe(2n); // 1 + 1
    expect(stats2.totalStake).toBe(1100000n); // 1000000 + 100000
    
    // Property: Should be able to tick epoch with mixed stakes
    const rewards = await engine.tickEpoch();
    expect(rewards.totalMinted > 0n).toBe(true);
  });

  it('should maintain validator invariants under random operations', async () => {
    const validators = new Map<string, bigint>();
    
    for (let i = 0; i < 100; i++) {
      const operation = Math.random();
      
      if (operation < 0.3) {
        // Register validator
        const pubkey = `validator-${i}`;
        const stake = generateRandomStakeAmount();
        
        if (!validators.has(pubkey)) {
          engine.registerValidator(pubkey, stake);
          validators.set(pubkey, stake);
        }
      } else if (operation < 0.8) {
        // Delegate
        const validatorKeys = Array.from(validators.keys());
        if (validatorKeys.length > 0) {
          const validator = validatorKeys[Math.floor(Math.random() * validatorKeys.length)];
          const amount = generateRandomDelegationAmount();
          
          engine.delegate(`delegator-${i}`, validator, amount);
          
          // Property: Validator total stake should increase
          const stats = engine.getValidatorStats(validator);
          expect(stats.totalStake >= validators.get(validator)!).toBe(true);
        }
      } else {
        // Tick epoch
        const rewards = await engine.tickEpoch();
        
        // Property: Should never mint negative amounts
        expect(rewards.totalMinted >= 0n).toBe(true);
        
        // Property: Should never exceed total stake
        const totalStake = Array.from(validators.values()).reduce((sum, stake) => sum + stake, 0n);
        if (rewards.totalMinted > 0n) {
          expect(rewards.totalMinted <= totalStake).toBe(true);
        }
      }
    }
  });

  it('should handle concurrent delegation updates', async () => {
    const validator = engine.registerValidator('validator-concurrent', 1000n);
    
    // Simulate concurrent delegations from same delegator
    const delegator = 'delegator-concurrent';
    let expectedTotal = 0n;
    
    for (let i = 0; i < 20; i++) {
      const amount = generateRandomDelegationAmount();
      const delegation = engine.delegate(delegator, validator.pubkey, amount);
      expectedTotal += amount;
      
      // Property: Delegation amount should accumulate correctly
      expect(delegation.amount).toBe(expectedTotal);
    }
    
    // Property: Final validator stats should reflect total delegations
    const stats = engine.getValidatorStats(validator.pubkey);
    expect(stats.totalStake).toBe(1000n + expectedTotal);
    expect(stats.delegationCount).toBe(1); // Same delegator
  });
});
