// Canonical peg constants - exact rational math using bigint
export const SATS_PER_BTC = 100_000_000n;
export const BTC_PER_BLOOM = 10n; // 10 BLOOM = 1 BTC
export const SATS_PER_BLOOM = SATS_PER_BTC / BTC_PER_BLOOM; // 10,000,000 sats per BLOOM

/**
 * Convert BLOOM tokens to Bitcoin satoshis at the canonical peg
 * @param bloom Amount of BLOOM tokens (in smallest unit)
 * @returns Equivalent satoshis
 */
export function bloomToSats(bloom: bigint): bigint {
  return bloom * SATS_PER_BLOOM;
}

/**
 * Convert Bitcoin satoshis to BLOOM tokens at the canonical peg
 * Uses floor division by default to prevent over-minting
 * @param sats Amount of satoshis
 * @returns Equivalent BLOOM tokens (floored)
 */
export function satsToBloom(sats: bigint): bigint {
  return sats / SATS_PER_BLOOM;
}

/**
 * Returns the canonical peg statement for UI display
 */
export function assertPeg(): string {
  return "Peg: 10 BLOOM = 1 BTC";
}

// Collateralization interfaces
export interface ReserveFeed {
  getLockedBtcSats(): Promise<bigint>;
}

export interface SupplyFeed {
  getBloomOutstanding(): Promise<bigint>;
}

/**
 * Calculate required satoshis to fully collateralize a given BLOOM supply
 * @param outstandingBloom Current BLOOM supply
 * @returns Required locked BTC satoshis
 */
export function requiredSatsForSupply(outstandingBloom: bigint): bigint {
  return bloomToSats(outstandingBloom);
}

/**
 * Calculate collateralization ratio as a percentage
 * @param lockedSats Currently locked BTC satoshis
 * @param outstandingBloom Current BLOOM supply
 * @returns Collateralization ratio (1.0 = 100%)
 */
export function collateralizationRatio(lockedSats: bigint, outstandingBloom: bigint): number {
  if (outstandingBloom === 0n) return Infinity;
  const required = requiredSatsForSupply(outstandingBloom);
  return Number(lockedSats) / Number(required);
}

/**
 * Check if the system is fully reserved (100%+ collateralization)
 * @param lockedSats Currently locked BTC satoshis
 * @param outstandingBloom Current BLOOM supply
 * @returns true if fully reserved
 */
export function isFullyReserved(lockedSats: bigint, outstandingBloom: bigint): boolean {
  return lockedSats >= requiredSatsForSupply(outstandingBloom);
}

/**
 * Check if a mint operation would maintain full collateralization
 * @param mintAmountBloom Amount of BLOOM to mint
 * @param feeds Reserve and supply feeds
 * @returns Promise<boolean> true if mint is allowed
 */
export async function canMint(
  mintAmountBloom: bigint,
  feeds: { reserve: ReserveFeed; supply: SupplyFeed }
): Promise<boolean> {
  const [lockedSats, outstandingBloom] = await Promise.all([
    feeds.reserve.getLockedBtcSats(),
    feeds.supply.getBloomOutstanding()
  ]);
  
  const newSupply = outstandingBloom + mintAmountBloom;
  return isFullyReserved(lockedSats, newSupply);
}

/**
 * Assert that a mint operation maintains full collateralization
 * Throws if mint would cause under-collateralization
 * @param mintAmountBloom Amount of BLOOM to mint
 * @param feeds Reserve and supply feeds
 */
export async function assertCanMint(
  mintAmountBloom: bigint,
  feeds: { reserve: ReserveFeed; supply: SupplyFeed }
): Promise<void> {
  const allowed = await canMint(mintAmountBloom, feeds);
  if (!allowed) {
    throw new Error(
      "Mint denied: collateral shortfall. Peg requires locked BTC sats >= BLOOM * 10 ratio."
    );
  }
}

/**
 * Calculate maximum redeemable BLOOM given current reserves
 * @param lockedSats Currently locked BTC satoshis
 * @param outstandingBloom Current BLOOM supply
 * @returns Maximum BLOOM that can be redeemed
 */
export function maxRedeemableBloom(lockedSats: bigint, outstandingBloom: bigint): bigint {
  return satsToBloom(lockedSats);
}

/**
 * Quote exact satoshis for BLOOM redemption at the canonical peg
 * @param bloom Amount of BLOOM to redeem
 * @returns Exact satoshis to be paid out
 */
export function quoteRedeemBloomToSats(bloom: bigint): bigint {
  return bloomToSats(bloom);
}
