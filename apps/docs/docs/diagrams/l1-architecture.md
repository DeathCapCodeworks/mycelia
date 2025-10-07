---
title: L1 Architecture
---

```mermaid
flowchart LR
  U[Users] --> G[Gateway Nodes]
  G --> C[Consensus Layer]
  C --> M[Mempool]
  M --> S[State Machine]
  S --> A[App Modules]
  A --> IBC[Interchain IBC or Parachain]
  S --> BTC[(Bitcoin Anchoring)]
```

