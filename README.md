# Mycelia - Decentralized BLOOM Token Ecosystem

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6+-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20%20LTS-green.svg)](https://nodejs.org/)
[![pnpm](https://img.shields.io/badge/pnpm-8+-orange.svg)](https://pnpm.io/)

**Mycelia** is a decentralized ecosystem featuring a Layer 1 blockchain, BLOOM token, and Web4 browser. The BLOOM token is hard-pegged to Bitcoin at a fixed ratio of **10 BLOOM = 1 BTC**, with each BLOOM fully redeemable for BTC at the fixed rate.

## 🌟 Key Features

### 🔗 **Hard Protocol-Level Peg**
- **Canonical Peg**: 10 BLOOM = 1 BTC
- **Full Collateralization**: Each BLOOM backed by locked Bitcoin reserves
- **Programmatic Enforcement**: Peg enforced across minting, redemption, and accounting
- **Exact Math**: All calculations use `bigint` for precision

### ⛓️ **Cross-Chain Compatibility**
- **EVM Support**: Ethereum, Polygon, Arbitrum, and other EVM chains
- **Solana Support**: Native Solana program integration
- **Unified SDK**: Single interface for multi-chain development
- **Seamless Bridge**: Cross-chain BLOOM token transfers

### ⛏️ **IPFS Mining Rewards**
- **Proof of Contribution**: IPFS-based mining with contribution scoring
- **Storage Rewards**: 1 BLOOM per GB stored
- **Bandwidth Rewards**: 0.1 BLOOM per GB served
- **Content Rewards**: 0.01 BLOOM per content piece
- **Tier Multipliers**: 1.0x, 1.1x, 1.25x based on contribution score

### 💼 **Wallet Integration**
- **MetaMask**: Full EVM wallet integration
- **Phantom**: Complete Solana wallet support
- **Multi-Wallet**: Coinbase, Solflare, Backpack support
- **Cross-Chain**: Unified wallet management across chains

### 🔒 **Security & Trust**
- **Non-Custodial**: All operations are non-custodial
- **Private Key Security**: Private keys never leave the wallet
- **Transaction Signing**: All transactions signed by user's wallet
- **Permission Management**: Granular permission handling

## 🚀 Quick Start

### Prerequisites

- **Node.js** 20 LTS or higher
- **TypeScript** 5.6+ for type safety
- **pnpm** for package management
- Basic knowledge of blockchain development

### Installation

```bash
# Clone the repository
git clone https://github.com/mycelia/mycelia.git
cd mycelia

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test
```

### Basic Usage

```typescript
import { MyceliaSDK } from '@mycelia/developer-sdk';
import { bloomToSats, satsToBloom } from '@mycelia/tokenomics';

// Initialize the SDK
const sdk = new MyceliaSDK({
  evm: {
    rpcUrl: 'https://mainnet.infura.io/v3/YOUR_PROJECT_ID',
    bloomTokenAddress: '0xBloomToken1234567890123456789012345678901234',
    gasOracleAddress: '0x0000000000000000000000000000000000000000'
  },
  solana: {
    rpcUrl: 'https://api.mainnet-beta.solana.com',
    bloomTokenMint: 'BloomToken1111111111111111111111111111111111111',
    rentOracleProgram: '11111111111111111111111111111112'
  }
});

// Create wallets
const evmWallet = sdk.createEVMWallet('your-private-key');
const solanaWallet = sdk.createSolanaWallet('your-private-key');

// Get BLOOM balance
const balance = await evmWallet.getBloomBalance();
console.log(`BLOOM Balance: ${balance}`);

// Convert to BTC equivalent
const sats = bloomToSats(balance);
const btc = Number(sats) / 100_000_000;
console.log(`BTC Equivalent: ${btc} BTC`);
```

## 📦 Packages

### Core Packages

| Package | Description | Version |
|---------|-------------|---------|
| [`@mycelia/developer-sdk`](./packages/developer-sdk) | Unified SDK for cross-chain development | `1.0.0` |
| [`@mycelia/tokenomics`](./packages/tokenomics) | BLOOM token peg and tokenomics | `1.0.0` |
| [`@mycelia/shared-kernel`](./packages/shared-kernel) | Core utilities and shared functionality | `1.0.0` |

### Compatibility Layers

| Package | Description | Version |
|---------|-------------|---------|
| [`@mycelia/evm-compat`](./packages/evm-compat) | EVM compatibility layer | `1.0.0` |
| [`@mycelia/solana-compat`](./packages/solana-compat) | Solana compatibility layer | `1.0.0` |

### Infrastructure

| Package | Description | Version |
|---------|-------------|---------|
| [`@mycelia/bridge-infrastructure`](./packages/bridge-infrastructure) | Cross-chain bridge system | `1.0.0` |
| [`@mycelia/mining-app`](./packages/mining-app) | IPFS mining application | `1.0.0` |
| [`@mycelia/bloom-contracts`](./packages/bloom-contracts) | Smart contracts and programs | `1.0.0` |
| [`@mycelia/wallet-integration`](./packages/wallet-integration) | Wallet integration system | `1.0.0` |

### Supporting Packages

| Package | Description | Version |
|---------|-------------|---------|
| [`@mycelia/proof-of-reserve`](./packages/proof-of-reserve) | Proof of reserves system | `1.0.0` |
| [`@mycelia/redemption`](./packages/redemption) | BLOOM redemption system | `1.0.0` |
| [`@mycelia/bloom-rewards`](./packages/bloom-rewards) | Rewards engine | `1.0.0` |
| [`@mycelia/ui-components`](./packages/ui-components) | React UI components | `1.0.0` |

## 🏗️ Architecture

### System Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   EVM Chains    │    │  Mycelia Core   │    │  Solana Chain   │
│                 │    │                 │    │                 │
│ • Ethereum      │───▶│ • BLOOM Token    │───▶│ • Solana        │
│ • Polygon       │    │ • Peg System     │    │ • SPL Tokens    │
│ • Arbitrum      │    │ • Mining Rewards │    │ • Programs      │
│ • Other EVM     │    │ • Cross-Chain    │    │ • Accounts      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   EVM Wallets   │    │  Bridge System   │    │ Solana Wallets  │
│                 │    │                  │    │                 │
│ • MetaMask      │    │ • Lock & Mint    │    │ • Phantom       │
│ • Coinbase      │    │ • Burn & Unlock  │    │ • Solflare      │
│ • WalletConnect │    │ • Merkle Proofs   │    │ • Backpack      │
│ • Detection     │    │ • Relayer        │    │ • Detection     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### BLOOM Token Peg

The BLOOM token maintains a hard peg to Bitcoin:

```typescript
// Peg constants
const SATS_PER_BTC = 100_000_000n;
const BTC_PER_BLOOM_RATIO = 10n;
const SATS_PER_BLOOM = SATS_PER_BTC / BTC_PER_BLOOM_RATIO; // 10,000,000 sats

// Conversion functions
function bloomToSats(bloom: bigint): bigint {
  return bloom * SATS_PER_BLOOM;
}

function satsToBloom(sats: bigint): bigint {
  return sats / SATS_PER_BLOOM; // Floor division
}
```

### Cross-Chain Bridge

The bridge system enables seamless BLOOM token transfers between chains:

```typescript
import { CrossChainBridge, BridgeChain } from '@mycelia/bridge-infrastructure';

const bridge = new CrossChainBridge(bridgeConfig);

// EVM to Solana transfer
const transaction = await bridge.crossChainTransfer(
  BridgeChain.EVM,
  BridgeChain.SOLANA,
  fromAddress,
  toAddress,
  amount,
  privateKey
);
```

### Mining System

The IPFS-based mining system rewards contributors:

```typescript
import { MiningApplication } from '@mycelia/mining-app';

const miningApp = new MiningApplication(ipfsConfig, supplyLedger, mintingFeeds);

// Start mining session
const session = await miningApp.startMiningSession('miner1');

// Process contribution
const result = await miningApp.processContribution(session.id, {
  content: 'Hello, Mycelia!',
  storageUsed: 1024 * 1024, // 1MB
  bandwidthUsed: 10 * 1024 * 1024 // 10MB
});
```

## 🛠️ Development

### Project Structure

```
mycelia/
├── apps/                    # Applications
│   ├── docs/               # Documentation site
│   └── navigator-sandbox/  # Development sandbox
├── packages/               # Core packages
│   ├── developer-sdk/       # Main SDK
│   ├── tokenomics/         # Tokenomics and peg
│   ├── evm-compat/         # EVM compatibility
│   ├── solana-compat/      # Solana compatibility
│   ├── bridge-infrastructure/ # Cross-chain bridge
│   ├── mining-app/         # Mining application
│   ├── bloom-contracts/    # Smart contracts
│   ├── wallet-integration/ # Wallet integration
│   └── ...                 # Other packages
├── docs/                   # Documentation
├── package.json            # Root package.json
├── pnpm-workspace.yaml     # Workspace configuration
└── README.md               # This file
```

### Development Commands

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Lint code
pnpm lint

# Format code
pnpm format

# Start development server
pnpm dev

# Build documentation
pnpm docs:build

# Start documentation server
pnpm docs:dev
```

### Testing

```bash
# Run all tests
pnpm test

# Run tests for specific package
pnpm test --filter @mycelia/tokenomics

# Run tests with coverage
pnpm test:coverage

# Run integration tests
pnpm test:integration
```

### Building

```bash
# Build all packages
pnpm build

# Build specific package
pnpm build --filter @mycelia/developer-sdk

# Build in production mode
pnpm build:prod
```

## 📚 Documentation

### Getting Started

- [**Developer Guide**](./docs/developer-guide.md) - Comprehensive development guide
- [**API Reference**](./docs/api-reference.md) - Complete API documentation
- [**Tutorials**](./docs/tutorials.md) - Step-by-step tutorials

### Architecture

- [**Executive One Pager**](./apps/docs/docs/executive/executive-one-pager.md) - Project overview
- [**Tokenomics Appendix**](./docs/appendices/appendix-tokenomics.md) - Tokenomics specification
- [**Peg Flow Diagram**](./docs/diagrams/peg-flow.md) - BLOOM minting/redemption flow
- [**Proof of Reserves**](./docs/diagrams/proof-of-reserves.md) - Reserve verification system

### Examples

- [**Basic Usage**](./packages/developer-sdk/examples/basic-usage.ts) - Basic SDK usage
- [**Bridge Examples**](./packages/bridge-infrastructure/examples/bridge-examples.ts) - Bridge usage
- [**Wallet Examples**](./packages/wallet-integration/examples/wallet-examples.tsx) - Wallet integration

## 🔧 Configuration

### Environment Variables

Create a `.env` file in your project root:

```bash
# EVM Configuration
EVM_RPC_URL=https://mainnet.infura.io/v3/YOUR_PROJECT_ID
BLOOM_TOKEN_ADDRESS=0xBloomToken1234567890123456789012345678901234
GAS_ORACLE_ADDRESS=0x0000000000000000000000000000000000000000

# Solana Configuration
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
BLOOM_TOKEN_MINT=BloomToken1111111111111111111111111111111111111
RENT_ORACLE_PROGRAM=11111111111111111111111111111112

# Bridge Configuration
BRIDGE_CONTRACT=0xBloomBridge1234567890123456789012345678901234
BRIDGE_PROGRAM=BloomBridge1111111111111111111111111111111111111
RELAYER_URL=https://relayer.mycelia.com
RELAYER_API_KEY=your-api-key

# Reserve Configuration
RESERVE_SATS=100000000000
```

### SDK Configuration

```typescript
const sdkConfig = {
  evm: {
    rpcUrl: process.env.EVM_RPC_URL,
    bloomTokenAddress: process.env.BLOOM_TOKEN_ADDRESS,
    gasOracleAddress: process.env.GAS_ORACLE_ADDRESS
  },
  solana: {
    rpcUrl: process.env.SOLANA_RPC_URL,
    bloomTokenMint: process.env.BLOOM_TOKEN_MINT,
    rentOracleProgram: process.env.RENT_ORACLE_PROGRAM
  }
};
```

## 🤝 Contributing

We welcome contributions to Mycelia! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

### Development Setup

1. Fork the repository
2. Clone your fork
3. Install dependencies: `pnpm install`
4. Create a feature branch
5. Make your changes
6. Run tests: `pnpm test`
7. Submit a pull request

### Code Style

- Use TypeScript with strict mode
- Follow ESLint configuration
- Use Prettier for formatting
- Write comprehensive tests
- Document your code

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## 🆘 Support

- **Documentation**: [docs.mycelia.com](https://docs.mycelia.com)
- **GitHub Issues**: [github.com/mycelia/mycelia/issues](https://github.com/mycelia/mycelia/issues)
- **Discord**: [discord.gg/mycelia](https://discord.gg/mycelia)
- **Email**: support@mycelia.com

## 🗺️ Roadmap

### Phase 1: Core Infrastructure ✅
- [x] BLOOM token peg implementation
- [x] EVM and Solana compatibility
- [x] Cross-chain bridge infrastructure
- [x] IPFS mining application
- [x] Wallet integration
- [x] Developer SDK

### Phase 2: Production Deployment 🚧
- [ ] Mainnet deployment
- [ ] Security audits
- [ ] Performance optimization
- [ ] Monitoring and analytics
- [ ] Documentation completion

### Phase 3: Ecosystem Expansion 📋
- [ ] Additional EVM chains
- [ ] Mobile wallet support
- [ ] Advanced mining features
- [ ] Governance system
- [ ] Developer tools

### Phase 4: Web4 Integration 📋
- [ ] Web4 browser integration
- [ ] Decentralized identity
- [ ] Social graph features
- [ ] Content management
- [ ] User experience optimization

## 🙏 Acknowledgments

- **Bitcoin** for the foundational blockchain technology
- **Ethereum** for smart contract innovation
- **Solana** for high-performance blockchain
- **IPFS** for decentralized storage
- **Open Source Community** for inspiration and collaboration

---

**Mycelia** - Building the decentralized future, one BLOOM at a time. 🌱