---
id: peg-flow
title: Peg Flow Diagram
---

# Peg Flow Diagram

This diagram shows the mint and redemption flow with peg enforcement.

```mermaid
flowchart LR
  A[User mines BLOOM] --> B{Mint guard}
  B -- reserves sufficient --> C[Mint BLOOM]
  B -- shortfall --> X[Reject mint]
  C --> D[Outstanding Supply+]
  E[User Redeems BLOOM] --> F[Quote sats at peg]
  F --> G[HTLC on Bitcoin]
  G --> H[Burn BLOOM]
  H --> D[Outstanding Supply-]
```text
