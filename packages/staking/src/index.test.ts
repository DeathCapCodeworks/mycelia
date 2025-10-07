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
