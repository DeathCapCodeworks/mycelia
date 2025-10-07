---
title: "Part 1: The Mycelia Blockchain and BLOOM Token"
---

## 1.1 Blockchain Architecture and Development Path

Option A, Framework approach.

Cosmos SDK, focus on IBC, security modules, and Tendermint style consensus. Pros, mature ecosystem, IBC native, quick to market. Cons, opinionated stack and trade offs in execution environment.

Substrate, focus on pallets, runtime flexibility, and consensus with BABE and GRANDPA. Pros, powerful runtime and shared tooling. Cons, complexity and steeper ramp.

Consensus choices, Tendermint for BFT and fast finality, BABE for block production, GRANDPA for finality. Security considerations include key management, fork choice, and replay protection.

Option B, Ground up approach.

Implemented in Rust or C plus plus. Components include networking, mempool, consensus, state machine, runtime, and storage. Risks, longer timeline, higher defect rate, and verification demands. Verification and performance goals require property based testing, fuzzing, and target TPS and latency objectives.

Security checkpoint, Harden key material, protect consensus nodes, and audit interchain logic.

Community, Publish RFCs and open design reviews to build trust.

Reference, see diagram, [Layer 1 Architecture](/diagrams/l1-architecture).

## 1.2 BLOOM Token, Mining and Tokenomics

Proof of Contribution via IPFS storage and bandwidth. Reward streaming model to the wallet.

Bitcoin integration includes periodic block hash anchoring, a trustless wrapped BTC bridge, and cross chain pre authorization for high value transfers using on chain proofs.

See tokenomics details in Appendix, [Tokenomics](/appendices/appendix-tokenomics). Reference diagram, [Mining Flow](/diagrams/mining-flow).

