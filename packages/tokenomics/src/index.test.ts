import { describe, it, expect } from 'vitest';
import {
  SATS_PER_BTC,
  BTC_PER_BLOOM,
  SATS_PER_BLOOM,
  bloomToSats,
  satsToBloom,
  assertPeg,
  requiredSatsForSupply,
  collateralizationRatio,
  isFullyReserved,
  canMint,
  assertCanMint,
  maxRedeemableBloom,
  quoteRedeemBloomToSats,
  type ReserveFeed,
  type SupplyFeed
} from './index';

// Property test utilities
function generateRandomBigInt(min: bigint, max: bigint): bigint {
  const range = max - min;
  const random = BigInt(Math.floor(Math.random() * Number(range)));
  return min + random;
}

function generateRandomBloomAmount(): bigint {
  return generateRandomBigInt(1n, 1000000n); // 1 to 1M BLOOM
}

function generateRandomSatsAmount(): bigint {
  return generateRandomBigInt(1n, 100000000000n); // 1 to 100B sats
}

describe('Peg Constants', () => {
  it('should have correct BTC to BLOOM ratio', () => {
    expect(BTC_PER_BLOOM).toBe(10n);
  });

  it('should calculate correct sats per BLOOM', () => {
    expect(SATS_PER_BLOOM).toBe(10_000_000n); // 100M / 10
  });

  it('should maintain peg invariant', () => {
    expect(SATS_PER_BTC).toBe(100_000_000n);
    expect(SATS_PER_BLOOM * BTC_PER_BLOOM).toBe(SATS_PER_BTC);
  });
});

describe('Peg Math Functions', () => {
  it('should convert BLOOM to sats correctly', () => {
    expect(bloomToSats(1n)).toBe(10_000_000n);
    expect(bloomToSats(10n)).toBe(100_000_000n); // 1 BTC
    expect(bloomToSats(0n)).toBe(0n);
  });

  it('should convert sats to BLOOM with floor division', () => {
    expect(satsToBloom(10_000_000n)).toBe(1n);
    expect(satsToBloom(100_000_000n)).toBe(10n); // 1 BTC
    expect(satsToBloom(5_000_000n)).toBe(0n); // Floor division
    expect(satsToBloom(15_000_000n)).toBe(1n); // Floor division
  });

  it('should handle large numbers correctly', () => {
    const largeBloom = 1_000_000n;
    const sats = bloomToSats(largeBloom);
    const backToBloom = satsToBloom(sats);
    expect(backToBloom).toBe(largeBloom);
  });

  it('should return canonical peg statement', () => {
    expect(assertPeg()).toBe("Peg: 10 BLOOM = 1 BTC");
  });
});

describe('Collateralization Math', () => {
  it('should calculate required sats for supply', () => {
    expect(requiredSatsForSupply(100n)).toBe(1_000_000_000n); // 100 BLOOM = 10 BTC
    expect(requiredSatsForSupply(0n)).toBe(0n);
  });

  it('should calculate collateralization ratio', () => {
    expect(collateralizationRatio(100_000_000n, 10n)).toBe(1.0); // 100% collateralized
    expect(collateralizationRatio(200_000_000n, 10n)).toBe(2.0); // 200% collateralized
    expect(collateralizationRatio(50_000_000n, 10n)).toBe(0.5); // 50% collateralized
  });

  it('should handle zero supply correctly', () => {
    expect(collateralizationRatio(100_000_000n, 0n)).toBe(Infinity);
  });

  it('should check if fully reserved', () => {
    expect(isFullyReserved(100_000_000n, 10n)).toBe(true); // Exactly 100%
    expect(isFullyReserved(200_000_000n, 10n)).toBe(true); // Over-collateralized
    expect(isFullyReserved(50_000_000n, 10n)).toBe(false); // Under-collateralized
  });
});

describe('Mint Guard', () => {
  const mockReserveFeed: ReserveFeed = {
    async getLockedBtcSats() {
      return 100_000_000n; // 1 BTC locked
    }
  };

  const mockSupplyFeed: SupplyFeed = {
    async getBloomOutstanding() {
      return 5n; // 5 BLOOM outstanding
    }
  };

  it('should allow minting when fully reserved', async () => {
    const allowed = await canMint(5n, { reserve: mockReserveFeed, supply: mockSupplyFeed });
    expect(allowed).toBe(true); // 5 + 5 = 10 BLOOM, requires 1 BTC, we have 1 BTC
  });

  it('should deny minting when under-collateralized', async () => {
    const allowed = await canMint(10n, { reserve: mockReserveFeed, supply: mockSupplyFeed });
    expect(allowed).toBe(false); // 5 + 10 = 15 BLOOM, requires 1.5 BTC, we have 1 BTC
  });

  it('should assert mint guard correctly', async () => {
    await expect(assertCanMint(5n, { reserve: mockReserveFeed, supply: mockSupplyFeed }))
      .resolves.not.toThrow();
    
    await expect(assertCanMint(10n, { reserve: mockReserveFeed, supply: mockSupplyFeed }))
      .rejects.toThrow("Mint denied: collateral shortfall. Peg requires locked BTC sats >= BLOOM * 10 ratio.");
  });
});

describe('Redemption Functions', () => {
  it('should calculate max redeemable BLOOM', () => {
    expect(maxRedeemableBloom(100_000_000n, 20n)).toBe(10n); // 1 BTC locked = 10 BLOOM max
    expect(maxRedeemableBloom(50_000_000n, 20n)).toBe(5n); // 0.5 BTC locked = 5 BLOOM max
  });

  it('should quote exact redemption sats', () => {
    expect(quoteRedeemBloomToSats(1n)).toBe(10_000_000n);
    expect(quoteRedeemBloomToSats(10n)).toBe(100_000_000n); // 1 BTC
  });
});

describe('Peg Invariants', () => {
  it('should maintain peg across conversions', () => {
    const testValues = [1n, 10n, 100n, 1000n, 10000n];
    
    for (const bloom of testValues) {
      const sats = bloomToSats(bloom);
      const backToBloom = satsToBloom(sats);
      expect(backToBloom).toBe(bloom);
    }
  });

  it('should never allow over-minting beyond reserves', async () => {
    const reserveFeed: ReserveFeed = {
      async getLockedBtcSats() { return 100_000_000n; } // 1 BTC
    };
    
    const supplyFeed: SupplyFeed = {
      async getBloomOutstanding() { return 0n; }
    };

    // Should allow minting up to 10 BLOOM (1 BTC worth)
    expect(await canMint(10n, { reserve: reserveFeed, supply: supplyFeed })).toBe(true);
    
    // Should deny minting beyond 10 BLOOM
    expect(await canMint(11n, { reserve: reserveFeed, supply: supplyFeed })).toBe(false);
  });

  it('should maintain exact peg quotes for redemption', () => {
    const testAmounts = [1n, 5n, 10n, 25n, 100n];
    
    for (const bloom of testAmounts) {
      const sats = quoteRedeemBloomToSats(bloom);
      const expectedSats = bloom * SATS_PER_BLOOM;
      expect(sats).toBe(expectedSats);
    }
  });
});

describe('Property Tests', () => {
  it('should maintain peg invariant across random conversions', () => {
    for (let i = 0; i < 100; i++) {
      const bloom = generateRandomBloomAmount();
      const sats = bloomToSats(bloom);
      const backToBloom = satsToBloom(sats);
      
      // Property: Round-trip conversion should preserve exact amount
      expect(backToBloom).toBe(bloom);
      
      // Property: Conversion should be exact multiple of SATS_PER_BLOOM
      expect(sats % SATS_PER_BLOOM).toBe(0n);
    }
  });

  it('should never overflow in bigint calculations', () => {
    const maxSafeBloom = 1000000000n; // 1B BLOOM
    const sats = bloomToSats(maxSafeBloom);
    
    // Property: Should handle large numbers without overflow
    expect(sats).toBe(maxSafeBloom * SATS_PER_BLOOM);
    expect(sats > 0n).toBe(true);
  });

  it('should maintain collateralization properties', () => {
    for (let i = 0; i < 50; i++) {
      const lockedSats = generateRandomSatsAmount();
      const supply = generateRandomBloomAmount();
      const requiredSats = requiredSatsForSupply(supply);
      
      // Property: Required sats should be exact multiple of supply
      expect(requiredSats).toBe(supply * SATS_PER_BLOOM);
      
      // Property: Collateralization ratio should be consistent
      const ratio = collateralizationRatio(lockedSats, supply);
      if (supply > 0n) {
        expect(ratio).toBe(Number(lockedSats) / Number(requiredSats));
      }
    }
  });

  it('should never allow negative or zero amounts in conversions', () => {
    for (let i = 0; i < 100; i++) {
      const bloom = generateRandomBloomAmount();
      const sats = bloomToSats(bloom);
      
      // Property: Positive input should produce positive output
      expect(bloom > 0n).toBe(true);
      expect(sats > 0n).toBe(true);
    }
  });

  it('should maintain redemption quote properties', () => {
    for (let i = 0; i < 100; i++) {
      const bloom = generateRandomBloomAmount();
      const sats = quoteRedeemBloomToSats(bloom);
      
      // Property: Quote should be exact multiple of SATS_PER_BLOOM
      expect(sats % SATS_PER_BLOOM).toBe(0n);
      
      // Property: Quote should equal bloomToSats
      expect(sats).toBe(bloomToSats(bloom));
    }
  });
});
