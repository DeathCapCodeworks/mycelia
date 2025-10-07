import { describe, it, expect, beforeEach } from 'vitest';
import { SupplyLedger } from '@mycelia/shared-kernel';
import { StaticReserveFeed } from '@mycelia/proof-of-reserve';
import { RewardsEngine } from '@mycelia/bloom-rewards';
import { RedemptionEngine, MockHtlcSimulator } from '@mycelia/redemption';
import { 
  bloomToSats, 
  satsToBloom, 
  collateralizationRatio, 
  isFullyReserved,
  assertCanMint 
} from '@mycelia/tokenomics';

describe('Peg Integration Tests', () => {
  let supplyLedger: SupplyLedger;
  let reserveFeed: StaticReserveFeed;
  let rewardsEngine: RewardsEngine;
  let redemptionEngine: RedemptionEngine;

  beforeEach(() => {
    supplyLedger = new SupplyLedger();
    reserveFeed = new StaticReserveFeed(100_000_000n); // 1 BTC
    rewardsEngine = new RewardsEngine(supplyLedger);
    redemptionEngine = new RedemptionEngine(supplyLedger, new MockHtlcSimulator());

    // Set up minting feeds
    const supplyFeed = {
      async getBloomOutstanding() {
        return supplyLedger.currentSupply();
      }
    };
    rewardsEngine.setMintingFeeds({ reserve: reserveFeed, supply: supplyFeed });
  });

  describe('Peg Math Invariants', () => {
    it('should maintain exact peg across conversions', () => {
      const testValues = [1n, 10n, 100n, 1000n];
      
      for (const bloom of testValues) {
        const sats = bloomToSats(bloom);
        const backToBloom = satsToBloom(sats);
        expect(backToBloom).toBe(bloom);
      }
    });

    it('should calculate correct collateralization ratios', () => {
      // Mint 5 BLOOM (requires 0.5 BTC)
      supplyLedger.recordMint(5n);
      
      const ratio = collateralizationRatio(100_000_000n, 5n);
      expect(ratio).toBe(2.0); // 200% collateralized
      
      const isReserved = isFullyReserved(100_000_000n, 5n);
      expect(isReserved).toBe(true);
    });
  });

  describe('Mint Guard Integration', () => {
    it('should allow minting up to reserve limit', async () => {
      // Should allow minting 10 BLOOM (1 BTC worth)
      await expect(rewardsEngine.mintBloom(10n)).resolves.not.toThrow();
      expect(supplyLedger.currentSupply()).toBe(10n);
    });

    it('should reject minting beyond reserve limit', async () => {
      // Try to mint 11 BLOOM (requires 1.1 BTC, but only have 1 BTC)
      await expect(rewardsEngine.mintBloom(11n)).rejects.toThrow(
        'Mint denied: collateral shortfall. Peg requires locked BTC sats >= BLOOM * 10 ratio.'
      );
    });

    it('should maintain peg after multiple mints', async () => {
      // Mint in batches
      await rewardsEngine.mintBloom(3n);
      await rewardsEngine.mintBloom(4n);
      await rewardsEngine.mintBloom(3n);
      
      expect(supplyLedger.currentSupply()).toBe(10n);
      
      // Try one more mint (should fail)
      await expect(rewardsEngine.mintBloom(1n)).rejects.toThrow();
    });
  });

  describe('Redemption Integration', () => {
    it('should complete redemption flow and burn tokens', async () => {
      // Mint some BLOOM first
      await rewardsEngine.mintBloom(5n);
      expect(supplyLedger.currentSupply()).toBe(5n);

      // Request redemption
      const intent = await redemptionEngine.requestRedeemBloom(2n, 'bc1test123');
      expect(intent.bloomAmount).toBe(2n);
      expect(intent.quotedSats).toBe(20_000_000n); // 2 BLOOM * 10M sats

      // Complete redemption
      const success = await redemptionEngine.completeRedemption(intent.id);
      expect(success).toBe(true);
      expect(supplyLedger.currentSupply()).toBe(3n); // 5 - 2 = 3
    });

    it('should reject redemption exceeding supply', async () => {
      await rewardsEngine.mintBloom(5n);
      
      await expect(redemptionEngine.requestRedeemBloom(10n, 'bc1test123')).rejects.toThrow(
        'Cannot redeem more than outstanding supply'
      );
    });
  });

  describe('End-to-End Peg Invariant', () => {
    it('should maintain peg invariant through mint and redeem cycle', async () => {
      // Start with 1 BTC locked
      expect(await reserveFeed.getLockedBtcSats()).toBe(100_000_000n);
      
      // Mint to the brink of reserves
      await rewardsEngine.mintBloom(10n); // Exactly 1 BTC worth
      expect(supplyLedger.currentSupply()).toBe(10n);
      
      // Verify we're at 100% collateralization
      const ratio = collateralizationRatio(100_000_000n, 10n);
      expect(ratio).toBe(1.0);
      
      // Redeem some BLOOM
      const intent = await redemptionEngine.requestRedeemBloom(3n, 'bc1test123');
      await redemptionEngine.completeRedemption(intent.id);
      
      // Verify supply reduced and peg maintained
      expect(supplyLedger.currentSupply()).toBe(7n);
      const newRatio = collateralizationRatio(100_000_000n, 7n);
      expect(newRatio).toBeGreaterThan(1.0); // Over-collateralized
      
      // Should be able to mint more now
      await expect(rewardsEngine.mintBloom(3n)).resolves.not.toThrow();
      expect(supplyLedger.currentSupply()).toBe(10n);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero supply correctly', () => {
      const ratio = collateralizationRatio(100_000_000n, 0n);
      expect(ratio).toBe(Infinity);
      expect(isFullyReserved(100_000_000n, 0n)).toBe(true);
    });

    it('should handle large numbers correctly', () => {
      const largeBloom = 1_000_000n;
      const sats = bloomToSats(largeBloom);
      const backToBloom = satsToBloom(sats);
      expect(backToBloom).toBe(largeBloom);
    });

    it('should maintain precision with fractional BTC amounts', () => {
      // Test with 0.1 BTC (10M sats)
      const smallSats = 10_000_000n;
      const bloom = satsToBloom(smallSats);
      expect(bloom).toBe(1n); // 0.1 BTC = 1 BLOOM
      
      const backToSats = bloomToSats(bloom);
      expect(backToSats).toBe(smallSats);
    });
  });
});
