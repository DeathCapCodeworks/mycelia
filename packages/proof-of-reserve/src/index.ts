import { ReserveFeed } from '@mycelia/tokenomics';

/**
 * Static reserve feed for local demos and testing
 * Reads locked BTC satoshis from configuration
 */
export class StaticReserveFeed implements ReserveFeed {
  private lockedSats: bigint;

  constructor(lockedSats: bigint) {
    this.lockedSats = lockedSats;
  }

  async getLockedBtcSats(): Promise<bigint> {
    return this.lockedSats;
  }

  /**
   * Update the locked amount (for testing/demo purposes)
   */
  setLockedSats(sats: bigint): void {
    this.lockedSats = sats;
  }
}

/**
 * SPV proof feed interface for future Bitcoin verification
 * Currently stubbed for demo purposes
 */
export interface SpvProofFeed extends ReserveFeed {
  /**
   * Verify SPV proof and return locked satoshis
   * Returns null if SPV verification is not available
   */
  verifySpvProof(): Promise<bigint | null>;
}

/**
 * Mock SPV proof feed that returns unsupported in demo mode
 */
export class MockSpvProofFeed implements SpvProofFeed {
  async getLockedBtcSats(): Promise<bigint> {
    throw new Error('SPV proof verification not available in demo mode');
  }

  async verifySpvProof(): Promise<bigint | null> {
    return null; // SPV not available
  }
}

/**
 * Composable reserve feed that prefers SPV when available, falls back to static
 */
export class ComposableReserveFeed implements ReserveFeed {
  constructor(
    private primary: SpvProofFeed,
    private fallback: ReserveFeed
  ) {}

  async getLockedBtcSats(): Promise<bigint> {
    try {
      // Try SPV verification first
      const spvResult = await this.primary.verifySpvProof();
      if (spvResult !== null) {
        return spvResult;
      }
    } catch (error) {
      // SPV not available, continue to fallback
    }

    // Fall back to static feed
    return this.fallback.getLockedBtcSats();
  }
}

/**
 * Factory function to create a reserve feed with fallback
 */
export function composeReserveFeed(
  primary: SpvProofFeed,
  fallback: ReserveFeed
): ReserveFeed {
  return new ComposableReserveFeed(primary, fallback);
}

/**
 * Create a static reserve feed from environment variable
 * Reads RESERVE_SATS from process.env
 */
export function createStaticReserveFeedFromEnv(): StaticReserveFeed {
  const envSats = process.env.RESERVE_SATS;
  if (!envSats) {
    // Default to 1 BTC for demo
    return new StaticReserveFeed(100_000_000n);
  }
  
  try {
    const sats = BigInt(envSats);
    return new StaticReserveFeed(sats);
  } catch (error) {
    throw new Error(`Invalid RESERVE_SATS environment variable: ${envSats}`);
  }
}
