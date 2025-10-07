---
title: Mining Flow
---

```mermaid
flowchart TD
  W[Mycelia Wallet] --> Auth[Authenticate]
  Auth --> Assess[Resource Assessment]
  Assess --> IPFS[IPFS Node Service]
  IPFS --> Meter[Contribution Metering]
  Meter --> Rewards[Streaming BLOOM Rewards]
  Rewards --> W
```

