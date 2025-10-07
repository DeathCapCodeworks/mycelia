import {
  CrossChainBridge,
  BridgeFactory,
  BridgeChain,
  BridgeType,
  BridgeStatus,
  type BridgeConfig,
  type BridgeTransaction
} from '@mycelia/bridge-infrastructure';
import { MyceliaSDK } from '@mycelia/developer-sdk';
import { bloomToSats, satsToBloom } from '@mycelia/tokenomics';

/**
 * Bridge Infrastructure Example
 * 
 * This example demonstrates how to use the Mycelia cross-chain bridge
 * to transfer BLOOM tokens between EVM and Solana chains.
 */

// Example configuration
const bridgeConfig: BridgeConfig = {
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
};

/**
 * Example 1: Basic Cross-Chain Transfer
 */
async function basicCrossChainTransfer() {
  console.log('=== Basic Cross-Chain Transfer ===');
  
  const bridge = BridgeFactory.createBridge(bridgeConfig);
  
  // EVM to Solana transfer
  const fromAddress = '0x1234567890123456789012345678901234567890';
  const toAddress = 'SolanaWallet123456789012345678901234567890123456789';
  const amount = 1000000000000000000n; // 1 BLOOM
  const privateKey = '0x1234567890123456789012345678901234567890123456789012345678901234';
  
  try {
    console.log(`Transferring ${amount} BLOOM from EVM to Solana...`);
    
    const transaction = await bridge.crossChainTransfer(
      BridgeChain.EVM,
      BridgeChain.SOLANA,
      fromAddress,
      toAddress,
      amount,
      privateKey
    );
    
    console.log('Transfer completed:', {
      id: transaction.id,
      type: transaction.type,
      status: transaction.status,
      amount: transaction.amount,
      txHash: transaction.txHash
    });
    
    return transaction;
  } catch (error) {
    console.error('Transfer failed:', error);
    throw error;
  }
}

/**
 * Example 2: Lock and Mint (EVM to Solana)
 */
async function lockAndMintExample() {
  console.log('=== Lock and Mint Example ===');
  
  const bridge = BridgeFactory.createBridge(bridgeConfig);
  
  const fromAddress = '0x1234567890123456789012345678901234567890';
  const toAddress = 'SolanaWallet123456789012345678901234567890123456789';
  const amount = 2000000000000000000n; // 2 BLOOM
  const privateKey = '0x1234567890123456789012345678901234567890123456789012345678901234';
  
  try {
    console.log(`Locking ${amount} BLOOM on EVM and minting on Solana...`);
    
    const transaction = await bridge.lockAndMint(fromAddress, toAddress, amount, privateKey);
    
    console.log('Lock and mint completed:', {
      id: transaction.id,
      status: transaction.status,
      amount: transaction.amount,
      fromChain: transaction.fromChain,
      toChain: transaction.toChain,
      proof: transaction.proof ? 'Generated' : 'None'
    });
    
    return transaction;
  } catch (error) {
    console.error('Lock and mint failed:', error);
    throw error;
  }
}

/**
 * Example 3: Burn and Unlock (Solana to EVM)
 */
async function burnAndUnlockExample() {
  console.log('=== Burn and Unlock Example ===');
  
  const bridge = BridgeFactory.createBridge(bridgeConfig);
  
  const fromAddress = 'SolanaWallet123456789012345678901234567890123456789';
  const toAddress = '0x1234567890123456789012345678901234567890';
  const amount = 1500000000000000000n; // 1.5 BLOOM
  const privateKey = '0x1234567890123456789012345678901234567890123456789012345678901234';
  
  try {
    console.log(`Burning ${amount} BLOOM on Solana and unlocking on EVM...`);
    
    const transaction = await bridge.burnAndUnlock(fromAddress, toAddress, amount, privateKey);
    
    console.log('Burn and unlock completed:', {
      id: transaction.id,
      status: transaction.status,
      amount: transaction.amount,
      fromChain: transaction.fromChain,
      toChain: transaction.toChain,
      proof: transaction.proof ? 'Generated' : 'None'
    });
    
    return transaction;
  } catch (error) {
    console.error('Burn and unlock failed:', error);
    throw error;
  }
}

/**
 * Example 4: Bridge Statistics and Monitoring
 */
async function bridgeStatisticsExample() {
  console.log('=== Bridge Statistics Example ===');
  
  const bridge = BridgeFactory.createBridge(bridgeConfig);
  
  // Perform some transactions first
  await basicCrossChainTransfer();
  await lockAndMintExample();
  await burnAndUnlockExample();
  
  // Get bridge statistics
  const stats = bridge.getBridgeStatistics();
  console.log('Bridge Statistics:', {
    totalTransactions: stats.totalTransactions,
    totalVolume: stats.totalVolume.toString(),
    pendingTransactions: stats.pendingTransactions,
    completedTransactions: stats.completedTransactions,
    failedTransactions: stats.failedTransactions,
    averageTransactionTime: `${Math.round(stats.averageTransactionTime / 1000)}s`
  });
  
  // Get transactions by status
  const completedTransactions = bridge.getTransactionsByStatus(BridgeStatus.COMPLETED);
  console.log(`Completed transactions: ${completedTransactions.length}`);
  
  // Get transactions by chain
  const evmTransactions = bridge.getTransactionsByChain(BridgeChain.EVM);
  const solanaTransactions = bridge.getTransactionsByChain(BridgeChain.SOLANA);
  console.log(`EVM transactions: ${evmTransactions.length}`);
  console.log(`Solana transactions: ${solanaTransactions.length}`);
}

/**
 * Example 5: Fee Estimation
 */
async function feeEstimationExample() {
  console.log('=== Fee Estimation Example ===');
  
  const bridge = BridgeFactory.createBridge(bridgeConfig);
  
  const amount = 1000000000000000000n; // 1 BLOOM
  
  // Estimate EVM to Solana fees
  const evmToSolanaFees = await bridge.estimateBridgeFees(
    BridgeChain.EVM,
    BridgeChain.SOLANA,
    amount
  );
  
  console.log('EVM to Solana Fees:', {
    gasFee: evmToSolanaFees.gasFee.toString(),
    bridgeFee: evmToSolanaFees.bridgeFee.toString(),
    totalFee: evmToSolanaFees.totalFee.toString(),
    estimatedTime: `${evmToSolanaFees.estimatedTime}s`
  });
  
  // Estimate Solana to EVM fees
  const solanaToEvmFees = await bridge.estimateBridgeFees(
    BridgeChain.SOLANA,
    BridgeChain.EVM,
    amount
  );
  
  console.log('Solana to EVM Fees:', {
    gasFee: solanaToEvmFees.gasFee.toString(),
    bridgeFee: solanaToEvmFees.bridgeFee.toString(),
    totalFee: solanaToEvmFees.totalFee.toString(),
    estimatedTime: `${solanaToEvmFees.estimatedTime}s`
  });
}

/**
 * Example 6: Transaction Monitoring
 */
async function transactionMonitoringExample() {
  console.log('=== Transaction Monitoring Example ===');
  
  const bridge = BridgeFactory.createBridge(bridgeConfig);
  
  const fromAddress = '0x1234567890123456789012345678901234567890';
  const toAddress = 'SolanaWallet123456789012345678901234567890123456789';
  const amount = 500000000000000000n; // 0.5 BLOOM
  const privateKey = '0x1234567890123456789012345678901234567890123456789012345678901234';
  
  // Subscribe to transaction updates
  const transaction = await bridge.lockAndMint(fromAddress, toAddress, amount, privateKey);
  
  bridge.subscribeToTransaction(transaction.id, (updatedTransaction) => {
    console.log(`Transaction ${updatedTransaction.id} updated:`, {
      status: updatedTransaction.status,
      timestamp: new Date(updatedTransaction.createdAt).toISOString()
    });
  });
  
  // Get transaction details
  const transactionDetails = bridge.getTransaction(transaction.id);
  console.log('Transaction Details:', {
    id: transactionDetails?.id,
    type: transactionDetails?.type,
    status: transactionDetails?.status,
    amount: transactionDetails?.amount.toString(),
    fromChain: transactionDetails?.fromChain,
    toChain: transactionDetails?.toChain,
    createdAt: new Date(transactionDetails?.createdAt || 0).toISOString(),
    completedAt: transactionDetails?.completedAt 
      ? new Date(transactionDetails.completedAt).toISOString() 
      : 'Not completed'
  });
}

/**
 * Example 7: Peg Integration
 */
async function pegIntegrationExample() {
  console.log('=== Peg Integration Example ===');
  
  const bridge = BridgeFactory.createBridge(bridgeConfig);
  
  // Convert BLOOM to BTC using peg
  const bloomAmount = 1000000000000000000n; // 1 BLOOM
  const btcAmount = bloomToSats(bloomAmount);
  const btcDisplay = Number(btcAmount) / 100_000_000; // Convert to BTC
  
  console.log('Peg Conversion:', {
    bloomAmount: bloomAmount.toString(),
    btcAmount: btcAmount.toString(),
    btcDisplay: `${btcDisplay} BTC`,
    pegRatio: '10 BLOOM = 1 BTC'
  });
  
  // Convert BTC to BLOOM using peg
  const btcSats = 10000000n; // 0.1 BTC in sats
  const bloomFromBtc = satsToBloom(btcSats);
  
  console.log('Reverse Peg Conversion:', {
    btcSats: btcSats.toString(),
    bloomAmount: bloomFromBtc.toString(),
    btcDisplay: '0.1 BTC',
    pegRatio: '10 BLOOM = 1 BTC'
  });
}

/**
 * Example 8: Error Handling
 */
async function errorHandlingExample() {
  console.log('=== Error Handling Example ===');
  
  const bridge = BridgeFactory.createBridge(bridgeConfig);
  
  const fromAddress = '0x1234567890123456789012345678901234567890';
  const toAddress = 'SolanaWallet123456789012345678901234567890123456789';
  const amount = 2000000000000000000n; // 2 BLOOM (more than balance)
  const privateKey = '0x1234567890123456789012345678901234567890123456789012345678901234';
  
  try {
    console.log('Attempting transfer with insufficient balance...');
    await bridge.lockAndMint(fromAddress, toAddress, amount, privateKey);
  } catch (error) {
    console.log('Expected error caught:', error instanceof Error ? error.message : 'Unknown error');
  }
  
  try {
    console.log('Attempting unsupported cross-chain transfer...');
    await bridge.crossChainTransfer(
      BridgeChain.EVM,
      BridgeChain.EVM, // Same chain
      fromAddress,
      toAddress,
      amount,
      privateKey
    );
  } catch (error) {
    console.log('Expected error caught:', error instanceof Error ? error.message : 'Unknown error');
  }
}

/**
 * Main example runner
 */
async function runBridgeExamples() {
  console.log('🚀 Mycelia Bridge Infrastructure Examples\n');
  
  try {
    await basicCrossChainTransfer();
    console.log('');
    
    await lockAndMintExample();
    console.log('');
    
    await burnAndUnlockExample();
    console.log('');
    
    await bridgeStatisticsExample();
    console.log('');
    
    await feeEstimationExample();
    console.log('');
    
    await transactionMonitoringExample();
    console.log('');
    
    await pegIntegrationExample();
    console.log('');
    
    await errorHandlingExample();
    console.log('');
    
    console.log('✅ All bridge examples completed successfully!');
  } catch (error) {
    console.error('❌ Bridge examples failed:', error);
  }
}

// Export for use in other modules
export {
  basicCrossChainTransfer,
  lockAndMintExample,
  burnAndUnlockExample,
  bridgeStatisticsExample,
  feeEstimationExample,
  transactionMonitoringExample,
  pegIntegrationExample,
  errorHandlingExample,
  runBridgeExamples
};

// Run examples if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runBridgeExamples();
}
