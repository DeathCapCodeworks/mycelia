# Changelog

## [v0.9.0-rc.1] - 2025-10-08

### Highlights

- **Diagnostics Gates**: Comprehensive system health checks and SLO monitoring
- **Feature Flags Registry**: Unified registry with CLI for flag management
- **Ethereum Rails**: Complete EVM integration with Account Abstraction and Paymaster
- **Docker/IPFS**: Clean deployment configuration and IPFS publishing
- **Demo Recorder**: Golden Path demonstration with watermarking
- **PoR Freshness**: Proof-of-Reserves attestation freshness guards

### Features

- **demo**: Golden Path Demo Recorder with Playwright capture, ffmpeg stitching, captions, optional OS TTS; CI artifact (6f0d640)
- **perf+rollout**: AV1 SLO gates, compat matrix with auto-fallback, progressive rollout controls, and pilot kits (e761094)
- **testnet**: Bitcoin testnet redemption, SPV PoR prototype, observability, and staking slice (3b69b08)
- **diagnostics**: add @mycelia/diagnostics one-shot health CLI with peg, PoR, mint-guard, redemption, mining, capabilities, workspaces, and docs checks (c91e53d)

### Chore

- **repo**: normalize tooling, restore missing Web4 stubs, wire diagnostics/SLO, expand flags, PoR freshness, Docker/IPFS, ETH docs (a9e6470)
- scaffold docs, config, components, diagrams, search, print css (dd1aa1e)
- Initial commit (fafa722)


