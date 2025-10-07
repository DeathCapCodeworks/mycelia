import { Capability, assertCap, SupplyLedger } from '@mycelia/shared-kernel';
import { assertCanMint, type ReserveFeed, type SupplyFeed } from '@mycelia/tokenomics';

export type PageSignals = { url?: string; title?: string } & Record<string, unknown>;
export type Decision = { creativeId: string; hints?: Record<string, unknown> } | null;
export type TxReceipt = { epoch: string; txHash: string };

type LedgerEvent = { ts: number; type: 'impression' | 'click'; meta: Record<string, unknown> };

export interface MintingFeeds {
  reserve: ReserveFeed;
  supply: SupplyFeed;
}

// Global rewards engine instance for diagnostics
let globalRewardsEngine: RewardsEngine | null = null;

export function enable() {
  if (!globalRewardsEngine) {
    const supplyLedger = new SupplyLedger();
    globalRewardsEngine = new RewardsEngine(supplyLedger);
  }
  globalRewardsEngine.enable();
}

export function account(event: 'impression' | 'click', metadata: Record<string, unknown>) {
  if (!globalRewardsEngine) {
    const supplyLedger = new SupplyLedger();
    globalRewardsEngine = new RewardsEngine(supplyLedger);
  }
  globalRewardsEngine.account(event, metadata);
}

export class RewardsEngine {
  private enabled = false;
  private slots = new Map<string, PageSignals>();
  private ledger: LedgerEvent[] = [];
  private caps: Capability[] = [];
  private supplyLedger: SupplyLedger;
  private mintingFeeds?: MintingFeeds;

  constructor(supplyLedger: SupplyLedger) {
    this.supplyLedger = supplyLedger;
  }

  /**
   * Set the minting feeds for peg enforcement
   */
  setMintingFeeds(feeds: MintingFeeds): void {
    this.mintingFeeds = feeds;
  }

  grant(cap: Capability) { this.caps.push(cap); }
  revoke(id: string) { this.caps = this.caps.filter((c) => c.id !== id); }

  enable() { this.enabled = true; }
  disable() { this.enabled = false; }

  registerSlot(selector: string, ctx: PageSignals) {
    this.slots.set(selector, ctx);
  }

  auction(ctx: PageSignals): Decision {
    if (!this.enabled) return null;
    // Local only decisioning using simple heuristics
    const creativeId = ctx.title?.toLowerCase().includes('flight') ? 'creative-travel-1' : 'creative-generic-1';
    return { creativeId, hints: { style: 'text' } };
  }

  account(event: 'impression' | 'click', metadata: Record<string, unknown>) {
    this.ledger.push({ ts: Date.now(), type: event, meta: metadata });
  }

  /**
   * Mint BLOOM tokens with peg enforcement
   * @param amount Amount of BLOOM to mint
   * @returns Promise<TxReceipt[]> Transaction receipts
   */
  async mintBloom(amount: bigint): Promise<TxReceipt[]> {
    if (!this.mintingFeeds) {
      throw new Error('Minting feeds not configured');
    }

    // Enforce peg invariant before minting
    await assertCanMint(amount, this.mintingFeeds);

    // Record the mint in the supply ledger
    this.supplyLedger.recordMint(amount);

    // Generate transaction receipt
    const txHash = `0x${amount.toString(16).padStart(8, '0')}`;
    return [{ epoch: Date.now().toString(), txHash }];
  }

  settle(epoch: string, userShare = 0.85): Promise<TxReceipt[]> {
    assertCap('rewards:account', this.caps);
    // Sum events locally, produce stub receipts
    const impressions = this.ledger.filter((e) => e.type === 'impression').length;
    const clicks = this.ledger.filter((e) => e.type === 'click').length;
    const payout = (impressions * 0.001 + clicks * 0.01) * userShare; // mock economics
    const txHash = `0x${Math.floor(payout * 1e6).toString(16).padStart(8, '0')}`;
    // Clear ledger at epoch end
    this.ledger = [];
    return Promise.resolve([{ epoch, txHash }]);
  }

  getLedger() { return [...this.ledger]; }
}

