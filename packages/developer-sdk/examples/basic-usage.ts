import { 
  MyceliaSDK, 
  setupMyceliaSDK, 
  CrossChainUtils,
  BlockchainNetwork 
} from '@mycelia/developer-sdk';

/**
 * Basic usage example for Mycelia Developer SDK
 * This demonstrates how to use the unified SDK for both EVM and Solana
 */

async function basicUsageExample() {
  console.log('🚀 Mycelia Developer SDK - Basic Usage Example\n');

  // Quick setup with both EVM and Solana
  const sdk = setupMyceliaSDK({
    evm: {
      rpcUrl: 'https://rpc.mycelia.com',
      bloomTokenAddress: '0xBloomToken1234567890123456789012345678901234',
      gasOracleAddress: '0xGasOracle1234567890123456789012345678901234'
    },
    solana: {
      rpcUrl: 'https://api.mycelia.com',
      bloomTokenMint: 'BloomToken1111111111111111111111111111111111111',
      rentOracleProgram: 'RentOracle111111111111111111111111111111111111'
    }
  });

  // Create EVM wallet
  console.log('📱 Creating EVM wallet...');
  const evmWallet = sdk.createEVMWallet(
    '0x1234567890123456789012345678901234567890123456789012345678901234'
  );
  
  console.log(`EVM Wallet Address: ${evmWallet.address}`);
  console.log(`Network: ${evmWallet.network}`);

  // Create Solana wallet
  console.log('\n🔗 Creating Solana wallet...');
  const solanaWallet = sdk.createSolanaWallet(
    new Uint8Array(64).fill(1) // Example private key
  );
  
  console.log(`Solana Wallet Address: ${solanaWallet.address}`);
  console.log(`Network: ${solanaWallet.network}`);

  // Get BLOOM balances
  console.log('\n💰 Getting BLOOM balances...');
  
  const evmBalance = await evmWallet.getBloomBalance();
  const evmBtcBalance = await evmWallet.getBloomBalanceInBtc();
  
  const solanaBalance = await solanaWallet.getBloomBalance();
  const solanaBtcBalance = await solanaWallet.getBloomBalanceInBtc();

  console.log(`EVM BLOOM Balance: ${CrossChainUtils.formatBloomAmount(evmBalance)} BLOOM`);
  console.log(`EVM BTC Equivalent: ${evmBtcBalance.toFixed(8)} BTC`);
  console.log(`Solana BLOOM Balance: ${CrossChainUtils.formatBloomAmount(solanaBalance)} BLOOM`);
  console.log(`Solana BTC Equivalent: ${solanaBtcBalance.toFixed(8)} BTC`);

  // Get network information
  console.log('\n🌐 Getting network information...');
  const networkInfo = await sdk.getNetworkInfo();
  
  console.log('Network Info:', JSON.stringify(networkInfo, null, 2));

  // Send BLOOM tokens (example)
  console.log('\n💸 Sending BLOOM tokens...');
  
  try {
    const sendAmount = CrossChainUtils.parseBloomAmount('0.1'); // 0.1 BLOOM
    const txHash = await evmWallet.sendBloom(
      '0x742d35Cc6634C0532925a3b8D4C9db96C4b9b8C1', // Example recipient
      sendAmount
    );
    
    console.log(`Transaction sent: ${txHash}`);
    console.log(`Explorer URL: ${CrossChainUtils.getExplorerUrl(txHash, BlockchainNetwork.EVM)}`);
  } catch (error) {
    console.log('Send failed (expected in demo):', error);
  }

  // Get all wallets
  console.log('\n👥 All wallets:');
  const allWallets = sdk.getAllWallets();
  allWallets.forEach((wallet, index) => {
    console.log(`${index + 1}. ${wallet.address} (${wallet.network})`);
  });

  console.log('\n✅ Basic usage example completed!');
}

/**
 * React hook usage example
 */
export function ReactUsageExample() {
  const { sdk, wallets, networkInfo, createEVMWallet, createSolanaWallet } = useMyceliaSDK();

  const handleCreateEVMWallet = () => {
    const wallet = createEVMWallet('0x1234567890123456789012345678901234567890123456789012345678901234');
    console.log('Created EVM wallet:', wallet.address);
  };

  const handleCreateSolanaWallet = () => {
    const wallet = createSolanaWallet(new Uint8Array(64).fill(1));
    console.log('Created Solana wallet:', wallet.address);
  };

  return {
    wallets,
    networkInfo,
    handleCreateEVMWallet,
    handleCreateSolanaWallet
  };
}

/**
 * Wallet hook usage example
 */
export function WalletUsageExample() {
  const { sdk } = useMyceliaSDK();
  const evmWallet = sdk.createEVMWallet('0x1234567890123456789012345678901234567890123456789012345678901234');
  
  const { balance, btcBalance, loading, sendBloom } = useWallet(evmWallet);

  const handleSendBloom = async () => {
    try {
      const txHash = await sendBloom(
        '0x742d35Cc6634C0532925a3b8D4C9db96C4b9b8C1',
        CrossChainUtils.parseBloomAmount('0.1')
      );
      console.log('Sent BLOOM:', txHash);
    } catch (error) {
      console.error('Failed to send BLOOM:', error);
    }
  };

  return {
    balance: CrossChainUtils.formatBloomAmount(balance),
    btcBalance: btcBalance.toFixed(8),
    loading,
    handleSendBloom
  };
}

// Run the example if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  basicUsageExample().catch(console.error);
}
