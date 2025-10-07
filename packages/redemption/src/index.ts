import { SupplyLedger } from '@mycelia/shared-kernel';
import { quoteRedeemBloomToSats as tokenomicsQuoteRedeemBloomToSats, maxRedeemableBloom } from '@mycelia/tokenomics';
import { BitcoinBridge, HtlcResult, ClaimConfig, RefundConfig } from '@mycelia/btc-bridge';
import { logEvent, counter, gauge } from '@mycelia/observability';

export interface RedeemIntent {
  id: string;
  bloomAmount: bigint;
  btcAddress: string;
  quotedSats: bigint;
  deadline: number;
  status: 'pending' | 'completed' | 'expired' | 'failed';
  btcTxId?: string;
  createdAt: number;
  htlc?: HtlcResult;
  secretHash?: string;
  signature?: string;
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

export function redeemOnBitcoinTestnet(bloomAmount: bigint, btcAddress: string): Promise<RedeemIntent> {
  if (!globalRedemptionEngine) {
    // Create a default instance for diagnostics
    const supplyLedger = new SupplyLedger();
    const htlcSimulator = new MockHtlcSimulator();
    globalRedemptionEngine = new RedemptionEngine(supplyLedger, htlcSimulator);
  }
  return globalRedemptionEngine.redeemOnBitcoinTestnet(bloomAmount, btcAddress);
}

export function claimHtlc(config: ClaimConfig): Promise<{ txid: string }> {
  if (!globalRedemptionEngine) {
    throw new Error('Redemption engine not initialized');
  }
  return globalRedemptionEngine.claimHtlc(config);
}

export function refundHtlc(config: RefundConfig): Promise<{ txid: string }> {
  if (!globalRedemptionEngine) {
    throw new Error('Redemption engine not initialized');
  }
  return globalRedemptionEngine.refundHtlc(config);
}

export function quoteRedeemBloomToSats(bloomAmount: bigint): bigint {
  return tokenomicsQuoteRedeemBloomToSats(bloomAmount);
}

export class RedemptionEngine {
  private intents = new Map<string, RedeemIntent>();
  private supplyLedger: SupplyLedger;
  private htlcSimulator: HtlcSimulator;
  private btcBridge: BitcoinBridge;
  private rateLimits = new Map<string, { count: number; resetTime: number }>();
  private operatorKey: string;
  private redemptionCounter = counter('redemption_requests');
  private redemptionGauge = gauge('pending_redemptions');

  constructor(supplyLedger: SupplyLedger, htlcSimulator: HtlcSimulator, btcBridge?: BitcoinBridge) {
    this.supplyLedger = supplyLedger;
    this.htlcSimulator = htlcSimulator;
    this.btcBridge = btcBridge || new BitcoinBridge('testnet');
    this.operatorKey = 'mock-operator-key'; // In production, load from secure storage
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
    
    // Log redemption request
    logEvent('redemption_requested', {
      intentId: intent.id,
      bloomAmount: bloomAmount.toString(),
      btcAddress,
      quotedSats: quotedSats.toString(),
      deadline: intent.deadline
    });
    
    this.redemptionCounter.inc();
    this.redemptionGauge.set(this.intents.size);
    
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

  /**
   * Request redemption on Bitcoin testnet using real HTLC
   * @param bloomAmount Amount of BLOOM to redeem
   * @param btcAddress Bitcoin testnet address to receive BTC
   * @returns RedeemIntent with HTLC details
   */
  async redeemOnBitcoinTestnet(bloomAmount: bigint, btcAddress: string): Promise<RedeemIntent> {
    // Rate limiting
    if (!this.checkRateLimit(btcAddress)) {
      throw new Error('Rate limit exceeded for this address');
    }

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

    // Generate secret and hash
    const secret = this.generateSecret();
    const secretHash = this.hashSecret(secret);

    // Create HTLC with 24 hour deadline
    const deadline = Math.floor(Date.now() / 1000) + (24 * 60 * 60); // 24 hours
    const htlcResult = await this.btcBridge.createHtlcRedeem({
      sats: quotedSats,
      recipient: btcAddress,
      timeout: deadline,
      secretHash
    });

    // Create redemption intent
    const intent: RedeemIntent = {
      id: `redeem_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      bloomAmount,
      btcAddress,
      quotedSats,
      deadline: deadline * 1000, // Convert to milliseconds
      status: 'pending',
      btcTxId: htlcResult.txid,
      createdAt: Date.now(),
      htlc: htlcResult,
      secretHash,
      signature: this.signIntent(bloomAmount, btcAddress, secretHash)
    };

    this.intents.set(intent.id, intent);
    
    // Log testnet redemption request
    logEvent('testnet_redemption_requested', {
      intentId: intent.id,
      bloomAmount: bloomAmount.toString(),
      btcAddress,
      quotedSats: quotedSats.toString(),
      htlcTxid: htlcResult.txid,
      secretHash,
      signature: intent.signature
    });
    
    this.redemptionCounter.inc();
    this.redemptionGauge.set(this.intents.size);
    
    return intent;
  }

  /**
   * Claim HTLC with secret
   */
  async claimHtlc(config: ClaimConfig): Promise<{ txid: string }> {
    return this.btcBridge.claimHtlc(config);
  }

  /**
   * Refund HTLC after timeout
   */
  async refundHtlc(config: RefundConfig): Promise<{ txid: string }> {
    return this.btcBridge.refundHtlc(config);
  }

  /**
   * Complete a testnet redemption by burning BLOOM tokens
   * @param intentId Redemption intent ID
   * @returns true if successful
   */
  async completeTestnetRedemption(intentId: string): Promise<boolean> {
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

    if (!intent.htlc) {
      throw new Error('No HTLC details found');
    }

    // Burn the BLOOM tokens
    this.supplyLedger.recordBurn(intent.bloomAmount);

    // Mark as completed
    intent.status = 'completed';
    return true;
  }

  /**
   * Check rate limit for address
   */
  private checkRateLimit(address: string): boolean {
    const now = Date.now();
    const limit = this.rateLimits.get(address);
    
    if (!limit || now > limit.resetTime) {
      // Reset or create new limit
      this.rateLimits.set(address, {
        count: 1,
        resetTime: now + (60 * 60 * 1000) // 1 hour window
      });
      return true;
    }

    if (limit.count >= 10) { // Max 10 redemptions per hour
      return false;
    }

    limit.count++;
    return true;
  }

  /**
   * Generate random secret
   */
  private generateSecret(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  /**
   * Hash secret using SHA256
   */
  private hashSecret(secret: string): string {
    // In production, use proper crypto
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(secret).digest('hex');
  }

  /**
   * Sign redemption intent
   */
  private signIntent(bloomAmount: bigint, btcAddress: string, secretHash: string): string {
    // In production, use proper digital signature
    const data = `${bloomAmount}-${btcAddress}-${secretHash}`;
    return `sig-${Buffer.from(data).toString('base64')}`;
  }
}
