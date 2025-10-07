---
id: appendix-tokenomics
title: Appendix A, Tokenomics
---

## Appendix A, Tokenomics

### A.1 BLOOM Token Peg Specification

The BLOOM token maintains a hard peg to Bitcoin at a fixed rate of 10 BLOOM = 1 BTC. This peg is enforced programmatically across all system components.

#### Peg Constants

```typescript
const SATS_PER_BTC = 100_000_000n;
const BTC_PER_BLOOM = 10n; // 10 BLOOM = 1 BTC
const SATS_PER_BLOOM = SATS_PER_BTC / BTC_PER_BLOOM; // 10,000,000 sats per BLOOM
```

#### Conversion Functions

```typescript
function bloomToSats(bloom: bigint): bigint {
  return bloom * SATS_PER_BLOOM;
}

function satsToBloom(sats: bigint): bigint {
  return sats / SATS_PER_BLOOM; // Floor division
}
```

#### Collateralization Invariant

The system maintains full collateralization through the following invariant:

```typescript
function isFullyReserved(lockedSats: bigint, outstandingBloom: bigint): boolean {
  return lockedSats >= bloomToSats(outstandingBloom);
}
```

### A.2 Mint Guard

Minting is blocked when it would cause under-collateralization:

```typescript
async function assertCanMint(mintAmountBloom: bigint, feeds: {reserve: ReserveFeed; supply: SupplyFeed}) {
  const [lockedSats, outstandingBloom] = await Promise.all([
    feeds.reserve.getLockedBtcSats(),
    feeds.supply.getBloomOutstanding()
  ]);
  
  const newSupply = outstandingBloom + mintAmountBloom;
  if (!isFullyReserved(lockedSats, newSupply)) {
    throw new Error("Mint denied: collateral shortfall. Peg requires locked BTC sats >= BLOOM * 10 ratio.");
  }
}
```

### A.3 Redemption Flow

BLOOM tokens are redeemed for BTC through HTLC (Hash Time Locked Contracts):

1. User requests redemption of BLOOM amount
2. System quotes exact BTC sats at peg rate
3. HTLC created on Bitcoin network
4. Upon HTLC completion, BLOOM tokens are burned
5. Supply ledger updated to reflect reduced outstanding supply

### A.4 Supply and Emissions

The supply schedule defines initial supply, ongoing emissions, and allocation to validators, delegators, and contributors.

```text
Let S0 be initial supply, E(t) the emissions at time t.
Total Supply S(t) = S0 + ∫ E(t) dt.
```

### A.5 Validator and Delegator Rewards

Rewards split by stake weight and performance.

### A.6 Contribution Multipliers

Contribution score combines storage provided, bandwidth served, and availability. Anti gaming measures include identity binding and randomness in audits.

| Tier | Storage GB | Bandwidth GB | Multiplier |
|---:|---:|---:|---:|
| 1 | 100 | 500 | 1.0 |
| 2 | 500 | 2,500 | 1.1 |
| 3 | 2,000 | 10,000 | 1.25 |

See also mining flow diagram, [Mining Flow](/diagrams/mining-flow).

