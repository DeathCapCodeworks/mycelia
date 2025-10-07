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

// Fuzz test utilities
function generateRandomAmount(min: bigint, max: bigint): bigint {
  const range = max - min;
  const random = BigInt(Math.floor(Math.random() * Number(range)));
  return min + random;
}

function generateRandomBloomAmount(): bigint {
  return generateRandomAmount(1n, 1000000n); // 1 to 1M BLOOM
}

function generateRandomSatsAmount(): bigint {
  return generateRandomAmount(1n, 100000000000n); // 1 to 100B sats
}

function generateRandomTimeout(): number {
  const now = Date.now();
  const min = now + 3600000; // 1 hour from now
  const max = now + 86400000 * 7; // 1 week from now
  return Math.floor(Math.random() * (max - min)) + min;
}

describe('Fuzz Tests', () => {
  let engine: RedemptionEngine;
  let supplyLedger: SupplyLedger;
  let htlcSimulator: MockHtlcSimulator;

  beforeEach(() => {
    supplyLedger = new SupplyLedger();
    htlcSimulator = new MockHtlcSimulator();
    engine = new RedemptionEngine(supplyLedger, htlcSimulator);
  });

  it('should handle random redemption amounts without overflow', async () => {
    for (let i = 0; i < 100; i++) {
      const bloomAmount = generateRandomBloomAmount();
      const supply = generateRandomBloomAmount();
      
      // Mint supply
      supplyLedger.recordMint(supply);
      
      // Try redemption within supply
      const redeemAmount = bloomAmount > supply ? supply : bloomAmount;
      
      if (redeemAmount > 0n) {
        const intent = await engine.requestRedeemBloom(redeemAmount, 'bc1test123');
        
        // Property: Quoted sats should be exact multiple of redeem amount
        expect(intent.quotedSats % redeemAmount).toBe(0n);
        
        // Property: Quoted sats should equal redeemAmount * 10M
        expect(intent.quotedSats).toBe(redeemAmount * 10_000_000n);
        
        // Property: Should not overflow
        expect(intent.quotedSats > 0n).toBe(true);
      }
    }
  });

  it('should handle HTLC parameter bounds correctly', async () => {
    for (let i = 0; i < 50; i++) {
      const sats = generateRandomSatsAmount();
      const timeout = generateRandomTimeout();
      const address = `bc1test${i}`;
      
      const txId = await htlcSimulator.createHtlc(address, sats, timeout);
      
      // Property: TX ID should be valid format
      expect(txId).toMatch(/^btc_\d+_/);
      
      // Property: Should be able to complete HTLC
      const completed = await htlcSimulator.completeHtlc(txId);
      expect(completed).toBe(true);
      
      // Property: Should not be able to complete twice
      const completedAgain = await htlcSimulator.completeHtlc(txId);
      expect(completedAgain).toBe(false);
    }
  });

  it('should maintain supply invariants under random operations', async () => {
    let expectedSupply = 0n;
    
    for (let i = 0; i < 100; i++) {
      const operation = Math.random();
      
      if (operation < 0.7) {
        // Mint operation
        const mintAmount = generateRandomBloomAmount();
        supplyLedger.recordMint(mintAmount);
        expectedSupply += mintAmount;
      } else {
        // Redemption operation
        if (expectedSupply > 0n) {
          const redeemAmount = generateRandomAmount(1n, expectedSupply);
          const intent = await engine.requestRedeemBloom(redeemAmount, 'bc1test123');
          
          // Complete redemption
          await engine.completeRedemption(intent.id);
          expectedSupply -= redeemAmount;
        }
      }
      
      // Property: Supply should match expected
      expect(supplyLedger.currentSupply()).toBe(expectedSupply);
      
      // Property: Supply should never be negative
      expect(expectedSupply >= 0n).toBe(true);
    }
  });

  it('should handle edge cases in timeout calculations', async () => {
    const testCases = [
      Date.now() + 1000, // 1 second from now
      Date.now() + 3600000, // 1 hour from now
      Date.now() + 86400000, // 1 day from now
      Date.now() + 86400000 * 30, // 30 days from now
      Date.now() - 1000, // 1 second ago (expired)
    ];
    
    for (const timeout of testCases) {
      const txId = await htlcSimulator.createHtlc('bc1test123', 1000000n, timeout);
      
      // Property: Should create HTLC regardless of timeout
      expect(txId).toMatch(/^btc_\d+_/);
      
      // Property: Should be able to complete if not expired
      if (timeout > Date.now()) {
        const completed = await htlcSimulator.completeHtlc(txId);
        expect(completed).toBe(true);
      }
    }
  });

  it('should prevent rate limit bypass attempts', async () => {
    const address = 'bc1test123';
    
    // Property: Should allow normal rate limit
    for (let i = 0; i < 10; i++) {
      supplyLedger.recordMint(1n);
      const intent = await engine.requestRedeemBloom(1n, address);
      expect(intent.status).toBe('pending');
    }
    
    // Property: Should block after rate limit
    supplyLedger.recordMint(1n);
    await expect(engine.requestRedeemBloom(1n, address)).rejects.toThrow(
      'Rate limit exceeded for this address'
    );
  });
});
