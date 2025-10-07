import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  CrossChainBridge,
  BridgeRelayer,
  BridgeValidator,
  BridgeFactory,
  BridgeUtils,
  BridgeChain,
  BridgeStatus,
  BridgeType,
  type BridgeConfig,
  type BridgeTransaction,
  type BridgeProof
} from './index';

// Mock dependencies
vi.mock('@mycelia/developer-sdk', () => ({
  MyceliaSDK: vi.fn().mockImplementation(() => ({
    createEVMWallet: vi.fn().mockReturnValue({
      getBloomBalance: vi.fn().mockResolvedValue(1000000000000000000n),
      getAddress: vi.fn().mockResolvedValue('0x1234567890123456789012345678901234567890')
    }),
    createSolanaWallet: vi.fn().mockReturnValue({
      getBloomBalance: vi.fn().mockResolvedValue(1000000000000000000n),
      getAddress: vi.fn().mockResolvedValue('SolanaWallet123456789012345678901234567890123456789')
    }),
    getEVMProvider: vi.fn().mockReturnValue({}),
    getSolanaConnection: vi.fn().mockReturnValue({})
  }))
}));

vi.mock('crypto-js', () => ({
  default: {
    SHA256: vi.fn().mockReturnValue({
      toString: vi.fn().mockReturnValue('mock-hash-123456789')
    })
  }
}));

describe('CrossChainBridge', () => {
  let bridge: CrossChainBridge;
  let config: BridgeConfig;

  beforeEach(() => {
    config = BridgeFactory.createDefaultConfig();
    bridge = new CrossChainBridge(config);
  });

  describe('Lock and Mint (EVM to Solana)', () => {
    it('should successfully lock and mint tokens', async () => {
      const fromAddress = '0x1234567890123456789012345678901234567890';
      const toAddress = 'SolanaWallet123456789012345678901234567890123456789';
      const amount = 1000000000000000000n; // 1 BLOOM
      const privateKey = '0x1234567890123456789012345678901234567890123456789012345678901234';

      const transaction = await bridge.lockAndMint(fromAddress, toAddress, amount, privateKey);

      expect(transaction.id).toMatch(/^bridge_\d+_/);
      expect(transaction.type).toBe(BridgeType.LOCK_AND_MINT);
      expect(transaction.fromChain).toBe(BridgeChain.EVM);
      expect(transaction.toChain).toBe(BridgeChain.SOLANA);
      expect(transaction.fromAddress).toBe(fromAddress);
      expect(transaction.toAddress).toBe(toAddress);
      expect(transaction.amount).toBe(amount);
      expect(transaction.status).toBe(BridgeStatus.COMPLETED);
      expect(transaction.txHash).toBeDefined();
      expect(transaction.proof).toBeDefined();
      expect(transaction.completedAt).toBeGreaterThan(transaction.createdAt);
    });

    it('should handle insufficient balance error', async () => {
      const fromAddress = '0x1234567890123456789012345678901234567890';
      const toAddress = 'SolanaWallet123456789012345678901234567890123456789';
      const amount = 2000000000000000000n; // 2 BLOOM (more than balance)
      const privateKey = '0x1234567890123456789012345678901234567890123456789012345678901234';

      await expect(bridge.lockAndMint(fromAddress, toAddress, amount, privateKey))
        .rejects.toThrow('Insufficient BLOOM balance for bridge transaction');
    });
  });

  describe('Burn and Unlock (Solana to EVM)', () => {
    it('should successfully burn and unlock tokens', async () => {
      const fromAddress = 'SolanaWallet123456789012345678901234567890123456789';
      const toAddress = '0x1234567890123456789012345678901234567890';
      const amount = 1000000000000000000n; // 1 BLOOM
      const privateKey = '0x1234567890123456789012345678901234567890123456789012345678901234';

      const transaction = await bridge.burnAndUnlock(fromAddress, toAddress, amount, privateKey);

      expect(transaction.id).toMatch(/^bridge_\d+_/);
      expect(transaction.type).toBe(BridgeType.BURN_AND_UNLOCK);
      expect(transaction.fromChain).toBe(BridgeChain.SOLANA);
      expect(transaction.toChain).toBe(BridgeChain.EVM);
      expect(transaction.fromAddress).toBe(fromAddress);
      expect(transaction.toAddress).toBe(toAddress);
      expect(transaction.amount).toBe(amount);
      expect(transaction.status).toBe(BridgeStatus.COMPLETED);
      expect(transaction.txHash).toBeDefined();
      expect(transaction.proof).toBeDefined();
      expect(transaction.completedAt).toBeGreaterThan(transaction.createdAt);
    });

    it('should handle insufficient balance error', async () => {
      const fromAddress = 'SolanaWallet123456789012345678901234567890123456789';
      const toAddress = '0x1234567890123456789012345678901234567890';
      const amount = 2000000000000000000n; // 2 BLOOM (more than balance)
      const privateKey = '0x1234567890123456789012345678901234567890123456789012345678901234';

      await expect(bridge.burnAndUnlock(fromAddress, toAddress, amount, privateKey))
        .rejects.toThrow('Insufficient BLOOM balance for bridge transaction');
    });
  });

  describe('Cross-Chain Transfer', () => {
    it('should handle EVM to Solana transfer', async () => {
      const fromAddress = '0x1234567890123456789012345678901234567890';
      const toAddress = 'SolanaWallet123456789012345678901234567890123456789';
      const amount = 1000000000000000000n;
      const privateKey = '0x1234567890123456789012345678901234567890123456789012345678901234';

      const transaction = await bridge.crossChainTransfer(
        BridgeChain.EVM,
        BridgeChain.SOLANA,
        fromAddress,
        toAddress,
        amount,
        privateKey
      );

      expect(transaction.type).toBe(BridgeType.LOCK_AND_MINT);
      expect(transaction.status).toBe(BridgeStatus.COMPLETED);
    });

    it('should handle Solana to EVM transfer', async () => {
      const fromAddress = 'SolanaWallet123456789012345678901234567890123456789';
      const toAddress = '0x1234567890123456789012345678901234567890';
      const amount = 1000000000000000000n;
      const privateKey = '0x1234567890123456789012345678901234567890123456789012345678901234';

      const transaction = await bridge.crossChainTransfer(
        BridgeChain.SOLANA,
        BridgeChain.EVM,
        fromAddress,
        toAddress,
        amount,
        privateKey
      );

      expect(transaction.type).toBe(BridgeType.BURN_AND_UNLOCK);
      expect(transaction.status).toBe(BridgeStatus.COMPLETED);
    });

    it('should reject unsupported transfer types', async () => {
      const fromAddress = '0x1234567890123456789012345678901234567890';
      const toAddress = '0x9876543210987654321098765432109876543210';
      const amount = 1000000000000000000n;
      const privateKey = '0x1234567890123456789012345678901234567890123456789012345678901234';

      await expect(bridge.crossChainTransfer(
        BridgeChain.EVM,
        BridgeChain.EVM,
        fromAddress,
        toAddress,
        amount,
        privateKey
      )).rejects.toThrow('Unsupported cross-chain transfer: evm -> evm');
    });
  });

  describe('Transaction Management', () => {
    it('should get transaction by ID', async () => {
      const fromAddress = '0x1234567890123456789012345678901234567890';
      const toAddress = 'SolanaWallet123456789012345678901234567890123456789';
      const amount = 1000000000000000000n;
      const privateKey = '0x1234567890123456789012345678901234567890123456789012345678901234';

      const transaction = await bridge.lockAndMint(fromAddress, toAddress, amount, privateKey);
      const retrieved = bridge.getTransaction(transaction.id);

      expect(retrieved).toEqual(transaction);
    });

    it('should get all transactions', async () => {
      const fromAddress = '0x1234567890123456789012345678901234567890';
      const toAddress = 'SolanaWallet123456789012345678901234567890123456789';
      const amount = 1000000000000000000n;
      const privateKey = '0x1234567890123456789012345678901234567890123456789012345678901234';

      await bridge.lockAndMint(fromAddress, toAddress, amount, privateKey);
      await bridge.lockAndMint(fromAddress, toAddress, amount, privateKey);

      const transactions = bridge.getAllTransactions();
      expect(transactions).toHaveLength(2);
    });

    it('should get transactions by status', async () => {
      const fromAddress = '0x1234567890123456789012345678901234567890';
      const toAddress = 'SolanaWallet123456789012345678901234567890123456789';
      const amount = 1000000000000000000n;
      const privateKey = '0x1234567890123456789012345678901234567890123456789012345678901234';

      await bridge.lockAndMint(fromAddress, toAddress, amount, privateKey);

      const completedTransactions = bridge.getTransactionsByStatus(BridgeStatus.COMPLETED);
      expect(completedTransactions).toHaveLength(1);

      const pendingTransactions = bridge.getTransactionsByStatus(BridgeStatus.PENDING);
      expect(pendingTransactions).toHaveLength(0);
    });

    it('should get transactions by chain', async () => {
      const fromAddress = '0x1234567890123456789012345678901234567890';
      const toAddress = 'SolanaWallet123456789012345678901234567890123456789';
      const amount = 1000000000000000000n;
      const privateKey = '0x1234567890123456789012345678901234567890123456789012345678901234';

      await bridge.lockAndMint(fromAddress, toAddress, amount, privateKey);

      const evmTransactions = bridge.getTransactionsByChain(BridgeChain.EVM);
      expect(evmTransactions).toHaveLength(1);

      const solanaTransactions = bridge.getTransactionsByChain(BridgeChain.SOLANA);
      expect(solanaTransactions).toHaveLength(1);
    });
  });

  describe('Event Subscription', () => {
    it('should subscribe to transaction updates', async () => {
      const callback = vi.fn();
      const transactionId = 'test-transaction-id';
      
      bridge.subscribeToTransaction(transactionId, callback);
      
      // In real implementation, would trigger callback when transaction updates
      expect(callback).not.toHaveBeenCalled();
    });

    it('should unsubscribe from transaction updates', () => {
      const callback = vi.fn();
      const transactionId = 'test-transaction-id';
      
      bridge.subscribeToTransaction(transactionId, callback);
      bridge.unsubscribeFromTransaction(transactionId);
      
      // Should not throw error
    });
  });

  describe('Bridge Statistics', () => {
    it('should calculate bridge statistics', async () => {
      const fromAddress = '0x1234567890123456789012345678901234567890';
      const toAddress = 'SolanaWallet123456789012345678901234567890123456789';
      const amount = 1000000000000000000n;
      const privateKey = '0x1234567890123456789012345678901234567890123456789012345678901234';

      await bridge.lockAndMint(fromAddress, toAddress, amount, privateKey);
      await bridge.lockAndMint(fromAddress, toAddress, amount, privateKey);

      const stats = bridge.getBridgeStatistics();
      
      expect(stats.totalTransactions).toBe(2);
      expect(stats.totalVolume).toBe(2000000000000000000n);
      expect(stats.completedTransactions).toBe(2);
      expect(stats.failedTransactions).toBe(0);
      expect(stats.averageTransactionTime).toBeGreaterThan(0);
    });
  });

  describe('Fee Estimation', () => {
    it('should estimate EVM to Solana bridge fees', async () => {
      const amount = 1000000000000000000n;
      const fees = await bridge.estimateBridgeFees(BridgeChain.EVM, BridgeChain.SOLANA, amount);
      
      expect(fees.gasFee).toBe(50000n);
      expect(fees.bridgeFee).toBe(amount / 1000n);
      expect(fees.totalFee).toBe(fees.gasFee + fees.bridgeFee);
      expect(fees.estimatedTime).toBe(300);
    });

    it('should estimate Solana to EVM bridge fees', async () => {
      const amount = 1000000000000000000n;
      const fees = await bridge.estimateBridgeFees(BridgeChain.SOLANA, BridgeChain.EVM, amount);
      
      expect(fees.gasFee).toBe(5000n);
      expect(fees.bridgeFee).toBe(amount / 1000n);
      expect(fees.totalFee).toBe(fees.gasFee + fees.bridgeFee);
      expect(fees.estimatedTime).toBe(60);
    });
  });
});

describe('BridgeRelayer', () => {
  let relayer: BridgeRelayer;
  let config: BridgeConfig;

  beforeEach(() => {
    config = BridgeFactory.createDefaultConfig();
    relayer = new BridgeRelayer(config);
  });

  describe('Transaction Submission', () => {
    it('should submit transaction to relayer', async () => {
      const transaction: BridgeTransaction = {
        id: 'test-transaction-id',
        type: BridgeType.LOCK_AND_MINT,
        fromChain: BridgeChain.EVM,
        toChain: BridgeChain.SOLANA,
        fromAddress: '0x123',
        toAddress: 'Solana123',
        amount: 1000000000000000000n,
        status: BridgeStatus.PENDING,
        createdAt: Date.now()
      };

      const relayerId = await relayer.submitTransaction(transaction);
      expect(relayerId).toBe(`relayer_${transaction.id}`);
    });

    it('should get transaction status', async () => {
      const transaction: BridgeTransaction = {
        id: 'test-transaction-id',
        type: BridgeType.LOCK_AND_MINT,
        fromChain: BridgeChain.EVM,
        toChain: BridgeChain.SOLANA,
        fromAddress: '0x123',
        toAddress: 'Solana123',
        amount: 1000000000000000000n,
        status: BridgeStatus.PENDING,
        createdAt: Date.now()
      };

      await relayer.submitTransaction(transaction);
      const status = await relayer.getTransactionStatus(transaction.id);
      expect(status).toBe(BridgeStatus.PENDING);
    });

    it('should get pending transactions', async () => {
      const transaction: BridgeTransaction = {
        id: 'test-transaction-id',
        type: BridgeType.LOCK_AND_MINT,
        fromChain: BridgeChain.EVM,
        toChain: BridgeChain.SOLANA,
        fromAddress: '0x123',
        toAddress: 'Solana123',
        amount: 1000000000000000000n,
        status: BridgeStatus.PENDING,
        createdAt: Date.now()
      };

      await relayer.submitTransaction(transaction);
      const pending = relayer.getPendingTransactions();
      expect(pending).toHaveLength(1);
      expect(pending[0].id).toBe(transaction.id);
    });
  });
});

describe('BridgeValidator', () => {
  let validator: BridgeValidator;
  let config: BridgeConfig;

  beforeEach(() => {
    config = BridgeFactory.createDefaultConfig();
    validator = new BridgeValidator(config);
  });

  describe('Proof Validation', () => {
    it('should validate EVM proof', async () => {
      const proof: BridgeProof = {
        transactionHash: '0x123',
        blockNumber: 12345,
        merkleProof: ['0x123', '0x456'],
        merkleRoot: '0xabcdef',
        chainId: 1,
        timestamp: Date.now()
      };

      const isValid = await validator.validateEVMProof(proof);
      expect(isValid).toBe(true);
    });

    it('should validate Solana proof', async () => {
      const proof: BridgeProof = {
        transactionHash: 'solana_123',
        blockNumber: 67890,
        merkleProof: ['solana_123', 'solana_456'],
        merkleRoot: 'solana_abcdef',
        chainId: 101,
        timestamp: Date.now()
      };

      const isValid = await validator.validateSolanaProof(proof);
      expect(isValid).toBe(true);
    });

    it('should validate cross-chain transaction', async () => {
      const transaction: BridgeTransaction = {
        id: 'test-transaction-id',
        type: BridgeType.LOCK_AND_MINT,
        fromChain: BridgeChain.EVM,
        toChain: BridgeChain.SOLANA,
        fromAddress: '0x123',
        toAddress: 'Solana123',
        amount: 1000000000000000000n,
        status: BridgeStatus.PENDING,
        createdAt: Date.now(),
        proof: JSON.stringify({
          transactionHash: '0x123',
          blockNumber: 12345,
          merkleProof: ['0x123', '0x456'],
          merkleRoot: '0xabcdef',
          chainId: 1,
          timestamp: Date.now()
        })
      };

      const isValid = await validator.validateTransaction(transaction);
      expect(isValid).toBe(true);
    });

    it('should reject transaction without proof', async () => {
      const transaction: BridgeTransaction = {
        id: 'test-transaction-id',
        type: BridgeType.LOCK_AND_MINT,
        fromChain: BridgeChain.EVM,
        toChain: BridgeChain.SOLANA,
        fromAddress: '0x123',
        toAddress: 'Solana123',
        amount: 1000000000000000000n,
        status: BridgeStatus.PENDING,
        createdAt: Date.now()
      };

      const isValid = await validator.validateTransaction(transaction);
      expect(isValid).toBe(false);
    });
  });
});

describe('BridgeFactory', () => {
  describe('Factory Methods', () => {
    it('should create cross-chain bridge', () => {
      const config = BridgeFactory.createDefaultConfig();
      const bridge = BridgeFactory.createBridge(config);
      expect(bridge).toBeInstanceOf(CrossChainBridge);
    });

    it('should create bridge relayer', () => {
      const config = BridgeFactory.createDefaultConfig();
      const relayer = BridgeFactory.createRelayer(config);
      expect(relayer).toBeInstanceOf(BridgeRelayer);
    });

    it('should create bridge validator', () => {
      const config = BridgeFactory.createDefaultConfig();
      const validator = BridgeFactory.createValidator(config);
      expect(validator).toBeInstanceOf(BridgeValidator);
    });
  });

  describe('Default Configuration', () => {
    it('should create default configuration', () => {
      const config = BridgeFactory.createDefaultConfig();
      
      expect(config.evm.rpcUrl).toBe('https://mainnet.infura.io/v3/YOUR_PROJECT_ID');
      expect(config.evm.confirmations).toBe(12);
      expect(config.solana.rpcUrl).toBe('https://api.mainnet-beta.solana.com');
      expect(config.solana.confirmations).toBe(32);
      expect(config.bitcoin.confirmations).toBe(6);
      expect(config.relayer.url).toBe('https://relayer.mycelia.com');
    });
  });
});

describe('BridgeUtils', () => {
  describe('Amount Conversion', () => {
    it('should convert amounts between different decimals', () => {
      const amount = 1000000000000000000n; // 1 token with 18 decimals
      
      // Convert to 9 decimals
      const converted = BridgeUtils.convertAmount(amount, 18, 9);
      expect(converted).toBe(1000000000n); // 1 token with 9 decimals
      
      // Convert back to 18 decimals
      const convertedBack = BridgeUtils.convertAmount(converted, 9, 18);
      expect(convertedBack).toBe(1000000000000000000n);
    });

    it('should handle same decimal places', () => {
      const amount = 1000000000000000000n;
      const converted = BridgeUtils.convertAmount(amount, 18, 18);
      expect(converted).toBe(amount);
    });
  });

  describe('Transaction Hash Generation', () => {
    it('should generate transaction hash', () => {
      const hash = BridgeUtils.generateTransactionHash(
        BridgeChain.EVM,
        BridgeChain.SOLANA,
        '0x123',
        'Solana123',
        1000000000000000000n,
        Date.now()
      );
      
      expect(hash).toBe('mock-hash-123456789');
    });
  });

  describe('Fee Calculation', () => {
    it('should calculate bridge fees', () => {
      const amount = 1000000000000000000n; // 1 BLOOM
      const fees = BridgeUtils.calculateBridgeFees(amount, 0.001); // 0.1% fee
      
      expect(fees).toBe(1000000000000000n); // 0.001 BLOOM
    });

    it('should handle zero fee rate', () => {
      const amount = 1000000000000000000n;
      const fees = BridgeUtils.calculateBridgeFees(amount, 0);
      
      expect(fees).toBe(0n);
    });
  });

  describe('Transaction Formatting', () => {
    it('should format transaction for display', () => {
      const transaction: BridgeTransaction = {
        id: 'test-transaction-id',
        type: BridgeType.LOCK_AND_MINT,
        fromChain: BridgeChain.EVM,
        toChain: BridgeChain.SOLANA,
        fromAddress: '0x123',
        toAddress: 'Solana123',
        amount: 1000000000000000000n,
        status: BridgeStatus.COMPLETED,
        createdAt: Date.now()
      };

      const formatted = BridgeUtils.formatTransaction(transaction);
      expect(formatted).toContain('Bridge lock_and_mint');
      expect(formatted).toContain('1000000000000000000 BLOOM');
      expect(formatted).toContain('from evm to solana');
      expect(formatted).toContain('(completed)');
    });
  });

  describe('Explorer URL Generation', () => {
    it('should generate bridge explorer URL', () => {
      const url = BridgeUtils.getBridgeExplorerUrl('test-transaction-id');
      expect(url).toBe('https://bridge.mycelia.com/transaction/test-transaction-id');
    });
  });
});
