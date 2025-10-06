---
id: appendix-tokenomics
title: Appendix A, Tokenomics
---

## Appendix A, Tokenomics

### A.1 Supply and Emissions

The supply schedule defines initial supply, ongoing emissions, and allocation to validators, delegators, and contributors.

```text
Let S0 be initial supply, E(t) the emissions at time t.
Total Supply S(t) = S0 + ∫ E(t) dt.
```

### A.2 Validator and Delegator Rewards

Rewards split by stake weight and performance.

### A.3 Contribution Multipliers

Contribution score combines storage provided, bandwidth served, and availability. Anti gaming measures include identity binding and randomness in audits.

| Tier | Storage GB | Bandwidth GB | Multiplier |
|---:|---:|---:|---:|
| 1 | 100 | 500 | 1.0 |
| 2 | 500 | 2,500 | 1.1 |
| 3 | 2,000 | 10,000 | 1.25 |

See also mining flow diagram, [Mining Flow](/diagrams/mining-flow).

