---
id: proof-of-reserves
title: Proof of Reserves Diagram
---

# Proof of Reserves Diagram

This diagram shows how locked BTC reserves are verified and used for peg enforcement.

```mermaid
flowchart TB
  BTC[(Bitcoin UTXOs)] --> SPV[SPV Feed]
  SPV --> OR[Reserve Oracle]
  CFG[Static Config] --> OR
  OR --> L[Locked BTC Sats]
  L --> MG[Mint Guard]
  MG --> MINT[Mint BLOOM]
  MG --> REJECT[Reject Mint]
```text
