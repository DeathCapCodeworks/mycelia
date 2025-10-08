# Mycelia Mainnet Launch Report (v1.0.0)

*Release Date: [DATE]*  
*Build SHA: [SHA]*  
*PoR Freshness: ≤30 minutes*

## Overview

Mycelia v1.0.0 represents the first General Availability (GA) release of the decentralized data infrastructure platform. This release establishes the core foundation for Web4 applications with secure data sovereignty, Bitcoin-backed peg stability, and comprehensive governance mechanisms.

## What's Live vs Preview

| Feature | Status | Description |
|---------|--------|-------------|
| **Core Infrastructure** | ✅ Live | EVM provider, databox v0, NFT envelopes |
| **Media Pipeline** | ✅ Live | AV1 decode/encode/SVC, WebRTC enhanced |
| **Presence System** | ✅ Live | v0 implementation (opt-in for users) |
| **Observability** | ✅ Live | System monitoring and status surfaces |
| **Bitcoin Redemption** | 🔒 Governance | Requires community vote (P-0001) |
| **Staking Slashing** | 🔒 Governance | Requires community vote |
| **EVM Account Abstraction** | 🧪 Experimental | ERC-4337 support (pilot) |
| **WebGPU Super-Resolution** | 🧪 Experimental | Pilot-only feature |

## Peg Invariant

**10 BLOOM = 1 BTC**

The BLOOM token maintains a strict 1:10 peg ratio with Bitcoin, enforced through:
- Proof of Reserves (PoR) attestations updated every 30 minutes
- Governance-controlled redemption mechanisms
- Transparent reserve verification

## PoR Summary

- **Freshness**: ≤30 minutes from launch
- **Total Reserves**: [SATS_TOTAL] satoshis
- **Signer**: [SIGNER]
- **Verification**: Available in governance pack

## Flags at Launch

See [flags-v1.0.0.md](./flags-v1.0.0.md) for complete feature flag status.

### Core Features (Enabled)
- `evm_provider`: EVM-compatible provider
- `databox_v0`: Personal data vault
- `nft_envelopes`: NFT-based data envelopes
- `presence_v0`: Presence system (opt-in)
- `engine_av1_*`: AV1 video processing
- `observability`: System monitoring

### Governance-Gated (Disabled)
- `btc_mainnet_redemption`: Bitcoin redemption
- `staking_slashing`: Staking mechanisms
- `public_directory`: Public directory service

## Performance SLOs

| Metric | Target | Status |
|--------|--------|--------|
| **Diagnostics Pass Rate** | ≥95% | ✅ |
| **Build Success Rate** | 100% | ✅ |
| **PoR Freshness** | ≤30m | ✅ |
| **Documentation Build** | Success | ✅ |

## Known Limits

1. **Experimental Packages**: Some packages remain in experimental state and are excluded from GA build
2. **Governance Features**: Bitcoin redemption and staking require community approval
3. **Pilot Features**: WebGPU SR and EVM AA are pilot-only
4. **Network Effects**: Full utility requires ecosystem adoption

## Next Governance Items

### P-0001: Enable Bitcoin Redemption
- **Status**: Pending community vote
- **Risk**: High (affects peg stability)
- **Rollback**: Immediate flag disable
- **Dry-run**: Testnet validation required

### P-0003: EVM Account Abstraction GA
- **Status**: Draft
- **Risk**: Medium (new functionality)
- **Rollback**: Feature flag disable
- **Dry-run**: Pilot program completion

## Security & Peg

The BLOOM token maintains its **10 BLOOM = 1 BTC** peg through:

1. **Reserve Verification**: Continuous PoR attestations
2. **Governance Control**: Community-controlled redemption
3. **Transparency**: Public reserve verification
4. **Audit Trail**: Immutable governance decisions

Redemption mechanisms remain **governance-gated** to ensure community oversight of peg stability.

## Verification

Governance pack verification:
```bash
# Verify checksums
sha256sum release/governance/v1.0.0/*

# Verify PoR freshness
node scripts/por-validate.js 30

# Verify flags lock
diff release/flags-v1.0.0.json release/cfg/flags.lock.json
```

---

*This report is part of the v1.0.0 governance pack. All artifacts are signed and verifiable.*
