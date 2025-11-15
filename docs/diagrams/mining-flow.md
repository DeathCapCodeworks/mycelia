---
id: mining-flow
title: Diagram, Mining Flow
---

```mermaid
%% id: mining-flow
flowchart TD
    W[Mycelia Wallet] --> Auth[Authenticate]
    Auth --> Assess[Resource Assessment storage and bandwidth]
    Assess --> IPFS[IPFS Node Service]
    IPFS --> Meter[Contribution Metering]
    Meter --> Rewards[Streaming BLOOM Rewards]
    Rewards --> W
```text

