import { describe, it, expect, beforeEach } from 'vitest';
import { RewardsEngine } from './index';
import { SupplyLedger } from '@mycelia/shared-kernel';
import { StaticReserveFeed } from '@mycelia/proof-of-reserve';

describe('RewardsEngine', () => {
  let engine: RewardsEngine;
  let supplyLedger: SupplyLedger;

  beforeEach(() => {
    supplyLedger = new SupplyLedger();
    engine = new RewardsEngine(supplyLedger);
  });

  it('does local auction and accounting, user share between 0.8 and 0.9', async () => {
    engine.enable();
    const d = engine.auction({ title: 'Flight to Tokyo' });
    expect(d).not.toBeNull();
    engine.account('impression', { id: 1 });
    engine.account('click', { id: 1 });
    engine.grant({ id: 'acc', scope: 'rewards:account' });
    const receipts = await engine.settle('2025-Q4', 0.85);
    expect(receipts[0].epoch).toBe('2025-Q4');
  });

  describe('Minting with Peg Enforcement', () => {
    it('should mint BLOOM when fully collateralized', async () => {
      const reserveFeed = new StaticReserveFeed(100_000_000n); // 1 BTC
      const supplyFeed = {
        async getBloomOutstanding() {
          return supplyLedger.currentSupply();
        }
      };

      engine.setMintingFeeds({ reserve: reserveFeed, supply: supplyFeed });

      const receipts = await engine.mintBloom(5n); // 5 BLOOM
      expect(receipts).toHaveLength(1);
      expect(supplyLedger.currentSupply()).toBe(5n);
    });

    it('should reject minting when under-collateralized', async () => {
      const reserveFeed = new StaticReserveFeed(50_000_000n); // 0.5 BTC
      const supplyFeed = {
        async getBloomOutstanding() {
          return supplyLedger.currentSupply();
        }
      };

      engine.setMintingFeeds({ reserve: reserveFeed, supply: supplyFeed });

      await expect(engine.mintBloom(10n)).rejects.toThrow(
        'Mint denied: collateral shortfall. Peg requires locked BTC sats >= BLOOM * 10 ratio.'
      );
    });

    it('should throw error when minting feeds not configured', async () => {
      await expect(engine.mintBloom(1n)).rejects.toThrow(
        'Minting feeds not configured'
      );
    });
  });
});

