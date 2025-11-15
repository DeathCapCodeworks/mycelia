---
title: Developer Guide
---

# Mycelia Developer Documentation

Welcome to the Mycelia Developer Documentation! This comprehensive guide will help you integrate with the Mycelia ecosystem, including BLOOM token operations, cross-chain functionality, mining rewards, and wallet integration.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Core Concepts](#core-concepts)
3. [BLOOM Token Integration](#bloom-token-integration)
4. [Cross-Chain Development](#cross-chain-development)
5. [Mining Application](#mining-application)
6. [Wallet Integration](#wallet-integration)
7. [Smart Contracts](#smart-contracts)
8. [API Reference](#api-reference)
9. [Examples & Tutorials](#examples--tutorials)
10. [Best Practices](#best-practices)
11. [Troubleshooting](#troubleshooting)

## Getting Started

### Prerequisites

Before you begin developing with Mycelia, ensure you have:

- **Node.js** 20 LTS or higher
- **TypeScript** 5.6+ for type safety
- **pnpm** for package management
- Basic knowledge of blockchain development
- Familiarity with React (for UI components)

### Installation

Install the Mycelia SDK and related packages:

```bash
# Core SDK
pnpm add @mycelia/developer-sdk

# Tokenomics and peg functionality
pnpm add @mycelia/tokenomics @mycelia/proof-of-reserve

# Cross-chain compatibility
pnpm add @mycelia/evm-compat @mycelia/solana-compat

# Bridge infrastructure
pnpm add @mycelia/bridge-infrastructure

# Wallet integration
pnpm add @mycelia/wallet-integration

# Mining application
pnpm add @mycelia/mining-app

# Smart contracts
pnpm add @mycelia/bloom-contracts
```text

### Quick Start

Here's a simple example to get you started:

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
```text

## Core Concepts

### BLOOM Token Peg

The BLOOM token is hard-pegged to Bitcoin at a fixed ratio:

**Canonical Peg: 10 BLOOM = 1 BTC**

This peg is enforced programmatically across all operations:

```typescript
import { bloomToSats, satsToBloom, assertPeg } from '@mycelia/tokenomics';

// Convert BLOOM to satoshis
const bloomAmount = 1000000000000000000n; // 1 BLOOM
const sats = bloomToSats(bloomAmount); // 10,000,000 sats

// Convert satoshis to BLOOM (floor division)
const satsAmount = 10000000n; // 10,000,000 sats
const bloom = satsToBloom(satsAmount); // 1 BLOOM

// Get peg statement
const pegStatement = assertPeg(); // "Peg: 10 BLOOM = 1 BTC"
```text

### Cross-Chain Architecture

Mycelia supports both EVM and Solana chains:

- **EVM Chains**: Ethereum, Polygon, Arbitrum, etc.
- **Solana**: Mainnet and devnet
- **Cross-Chain Bridge**: Seamless token transfers between chains

### Mining Rewards

The Mycelia ecosystem uses IPFS-based mining with contribution scoring:

- **Storage Rewards**: 1 BLOOM per GB stored
- **Bandwidth Rewards**: 0.1 BLOOM per GB served
- **Content Rewards**: 0.01 BLOOM per content piece
- **Tier Multipliers**: 1.0x, 1.1x, 1.25x based on contribution score

## BLOOM Token Integration

### Basic Token Operations

```typescript
import { MyceliaSDK } from '@mycelia/developer-sdk';

const sdk = new MyceliaSDK(config);
const wallet = sdk.createEVMWallet(privateKey);

// Get BLOOM balance
const balance = await wallet.getBloomBalance();
console.log(`Balance: ${balance} BLOOM`);

// Get BTC equivalent
const btcEquivalent = await wallet.getBloomBalanceInBtc();
console.log(`BTC Equivalent: ${btcEquivalent} BTC`);

// Send BLOOM tokens
const txHash = await wallet.sendBloom(recipientAddress, amount);
console.log(`Transaction: ${txHash}`);
```text

### Peg Enforcement

All minting operations enforce the peg:

```typescript
import { assertCanMint, canMint } from '@mycelia/tokenomics';

// Check if minting is allowed
const canMintTokens = await canMint(amount, {
  reserve: reserveFeed,
  supply: supplyFeed
});

if (canMintTokens) {
  // Proceed with minting
  await assertCanMint(amount, { reserve: reserveFeed, supply: supplyFeed });
} else {
  throw new Error('Minting would break peg');
}
```text

### Supply Management

Track BLOOM token supply:

```typescript
import { SupplyLedger } from '@mycelia/shared-kernel';

const supplyLedger = new SupplyLedger();

// Record minting
supplyLedger.recordMint(1000000000000000000n); // 1 BLOOM

// Record burning
supplyLedger.recordBurn(500000000000000000n); // 0.5 BLOOM

// Get current supply
const currentSupply = supplyLedger.currentSupply();
console.log(`Current Supply: ${currentSupply} BLOOM`);
```text

## Cross-Chain Development

### Bridge Integration

Transfer BLOOM tokens between chains:

```typescript
import { CrossChainBridge, BridgeFactory, BridgeChain } from '@mycelia/bridge-infrastructure';

const bridge = BridgeFactory.createBridge(bridgeConfig);

// EVM to Solana transfer
const transaction = await bridge.crossChainTransfer(
  BridgeChain.EVM,
  BridgeChain.SOLANA,
  fromAddress,
  toAddress,
  amount,
  privateKey
);

console.log(`Bridge Transaction: ${transaction.id}`);
```text

### Bridge Monitoring

Monitor bridge transactions:

```typescript
// Subscribe to transaction updates
bridge.subscribeToTransaction(transactionId, (updatedTransaction) => {
  console.log(`Transaction ${updatedTransaction.id} updated:`, {
    status: updatedTransaction.status,
    timestamp: new Date(updatedTransaction.createdAt).toISOString()
  });
});

// Get bridge statistics
const stats = bridge.getBridgeStatistics();
console.log('Bridge Stats:', {
  totalTransactions: stats.totalTransactions,
  totalVolume: stats.totalVolume.toString(),
  completedTransactions: stats.completedTransactions
});
```text

### Fee Estimation

Estimate bridge fees:

```typescript
const fees = await bridge.estimateBridgeFees(
  BridgeChain.EVM,
  BridgeChain.SOLANA,
  amount
);

console.log('Bridge Fees:', {
  gasFee: fees.gasFee.toString(),
  bridgeFee: fees.bridgeFee.toString(),
  totalFee: fees.totalFee.toString(),
  estimatedTime: `${fees.estimatedTime}s`
});
```text

## Mining Application

### IPFS Node Management

Set up IPFS mining:

```typescript
import { MiningApplication, DEFAULT_IPFS_CONFIGS } from '@mycelia/mining-app';

const miningApp = new MiningApplication(
  DEFAULT_IPFS_CONFIGS.LOCAL,
  supplyLedger,
  mintingFeeds
);

await miningApp.initialize();

// Start mining session
const session = await miningApp.startMiningSession('miner1', {
  storageUsed: 1024 * 1024 * 1024, // 1GB
  bandwidthUsed: 100 * 1024 * 1024 // 100MB
});
```text

### Contribution Processing

Process mining contributions:

```typescript
// Process content contribution
const result = await miningApp.processContribution(session.id, {
  content: 'Hello, Mycelia!',
  storageUsed: 1024 * 1024, // 1MB
  bandwidthUsed: 10 * 1024 * 1024 // 10MB
});

console.log('Contribution processed:', {
  cid: result.cid,
  rewards: result.rewards.toString()
});
```text

### Mining Statistics

Get mining statistics:

```typescript
const status = miningApp.getMiningStatus();
console.log('Mining Status:', {
  isMining: status.isMining,
  activeSessions: status.activeSessions,
  totalRewardsEarned: status.totalRewardsEarned.toString(),
  totalStorageUsed: status.totalStorageUsed,
  totalBandwidthUsed: status.totalBandwidthUsed
});
```text

### Redemption

Redeem mining rewards:

```typescript
// Request redemption
const intent = await miningApp.requestRedemption(session.id, 'bc1test123');
console.log('Redemption Intent:', {
  id: intent.id,
  bloomAmount: intent.bloomAmount.toString(),
  btcAddress: intent.btcAddress,
  quotedSats: intent.quotedSats.toString()
});

// Complete redemption
const success = await miningApp.completeRedemption(intent.id);
console.log('Redemption completed:', success);
```text

## Wallet Integration

### EVM Wallet Connection

Connect to EVM wallets:

```typescript
import { EVMWalletManager, WalletType } from '@mycelia/wallet-integration';

const evmManager = new EVMWalletManager();

// Connect to MetaMask
const state = await evmManager.connectMetaMask();
console.log('MetaMask connected:', state.address);

// Connect to Coinbase Wallet
const coinbaseState = await evmManager.connectCoinbase();
console.log('Coinbase connected:', coinbaseState.address);
```text

### Solana Wallet Connection

Connect to Solana wallets:

```typescript
import { SolanaWalletManager } from '@mycelia/wallet-integration';

const solanaManager = new SolanaWalletManager();

// Connect to Phantom
const phantomState = await solanaManager.connectPhantom();
console.log('Phantom connected:', phantomState.publicKey?.toBase58());

// Connect to Solflare
const solflareState = await solanaManager.connectSolflare();
console.log('Solflare connected:', solflareState.publicKey?.toBase58());
```text

### Cross-Chain Wallet Management

Manage multiple wallets:

```typescript
import { CrossChainWalletManager } from '@mycelia/wallet-integration';

const crossChainManager = new CrossChainWalletManager(sdkConfig, bridgeConfig);

// Connect EVM wallet
await crossChainManager.connectEVM(WalletType.METAMASK);

// Connect Solana wallet
await crossChainManager.connectSolana(WalletType.PHANTOM);

// Get total balance across chains
const totalBalance = await crossChainManager.getTotalBloomBalance();
console.log(`Total BLOOM Balance: ${totalBalance}`);

// Get BTC equivalent
const totalBtc = await crossChainManager.getTotalBloomBalanceInBtc();
console.log(`Total BTC Equivalent: ${totalBtc} BTC`);
```text

### React Integration

Use React hooks for wallet management:

```tsx
import React from 'react';
import { useEVMWallet, useSolanaWallet, useCrossChainWallet } from '@mycelia/wallet-integration';

function WalletComponent() {
  const evmWallet = useEVMWallet();
  const solanaWallet = useSolanaWallet();
  const crossChainWallet = useCrossChainWallet();

  const handleConnectMetaMask = async () => {
    try {
      await evmWallet.connectMetaMask();
      console.log('MetaMask connected:', evmWallet.address);
    } catch (error) {
      console.error('Connection failed:', error);
    }
  };

  const handleConnectPhantom = async () => {
    try {
      await solanaWallet.connectPhantom();
      console.log('Phantom connected:', solanaWallet.publicKey?.toBase58());
    } catch (error) {
      console.error('Connection failed:', error);
    }
  };

  return (
    <div>
      <button onClick={handleConnectMetaMask}>
        Connect MetaMask
      </button>
      <button onClick={handleConnectPhantom}>
        Connect Phantom
      </button>
      
      {evmWallet.isConnected && (
        <p>EVM Address: {evmWallet.address}</p>
      )}
      
      {solanaWallet.isConnected && (
        <p>Solana Public Key: {solanaWallet.publicKey?.toBase58()}</p>
      )}
    </div>
  );
}
```text

## Smart Contracts

### EVM Contracts

Deploy and interact with EVM contracts:

```typescript
import { BloomTokenEVM, ContractDeployment } from '@mycelia/bloom-contracts';

// Deploy BLOOM token contract
const { contract, address } = await ContractDeployment.deployBloomTokenEVM(
  signer,
  'BLOOM Token',
  'BLOOM',
  0n // Unlimited supply
);

console.log('BLOOM Token deployed at:', address);

// Interact with contract
const name = await contract.name();
const symbol = await contract.symbol();
const totalSupply = await contract.totalSupply();

console.log('Token Info:', { name, symbol, totalSupply: totalSupply.toString() });
```text

### Solana Programs

Deploy and interact with Solana programs:

```typescript
import { BloomTokenSolana, ContractDeployment } from '@mycelia/bloom-contracts';

// Deploy BLOOM token program
const { program, mintData, mint } = await ContractDeployment.deployBloomTokenSolana(
  provider,
  idl
);

// Initialize mint
const tx = await program.methods
  .initializeBloomMint('BLOOM Token', 'BLOOM', 9)
  .accounts({
    mintData,
    mint,
    mintAuthority: provider.wallet.publicKey,
    // ... other accounts
  })
  .rpc();

console.log('Mint initialized:', tx);
```text

### Contract Integration

Integrate contracts with the SDK:

```typescript
import { MyceliaSDK } from '@mycelia/developer-sdk';

const sdk = new MyceliaSDK(config);
const evmProvider = sdk.getEVMProvider();
const solanaConnection = sdk.getSolanaConnection();

// Get BLOOM balance from contract
const bloomBalance = await evmProvider.getBloomBalance(address);
const btcEquivalent = await evmProvider.getBloomBalanceInBtc(address);

console.log('Contract Balance:', {
  bloom: bloomBalance.toString(),
  btc: btcEquivalent
});
```text

## API Reference

### Core SDK

#### MyceliaSDK

Main SDK class for cross-chain operations.

```typescript
class MyceliaSDK {
  constructor(config: MyceliaSDKConfig);
  createEVMWallet(privateKey: string): IMyceliaWallet;
  createSolanaWallet(privateKey: string): IMyceliaWallet;
  getEVMProvider(): MyceliaEVMProvider;
  getSolanaConnection(): MyceliaSolanaConnection;
}
```text

#### IMyceliaWallet

Unified wallet interface for cross-chain operations.

```typescript
interface IMyceliaWallet {
  getBloomBalance(): Promise<bigint>;
  sendBloom(to: string | PublicKey, amount: bigint): Promise<any>;
  getBloomBalanceInBtc(): Promise<number>;
  getAddress(): string | PublicKey;
}
```text

### Tokenomics

#### Core Functions

```typescript
// Peg constants
const SATS_PER_BTC = 100_000_000n;
const BTC_PER_BLOOM_RATIO = 10n;
const SATS_PER_BLOOM = SATS_PER_BTC / BTC_PER_BLOOM_RATIO;

// Conversion functions
function bloomToSats(bloom: bigint): bigint;
function satsToBloom(sats: bigint): bigint;
function assertPeg(): string;

// Collateralization functions
function requiredSatsForSupply(outstandingBloom: bigint): bigint;
function collateralizationRatio(lockedSats: bigint, outstandingBloom: bigint): number;
function isFullyReserved(lockedSats: bigint, outstandingBloom: bigint): boolean;

// Mint guard functions
function canMint(mintAmountBloom: bigint, feeds: {reserve: ReserveFeed; supply: SupplyFeed}): Promise<boolean>;
function assertCanMint(mintAmountBloom: bigint, feeds: {reserve: ReserveFeed; supply: SupplyFeed}): Promise<void>;

// Redemption functions
function maxRedeemableBloom(lockedSats: bigint, outstandingBloom: bigint): bigint;
function quoteRedeemBloomToSats(bloom: bigint): bigint;
```text

### Bridge Infrastructure

#### CrossChainBridge

Main bridge class for cross-chain operations.

```typescript
class CrossChainBridge {
  constructor(config: BridgeConfig);
  lockAndMint(fromAddress: string, toAddress: string, amount: bigint, privateKey: string): Promise<BridgeTransaction>;
  burnAndUnlock(fromAddress: string, toAddress: string, amount: bigint, privateKey: string): Promise<BridgeTransaction>;
  crossChainTransfer(fromChain: BridgeChain, toChain: BridgeChain, fromAddress: string, toAddress: string, amount: bigint, privateKey: string): Promise<BridgeTransaction>;
  getTransaction(transactionId: string): BridgeTransaction | undefined;
  getAllTransactions(): BridgeTransaction[];
  getTransactionsByStatus(status: BridgeStatus): BridgeTransaction[];
  getTransactionsByChain(chain: BridgeChain): BridgeTransaction[];
  subscribeToTransaction(transactionId: string, callback: (tx: BridgeTransaction) => void): void;
  unsubscribeFromTransaction(transactionId: string): void;
  getBridgeStatistics(): BridgeStatistics;
  estimateBridgeFees(fromChain: BridgeChain, toChain: BridgeChain, amount: bigint): Promise<BridgeFees>;
}
```text

### Mining Application

#### MiningApplication

Main mining application class.

```typescript
class MiningApplication {
  constructor(ipfsConfig: IPFSConfig, supplyLedger: SupplyLedger, mintingFeeds: MintingFeeds);
  initialize(): Promise<void>;
  startMiningSession(minerId: string, requirements?: Partial<ResourceMetrics>): Promise<MiningSession>;
  processContribution(sessionId: string, contribution: ContributionData): Promise<ContributionResult>;
  stopMiningSession(sessionId: string): Promise<MiningSession>;
  getMiningSession(sessionId: string): MiningSession | undefined;
  getAllMiningSessions(): MiningSession[];
  getMiningStatus(): MiningStatus;
  requestRedemption(sessionId: string, btcAddress: string): Promise<RedeemIntent>;
  shutdown(): Promise<void>;
}
```text

### Wallet Integration

#### EVMWalletManager

EVM wallet management class.

```typescript
class EVMWalletManager {
  connectMetaMask(): Promise<WalletState>;
  connectCoinbase(): Promise<WalletState>;
  disconnect(): Promise<void>;
  getState(): WalletState;
  getBloomBalance(): Promise<bigint>;
  getBloomBalanceInBtc(): Promise<number>;
  sendBloom(to: string, amount: bigint): Promise<string>;
  addEventListener(listener: WalletEventListener): void;
  removeEventListener(listener: WalletEventListener): void;
  static isMetaMaskInstalled(): boolean;
  static isCoinbaseInstalled(): boolean;
}
```text

#### SolanaWalletManager

Solana wallet management class.

```typescript
class SolanaWalletManager {
  connectPhantom(): Promise<WalletState>;
  connectSolflare(): Promise<WalletState>;
  connectBackpack(): Promise<WalletState>;
  disconnect(): Promise<void>;
  getState(): WalletState;
  getBloomBalance(): Promise<bigint>;
  getBloomBalanceInBtc(): Promise<number>;
  sendBloom(to: PublicKey, amount: bigint): Promise<string>;
  addEventListener(listener: WalletEventListener): void;
  removeEventListener(listener: WalletEventListener): void;
  static isPhantomInstalled(): boolean;
  static isSolflareInstalled(): boolean;
  static isBackpackInstalled(): boolean;
}
```text

## Examples & Tutorials

### Tutorial 1: Basic BLOOM Token Operations

This tutorial shows how to perform basic BLOOM token operations.

```typescript
import { MyceliaSDK } from '@mycelia/developer-sdk';
import { bloomToSats, satsToBloom } from '@mycelia/tokenomics';

async function basicBloomOperations() {
  // Initialize SDK
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

  // Create wallet
  const wallet = sdk.createEVMWallet('your-private-key');

  // Get balance
  const balance = await wallet.getBloomBalance();
  console.log(`BLOOM Balance: ${balance}`);

  // Convert to BTC
  const sats = bloomToSats(balance);
  const btc = Number(sats) / 100_000_000;
  console.log(`BTC Equivalent: ${btc} BTC`);

  // Send tokens
  const txHash = await wallet.sendBloom('0xRecipientAddress', 1000000000000000000n);
  console.log(`Transaction: ${txHash}`);
}
```text

### Tutorial 2: Cross-Chain Bridge Usage

This tutorial demonstrates cross-chain BLOOM token transfers.

```typescript
import { CrossChainBridge, BridgeFactory, BridgeChain } from '@mycelia/bridge-infrastructure';

async function crossChainBridgeTutorial() {
  // Create bridge
  const bridge = BridgeFactory.createBridge({
    evm: {
      rpcUrl: 'https://mainnet.infura.io/v3/YOUR_PROJECT_ID',
      bridgeContract: '0xBloomBridge1234567890123456789012345678901234',
      bloomTokenAddress: '0xBloomToken1234567890123456789012345678901234',
      mintGuardAddress: '0xMintGuard1234567890123456789012345678901234',
      confirmations: 12
    },
    solana: {
      rpcUrl: 'https://api.mainnet-beta.solana.com',
      bridgeProgram: 'BloomBridge1111111111111111111111111111111111111',
      bloomTokenMint: 'BloomToken1111111111111111111111111111111111111',
      confirmations: 32
    },
    bitcoin: {
      rpcUrl: 'https://bitcoin-mainnet.infura.io/v3/YOUR_PROJECT_ID',
      confirmations: 6
    },
    relayer: {
      url: 'https://relayer.mycelia.com',
      apiKey: 'your-api-key'
    }
  });

  // EVM to Solana transfer
  const transaction = await bridge.crossChainTransfer(
    BridgeChain.EVM,
    BridgeChain.SOLANA,
    '0xSenderAddress',
    'SolanaRecipientAddress',
    1000000000000000000n, // 1 BLOOM
    'sender-private-key'
  );

  console.log('Bridge Transaction:', {
    id: transaction.id,
    type: transaction.type,
    status: transaction.status,
    amount: transaction.amount.toString()
  });

  // Monitor transaction
  bridge.subscribeToTransaction(transaction.id, (updatedTransaction) => {
    console.log(`Transaction ${updatedTransaction.id} updated:`, {
      status: updatedTransaction.status,
      timestamp: new Date(updatedTransaction.createdAt).toISOString()
    });
  });
}
```text

### Tutorial 3: Mining Application Setup

This tutorial shows how to set up and use the mining application.

```typescript
import { MiningApplication, DEFAULT_IPFS_CONFIGS } from '@mycelia/mining-app';
import { SupplyLedger } from '@mycelia/shared-kernel';
import { StaticReserveFeed } from '@mycelia/proof-of-reserve';

async function miningApplicationTutorial() {
  // Set up dependencies
  const supplyLedger = new SupplyLedger();
  const reserveFeed = new StaticReserveFeed(100_000_000n); // 1 BTC
  
  const mintingFeeds = {
    reserve: reserveFeed,
    supply: {
      async getBloomOutstanding() {
        return supplyLedger.currentSupply();
      }
    }
  };

  // Create mining application
  const miningApp = new MiningApplication(
    DEFAULT_IPFS_CONFIGS.LOCAL,
    supplyLedger,
    mintingFeeds
  );

  // Initialize
  await miningApp.initialize();

  // Start mining session
  const session = await miningApp.startMiningSession('miner1', {
    storageUsed: 1024 * 1024 * 1024, // 1GB
    bandwidthUsed: 100 * 1024 * 1024 // 100MB
  });

  console.log('Mining session started:', session.id);

  // Process contributions
  const result = await miningApp.processContribution(session.id, {
    content: 'Hello, Mycelia!',
    storageUsed: 1024 * 1024, // 1MB
    bandwidthUsed: 10 * 1024 * 1024 // 10MB
  });

  console.log('Contribution processed:', {
    cid: result.cid,
    rewards: result.rewards.toString()
  });

  // Get mining status
  const status = miningApp.getMiningStatus();
  console.log('Mining Status:', {
    isMining: status.isMining,
    activeSessions: status.activeSessions,
    totalRewardsEarned: status.totalRewardsEarned.toString()
  });

  // Stop mining session
  await miningApp.stopMiningSession(session.id);
  console.log('Mining session completed');
}
```text

### Tutorial 4: React Wallet Integration

This tutorial demonstrates React wallet integration.

```tsx
import React, { useState, useEffect } from 'react';
import { useEVMWallet, useSolanaWallet, useCrossChainWallet } from '@mycelia/wallet-integration';

function WalletIntegrationTutorial() {
  const evmWallet = useEVMWallet();
  const solanaWallet = useSolanaWallet();
  const crossChainWallet = useCrossChainWallet();

  const [balance, setBalance] = useState<bigint>(0n);
  const [btcEquivalent, setBtcEquivalent] = useState<number>(0);

  useEffect(() => {
    const updateBalance = async () => {
      if (evmWallet.isConnected) {
        const evmBalance = await evmWallet.getBloomBalance();
        const evmBtc = await evmWallet.getBloomBalanceInBtc();
        setBalance(evmBalance);
        setBtcEquivalent(evmBtc);
      }
    };

    updateBalance();
  }, [evmWallet.isConnected, evmWallet.address]);

  const handleConnectMetaMask = async () => {
    try {
      await evmWallet.connectMetaMask();
      console.log('MetaMask connected:', evmWallet.address);
    } catch (error) {
      console.error('Connection failed:', error);
    }
  };

  const handleConnectPhantom = async () => {
    try {
      await solanaWallet.connectPhantom();
      console.log('Phantom connected:', solanaWallet.publicKey?.toBase58());
    } catch (error) {
      console.error('Connection failed:', error);
    }
  };

  return (
    <div>
      <h2>Wallet Integration Tutorial</h2>
      
      <div>
        <h3>EVM Wallets</h3>
        <button onClick={handleConnectMetaMask} disabled={evmWallet.isLoading}>
          {evmWallet.isLoading ? 'Connecting...' : 'Connect MetaMask'}
        </button>
        
        {evmWallet.isConnected && (
          <div>
            <p>Address: {evmWallet.address}</p>
            <p>Balance: {balance.toString()} BLOOM</p>
            <p>BTC Equivalent: {btcEquivalent} BTC</p>
          </div>
        )}
      </div>

      <div>
        <h3>Solana Wallets</h3>
        <button onClick={handleConnectPhantom} disabled={solanaWallet.isLoading}>
          {solanaWallet.isLoading ? 'Connecting...' : 'Connect Phantom'}
        </button>
        
        {solanaWallet.isConnected && (
          <div>
            <p>Public Key: {solanaWallet.publicKey?.toBase58()}</p>
            <p>Balance: {solanaWallet.balance?.toString()} BLOOM</p>
          </div>
        )}
      </div>

      <div>
        <h3>Cross-Chain Status</h3>
        <p>EVM Connected: {crossChainWallet.isEVMConnected ? 'Yes' : 'No'}</p>
        <p>Solana Connected: {crossChainWallet.isSolanaConnected ? 'Yes' : 'No'}</p>
      </div>
    </div>
  );
}

export default WalletIntegrationTutorial;
```text

## Best Practices

### Security

1. **Private Key Management**: Never expose private keys in client-side code
2. **Environment Variables**: Use environment variables for sensitive configuration
3. **Input Validation**: Always validate user inputs before processing
4. **Error Handling**: Implement comprehensive error handling
5. **Rate Limiting**: Implement rate limiting for API calls

### Performance

1. **Caching**: Cache frequently accessed data
2. **Batch Operations**: Use batch operations when possible
3. **Connection Pooling**: Reuse connections when possible
4. **Lazy Loading**: Load data only when needed
5. **Debouncing**: Debounce user input to reduce API calls

### Code Organization

1. **Modular Design**: Use modular design patterns
2. **Type Safety**: Leverage TypeScript for type safety
3. **Error Boundaries**: Implement error boundaries in React
4. **Testing**: Write comprehensive tests
5. **Documentation**: Document your code thoroughly

### Cross-Chain Development

1. **Chain Detection**: Always detect the current chain
2. **Network Switching**: Handle network switching gracefully
3. **Transaction Monitoring**: Monitor transactions across chains
4. **Fallback Mechanisms**: Implement fallback mechanisms
5. **User Experience**: Provide clear feedback to users

## Troubleshooting

### Common Issues

#### Wallet Connection Issues

**Problem**: Wallet fails to connect
**Solution**: 
- Check if wallet is installed
- Verify network configuration
- Check for popup blockers
- Ensure proper permissions

```typescript
// Check wallet installation
if (!EVMWalletManager.isMetaMaskInstalled()) {
  console.log('MetaMask not installed');
  // Redirect to installation page
}

// Handle connection errors
try {
  await evmWallet.connectMetaMask();
} catch (error) {
  if (error.message.includes('User rejected')) {
    console.log('User rejected connection');
  } else if (error.message.includes('Already processing')) {
    console.log('Connection already in progress');
  }
}
```text

#### Bridge Transaction Issues

**Problem**: Bridge transaction fails
**Solution**:
- Check sufficient balance
- Verify network connectivity
- Check transaction status
- Monitor gas fees

```typescript
// Check balance before bridge
const balance = await wallet.getBloomBalance();
if (balance < amount) {
  throw new Error('Insufficient balance');
}

// Monitor transaction status
bridge.subscribeToTransaction(transactionId, (tx) => {
  if (tx.status === BridgeStatus.FAILED) {
    console.error('Transaction failed:', tx.metadata?.error);
  }
});
```text

#### Mining Application Issues

**Problem**: Mining application fails to start
**Solution**:
- Check IPFS node status
- Verify resource allocation
- Check network connectivity
- Monitor system resources

```typescript
// Check IPFS node status
if (!miningApp.ipfsManager.isNodeRunning()) {
  console.log('IPFS node not running');
  await miningApp.ipfsManager.start();
}

// Check resource allocation
const resources = miningApp.resourceEngine.getResourceAllocation(minerId);
if (!resources) {
  console.log('No resources allocated');
  await miningApp.resourceEngine.allocateResources(minerId, requirements);
}
```text

### Error Codes

#### EVM Errors

- `INSUFFICIENT_FUNDS`: Insufficient balance for transaction
- `USER_REJECTED`: User rejected transaction
- `NETWORK_ERROR`: Network connectivity issue
- `CONTRACT_ERROR`: Smart contract error

#### Solana Errors

- `INSUFFICIENT_FUNDS`: Insufficient SOL for transaction
- `USER_REJECTED`: User rejected transaction
- `NETWORK_ERROR`: Network connectivity issue
- `PROGRAM_ERROR`: Program execution error

#### Bridge Errors

- `INSUFFICIENT_BALANCE`: Insufficient BLOOM balance
- `INVALID_PROOF`: Invalid merkle proof
- `TRANSACTION_EXPIRED`: Transaction expired
- `RELAYER_ERROR`: Relayer service error

### Debugging

#### Enable Debug Logging

```typescript
// Enable debug logging
process.env.DEBUG = 'mycelia:*';

// Or specific modules
process.env.DEBUG = 'mycelia:bridge,mycelia:wallet';
```text

#### Transaction Debugging

```typescript
// Debug transaction details
const transaction = await bridge.crossChainTransfer(/* ... */);
console.log('Transaction details:', {
  id: transaction.id,
  type: transaction.type,
  status: transaction.status,
  fromChain: transaction.fromChain,
  toChain: transaction.toChain,
  amount: transaction.amount.toString(),
  txHash: transaction.txHash,
  proof: transaction.proof
});
```text

#### Wallet Debugging

```typescript
// Debug wallet state
const evmState = evmWallet.getState();
console.log('EVM Wallet State:', {
  status: evmState.status,
  address: evmState.address,
  balance: evmState.balance?.toString(),
  error: evmState.error
});
```text

### Support

For additional support:

- **Documentation**: Check the official documentation
- **GitHub Issues**: Report issues on GitHub
- **Community**: Join the Mycelia community
- **Discord**: Get help on Discord
- **Email**: Contact support via email

---

This documentation provides a comprehensive guide to developing with the Mycelia ecosystem. For more specific examples and advanced usage patterns, refer to the individual package documentation and the examples repository.
