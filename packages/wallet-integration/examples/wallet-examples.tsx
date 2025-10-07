import React, { useState, useCallback } from 'react';
import {
  WalletType,
  WalletStatus,
  WalletUtils,
  EVMWalletManager,
  SolanaWalletManager,
  CrossChainWalletManager
} from '@mycelia/wallet-integration';
import {
  WalletButton,
  WalletSelector,
  WalletStatus as WalletStatusComponent,
  CrossChainDashboard,
  WalletProvider
} from '@mycelia/wallet-integration';
import { useEVMWallet, useSolanaWallet, useCrossChainWallet } from '@mycelia/wallet-integration';

/**
 * Wallet Integration Examples
 * 
 * This example demonstrates how to use the Mycelia wallet integration
 * to connect to various EVM and Solana wallets.
 */

// Example configuration
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

/**
 * Example 1: Basic Wallet Connection
 */
export function BasicWalletExample() {
  const evmWallet = useEVMWallet();
  const solanaWallet = useSolanaWallet();

  const handleEVMConnect = useCallback(async () => {
    try {
      await evmWallet.connectMetaMask();
      console.log('EVM wallet connected:', evmWallet.address);
    } catch (error) {
      console.error('Failed to connect EVM wallet:', error);
    }
  }, [evmWallet]);

  const handleSolanaConnect = useCallback(async () => {
    try {
      await solanaWallet.connectPhantom();
      console.log('Solana wallet connected:', solanaWallet.publicKey?.toBase58());
    } catch (error) {
      console.error('Failed to connect Solana wallet:', error);
    }
  }, [solanaWallet]);

  return (
    <div className="basic-wallet-example">
      <h2>Basic Wallet Connection</h2>
      
      <div className="wallet-section">
        <h3>EVM Wallets</h3>
        <WalletButton 
          walletType={WalletType.METAMASK}
          onConnect={() => console.log('MetaMask connected')}
        />
        <WalletButton 
          walletType={WalletType.COINBASE}
          onConnect={() => console.log('Coinbase connected')}
        />
        
        {evmWallet.isConnected && (
          <WalletStatusComponent 
            walletType={WalletType.METAMASK}
            showBalance={true}
            showBtcEquivalent={true}
          />
        )}
      </div>

      <div className="wallet-section">
        <h3>Solana Wallets</h3>
        <WalletButton 
          walletType={WalletType.PHANTOM}
          onConnect={() => console.log('Phantom connected')}
        />
        <WalletButton 
          walletType={WalletType.SOLFLARE}
          onConnect={() => console.log('Solflare connected')}
        />
        <WalletButton 
          walletType={WalletType.BACKPACK}
          onConnect={() => console.log('Backpack connected')}
        />
        
        {solanaWallet.isConnected && (
          <WalletStatusComponent 
            walletType={WalletType.PHANTOM}
            showBalance={true}
            showBtcEquivalent={true}
          />
        )}
      </div>
    </div>
  );
}

/**
 * Example 2: Wallet Selector
 */
export function WalletSelectorExample() {
  const [selectedWallet, setSelectedWallet] = useState<WalletType | null>(null);

  const handleWalletSelect = useCallback((walletType: WalletType) => {
    setSelectedWallet(walletType);
    console.log('Selected wallet:', walletType);
  }, []);

  return (
    <div className="wallet-selector-example">
      <h2>Wallet Selector</h2>
      
      <WalletSelector 
        onWalletSelect={handleWalletSelect}
        showEVM={true}
        showSolana={true}
      />
      
      {selectedWallet && (
        <div className="selected-wallet">
          <p>Selected: {selectedWallet}</p>
          <WalletButton walletType={selectedWallet} />
        </div>
      )}
    </div>
  );
}

/**
 * Example 3: Cross-Chain Dashboard
 */
export function CrossChainDashboardExample() {
  const crossChainWallet = useCrossChainWallet(sdkConfig, bridgeConfig);
  const [transferHistory, setTransferHistory] = useState<Array<{
    id: string;
    from: string;
    to: string;
    amount: string;
    timestamp: number;
  }>>([]);

  const handleTransfer = useCallback(async (
    fromChain: string, 
    toChain: string, 
    amount: bigint
  ) => {
    try {
      console.log('Cross-chain transfer:', { fromChain, toChain, amount });
      
      // Add to transfer history
      setTransferHistory(prev => [...prev, {
        id: `transfer_${Date.now()}`,
        from: fromChain,
        to: toChain,
        amount: WalletUtils.formatBloomAmount(amount),
        timestamp: Date.now()
      }]);
    } catch (error) {
      console.error('Transfer failed:', error);
    }
  }, []);

  return (
    <div className="cross-chain-dashboard-example">
      <h2>Cross-Chain Dashboard</h2>
      
      <CrossChainDashboard 
        onTransfer={handleTransfer}
      />
      
      {transferHistory.length > 0 && (
        <div className="transfer-history">
          <h3>Transfer History</h3>
          <ul>
            {transferHistory.map(transfer => (
              <li key={transfer.id}>
                {transfer.amount} BLOOM from {transfer.from} to {transfer.to} at {new Date(transfer.timestamp).toLocaleString()}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/**
 * Example 4: Wallet Manager Usage
 */
export function WalletManagerExample() {
  const [evmManager] = useState(() => new EVMWalletManager());
  const [solanaManager] = useState(() => new SolanaWalletManager());
  const [crossChainManager] = useState(() => new CrossChainWalletManager(sdkConfig, bridgeConfig));
  
  const [evmState, setEVMState] = useState(evmManager.getState());
  const [solanaState, setSolanaState] = useState(solanaManager.getState());
  const [crossChainState, setCrossChainState] = useState(crossChainManager.getState());

  const handleEVMConnect = useCallback(async () => {
    try {
      await evmManager.connectMetaMask();
      setEVMState(evmManager.getState());
    } catch (error) {
      console.error('EVM connection failed:', error);
    }
  }, [evmManager]);

  const handleSolanaConnect = useCallback(async () => {
    try {
      await solanaManager.connectPhantom();
      setSolanaState(solanaManager.getState());
    } catch (error) {
      console.error('Solana connection failed:', error);
    }
  }, [solanaManager]);

  const handleCrossChainTransfer = useCallback(async () => {
    try {
      const fromChain = 'evm';
      const toChain = 'solana';
      const toAddress = 'SolanaWallet123456789012345678901234567890123456789';
      const amount = 1000000000000000000n; // 1 BLOOM

      const transactionId = await crossChainManager.crossChainTransfer(
        fromChain as any,
        toChain as any,
        toAddress,
        amount
      );

      console.log('Cross-chain transfer initiated:', transactionId);
    } catch (error) {
      console.error('Cross-chain transfer failed:', error);
    }
  }, [crossChainManager]);

  return (
    <div className="wallet-manager-example">
      <h2>Wallet Manager Usage</h2>
      
      <div className="wallet-status">
        <h3>EVM Wallet Status</h3>
        <p>Status: {evmState.status}</p>
        <p>Address: {evmState.address || 'Not connected'}</p>
        <p>Balance: {evmState.balance ? WalletUtils.formatBloomAmount(evmState.balance) : 'N/A'} BLOOM</p>
        <button onClick={handleEVMConnect} disabled={evmState.status === WalletStatus.CONNECTED}>
          {evmState.status === WalletStatus.CONNECTED ? 'Connected' : 'Connect MetaMask'}
        </button>
      </div>

      <div className="wallet-status">
        <h3>Solana Wallet Status</h3>
        <p>Status: {solanaState.status}</p>
        <p>Public Key: {solanaState.publicKey?.toBase58() || 'Not connected'}</p>
        <p>Balance: {solanaState.balance ? WalletUtils.formatBloomAmount(solanaState.balance) : 'N/A'} BLOOM</p>
        <button onClick={handleSolanaConnect} disabled={solanaState.status === WalletStatus.CONNECTED}>
          {solanaState.status === WalletStatus.CONNECTED ? 'Connected' : 'Connect Phantom'}
        </button>
      </div>

      <div className="cross-chain-actions">
        <h3>Cross-Chain Actions</h3>
        <button onClick={handleCrossChainTransfer}>
          Perform Cross-Chain Transfer
        </button>
        
        <div className="available-wallets">
          <h4>Available Wallets</h4>
          <ul>
            {crossChainManager.getAvailableWallets().map(wallet => (
              <li key={wallet.type}>
                {wallet.icon} {wallet.name} - {wallet.installed ? 'Installed' : 'Not Installed'}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

/**
 * Example 5: Wallet Utility Functions
 */
export function WalletUtilsExample() {
  const [address, setAddress] = useState('0x1234567890123456789012345678901234567890');
  const [amount, setAmount] = useState('1000000000000000000');
  const [btcAmount, setBtcAmount] = useState('0.1');

  const formattedAddress = WalletUtils.formatAddress(address, 6);
  const formattedAmount = WalletUtils.formatBloomAmount(BigInt(amount));
  const formattedBtcAmount = WalletUtils.formatBtcAmount(parseFloat(btcAmount));

  const isEVMValid = WalletUtils.validateAddress(address, 'evm');
  const isSolanaValid = WalletUtils.validateAddress('SolanaPublicKey123456789012345678901234567890123456789', 'solana');

  return (
    <div className="wallet-utils-example">
      <h2>Wallet Utility Functions</h2>
      
      <div className="address-formatting">
        <h3>Address Formatting</h3>
        <p>Original: {address}</p>
        <p>Formatted: {formattedAddress}</p>
      </div>

      <div className="amount-formatting">
        <h3>Amount Formatting</h3>
        <p>BLOOM Amount: {amount} → {formattedAmount}</p>
        <p>BTC Amount: {btcAmount} → {formattedBtcAmount}</p>
      </div>

      <div className="address-validation">
        <h3>Address Validation</h3>
        <p>EVM Address Valid: {isEVMValid ? 'Yes' : 'No'}</p>
        <p>Solana Address Valid: {isSolanaValid ? 'Yes' : 'No'}</p>
      </div>

      <div className="wallet-info">
        <h3>Wallet Information</h3>
        <p>MetaMask Icon: {WalletUtils.getWalletIconUrl(WalletType.METAMASK)}</p>
        <p>Phantom Download: {WalletUtils.getWalletDownloadUrl(WalletType.PHANTOM)}</p>
      </div>
    </div>
  );
}

/**
 * Main App Component
 */
export function WalletIntegrationApp() {
  const [currentExample, setCurrentExample] = useState<string>('basic');

  const examples = {
    basic: BasicWalletExample,
    selector: WalletSelectorExample,
    dashboard: CrossChainDashboardExample,
    manager: WalletManagerExample,
    utils: WalletUtilsExample
  };

  const CurrentExample = examples[currentExample as keyof typeof examples];

  return (
    <WalletProvider sdkConfig={sdkConfig} bridgeConfig={bridgeConfig}>
      <div className="wallet-integration-app">
        <header className="app-header">
          <h1>Mycelia Wallet Integration Examples</h1>
          <nav className="example-nav">
            {Object.keys(examples).map(example => (
              <button
                key={example}
                onClick={() => setCurrentExample(example)}
                className={currentExample === example ? 'active' : ''}
              >
                {example.charAt(0).toUpperCase() + example.slice(1)}
              </button>
            ))}
          </nav>
        </header>

        <main className="app-main">
          <CurrentExample />
        </main>

        <footer className="app-footer">
          <p>Mycelia Wallet Integration - Cross-Chain BLOOM Token Support</p>
        </footer>
      </div>
    </WalletProvider>
  );
}

// Export all examples
export {
  BasicWalletExample,
  WalletSelectorExample,
  CrossChainDashboardExample,
  WalletManagerExample,
  WalletUtilsExample,
  WalletIntegrationApp
};

// Run the app if this file is executed directly
if (typeof window !== 'undefined') {
  const root = document.getElementById('root');
  if (root) {
    import('react-dom/client').then(({ createRoot }) => {
      const reactRoot = createRoot(root);
      reactRoot.render(<WalletIntegrationApp />);
    });
  }
}
