---
title: Tutorials
---

# Mycelia Tutorials

This document provides step-by-step tutorials for common Mycelia development tasks.

## Table of Contents

1. [Getting Started](#getting-started)
2. [BLOOM Token Operations](#bloom-token-operations)
3. [Cross-Chain Bridge](#cross-chain-bridge)
4. [Mining Application](#mining-application)
5. [Wallet Integration](#wallet-integration)
6. [React Integration](#react-integration)

## Getting Started

### Prerequisites

- Node.js 20 LTS+
- TypeScript 5.6+
- pnpm package manager
- Basic blockchain knowledge

### Installation

```bash
# Install core packages
pnpm add @mycelia/developer-sdk @mycelia/tokenomics

# Install additional packages as needed
pnpm add @mycelia/evm-compat @mycelia/solana-compat
pnpm add @mycelia/bridge-infrastructure @mycelia/wallet-integration
pnpm add @mycelia/mining-app @mycelia/bloom-contracts
```text

### Basic Setup

```typescript
import { MyceliaSDK } from '@mycelia/developer-sdk';
import { bloomToSats, satsToBloom } from '@mycelia/tokenomics';

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
```text

## BLOOM Token Operations

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

## Cross-Chain Bridge

### Bridge Setup

```typescript
import { CrossChainBridge, BridgeFactory, BridgeChain } from '@mycelia/bridge-infrastructure';

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
```text

### Cross-Chain Transfer

```typescript
// EVM to Solana transfer
const transaction = await bridge.crossChainTransfer(
  BridgeChain.EVM,
  BridgeChain.SOLANA,
  fromAddress,
  toAddress,
  amount,
  privateKey
);

console.log('Bridge Transaction:', {
  id: transaction.id,
  type: transaction.type,
  status: transaction.status,
  amount: transaction.amount.toString()
});
```text

### Transaction Monitoring

```typescript
// Subscribe to transaction updates
bridge.subscribeToTransaction(transaction.id, (updatedTransaction) => {
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

### Setup

```typescript
import { MiningApplication, DEFAULT_IPFS_CONFIGS } from '@mycelia/mining-app';
import { SupplyLedger } from '@mycelia/shared-kernel';
import { StaticReserveFeed } from '@mycelia/proof-of-reserve';

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

await miningApp.initialize();
```text

### Mining Session

```typescript
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
```text

### Mining Status

```typescript
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
```text

### Redemption

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

### EVM Wallet

```typescript
import { EVMWalletManager, WalletType } from '@mycelia/wallet-integration';

const evmManager = new EVMWalletManager();

// Connect to MetaMask
const state = await evmManager.connectMetaMask();
console.log('MetaMask connected:', state.address);

// Get BLOOM balance
const balance = await evmManager.getBloomBalance();
console.log('BLOOM Balance:', balance);

// Send BLOOM tokens
const txHash = await evmManager.sendBloom(recipientAddress, amount);
console.log('Transaction:', txHash);
```text

### Solana Wallet

```typescript
import { SolanaWalletManager } from '@mycelia/wallet-integration';

const solanaManager = new SolanaWalletManager();

// Connect to Phantom
const state = await solanaManager.connectPhantom();
console.log('Phantom connected:', state.publicKey?.toBase58());

// Get BLOOM balance
const balance = await solanaManager.getBloomBalance();
console.log('BLOOM Balance:', balance);

// Send BLOOM tokens
const txHash = await solanaManager.sendBloom(recipientPublicKey, amount);
console.log('Transaction:', txHash);
```text

### Cross-Chain Wallet

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

## React Integration

### Basic Wallet Hook

```tsx
import React from 'react';
import { useEVMWallet, useSolanaWallet } from '@mycelia/wallet-integration';

function WalletComponent() {
  const evmWallet = useEVMWallet();
  const solanaWallet = useSolanaWallet();

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

### Cross-Chain Dashboard

```tsx
import React, { useState } from 'react';
import { useCrossChainWallet } from '@mycelia/wallet-integration';

function CrossChainDashboard() {
  const crossChainWallet = useCrossChainWallet();
  const [transferAmount, setTransferAmount] = useState('');
  const [transferTo, setTransferTo] = useState('');

  const handleTransfer = async () => {
    if (!transferAmount || !transferTo) return;

    try {
      const amount = BigInt(transferAmount);
      const transactionId = await crossChainWallet.crossChainTransfer(
        'evm',
        'solana',
        transferTo,
        amount
      );
      console.log('Transfer initiated:', transactionId);
    } catch (error) {
      console.error('Transfer failed:', error);
    }
  };

  return (
    <div>
      <h2>Cross-Chain Dashboard</h2>
      
      <div>
        <h3>EVM Wallet</h3>
        <p>Connected: {crossChainWallet.isEVMConnected ? 'Yes' : 'No'}</p>
        <p>Address: {crossChainWallet.evmAddress}</p>
      </div>
      
      <div>
        <h3>Solana Wallet</h3>
        <p>Connected: {crossChainWallet.isSolanaConnected ? 'Yes' : 'No'}</p>
        <p>Public Key: {crossChainWallet.solanaPublicKey?.toBase58()}</p>
      </div>
      
      <div>
        <h3>Cross-Chain Transfer</h3>
        <input
          type="text"
          placeholder="Amount (BLOOM)"
          value={transferAmount}
          onChange={(e) => setTransferAmount(e.target.value)}
        />
        <input
          type="text"
          placeholder="To Address"
          value={transferTo}
          onChange={(e) => setTransferTo(e.target.value)}
        />
        <button onClick={handleTransfer}>
          Transfer
        </button>
      </div>
    </div>
  );
}
```text

### Wallet Components

```tsx
import React from 'react';
import { WalletButton, WalletStatus, CrossChainDashboard } from '@mycelia/wallet-integration';

function App() {
  return (
    <div>
      <h1>Mycelia Wallet Integration</h1>
      
      <div>
        <h2>Wallet Buttons</h2>
        <WalletButton walletType="metamask" />
        <WalletButton walletType="phantom" />
      </div>
      
      <div>
        <h2>Wallet Status</h2>
        <WalletStatus walletType="metamask" showBalance={true} />
        <WalletStatus walletType="phantom" showBalance={true} />
      </div>
      
      <div>
        <h2>Cross-Chain Dashboard</h2>
        <CrossChainDashboard />
      </div>
    </div>
  );
}
```text

## Best Practices

### Security

1. **Never expose private keys** in client-side code
2. **Use environment variables** for sensitive configuration
3. **Validate all inputs** before processing
4. **Implement proper error handling**
5. **Use HTTPS** for all network requests

### Performance

1. **Cache frequently accessed data**
2. **Use batch operations** when possible
3. **Implement connection pooling**
4. **Use lazy loading** for large datasets
5. **Debounce user input** to reduce API calls

### Error Handling

```typescript
try {
  const transaction = await bridge.crossChainTransfer(/* ... */);
  console.log('Transaction successful:', transaction.id);
} catch (error) {
  if (error.message.includes('Insufficient balance')) {
    console.error('Insufficient BLOOM balance');
  } else if (error.message.includes('Network error')) {
    console.error('Network connectivity issue');
  } else {
    console.error('Unexpected error:', error);
  }
}
```text

### Testing

```typescript
import { describe, it, expect } from 'vitest';
import { MyceliaSDK } from '@mycelia/developer-sdk';

describe('Mycelia SDK', () => {
  it('should initialize correctly', () => {
    const sdk = new MyceliaSDK(config);
    expect(sdk).toBeDefined();
  });

  it('should create EVM wallet', () => {
    const sdk = new MyceliaSDK(config);
    const wallet = sdk.createEVMWallet('test-private-key');
    expect(wallet).toBeDefined();
  });
});
```text

---

This tutorial provides step-by-step guidance for common Mycelia development tasks. For more advanced usage patterns and examples, refer to the API reference and developer guide.
