---
title: Appendix, Tokenomics
---

Supply and emissions, validator rewards, contribution multipliers.

## BLOOM Token Peg Specification

The BLOOM token maintains a hard protocol-level peg to Bitcoin:

**Canonical Peg: 10 BLOOM = 1 BTC**

This peg is enforced programmatically across all operations:

- **Exact Math**: All calculations use `bigint` for precision
- **Collateralization**: Each BLOOM is backed by locked Bitcoin reserves
- **Mint Guard**: Minting is blocked when collateral would fall below 100%
- **Redemption**: BLOOM tokens are redeemable for BTC at the fixed rate

### Peg Constants

```typescript
const SATS_PER_BTC = 100_000_000n;
const BTC_PER_BLOOM_RATIO = 10n;
const SATS_PER_BLOOM = SATS_PER_BTC / BTC_PER_BLOOM_RATIO; // 10,000,000 sats
```

### Conversion Functions

```typescript
function bloomToSats(bloom: bigint): bigint {
  return bloom * SATS_PER_BLOOM;
}

function satsToBloom(sats: bigint): bigint {
  return sats / SATS_PER_BLOOM; // Floor division
}
```

### Collateralization Requirements

- **Required Reserves**: `requiredSatsForSupply(outstandingBloom) = bloomToSats(outstandingBloom)`
- **Collateralization Ratio**: `lockedSats / requiredSats`
- **Fully Reserved**: `lockedSats >= requiredSats`

### Mint Guard

The mint guard prevents over-minting by enforcing:

```typescript
async function assertCanMint(amount: bigint, feeds: {reserve: ReserveFeed; supply: SupplyFeed}) {
  const [lockedSats, outstandingBloom] = await Promise.all([
    feeds.reserve.getLockedBtcSats(),
    feeds.supply.getBloomOutstanding()
  ]);
  
  const newSupply = outstandingBloom + amount;
  const requiredSats = bloomToSats(newSupply);
  
  if (lockedSats < requiredSats) {
    throw new Error("Mint denied: collateral shortfall");
  }
}
```

### Redemption Process

1. **Quote**: Calculate exact sats at peg: `quoteRedeemBloomToSats(bloom)`
2. **HTLC**: Create Bitcoin HTLC for the quoted amount
3. **Burn**: Burn BLOOM tokens from supply ledger
4. **Release**: Release BTC from HTLC to user

The peg ensures that each BLOOM token is fully redeemable for BTC at the fixed rate, backed by locked Bitcoin reserves.

