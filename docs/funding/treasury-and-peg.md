# Treasury & Peg Invariants

This document establishes the fundamental economic invariants that govern the Mycelia ecosystem and ensure the stability of the BLOOM token.

## Peg Invariant

**10 BLOOM = 1 BTC**

This is a hard invariant enforced on-chain and in the mint guard. The peg is maintained through:

- **Proof of Reserves**: Continuous attestation of Bitcoin reserves backing BLOOM tokens
- **Mint Guard**: Prevents over-minting beyond reserve capacity
- **Redemption Mechanism**: Allows conversion of BLOOM back to Bitcoin (governance-gated)
- **Transparent Verification**: Public reserve verification and audit trails

## Proof-of-Reserves Cadence

- **Freshness Target**: ≤30 minutes
- **Attestation Frequency**: Continuous monitoring with automated attestations
- **Verification**: Cryptographic signatures ensure authenticity
- **Public Access**: Reserve data available for public verification

## Governance Posture

### Bitcoin Mainnet Redemption

- **Status**: OFF by default
- **Governance**: Requires community approval via P-0001 proposal
- **Risk Level**: High (affects peg stability)
- **Current State**: Testnet validation complete, mainnet activation pending vote

### Staking Mechanisms

- **Status**: Governance-gated
- **Slashing**: Disabled until community approval
- **Risk Management**: Gradual rollout with monitoring

## Economic Security

The peg stability is maintained through multiple layers of security:

1. **Reserve Verification**: Continuous PoR attestations
2. **Governance Control**: Community-controlled redemption activation
3. **Transparency**: Public reserve verification
4. **Audit Trail**: Immutable governance decisions

## Related Documentation

- [Launch Report v1.0.0](../launch/report-v1.0.0.md)
- [Status Overview](../status/overview.md)
- [Governance Proposals](../governance/proposals/)

---

*This document is part of the v1.0.0 governance pack. All economic invariants are enforced on-chain and verified through continuous monitoring.*
