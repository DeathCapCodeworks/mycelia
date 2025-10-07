import { SupplyLedger } from '@mycelia/shared-kernel';
import { quoteRedeemBloomToSats as tokenomicsQuoteRedeemBloomToSats, maxRedeemableBloom } from '@mycelia/tokenomics';

export interface RedeemIntent {
  id: string;
  bloomAmount: bigint;
  btcAddress: string;
  quotedSats: bigint;
  deadline: number;
  status: 'pending' | 'completed' | 'expired' | 'failed';
  btcTxId?: string;
  createdAt: number;
}

export interface HtlcSimulator {
  createHtlc(btcAddress: string, sats: bigint, deadline: number): Promise<string>;
  completeHtlc(txId: string): Promise<boolean>;
}

/**
 * Mock HTLC simulator for demo purposes
 * In production, this would interface with real Bitcoin HTLC or DLC
 */
export class MockHtlcSimulator implements HtlcSimulator {
  private htlcMap = new Map<string, { address: string; sats: bigint; deadline: number }>();

  async createHtlc(btcAddress: string, sats: bigint, deadline: number): Promise<string> {
    const txId = `btc_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    this.htlcMap.set(txId, { address: btcAddress, sats, deadline });
    return txId;
  }

  async completeHtlc(txId: string): Promise<boolean> {
    const htlc = this.htlcMap.get(txId);
    if (!htlc) return false;
    
    // Simulate HTLC completion
    this.htlcMap.delete(txId);
    return true;
  }

  /**
   * Get all pending HTLCs (for testing/demo)
   */
  getPendingHtlcs(): Array<{ txId: string; address: string; sats: bigint; deadline: number }> {
    return Array.from(this.htlcMap.entries()).map(([txId, data]) => ({
      txId,
      address: data.address,
      sats: data.sats,
      deadline: data.deadline
    }));
  }
}

// Global redemption engine instance for diagnostics
let globalRedemptionEngine: RedemptionEngine | null = null;

export function requestRedeemBloom(bloomAmount: bigint, btcAddress: string): Promise<RedeemIntent> {
  if (!globalRedemptionEngine) {
    // Create a default instance for diagnostics
    const supplyLedger = new SupplyLedger();
    const htlcSimulator = new MockHtlcSimulator();
    globalRedemptionEngine = new RedemptionEngine(supplyLedger, htlcSimulator);
  }
  return globalRedemptionEngine.requestRedeemBloom(bloomAmount, btcAddress);
}

export function quoteRedeemBloomToSats(bloomAmount: bigint): bigint {
  return tokenomicsQuoteRedeemBloomToSats(bloomAmount);
}

export class RedemptionEngine {
  private intents = new Map<string, RedeemIntent>();
  private supplyLedger: SupplyLedger;
  private htlcSimulator: HtlcSimulator;

  constructor(supplyLedger: SupplyLedger, htlcSimulator: HtlcSimulator) {
    this.supplyLedger = supplyLedger;
    this.htlcSimulator = htlcSimulator;
  }

  /**
   * Request redemption of BLOOM tokens for BTC
   * @param bloomAmount Amount of BLOOM to redeem
   * @param btcAddress Bitcoin address to receive BTC
   * @returns RedeemIntent with quote and deadline
   */
  async requestRedeemBloom(bloomAmount: bigint, btcAddress: string): Promise<RedeemIntent> {
    if (bloomAmount <= 0n) {
      throw new Error('Redemption amount must be positive');
    }

    // Check if redemption is possible given current supply
    const currentSupply = this.supplyLedger.currentSupply();
    if (bloomAmount > currentSupply) {
      throw new Error('Cannot redeem more than outstanding supply');
    }

    // Quote exact sats at peg
    const quotedSats = tokenomicsQuoteRedeemBloomToSats(bloomAmount);

    // Create HTLC with 24 hour deadline
    const deadline = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
    const btcTxId = await this.htlcSimulator.createHtlc(btcAddress, quotedSats, deadline);

    // Create redemption intent
    const intent: RedeemIntent = {
      id: `redeem_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      bloomAmount,
      btcAddress,
      quotedSats,
      deadline,
      status: 'pending',
      btcTxId,
      createdAt: Date.now()
    };

    this.intents.set(intent.id, intent);
    return intent;
  }

  /**
   * Complete a redemption by burning BLOOM tokens
   * @param intentId Redemption intent ID
   * @returns true if successful
   */
  async completeRedemption(intentId: string): Promise<boolean> {
    const intent = this.intents.get(intentId);
    if (!intent) {
      throw new Error('Redemption intent not found');
    }

    if (intent.status !== 'pending') {
      throw new Error('Redemption intent is not pending');
    }

    if (Date.now() > intent.deadline) {
      intent.status = 'expired';
      return false;
    }

    if (!intent.btcTxId) {
      throw new Error('No Bitcoin transaction ID found');
    }

    // Complete the HTLC
    const htlcCompleted = await this.htlcSimulator.completeHtlc(intent.btcTxId);
    if (!htlcCompleted) {
      intent.status = 'failed';
      return false;
    }

    // Burn the BLOOM tokens
    this.supplyLedger.recordBurn(intent.bloomAmount);

    // Mark as completed
    intent.status = 'completed';
    return true;
  }

  /**
   * Get redemption intent by ID
   */
  getRedemptionIntent(intentId: string): RedeemIntent | undefined {
    return this.intents.get(intentId);
  }

  /**
   * Get all redemption intents
   */
  getAllRedemptionIntents(): RedeemIntent[] {
    return Array.from(this.intents.values());
  }

  /**
   * Get pending redemption intents
   */
  getPendingRedemptions(): RedeemIntent[] {
    return Array.from(this.intents.values()).filter(intent => intent.status === 'pending');
  }

  /**
   * Calculate maximum redeemable BLOOM given current reserves
   * @param lockedSats Currently locked BTC satoshis
   * @returns Maximum BLOOM that can be redeemed
   */
  calculateMaxRedeemable(lockedSats: bigint): bigint {
    return maxRedeemableBloom(lockedSats, this.supplyLedger.currentSupply());
  }
}
