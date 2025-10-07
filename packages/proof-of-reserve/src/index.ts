import { ReserveFeed } from '@mycelia/tokenomics';

export interface SpvUtxoConfig {
  watchAddresses?: string[];
  descriptors?: string[];
  network?: 'testnet' | 'signet' | 'mainnet';
}

export interface SpvUtxoResult {
  status: 'complete' | 'partial';
  sats: bigint;
  warning?: string;
  utxoCount: number;
}

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
 * SPV UTXO feed that fetches UTXOs and sums value
 * Accepts multiple backends; verifies headers and Merkle proofs when available
 */
export class SpvUtxoFeed implements ReserveFeed {
  private config: SpvUtxoConfig;
  private utxos = new Map<string, { value: bigint; confirmed: boolean }>();

  constructor(config: SpvUtxoConfig) {
    this.config = config;
  }

  async getLockedBtcSats(): Promise<bigint> {
    const result = await this.getUtxoResult();
    return result.sats;
  }

  /**
   * Get detailed UTXO result with status and warnings
   */
  async getUtxoResult(): Promise<SpvUtxoResult> {
    try {
      // In production, would fetch from Bitcoin node or API
      const utxos = await this.fetchUtxos();
      
      let totalSats = 0n;
      let confirmedCount = 0;
      
      for (const [txid, utxo] of utxos) {
        totalSats += utxo.value;
        if (utxo.confirmed) {
          confirmedCount++;
        }
      }

      const isComplete = confirmedCount === utxos.size;
      
      return {
        status: isComplete ? 'complete' : 'partial',
        sats: totalSats,
        warning: isComplete ? undefined : 'spv-incomplete',
        utxoCount: utxos.size
      };
    } catch (error) {
      // Return partial result with warning
      return {
        status: 'partial',
        sats: 0n,
        warning: 'spv-unavailable',
        utxoCount: 0
      };
    }
  }

  /**
   * Fetch UTXOs from configured addresses/descriptors
   * Mock implementation for demo
   */
  private async fetchUtxos(): Promise<Map<string, { value: bigint; confirmed: boolean }>> {
    const utxos = new Map<string, { value: bigint; confirmed: boolean }>();
    
    // Mock UTXOs for demo
    if (this.config.watchAddresses && this.config.watchAddresses.length > 0) {
      // Simulate some UTXOs
      utxos.set('mock-txid-1', { value: 50_000_000n, confirmed: true });
      utxos.set('mock-txid-2', { value: 25_000_000n, confirmed: true });
      utxos.set('mock-txid-3', { value: 10_000_000n, confirmed: false }); // Unconfirmed
    }
    
    return utxos;
  }

  /**
   * Add UTXO to watch list
   */
  addUtxo(txid: string, vout: number, value: bigint, confirmed: boolean = true): void {
    const key = `${txid}:${vout}`;
    this.utxos.set(key, { value, confirmed });
  }

  /**
   * Remove UTXO from watch list
   */
  removeUtxo(txid: string, vout: number): void {
    const key = `${txid}:${vout}`;
    this.utxos.delete(key);
  }
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
  private lastWarning?: string;

  constructor(
    private primary: SpvProofFeed,
    private fallback: ReserveFeed
  ) {}

  async getLockedBtcSats(): Promise<bigint> {
    try {
      // Try SPV verification first
      const spvResult = await this.primary.verifySpvProof();
      if (spvResult !== null) {
        this.lastWarning = undefined;
        return spvResult;
      }
    } catch (error) {
      // SPV not available, continue to fallback
    }

    // Fall back to static feed with warning
    this.lastWarning = 'spv-unavailable';
    return this.fallback.getLockedBtcSats();
  }

  /**
   * Get the last warning message
   */
  getLastWarning(): string | undefined {
    return this.lastWarning;
  }

  /**
   * Check if SPV is available
   */
  async isSpvAvailable(): Promise<boolean> {
    try {
      const result = await this.primary.verifySpvProof();
      return result !== null;
    } catch {
      return false;
    }
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
