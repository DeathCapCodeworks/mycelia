import { describe, it, expect, beforeEach } from 'vitest';
import { RedemptionEngine, MockHtlcSimulator } from './index';
import { SupplyLedger } from '@mycelia/shared-kernel';

describe('RedemptionEngine', () => {
  let engine: RedemptionEngine;
  let supplyLedger: SupplyLedger;
  let htlcSimulator: MockHtlcSimulator;

  beforeEach(() => {
    supplyLedger = new SupplyLedger();
    htlcSimulator = new MockHtlcSimulator();
    engine = new RedemptionEngine(supplyLedger, htlcSimulator);
  });

  describe('Redemption Request', () => {
    it('should create redemption intent with correct quote', async () => {
      // Mint some BLOOM first
      supplyLedger.recordMint(10n);

      const intent = await engine.requestRedeemBloom(5n, 'bc1test123');
      
      expect(intent.bloomAmount).toBe(5n);
      expect(intent.btcAddress).toBe('bc1test123');
      expect(intent.quotedSats).toBe(50_000_000n); // 5 BLOOM * 10M sats
      expect(intent.status).toBe('pending');
      expect(intent.btcTxId).toBeDefined();
    });

    it('should reject zero or negative amounts', async () => {
      await expect(engine.requestRedeemBloom(0n, 'bc1test123')).rejects.toThrow(
        'Redemption amount must be positive'
      );
      await expect(engine.requestRedeemBloom(-5n, 'bc1test123')).rejects.toThrow(
        'Redemption amount must be positive'
      );
    });

    it('should reject redemption exceeding supply', async () => {
      supplyLedger.recordMint(5n);
      
      await expect(engine.requestRedeemBloom(10n, 'bc1test123')).rejects.toThrow(
        'Cannot redeem more than outstanding supply'
      );
    });
  });

  describe('Redemption Completion', () => {
    it('should complete redemption and burn tokens', async () => {
      // Mint BLOOM and create redemption
      supplyLedger.recordMint(10n);
      const intent = await engine.requestRedeemBloom(5n, 'bc1test123');
      
      expect(supplyLedger.currentSupply()).toBe(10n);
      
      // Complete redemption
      const success = await engine.completeRedemption(intent.id);
      
      expect(success).toBe(true);
      expect(intent.status).toBe('completed');
      expect(supplyLedger.currentSupply()).toBe(5n); // 10 - 5 = 5
    });

    it('should handle non-existent intent', async () => {
      await expect(engine.completeRedemption('nonexistent')).rejects.toThrow(
        'Redemption intent not found'
      );
    });

    it('should handle already completed intent', async () => {
      supplyLedger.recordMint(10n);
      const intent = await engine.requestRedeemBloom(5n, 'bc1test123');
      
      // Complete once
      await engine.completeRedemption(intent.id);
      
      // Try to complete again
      await expect(engine.completeRedemption(intent.id)).rejects.toThrow(
        'Redemption intent is not pending'
      );
    });
  });

  describe('Intent Management', () => {
    it('should track multiple redemption intents', async () => {
      supplyLedger.recordMint(20n);
      
      const intent1 = await engine.requestRedeemBloom(5n, 'bc1test1');
      const intent2 = await engine.requestRedeemBloom(3n, 'bc1test2');
      
      const allIntents = engine.getAllRedemptionIntents();
      expect(allIntents).toHaveLength(2);
      
      const pendingIntents = engine.getPendingRedemptions();
      expect(pendingIntents).toHaveLength(2);
    });

    it('should get specific intent by ID', async () => {
      supplyLedger.recordMint(10n);
      const intent = await engine.requestRedeemBloom(5n, 'bc1test123');
      
      const retrieved = engine.getRedemptionIntent(intent.id);
      expect(retrieved).toEqual(intent);
      
      const notFound = engine.getRedemptionIntent('nonexistent');
      expect(notFound).toBeUndefined();
    });
  });

  describe('Max Redeemable Calculation', () => {
    it('should calculate max redeemable correctly', () => {
      supplyLedger.recordMint(20n); // 20 BLOOM outstanding
      
      const maxRedeemable = engine.calculateMaxRedeemable(100_000_000n); // 1 BTC locked
      expect(maxRedeemable).toBe(10n); // Can redeem up to 10 BLOOM (1 BTC worth)
    });
  });
});

describe('MockHtlcSimulator', () => {
  let simulator: MockHtlcSimulator;

  beforeEach(() => {
    simulator = new MockHtlcSimulator();
  });

  it('should create and complete HTLCs', async () => {
    const txId = await simulator.createHtlc('bc1test123', 50_000_000n, Date.now() + 86400000);
    expect(txId).toMatch(/^btc_\d+_/);
    
    const completed = await simulator.completeHtlc(txId);
    expect(completed).toBe(true);
    
    // Try to complete again
    const completedAgain = await simulator.completeHtlc(txId);
    expect(completedAgain).toBe(false);
  });

  it('should track pending HTLCs', async () => {
    await simulator.createHtlc('bc1test1', 10_000_000n, Date.now() + 86400000);
    await simulator.createHtlc('bc1test2', 20_000_000n, Date.now() + 86400000);
    
    const pending = simulator.getPendingHtlcs();
    expect(pending).toHaveLength(2);
  });
});
