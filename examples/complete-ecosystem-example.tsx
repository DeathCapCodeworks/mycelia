import React, { useState, useEffect } from 'react';
import { MyceliaSDK } from '@mycelia/developer-sdk';
import { bloomToSats, satsToBloom, assertPeg } from '@mycelia/tokenomics';
import { CrossChainBridge, BridgeFactory, BridgeChain } from '@mycelia/bridge-infrastructure';
import { MiningApplication, DEFAULT_IPFS_CONFIGS } from '@mycelia/mining-app';
import { SupplyLedger } from '@mycelia/shared-kernel';
import { StaticReserveFeed } from '@mycelia/proof-of-reserve';
import { EVMWalletManager, SolanaWalletManager, CrossChainWalletManager, WalletType } from '@mycelia/wallet-integration';

/**
 * Complete Mycelia Ecosystem Example
 * 
 * This example demonstrates the full Mycelia ecosystem including:
 * - BLOOM token operations with peg enforcement
 * - Cross-chain bridge functionality
 * - IPFS mining application
 * - Wallet integration (EVM and Solana)
 * - Real-time balance monitoring
 * - Transaction history
 */

// Configuration
const sdkConfig = {
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
};

const bridgeConfig = {
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

// Initialize core components
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

const sdk = new MyceliaSDK(sdkConfig);
const bridge = BridgeFactory.createBridge(bridgeConfig);
const miningApp = new MiningApplication(DEFAULT_IPFS_CONFIGS.LOCAL, supplyLedger, mintingFeeds);

// Wallet managers
const evmManager = new EVMWalletManager();
const solanaManager = new SolanaWalletManager();
const crossChainManager = new CrossChainWalletManager(sdkConfig, bridgeConfig);

export function CompleteMyceliaExample() {
  const [evmState, setEVMState] = useState(evmManager.getState());
  const [solanaState, setSolanaState] = useState(solanaManager.getState());
  const [crossChainState, setCrossChainState] = useState(crossChainManager.getState());
  const [miningStatus, setMiningStatus] = useState(miningApp.getMiningStatus());
  const [bridgeStats, setBridgeStats] = useState(bridge.getBridgeStatistics());
  const [transactions, setTransactions] = useState(bridge.getAllTransactions());
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize the ecosystem
  useEffect(() => {
    const initializeEcosystem = async () => {
      try {
        // Initialize mining application
        await miningApp.initialize();
        
        // Set up event listeners
        evmManager.addEventListener((event) => {
          setEVMState(evmManager.getState());
        });
        
        solanaManager.addEventListener((event) => {
          setSolanaState(solanaManager.getState());
        });
        
        crossChainManager.addEventListener((event) => {
          setCrossChainState(crossChainManager.getState());
        });
        
        setIsInitialized(true);
        console.log('Mycelia ecosystem initialized successfully');
      } catch (error) {
        console.error('Failed to initialize ecosystem:', error);
      }
    };

    initializeEcosystem();
  }, []);

  // Update mining status periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setMiningStatus(miningApp.getMiningStatus());
      setBridgeStats(bridge.getBridgeStatistics());
      setTransactions(bridge.getAllTransactions());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Wallet connection handlers
  const handleConnectMetaMask = async () => {
    try {
      await evmManager.connectMetaMask();
      setEVMState(evmManager.getState());
    } catch (error) {
      console.error('MetaMask connection failed:', error);
    }
  };

  const handleConnectPhantom = async () => {
    try {
      await solanaManager.connectPhantom();
      setSolanaState(solanaManager.getState());
    } catch (error) {
      console.error('Phantom connection failed:', error);
    }
  };

  const handleConnectCrossChain = async () => {
    try {
      await crossChainManager.connectEVM(WalletType.METAMASK);
      await crossChainManager.connectSolana(WalletType.PHANTOM);
      setCrossChainState(crossChainManager.getState());
    } catch (error) {
      console.error('Cross-chain connection failed:', error);
    }
  };

  // BLOOM token operations
  const handleSendBloom = async (to: string, amount: bigint) => {
    try {
      if (evmState.status === 'connected') {
        const txHash = await evmManager.sendBloom(to, amount);
        console.log('BLOOM sent:', txHash);
      }
    } catch (error) {
      console.error('Send BLOOM failed:', error);
    }
  };

  // Cross-chain transfer
  const handleCrossChainTransfer = async (fromChain: BridgeChain, toChain: BridgeChain, toAddress: string, amount: bigint) => {
    try {
      const transaction = await bridge.crossChainTransfer(
        fromChain,
        toChain,
        toAddress,
        amount,
        'sender-private-key'
      );
      
      console.log('Cross-chain transfer initiated:', transaction.id);
      
      // Subscribe to transaction updates
      bridge.subscribeToTransaction(transaction.id, (updatedTransaction) => {
        console.log(`Transaction ${updatedTransaction.id} updated:`, {
          status: updatedTransaction.status,
          timestamp: new Date(updatedTransaction.createdAt).toISOString()
        });
      });
    } catch (error) {
      console.error('Cross-chain transfer failed:', error);
    }
  };

  // Mining operations
  const handleStartMining = async () => {
    try {
      const session = await miningApp.startMiningSession('miner1', {
        storageUsed: 1024 * 1024 * 1024, // 1GB
        bandwidthUsed: 100 * 1024 * 1024 // 100MB
      });
      
      console.log('Mining session started:', session.id);
    } catch (error) {
      console.error('Start mining failed:', error);
    }
  };

  const handleProcessContribution = async (sessionId: string) => {
    try {
      const result = await miningApp.processContribution(sessionId, {
        content: 'Hello, Mycelia!',
        storageUsed: 1024 * 1024, // 1MB
        bandwidthUsed: 10 * 1024 * 1024 // 10MB
      });
      
      console.log('Contribution processed:', {
        cid: result.cid,
        rewards: result.rewards.toString()
      });
    } catch (error) {
      console.error('Process contribution failed:', error);
    }
  };

  // Peg demonstration
  const demonstratePeg = () => {
    const bloomAmount = 1000000000000000000n; // 1 BLOOM
    const sats = bloomToSats(bloomAmount);
    const btc = Number(sats) / 100_000_000;
    
    console.log('Peg Demonstration:', {
      bloom: bloomAmount.toString(),
      sats: sats.toString(),
      btc: btc,
      pegStatement: assertPeg()
    });
  };

  if (!isInitialized) {
    return <div>Initializing Mycelia ecosystem...</div>;
  }

  return (
    <div className="complete-mycelia-example">
      <header className="example-header">
        <h1>Mycelia Ecosystem - Complete Example</h1>
        <p>Demonstrating BLOOM token, cross-chain bridge, mining, and wallet integration</p>
      </header>

      <main className="example-main">
        {/* Peg Information */}
        <section className="peg-section">
          <h2>BLOOM Token Peg</h2>
          <div className="peg-info">
            <p><strong>Peg Statement:</strong> {assertPeg()}</p>
            <p><strong>Current Supply:</strong> {supplyLedger.currentSupply().toString()} BLOOM</p>
            <p><strong>Locked BTC:</strong> {reserveFeed.getLockedBtcSats().then(sats => sats.toString())} sats</p>
            <button onClick={demonstratePeg}>Demonstrate Peg</button>
          </div>
        </section>

        {/* Wallet Integration */}
        <section className="wallet-section">
          <h2>Wallet Integration</h2>
          
          <div className="wallet-group">
            <h3>EVM Wallets</h3>
            <button onClick={handleConnectMetaMask} disabled={evmState.status === 'connected'}>
              {evmState.status === 'connected' ? 'MetaMask Connected' : 'Connect MetaMask'}
            </button>
            
            {evmState.status === 'connected' && (
              <div className="wallet-info">
                <p>Address: {evmState.address}</p>
                <p>Balance: {evmState.balance?.toString()} BLOOM</p>
                <p>BTC Equivalent: {evmState.btcEquivalent} BTC</p>
              </div>
            )}
          </div>

          <div className="wallet-group">
            <h3>Solana Wallets</h3>
            <button onClick={handleConnectPhantom} disabled={solanaState.status === 'connected'}>
              {solanaState.status === 'connected' ? 'Phantom Connected' : 'Connect Phantom'}
            </button>
            
            {solanaState.status === 'connected' && (
              <div className="wallet-info">
                <p>Public Key: {solanaState.publicKey?.toBase58()}</p>
                <p>Balance: {solanaState.balance?.toString()} BLOOM</p>
                <p>BTC Equivalent: {solanaState.btcEquivalent} BTC</p>
              </div>
            )}
          </div>

          <div className="wallet-group">
            <h3>Cross-Chain Wallet</h3>
            <button onClick={handleConnectCrossChain}>
              Connect Cross-Chain
            </button>
            
            <div className="cross-chain-info">
              <p>EVM Connected: {crossChainState.evm.status === 'connected' ? 'Yes' : 'No'}</p>
              <p>Solana Connected: {crossChainState.solana.status === 'connected' ? 'Yes' : 'No'}</p>
            </div>
          </div>
        </section>

        {/* Cross-Chain Bridge */}
        <section className="bridge-section">
          <h2>Cross-Chain Bridge</h2>
          
          <div className="bridge-stats">
            <h3>Bridge Statistics</h3>
            <p>Total Transactions: {bridgeStats.totalTransactions}</p>
            <p>Total Volume: {bridgeStats.totalVolume.toString()} BLOOM</p>
            <p>Completed Transactions: {bridgeStats.completedTransactions}</p>
          </div>

          <div className="bridge-actions">
            <h3>Bridge Actions</h3>
            <button onClick={() => handleCrossChainTransfer(BridgeChain.EVM, BridgeChain.SOLANA, 'SolanaAddress', 1000000000000000000n)}>
              EVM → Solana Transfer
            </button>
            <button onClick={() => handleCrossChainTransfer(BridgeChain.SOLANA, BridgeChain.EVM, '0xEVMAddress', 1000000000000000000n)}>
              Solana → EVM Transfer
            </button>
          </div>

          <div className="transaction-history">
            <h3>Transaction History</h3>
            <ul>
              {transactions.slice(0, 5).map(tx => (
                <li key={tx.id}>
                  {tx.type} - {tx.fromChain} → {tx.toChain} - {tx.amount.toString()} BLOOM - {tx.status}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Mining Application */}
        <section className="mining-section">
          <h2>IPFS Mining Application</h2>
          
          <div className="mining-status">
            <h3>Mining Status</h3>
            <p>Is Mining: {miningStatus.isMining ? 'Yes' : 'No'}</p>
            <p>Active Sessions: {miningStatus.activeSessions}</p>
            <p>Total Rewards Earned: {miningStatus.totalRewardsEarned.toString()} BLOOM</p>
            <p>Total Storage Used: {miningStatus.totalStorageUsed} bytes</p>
            <p>Total Bandwidth Used: {miningStatus.totalBandwidthUsed} bytes</p>
          </div>

          <div className="mining-actions">
            <h3>Mining Actions</h3>
            <button onClick={handleStartMining}>
              Start Mining Session
            </button>
            <button onClick={() => handleProcessContribution('miner1')}>
              Process Contribution
            </button>
          </div>

          <div className="mining-sessions">
            <h3>Active Mining Sessions</h3>
            <ul>
              {miningApp.getAllMiningSessions().map(session => (
                <li key={session.id}>
                  Session {session.id} - {session.status} - {session.rewardsEarned.toString()} BLOOM
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* BLOOM Token Operations */}
        <section className="token-section">
          <h2>BLOOM Token Operations</h2>
          
          <div className="token-actions">
            <h3>Token Actions</h3>
            <button onClick={() => handleSendBloom('0xRecipientAddress', 1000000000000000000n)}>
              Send 1 BLOOM
            </button>
            <button onClick={() => handleSendBloom('0xRecipientAddress', 500000000000000000n)}>
              Send 0.5 BLOOM
            </button>
          </div>

          <div className="supply-info">
            <h3>Supply Information</h3>
            <p>Current Supply: {supplyLedger.currentSupply().toString()} BLOOM</p>
            <p>Mint History: {supplyLedger.getMintHistory().length} mints</p>
            <p>Burn History: {supplyLedger.getBurnHistory().length} burns</p>
          </div>
        </section>
      </main>

      <footer className="example-footer">
        <p>Mycelia Ecosystem - Complete Example</p>
        <p>Demonstrating the full power of the BLOOM token ecosystem</p>
      </footer>
    </div>
  );
}

// Export the component
export default CompleteMyceliaExample;

// Run the example if this file is executed directly
if (typeof window !== 'undefined') {
  const root = document.getElementById('root');
  if (root) {
    import('react-dom/client').then(({ createRoot }) => {
      const reactRoot = createRoot(root);
      reactRoot.render(<CompleteMyceliaExample />);
    });
  }
}
