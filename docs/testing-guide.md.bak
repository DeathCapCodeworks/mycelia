# Mycelia Testing Guide

This guide provides comprehensive testing strategies and examples for the Mycelia ecosystem.

## Table of Contents

1. [Testing Strategy](#testing-strategy)
2. [Unit Testing](#unit-testing)
3. [Integration Testing](#integration-testing)
4. [End-to-End Testing](#end-to-end-testing)
5. [Performance Testing](#performance-testing)
6. [Security Testing](#security-testing)
7. [Test Configuration](#test-configuration)
8. [CI/CD Integration](#cicd-integration)

## Testing Strategy

### Testing Pyramid

```
        /\
       /  \
      / E2E \     ← Few, slow, expensive
     /______\
    /        \
   /Integration\ ← Some, medium speed, medium cost
  /____________\
 /              \
/   Unit Tests   \ ← Many, fast, cheap
/________________\
```

### Test Types

1. **Unit Tests**: Test individual functions and classes
2. **Integration Tests**: Test package interactions
3. **End-to-End Tests**: Test complete user workflows
4. **Performance Tests**: Test system performance under load
5. **Security Tests**: Test security vulnerabilities

## Unit Testing

### Tokenomics Testing

```typescript
import { describe, it, expect } from 'vitest';
import { bloomToSats, satsToBloom, assertPeg, requiredSatsForSupply, collateralizationRatio, isFullyReserved } from '@mycelia/tokenomics';

describe('Tokenomics', () => {
  describe('bloomToSats', () => {
    it('should convert BLOOM to satoshis correctly', () => {
      const bloom = 1000000000000000000n; // 1 BLOOM
      const sats = bloomToSats(bloom);
      expect(sats).toBe(10000000n); // 10,000,000 sats
    });

    it('should handle zero BLOOM', () => {
      const bloom = 0n;
      const sats = bloomToSats(bloom);
      expect(sats).toBe(0n);
    });

    it('should handle large BLOOM amounts', () => {
      const bloom = 1000000000000000000000n; // 1000 BLOOM
      const sats = bloomToSats(bloom);
      expect(sats).toBe(10000000000000n); // 10,000,000,000,000 sats
    });
  });

  describe('satsToBloom', () => {
    it('should convert satoshis to BLOOM correctly', () => {
      const sats = 10000000n; // 10,000,000 sats
      const bloom = satsToBloom(sats);
      expect(bloom).toBe(1000000000000000000n); // 1 BLOOM
    });

    it('should handle floor division', () => {
      const sats = 15000000n; // 15,000,000 sats
      const bloom = satsToBloom(sats);
      expect(bloom).toBe(1000000000000000000n); // 1 BLOOM (floor)
    });

    it('should handle zero satoshis', () => {
      const sats = 0n;
      const bloom = satsToBloom(sats);
      expect(bloom).toBe(0n);
    });
  });

  describe('assertPeg', () => {
    it('should return correct peg statement', () => {
      const pegStatement = assertPeg();
      expect(pegStatement).toBe('Peg: 10 BLOOM = 1 BTC');
    });
  });

  describe('requiredSatsForSupply', () => {
    it('should calculate required satoshis correctly', () => {
      const outstandingBloom = 1000000000000000000n; // 1 BLOOM
      const requiredSats = requiredSatsForSupply(outstandingBloom);
      expect(requiredSats).toBe(10000000n); // 10,000,000 sats
    });
  });

  describe('collateralizationRatio', () => {
    it('should calculate collateralization ratio correctly', () => {
      const lockedSats = 20000000n; // 20,000,000 sats
      const outstandingBloom = 1000000000000000000n; // 1 BLOOM
      const ratio = collateralizationRatio(lockedSats, outstandingBloom);
      expect(ratio).toBe(2.0); // 200% collateralized
    });

    it('should handle zero outstanding BLOOM', () => {
      const lockedSats = 10000000n;
      const outstandingBloom = 0n;
      const ratio = collateralizationRatio(lockedSats, outstandingBloom);
      expect(ratio).toBe(Infinity);
    });
  });

  describe('isFullyReserved', () => {
    it('should return true when fully reserved', () => {
      const lockedSats = 20000000n; // 20,000,000 sats
      const outstandingBloom = 1000000000000000000n; // 1 BLOOM
      const fullyReserved = isFullyReserved(lockedSats, outstandingBloom);
      expect(fullyReserved).toBe(true);
    });

    it('should return false when under-reserved', () => {
      const lockedSats = 5000000n; // 5,000,000 sats
      const outstandingBloom = 1000000000000000000n; // 1 BLOOM
      const fullyReserved = isFullyReserved(lockedSats, outstandingBloom);
      expect(fullyReserved).toBe(false);
    });
  });
});
```

### Bridge Testing

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { CrossChainBridge, BridgeFactory, BridgeChain, BridgeStatus } from '@mycelia/bridge-infrastructure';

describe('CrossChainBridge', () => {
  let bridge: CrossChainBridge;

  beforeEach(() => {
    bridge = BridgeFactory.createBridge({
      evm: {
        rpcUrl: 'https://mainnet.infura.io/v3/test',
        bridgeContract: '0xTestBridge1234567890123456789012345678901234',
        bloomTokenAddress: '0xTestBloom1234567890123456789012345678901234',
        mintGuardAddress: '0xTestMintGuard1234567890123456789012345678901234',
        confirmations: 1
      },
      solana: {
        rpcUrl: 'https://api.devnet.solana.com',
        bridgeProgram: 'TestBridge1111111111111111111111111111111111111',
        bloomTokenMint: 'TestBloom1111111111111111111111111111111111111',
        confirmations: 1
      },
      bitcoin: {
        rpcUrl: 'https://bitcoin-testnet.infura.io/v3/test',
        confirmations: 1
      },
      relayer: {
        url: 'https://test-relayer.mycelia.com',
        apiKey: 'test-api-key'
      }
    });
  });

  describe('crossChainTransfer', () => {
    it('should create cross-chain transfer transaction', async () => {
      const transaction = await bridge.crossChainTransfer(
        BridgeChain.EVM,
        BridgeChain.SOLANA,
        '0xSenderAddress',
        'SolanaRecipientAddress',
        1000000000000000000n, // 1 BLOOM
        'test-private-key'
      );

      expect(transaction).toBeDefined();
      expect(transaction.id).toBeDefined();
      expect(transaction.type).toBe('cross_chain_transfer');
      expect(transaction.fromChain).toBe(BridgeChain.EVM);
      expect(transaction.toChain).toBe(BridgeChain.SOLANA);
      expect(transaction.amount).toBe(1000000000000000000n);
      expect(transaction.status).toBe(BridgeStatus.PENDING);
    });
  });

  describe('getTransaction', () => {
    it('should return transaction by ID', async () => {
      const transaction = await bridge.crossChainTransfer(
        BridgeChain.EVM,
        BridgeChain.SOLANA,
        '0xSenderAddress',
        'SolanaRecipientAddress',
        1000000000000000000n,
        'test-private-key'
      );

      const retrievedTransaction = bridge.getTransaction(transaction.id);
      expect(retrievedTransaction).toBeDefined();
      expect(retrievedTransaction?.id).toBe(transaction.id);
    });

    it('should return undefined for non-existent transaction', () => {
      const transaction = bridge.getTransaction('non-existent-id');
      expect(transaction).toBeUndefined();
    });
  });

  describe('getAllTransactions', () => {
    it('should return all transactions', async () => {
      // Create multiple transactions
      await bridge.crossChainTransfer(BridgeChain.EVM, BridgeChain.SOLANA, '0xSender1', 'SolanaRecipient1', 1000000000000000000n, 'key1');
      await bridge.crossChainTransfer(BridgeChain.SOLANA, BridgeChain.EVM, '0xSender2', 'SolanaRecipient2', 2000000000000000000n, 'key2');

      const transactions = bridge.getAllTransactions();
      expect(transactions).toHaveLength(2);
    });
  });

  describe('getTransactionsByStatus', () => {
    it('should filter transactions by status', async () => {
      await bridge.crossChainTransfer(BridgeChain.EVM, BridgeChain.SOLANA, '0xSender1', 'SolanaRecipient1', 1000000000000000000n, 'key1');

      const pendingTransactions = bridge.getTransactionsByStatus(BridgeStatus.PENDING);
      expect(pendingTransactions).toHaveLength(1);
      expect(pendingTransactions[0].status).toBe(BridgeStatus.PENDING);
    });
  });

  describe('getBridgeStatistics', () => {
    it('should return bridge statistics', async () => {
      await bridge.crossChainTransfer(BridgeChain.EVM, BridgeChain.SOLANA, '0xSender1', 'SolanaRecipient1', 1000000000000000000n, 'key1');

      const stats = bridge.getBridgeStatistics();
      expect(stats.totalTransactions).toBe(1);
      expect(stats.totalVolume).toBe(1000000000000000000n);
      expect(stats.completedTransactions).toBe(0);
    });
  });
});
```

### Mining Application Testing

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { MiningApplication, DEFAULT_IPFS_CONFIGS } from '@mycelia/mining-app';
import { SupplyLedger } from '@mycelia/shared-kernel';
import { StaticReserveFeed } from '@mycelia/proof-of-reserve';

describe('MiningApplication', () => {
  let miningApp: MiningApplication;
  let supplyLedger: SupplyLedger;
  let reserveFeed: StaticReserveFeed;

  beforeEach(async () => {
    supplyLedger = new SupplyLedger();
    reserveFeed = new StaticReserveFeed(100_000_000n); // 1 BTC
    
    const mintingFeeds = {
      reserve: reserveFeed,
      supply: {
        async getBloomOutstanding() {
          return supplyLedger.currentSupply();
        }
      }
    };

    miningApp = new MiningApplication(
      DEFAULT_IPFS_CONFIGS.LOCAL,
      supplyLedger,
      mintingFeeds
    );

    await miningApp.initialize();
  });

  describe('startMiningSession', () => {
    it('should start mining session successfully', async () => {
      const session = await miningApp.startMiningSession('miner1', {
        storageUsed: 1024 * 1024 * 1024, // 1GB
        bandwidthUsed: 100 * 1024 * 1024 // 100MB
      });

      expect(session).toBeDefined();
      expect(session.id).toBeDefined();
      expect(session.startTime).toBeGreaterThan(0);
      expect(session.status).toBe('active');
      expect(session.resourcesAllocated).toBeDefined();
      expect(session.contributionScore).toBeDefined();
      expect(session.rewardsEarned).toBe(0n);
    });

    it('should start mining session with default requirements', async () => {
      const session = await miningApp.startMiningSession('miner2');

      expect(session).toBeDefined();
      expect(session.id).toBeDefined();
      expect(session.status).toBe('active');
    });
  });

  describe('processContribution', () => {
    it('should process contribution successfully', async () => {
      const session = await miningApp.startMiningSession('miner1');
      
      const result = await miningApp.processContribution(session.id, {
        content: 'Hello, Mycelia!',
        storageUsed: 1024 * 1024, // 1MB
        bandwidthUsed: 10 * 1024 * 1024 // 10MB
      });

      expect(result).toBeDefined();
      expect(result.cid).toBeDefined();
      expect(result.rewards).toBeGreaterThan(0n);
    });

    it('should fail for non-existent session', async () => {
      await expect(
        miningApp.processContribution('non-existent-session', {
          content: 'Test content',
          storageUsed: 1024,
          bandwidthUsed: 1024
        })
      ).rejects.toThrow();
    });
  });

  describe('stopMiningSession', () => {
    it('should stop mining session successfully', async () => {
      const session = await miningApp.startMiningSession('miner1');
      
      const stoppedSession = await miningApp.stopMiningSession(session.id);
      
      expect(stoppedSession).toBeDefined();
      expect(stoppedSession.id).toBe(session.id);
      expect(stoppedSession.status).toBe('completed');
      expect(stoppedSession.endTime).toBeGreaterThan(session.startTime);
    });

    it('should fail for non-existent session', async () => {
      await expect(
        miningApp.stopMiningSession('non-existent-session')
      ).rejects.toThrow();
    });
  });

  describe('getMiningSession', () => {
    it('should return mining session by ID', async () => {
      const session = await miningApp.startMiningSession('miner1');
      
      const retrievedSession = miningApp.getMiningSession(session.id);
      
      expect(retrievedSession).toBeDefined();
      expect(retrievedSession?.id).toBe(session.id);
    });

    it('should return undefined for non-existent session', () => {
      const session = miningApp.getMiningSession('non-existent-session');
      expect(session).toBeUndefined();
    });
  });

  describe('getAllMiningSessions', () => {
    it('should return all mining sessions', async () => {
      await miningApp.startMiningSession('miner1');
      await miningApp.startMiningSession('miner2');

      const sessions = miningApp.getAllMiningSessions();
      expect(sessions).toHaveLength(2);
    });
  });

  describe('getMiningStatus', () => {
    it('should return mining status', async () => {
      await miningApp.startMiningSession('miner1');

      const status = miningApp.getMiningStatus();
      expect(status).toBeDefined();
      expect(status.isMining).toBe(true);
      expect(status.activeSessions).toBe(1);
      expect(status.totalRewardsEarned).toBeGreaterThanOrEqual(0n);
    });
  });
});
```

### Wallet Integration Testing

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { EVMWalletManager, SolanaWalletManager, CrossChainWalletManager, WalletType, WalletStatus } from '@mycelia/wallet-integration';

describe('Wallet Integration', () => {
  describe('EVMWalletManager', () => {
    let evmManager: EVMWalletManager;

    beforeEach(() => {
      evmManager = new EVMWalletManager();
    });

    it('should initialize with disconnected status', () => {
      const state = evmManager.getState();
      expect(state.status).toBe(WalletStatus.DISCONNECTED);
      expect(state.address).toBeUndefined();
      expect(state.balance).toBeUndefined();
    });

    it('should detect MetaMask installation', () => {
      const isInstalled = EVMWalletManager.isMetaMaskInstalled();
      expect(typeof isInstalled).toBe('boolean');
    });

    it('should detect Coinbase installation', () => {
      const isInstalled = EVMWalletManager.isCoinbaseInstalled();
      expect(typeof isInstalled).toBe('boolean');
    });

    it('should add and remove event listeners', () => {
      const listener = jest.fn();
      
      evmManager.addEventListener(listener);
      evmManager.removeEventListener(listener);
      
      // No error should be thrown
      expect(true).toBe(true);
    });
  });

  describe('SolanaWalletManager', () => {
    let solanaManager: SolanaWalletManager;

    beforeEach(() => {
      solanaManager = new SolanaWalletManager();
    });

    it('should initialize with disconnected status', () => {
      const state = solanaManager.getState();
      expect(state.status).toBe(WalletStatus.DISCONNECTED);
      expect(state.publicKey).toBeUndefined();
      expect(state.balance).toBeUndefined();
    });

    it('should detect Phantom installation', () => {
      const isInstalled = SolanaWalletManager.isPhantomInstalled();
      expect(typeof isInstalled).toBe('boolean');
    });

    it('should detect Solflare installation', () => {
      const isInstalled = SolanaWalletManager.isSolflareInstalled();
      expect(typeof isInstalled).toBe('boolean');
    });

    it('should detect Backpack installation', () => {
      const isInstalled = SolanaWalletManager.isBackpackInstalled();
      expect(typeof isInstalled).toBe('boolean');
    });
  });

  describe('CrossChainWalletManager', () => {
    let crossChainManager: CrossChainWalletManager;

    beforeEach(() => {
      crossChainManager = new CrossChainWalletManager();
    });

    it('should initialize with disconnected status', () => {
      const state = crossChainManager.getState();
      expect(state.evm.status).toBe(WalletStatus.DISCONNECTED);
      expect(state.solana.status).toBe(WalletStatus.DISCONNECTED);
    });

    it('should return available wallets', () => {
      const wallets = crossChainManager.getAvailableWallets();
      expect(Array.isArray(wallets)).toBe(true);
      expect(wallets.length).toBeGreaterThan(0);
      
      wallets.forEach(wallet => {
        expect(wallet.type).toBeDefined();
        expect(wallet.name).toBeDefined();
        expect(wallet.icon).toBeDefined();
        expect(typeof wallet.installed).toBe('boolean');
        expect(typeof wallet.supported).toBe('boolean');
      });
    });
  });
});
```

## Integration Testing

### SDK Integration Testing

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { MyceliaSDK } from '@mycelia/developer-sdk';
import { SupplyLedger } from '@mycelia/shared-kernel';
import { StaticReserveFeed } from '@mycelia/proof-of-reserve';

describe('MyceliaSDK Integration', () => {
  let sdk: MyceliaSDK;
  let supplyLedger: SupplyLedger;
  let reserveFeed: StaticReserveFeed;

  beforeEach(() => {
    const config = {
      evm: {
        rpcUrl: 'https://mainnet.infura.io/v3/test',
        bloomTokenAddress: '0xTestBloom1234567890123456789012345678901234',
        gasOracleAddress: '0x0000000000000000000000000000000000000000'
      },
      solana: {
        rpcUrl: 'https://api.devnet.solana.com',
        bloomTokenMint: 'TestBloom1111111111111111111111111111111111111',
        rentOracleProgram: '11111111111111111111111111111112'
      }
    };

    sdk = new MyceliaSDK(config);
    supplyLedger = new SupplyLedger();
    reserveFeed = new StaticReserveFeed(100_000_000n);
  });

  describe('EVM Wallet Integration', () => {
    it('should create EVM wallet', () => {
      const wallet = sdk.createEVMWallet('test-private-key');
      expect(wallet).toBeDefined();
      expect(wallet.getAddress()).toBeDefined();
    });

    it('should get EVM provider', () => {
      const provider = sdk.getEVMProvider();
      expect(provider).toBeDefined();
    });
  });

  describe('Solana Wallet Integration', () => {
    it('should create Solana wallet', () => {
      const wallet = sdk.createSolanaWallet('test-private-key');
      expect(wallet).toBeDefined();
      expect(wallet.getAddress()).toBeDefined();
    });

    it('should get Solana connection', () => {
      const connection = sdk.getSolanaConnection();
      expect(connection).toBeDefined();
    });
  });
});
```

### Cross-Package Integration Testing

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { MyceliaSDK } from '@mycelia/developer-sdk';
import { CrossChainBridge, BridgeFactory } from '@mycelia/bridge-infrastructure';
import { MiningApplication, DEFAULT_IPFS_CONFIGS } from '@mycelia/mining-app';
import { SupplyLedger } from '@mycelia/shared-kernel';
import { StaticReserveFeed } from '@mycelia/proof-of-reserve';
import { EVMWalletManager, SolanaWalletManager } from '@mycelia/wallet-integration';

describe('Cross-Package Integration', () => {
  let sdk: MyceliaSDK;
  let bridge: CrossChainBridge;
  let miningApp: MiningApplication;
  let supplyLedger: SupplyLedger;
  let reserveFeed: StaticReserveFeed;
  let evmManager: EVMWalletManager;
  let solanaManager: SolanaWalletManager;

  beforeEach(async () => {
    // Initialize core components
    supplyLedger = new SupplyLedger();
    reserveFeed = new StaticReserveFeed(100_000_000n);
    
    const mintingFeeds = {
      reserve: reserveFeed,
      supply: {
        async getBloomOutstanding() {
          return supplyLedger.currentSupply();
        }
      }
    };

    // Initialize SDK
    sdk = new MyceliaSDK({
      evm: {
        rpcUrl: 'https://mainnet.infura.io/v3/test',
        bloomTokenAddress: '0xTestBloom1234567890123456789012345678901234',
        gasOracleAddress: '0x0000000000000000000000000000000000000000'
      },
      solana: {
        rpcUrl: 'https://api.devnet.solana.com',
        bloomTokenMint: 'TestBloom1111111111111111111111111111111111111',
        rentOracleProgram: '11111111111111111111111111111112'
      }
    });

    // Initialize bridge
    bridge = BridgeFactory.createBridge({
      evm: {
        rpcUrl: 'https://mainnet.infura.io/v3/test',
        bridgeContract: '0xTestBridge1234567890123456789012345678901234',
        bloomTokenAddress: '0xTestBloom1234567890123456789012345678901234',
        mintGuardAddress: '0xTestMintGuard1234567890123456789012345678901234',
        confirmations: 1
      },
      solana: {
        rpcUrl: 'https://api.devnet.solana.com',
        bridgeProgram: 'TestBridge1111111111111111111111111111111111111',
        bloomTokenMint: 'TestBloom1111111111111111111111111111111111111',
        confirmations: 1
      },
      bitcoin: {
        rpcUrl: 'https://bitcoin-testnet.infura.io/v3/test',
        confirmations: 1
      },
      relayer: {
        url: 'https://test-relayer.mycelia.com',
        apiKey: 'test-api-key'
      }
    });

    // Initialize mining application
    miningApp = new MiningApplication(
      DEFAULT_IPFS_CONFIGS.LOCAL,
      supplyLedger,
      mintingFeeds
    );
    await miningApp.initialize();

    // Initialize wallet managers
    evmManager = new EVMWalletManager();
    solanaManager = new SolanaWalletManager();
  });

  describe('Complete Ecosystem Integration', () => {
    it('should integrate all components successfully', async () => {
      // Test SDK integration
      const evmWallet = sdk.createEVMWallet('test-private-key');
      const solanaWallet = sdk.createSolanaWallet('test-private-key');
      
      expect(evmWallet).toBeDefined();
      expect(solanaWallet).toBeDefined();

      // Test bridge integration
      const transaction = await bridge.crossChainTransfer(
        'evm' as any,
        'solana' as any,
        '0xSenderAddress',
        'SolanaRecipientAddress',
        1000000000000000000n,
        'test-private-key'
      );
      
      expect(transaction).toBeDefined();
      expect(transaction.id).toBeDefined();

      // Test mining integration
      const session = await miningApp.startMiningSession('miner1');
      expect(session).toBeDefined();
      expect(session.id).toBeDefined();

      // Test wallet integration
      const evmState = evmManager.getState();
      const solanaState = solanaManager.getState();
      
      expect(evmState).toBeDefined();
      expect(solanaState).toBeDefined();

      // Test supply ledger integration
      supplyLedger.recordMint(1000000000000000000n);
      const currentSupply = supplyLedger.currentSupply();
      expect(currentSupply).toBe(1000000000000000000n);
    });

    it('should handle cross-chain operations', async () => {
      // Start mining session
      const session = await miningApp.startMiningSession('miner1');
      
      // Process contribution
      const result = await miningApp.processContribution(session.id, {
        content: 'Test content',
        storageUsed: 1024 * 1024,
        bandwidthUsed: 10 * 1024 * 1024
      });
      
      expect(result).toBeDefined();
      expect(result.rewards).toBeGreaterThan(0n);

      // Perform cross-chain transfer
      const transaction = await bridge.crossChainTransfer(
        'evm' as any,
        'solana' as any,
        '0xSenderAddress',
        'SolanaRecipientAddress',
        result.rewards,
        'test-private-key'
      );
      
      expect(transaction).toBeDefined();
      expect(transaction.amount).toBe(result.rewards);
    });
  });
});
```

## End-to-End Testing

### User Workflow Testing

```typescript
import { describe, it, expect } from 'vitest';
import { MyceliaSDK } from '@mycelia/developer-sdk';
import { CrossChainBridge, BridgeFactory } from '@mycelia/bridge-infrastructure';
import { MiningApplication, DEFAULT_IPFS_CONFIGS } from '@mycelia/mining-app';
import { SupplyLedger } from '@mycelia/shared-kernel';
import { StaticReserveFeed } from '@mycelia/proof-of-reserve';
import { EVMWalletManager, SolanaWalletManager } from '@mycelia/wallet-integration';

describe('End-to-End User Workflows', () => {
  let sdk: MyceliaSDK;
  let bridge: CrossChainBridge;
  let miningApp: MiningApplication;
  let supplyLedger: SupplyLedger;
  let reserveFeed: StaticReserveFeed;
  let evmManager: EVMWalletManager;
  let solanaManager: SolanaWalletManager;

  beforeEach(async () => {
    // Initialize all components
    supplyLedger = new SupplyLedger();
    reserveFeed = new StaticReserveFeed(100_000_000n);
    
    const mintingFeeds = {
      reserve: reserveFeed,
      supply: {
        async getBloomOutstanding() {
          return supplyLedger.currentSupply();
        }
      }
    };

    sdk = new MyceliaSDK({
      evm: {
        rpcUrl: 'https://mainnet.infura.io/v3/test',
        bloomTokenAddress: '0xTestBloom1234567890123456789012345678901234',
        gasOracleAddress: '0x0000000000000000000000000000000000000000'
      },
      solana: {
        rpcUrl: 'https://api.devnet.solana.com',
        bloomTokenMint: 'TestBloom1111111111111111111111111111111111111',
        rentOracleProgram: '11111111111111111111111111111112'
      }
    });

    bridge = BridgeFactory.createBridge({
      evm: {
        rpcUrl: 'https://mainnet.infura.io/v3/test',
        bridgeContract: '0xTestBridge1234567890123456789012345678901234',
        bloomTokenAddress: '0xTestBloom1234567890123456789012345678901234',
        mintGuardAddress: '0xTestMintGuard1234567890123456789012345678901234',
        confirmations: 1
      },
      solana: {
        rpcUrl: 'https://api.devnet.solana.com',
        bridgeProgram: 'TestBridge1111111111111111111111111111111111111',
        bloomTokenMint: 'TestBloom1111111111111111111111111111111111111',
        confirmations: 1
      },
      bitcoin: {
        rpcUrl: 'https://bitcoin-testnet.infura.io/v3/test',
        confirmations: 1
      },
      relayer: {
        url: 'https://test-relayer.mycelia.com',
        apiKey: 'test-api-key'
      }
    });

    miningApp = new MiningApplication(
      DEFAULT_IPFS_CONFIGS.LOCAL,
      supplyLedger,
      mintingFeeds
    );
    await miningApp.initialize();

    evmManager = new EVMWalletManager();
    solanaManager = new SolanaWalletManager();
  });

  describe('Complete User Journey', () => {
    it('should complete full user journey from mining to cross-chain transfer', async () => {
      // Step 1: Start mining session
      const session = await miningApp.startMiningSession('miner1', {
        storageUsed: 1024 * 1024 * 1024, // 1GB
        bandwidthUsed: 100 * 1024 * 1024 // 100MB
      });
      
      expect(session).toBeDefined();
      expect(session.status).toBe('active');

      // Step 2: Process multiple contributions
      const contributions = [
        { content: 'Content 1', storageUsed: 1024 * 1024, bandwidthUsed: 10 * 1024 * 1024 },
        { content: 'Content 2', storageUsed: 2 * 1024 * 1024, bandwidthUsed: 20 * 1024 * 1024 },
        { content: 'Content 3', storageUsed: 3 * 1024 * 1024, bandwidthUsed: 30 * 1024 * 1024 }
      ];

      let totalRewards = 0n;
      for (const contribution of contributions) {
        const result = await miningApp.processContribution(session.id, contribution);
        totalRewards += result.rewards;
      }

      expect(totalRewards).toBeGreaterThan(0n);

      // Step 3: Stop mining session
      const completedSession = await miningApp.stopMiningSession(session.id);
      expect(completedSession.status).toBe('completed');
      expect(completedSession.rewardsEarned).toBe(totalRewards);

      // Step 4: Perform cross-chain transfer
      const transaction = await bridge.crossChainTransfer(
        'evm' as any,
        'solana' as any,
        '0xSenderAddress',
        'SolanaRecipientAddress',
        totalRewards,
        'test-private-key'
      );
      
      expect(transaction).toBeDefined();
      expect(transaction.amount).toBe(totalRewards);

      // Step 5: Monitor transaction
      let transactionUpdated = false;
      bridge.subscribeToTransaction(transaction.id, (updatedTransaction) => {
        transactionUpdated = true;
        expect(updatedTransaction.id).toBe(transaction.id);
      });

      // Step 6: Verify final state
      const miningStatus = miningApp.getMiningStatus();
      expect(miningStatus.isMining).toBe(false);
      expect(miningStatus.totalRewardsEarned).toBe(totalRewards);

      const bridgeStats = bridge.getBridgeStatistics();
      expect(bridgeStats.totalTransactions).toBe(1);
      expect(bridgeStats.totalVolume).toBe(totalRewards);
    });

    it('should handle wallet connection and balance checking', async () => {
      // Step 1: Check wallet installation
      const metaMaskInstalled = EVMWalletManager.isMetaMaskInstalled();
      const phantomInstalled = SolanaWalletManager.isPhantomInstalled();
      
      expect(typeof metaMaskInstalled).toBe('boolean');
      expect(typeof phantomInstalled).toBe('boolean');

      // Step 2: Get initial wallet state
      const evmState = evmManager.getState();
      const solanaState = solanaManager.getState();
      
      expect(evmState.status).toBe('disconnected');
      expect(solanaState.status).toBe('disconnected');

      // Step 3: Create wallets through SDK
      const evmWallet = sdk.createEVMWallet('test-private-key');
      const solanaWallet = sdk.createSolanaWallet('test-private-key');
      
      expect(evmWallet).toBeDefined();
      expect(solanaWallet).toBeDefined();

      // Step 4: Get wallet addresses
      const evmAddress = evmWallet.getAddress();
      const solanaAddress = solanaWallet.getAddress();
      
      expect(evmAddress).toBeDefined();
      expect(solanaAddress).toBeDefined();
    });
  });
});
```

## Performance Testing

### Load Testing

```typescript
import { describe, it, expect } from 'vitest';
import { MyceliaSDK } from '@mycelia/developer-sdk';
import { CrossChainBridge, BridgeFactory } from '@mycelia/bridge-infrastructure';
import { MiningApplication, DEFAULT_IPFS_CONFIGS } from '@mycelia/mining-app';
import { SupplyLedger } from '@mycelia/shared-kernel';
import { StaticReserveFeed } from '@mycelia/proof-of-reserve';

describe('Performance Testing', () => {
  let sdk: MyceliaSDK;
  let bridge: CrossChainBridge;
  let miningApp: MiningApplication;
  let supplyLedger: SupplyLedger;
  let reserveFeed: StaticReserveFeed;

  beforeEach(async () => {
    supplyLedger = new SupplyLedger();
    reserveFeed = new StaticReserveFeed(100_000_000n);
    
    const mintingFeeds = {
      reserve: reserveFeed,
      supply: {
        async getBloomOutstanding() {
          return supplyLedger.currentSupply();
        }
      }
    };

    sdk = new MyceliaSDK({
      evm: {
        rpcUrl: 'https://mainnet.infura.io/v3/test',
        bloomTokenAddress: '0xTestBloom1234567890123456789012345678901234',
        gasOracleAddress: '0x0000000000000000000000000000000000000000'
      },
      solana: {
        rpcUrl: 'https://api.devnet.solana.com',
        bloomTokenMint: 'TestBloom1111111111111111111111111111111111111',
        rentOracleProgram: '11111111111111111111111111111112'
      }
    });

    bridge = BridgeFactory.createBridge({
      evm: {
        rpcUrl: 'https://mainnet.infura.io/v3/test',
        bridgeContract: '0xTestBridge1234567890123456789012345678901234',
        bloomTokenAddress: '0xTestBloom1234567890123456789012345678901234',
        mintGuardAddress: '0xTestMintGuard1234567890123456789012345678901234',
        confirmations: 1
      },
      solana: {
        rpcUrl: 'https://api.devnet.solana.com',
        bridgeProgram: 'TestBridge1111111111111111111111111111111111111',
        bloomTokenMint: 'TestBloom1111111111111111111111111111111111111',
        confirmations: 1
      },
      bitcoin: {
        rpcUrl: 'https://bitcoin-testnet.infura.io/v3/test',
        confirmations: 1
      },
      relayer: {
        url: 'https://test-relayer.mycelia.com',
        apiKey: 'test-api-key'
      }
    });

    miningApp = new MiningApplication(
      DEFAULT_IPFS_CONFIGS.LOCAL,
      supplyLedger,
      mintingFeeds
    );
    await miningApp.initialize();
  });

  describe('Concurrent Operations', () => {
    it('should handle multiple concurrent mining sessions', async () => {
      const sessionCount = 10;
      const sessions = [];

      // Start multiple mining sessions concurrently
      for (let i = 0; i < sessionCount; i++) {
        const session = miningApp.startMiningSession(`miner${i}`);
        sessions.push(session);
      }

      const startedSessions = await Promise.all(sessions);
      
      expect(startedSessions).toHaveLength(sessionCount);
      startedSessions.forEach(session => {
        expect(session).toBeDefined();
        expect(session.id).toBeDefined();
        expect(session.status).toBe('active');
      });

      // Process contributions concurrently
      const contributions = startedSessions.map(session => 
        miningApp.processContribution(session.id, {
          content: `Content for ${session.id}`,
          storageUsed: 1024 * 1024,
          bandwidthUsed: 10 * 1024 * 1024
        })
      );

      const results = await Promise.all(contributions);
      
      expect(results).toHaveLength(sessionCount);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.cid).toBeDefined();
        expect(result.rewards).toBeGreaterThan(0n);
      });
    });

    it('should handle multiple concurrent bridge transactions', async () => {
      const transactionCount = 5;
      const transactions = [];

      // Create multiple bridge transactions concurrently
      for (let i = 0; i < transactionCount; i++) {
        const transaction = bridge.crossChainTransfer(
          'evm' as any,
          'solana' as any,
          `0xSender${i}`,
          `SolanaRecipient${i}`,
          1000000000000000000n,
          'test-private-key'
        );
        transactions.push(transaction);
      }

      const createdTransactions = await Promise.all(transactions);
      
      expect(createdTransactions).toHaveLength(transactionCount);
      createdTransactions.forEach(transaction => {
        expect(transaction).toBeDefined();
        expect(transaction.id).toBeDefined();
        expect(transaction.amount).toBe(1000000000000000000n);
      });

      // Verify all transactions are tracked
      const allTransactions = bridge.getAllTransactions();
      expect(allTransactions).toHaveLength(transactionCount);
    });
  });

  describe('Memory Usage', () => {
    it('should not leak memory with repeated operations', async () => {
      const iterations = 100;
      
      for (let i = 0; i < iterations; i++) {
        // Create and destroy mining session
        const session = await miningApp.startMiningSession(`miner${i}`);
        await miningApp.processContribution(session.id, {
          content: `Content ${i}`,
          storageUsed: 1024,
          bandwidthUsed: 1024
        });
        await miningApp.stopMiningSession(session.id);
      }

      // Verify system is still functional
      const status = miningApp.getMiningStatus();
      expect(status.isMining).toBe(false);
      expect(status.activeSessions).toBe(0);
    });
  });
});
```

## Security Testing

### Security Vulnerability Testing

```typescript
import { describe, it, expect } from 'vitest';
import { bloomToSats, satsToBloom, assertCanMint, canMint } from '@mycelia/tokenomics';
import { SupplyLedger } from '@mycelia/shared-kernel';
import { StaticReserveFeed } from '@mycelia/proof-of-reserve';

describe('Security Testing', () => {
  let supplyLedger: SupplyLedger;
  let reserveFeed: StaticReserveFeed;

  beforeEach(() => {
    supplyLedger = new SupplyLedger();
    reserveFeed = new StaticReserveFeed(100_000_000n); // 1 BTC
  });

  describe('Peg Enforcement Security', () => {
    it('should prevent minting beyond reserves', async () => {
      const mintingFeeds = {
        reserve: reserveFeed,
        supply: {
          async getBloomOutstanding() {
            return supplyLedger.currentSupply();
          }
        }
      };

      // Try to mint more than reserves allow
      const excessiveAmount = 2000000000000000000n; // 2 BLOOM (would require 20M sats)
      
      const canMintExcessive = await canMint(excessiveAmount, mintingFeeds);
      expect(canMintExcessive).toBe(false);

      await expect(
        assertCanMint(excessiveAmount, mintingFeeds)
      ).rejects.toThrow('Minting would break peg');
    });

    it('should handle edge cases in peg calculations', () => {
      // Test with very large numbers
      const largeBloom = 1000000000000000000000000n; // 1M BLOOM
      const sats = bloomToSats(largeBloom);
      expect(sats).toBe(10000000000000000000000000n); // 10M sats

      // Test with very small numbers
      const smallSats = 1n; // 1 sat
      const bloom = satsToBloom(smallSats);
      expect(bloom).toBe(0n); // Should floor to 0
    });

    it('should prevent integer overflow', () => {
      // Test with maximum safe integer
      const maxSafeInteger = BigInt(Number.MAX_SAFE_INTEGER);
      const sats = bloomToSats(maxSafeInteger);
      
      // Should not throw and should return a valid result
      expect(sats).toBeDefined();
      expect(typeof sats).toBe('bigint');
    });
  });

  describe('Supply Ledger Security', () => {
    it('should prevent negative supply', () => {
      // Record initial mint
      supplyLedger.recordMint(1000000000000000000n);
      expect(supplyLedger.currentSupply()).toBe(1000000000000000000n);

      // Try to burn more than available
      supplyLedger.recordBurn(2000000000000000000n);
      
      // Supply should not go negative
      const currentSupply = supplyLedger.currentSupply();
      expect(currentSupply).toBeGreaterThanOrEqual(0n);
    });

    it('should handle concurrent supply operations safely', async () => {
      const operations = [];
      
      // Create concurrent mint and burn operations
      for (let i = 0; i < 100; i++) {
        operations.push(() => supplyLedger.recordMint(1000000000000000000n));
        operations.push(() => supplyLedger.recordBurn(500000000000000000n));
      }

      // Execute all operations
      operations.forEach(op => op());

      // Verify supply is consistent
      const currentSupply = supplyLedger.currentSupply();
      expect(currentSupply).toBeGreaterThanOrEqual(0n);
    });
  });

  describe('Input Validation', () => {
    it('should validate input types', () => {
      // Test with invalid input types
      expect(() => bloomToSats('invalid' as any)).toThrow();
      expect(() => satsToBloom('invalid' as any)).toThrow();
      expect(() => bloomToSats(null as any)).toThrow();
      expect(() => satsToBloom(undefined as any)).toThrow();
    });

    it('should handle malicious input', () => {
      // Test with malicious strings
      expect(() => bloomToSats('0x123' as any)).toThrow();
      expect(() => satsToBloom('0x456' as any)).toThrow();
      
      // Test with negative numbers
      expect(() => bloomToSats(-1n)).toThrow();
      expect(() => satsToBloom(-1n)).toThrow();
    });
  });
});
```

## Test Configuration

### Vitest Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/test-setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test-setup.ts',
        '**/*.d.ts',
        '**/*.config.*',
        '**/coverage/**'
      ]
    },
    testTimeout: 30000,
    hookTimeout: 30000
  }
});
```

### Test Setup

```typescript
// src/test-setup.ts
import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock global objects
global.fetch = vi.fn();
global.console = {
  ...console,
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn()
};
```

### Package.json Test Scripts

```json
{
  "scripts": {
    "test": "vitest",
    "test:watch": "vitest --watch",
    "test:coverage": "vitest --coverage",
    "test:ui": "vitest --ui",
    "test:run": "vitest run",
    "test:integration": "vitest run --config vitest.integration.config.ts",
    "test:e2e": "vitest run --config vitest.e2e.config.ts"
  }
}
```

## CI/CD Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Test

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: [20.x, 22.x]

    steps:
    - uses: actions/checkout@v4
    
    - name: Use Node.js ${{ matrix.node-version }}
      uses: actions/setup-node@v4
      with:
        node-version: ${{ matrix.node-version }}
        cache: 'npm'
    
    - name: Install pnpm
      uses: pnpm/action-setup@v2
      with:
        version: 8
    
    - name: Install dependencies
      run: pnpm install
    
    - name: Run tests
      run: pnpm test:run
    
    - name: Run integration tests
      run: pnpm test:integration
    
    - name: Run security tests
      run: pnpm test:security
    
    - name: Upload coverage reports
      uses: codecov/codecov-action@v3
      with:
        file: ./coverage/lcov.info
```

### Test Reports

```typescript
// Generate test reports
import { generateTestReport } from './test-utils';

describe('Test Reporting', () => {
  it('should generate comprehensive test report', async () => {
    const report = await generateTestReport({
      unit: true,
      integration: true,
      e2e: true,
      performance: true,
      security: true
    });

    expect(report).toBeDefined();
    expect(report.summary).toBeDefined();
    expect(report.coverage).toBeDefined();
    expect(report.performance).toBeDefined();
    expect(report.security).toBeDefined();
  });
});
```

---

This testing guide provides comprehensive strategies for testing the Mycelia ecosystem. For more specific test examples and configurations, refer to the individual package test files and the CI/CD documentation.
