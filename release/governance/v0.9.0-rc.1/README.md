# Mycelia Governance Release Pack - v0.9.0-rc.1

This directory contains the governance artifacts for Mycelia release v0.9.0-rc.1.

## Contents

- **images.json**: 59aba3643fef...
- **health.json**: 05be06a781e9...
- **checksums.txt**: SHA256 checksums for all files

## Verification

To verify the integrity of these files:

```bash
# Verify checksums
sha256sum -c checksums.txt

# Verify PoR attestation (if available)
# This would require the appropriate verification tools

# Verify feature flags
cat flags.json | jq '.totalFlags'

# Verify health status
cat health.json | jq '.diagnostics.passRate'
```

## Release Information

- **Version**: v0.9.0-rc.1
- **Git SHA**: a9e64700eb83a90a070db6019ab48feab1941234
- **Generated**: 2025-10-08T01:12:05.094Z
- **Total Artifacts**: 2

## Governance Notes

This release pack contains:

1. **Proof of Reserves**: Latest attestation and signature
2. **Feature Flags**: Snapshot of all feature flags at release time
3. **Health Status**: System diagnostics, SLO status, and performance metrics
4. **Container Images**: Digests of all built container images
5. **IPFS Manifest**: Content identifiers for published documentation and demos

All artifacts are cryptographically verified and can be independently validated.
