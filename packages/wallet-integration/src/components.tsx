import React, { useState, useCallback } from 'react';
import {
  WalletType,
  WalletStatus,
  WalletUtils,
  type WalletInfo
} from './index';
import { useEVMWallet, useSolanaWallet, useCrossChainWallet, useWalletDetection } from './hooks';

/**
 * Wallet connection button component
 */
export interface WalletButtonProps {
  walletType: WalletType;
  onConnect?: (walletType: WalletType) => void;
  onDisconnect?: (walletType: WalletType) => void;
  className?: string;
  disabled?: boolean;
}

export function WalletButton({ 
  walletType, 
  onConnect, 
  onDisconnect, 
  className = '',
  disabled = false 
}: WalletButtonProps) {
  const evmWallet = useEVMWallet();
  const solanaWallet = useSolanaWallet();
  const { isWalletInstalled } = useWalletDetection();

  const isInstalled = isWalletInstalled(walletType);
  const isEVMWallet = [WalletType.METAMASK, WalletType.COINBASE].includes(walletType);
  const isSolanaWallet = [WalletType.PHANTOM, WalletType.SOLFLARE, WalletType.BACKPACK].includes(walletType);

  const getWalletState = () => {
    if (isEVMWallet) {
      return evmWallet.state;
    } else if (isSolanaWallet) {
      return solanaWallet.state;
    }
    return { status: WalletStatus.DISCONNECTED };
  };

  const handleConnect = useCallback(async () => {
    try {
      if (isEVMWallet) {
        if (walletType === WalletType.METAMASK) {
          await evmWallet.connectMetaMask();
        } else if (walletType === WalletType.COINBASE) {
          await evmWallet.connectCoinbase();
        }
      } else if (isSolanaWallet) {
        if (walletType === WalletType.PHANTOM) {
          await solanaWallet.connectPhantom();
        } else if (walletType === WalletType.SOLFLARE) {
          await solanaWallet.connectSolflare();
        } else if (walletType === WalletType.BACKPACK) {
          await solanaWallet.connectBackpack();
        }
      }
      onConnect?.(walletType);
    } catch (error) {
      console.error(`Failed to connect ${walletType}:`, error);
    }
  }, [walletType, isEVMWallet, isSolanaWallet, evmWallet, solanaWallet, onConnect]);

  const handleDisconnect = useCallback(async () => {
    try {
      if (isEVMWallet) {
        await evmWallet.disconnect();
      } else if (isSolanaWallet) {
        await solanaWallet.disconnect();
      }
      onDisconnect?.(walletType);
    } catch (error) {
      console.error(`Failed to disconnect ${walletType}:`, error);
    }
  }, [walletType, isEVMWallet, isSolanaWallet, evmWallet, solanaWallet, onDisconnect]);

  const walletState = getWalletState();
  const isConnected = walletState.status === WalletStatus.CONNECTED;
  const isLoading = walletState.status === WalletStatus.CONNECTING;

  const getWalletName = () => {
    const names: Record<WalletType, string> = {
      [WalletType.METAMASK]: 'MetaMask',
      [WalletType.PHANTOM]: 'Phantom',
      [WalletType.SOLFLARE]: 'Solflare',
      [WalletType.BACKPACK]: 'Backpack',
      [WalletType.COINBASE]: 'Coinbase',
      [WalletType.WALLETCONNECT]: 'WalletConnect'
    };
    return names[walletType];
  };

  const getWalletIcon = () => {
    const icons: Record<WalletType, string> = {
      [WalletType.METAMASK]: '🦊',
      [WalletType.PHANTOM]: '👻',
      [WalletType.SOLFLARE]: '☀️',
      [WalletType.BACKPACK]: '🎒',
      [WalletType.COINBASE]: '🔵',
      [WalletType.WALLETCONNECT]: '🔗'
    };
    return icons[walletType];
  };

  if (!isInstalled) {
    return (
      <button
        className={`wallet-button wallet-button--not-installed ${className}`}
        onClick={() => window.open(WalletUtils.getWalletDownloadUrl(walletType), '_blank')}
        disabled={disabled}
      >
        <span className="wallet-button__icon">{getWalletIcon()}</span>
        <span className="wallet-button__text">Install {getWalletName()}</span>
      </button>
    );
  }

  if (isConnected) {
    const address = isEVMWallet ? evmWallet.address : solanaWallet.publicKey?.toBase58();
    return (
      <div className={`wallet-button wallet-button--connected ${className}`}>
        <button
          className="wallet-button__connect"
          onClick={handleDisconnect}
          disabled={disabled || isLoading}
        >
          <span className="wallet-button__icon">{getWalletIcon()}</span>
          <span className="wallet-button__text">
            {address ? WalletUtils.formatAddress(address) : getWalletName()}
          </span>
        </button>
      </div>
    );
  }

  return (
    <button
      className={`wallet-button wallet-button--disconnected ${className}`}
      onClick={handleConnect}
      disabled={disabled || isLoading}
    >
      <span className="wallet-button__icon">{getWalletIcon()}</span>
      <span className="wallet-button__text">
        {isLoading ? 'Connecting...' : `Connect ${getWalletName()}`}
      </span>
    </button>
  );
}

/**
 * Wallet selector component
 */
export interface WalletSelectorProps {
  onWalletSelect?: (walletType: WalletType) => void;
  className?: string;
  showEVM?: boolean;
  showSolana?: boolean;
}

export function WalletSelector({ 
  onWalletSelect, 
  className = '',
  showEVM = true,
  showSolana = true
}: WalletSelectorProps) {
  const { availableWallets } = useWalletDetection();
  const [selectedWallet, setSelectedWallet] = useState<WalletType | null>(null);

  const filteredWallets = availableWallets.filter(wallet => {
    if (!showEVM && [WalletType.METAMASK, WalletType.COINBASE].includes(wallet.type)) {
      return false;
    }
    if (!showSolana && [WalletType.PHANTOM, WalletType.SOLFLARE, WalletType.BACKPACK].includes(wallet.type)) {
      return false;
    }
    return true;
  });

  const handleWalletSelect = useCallback((walletType: WalletType) => {
    setSelectedWallet(walletType);
    onWalletSelect?.(walletType);
  }, [onWalletSelect]);

  return (
    <div className={`wallet-selector ${className}`}>
      <h3 className="wallet-selector__title">Select Wallet</h3>
      <div className="wallet-selector__grid">
        {filteredWallets.map(wallet => (
          <WalletButton
            key={wallet.type}
            walletType={wallet.type}
            onConnect={handleWalletSelect}
            className={`wallet-selector__button ${
              selectedWallet === wallet.type ? 'wallet-selector__button--selected' : ''
            }`}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Wallet status component
 */
export interface WalletStatusProps {
  walletType: WalletType;
  className?: string;
  showBalance?: boolean;
  showBtcEquivalent?: boolean;
}

export function WalletStatus({ 
  walletType, 
  className = '',
  showBalance = true,
  showBtcEquivalent = true
}: WalletStatusProps) {
  const evmWallet = useEVMWallet();
  const solanaWallet = useSolanaWallet();
  const [balance, setBalance] = useState<bigint>(0n);
  const [btcEquivalent, setBtcEquivalent] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);

  const isEVMWallet = [WalletType.METAMASK, WalletType.COINBASE].includes(walletType);
  const isSolanaWallet = [WalletType.PHANTOM, WalletType.SOLFLARE, WalletType.BACKPACK].includes(walletType);

  const getWalletState = () => {
    if (isEVMWallet) {
      return evmWallet.state;
    } else if (isSolanaWallet) {
      return solanaWallet.state;
    }
    return { status: WalletStatus.DISCONNECTED };
  };

  const refreshBalance = useCallback(async () => {
    const walletState = getWalletState();
    if (walletState.status !== WalletStatus.CONNECTED) {
      setBalance(0n);
      setBtcEquivalent(0);
      return;
    }

    setIsLoading(true);
    try {
      let newBalance = 0n;
      let newBtcEquivalent = 0;

      if (isEVMWallet) {
        newBalance = await evmWallet.getBloomBalance();
        newBtcEquivalent = await evmWallet.getBloomBalanceInBtc();
      } else if (isSolanaWallet) {
        newBalance = await solanaWallet.getBloomBalance();
        newBtcEquivalent = await solanaWallet.getBloomBalanceInBtc();
      }

      setBalance(newBalance);
      setBtcEquivalent(newBtcEquivalent);
    } catch (error) {
      console.error('Failed to refresh balance:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isEVMWallet, isSolanaWallet, evmWallet, solanaWallet]);

  React.useEffect(() => {
    refreshBalance();
  }, [refreshBalance]);

  const walletState = getWalletState();
  const isConnected = walletState.status === WalletStatus.CONNECTED;
  const address = isEVMWallet ? evmWallet.address : solanaWallet.publicKey?.toBase58();

  if (!isConnected) {
    return (
      <div className={`wallet-status wallet-status--disconnected ${className}`}>
        <span className="wallet-status__text">Wallet not connected</span>
      </div>
    );
  }

  return (
    <div className={`wallet-status wallet-status--connected ${className}`}>
      <div className="wallet-status__header">
        <span className="wallet-status__address">
          {address ? WalletUtils.formatAddress(address) : 'Unknown address'}
        </span>
        <button 
          className="wallet-status__refresh"
          onClick={refreshBalance}
          disabled={isLoading}
        >
          {isLoading ? '⟳' : '↻'}
        </button>
      </div>
      
      {showBalance && (
        <div className="wallet-status__balance">
          <span className="wallet-status__balance-label">BLOOM:</span>
          <span className="wallet-status__balance-value">
            {WalletUtils.formatBloomAmount(balance)}
          </span>
        </div>
      )}
      
      {showBtcEquivalent && (
        <div className="wallet-status__btc">
          <span className="wallet-status__btc-label">BTC:</span>
          <span className="wallet-status__btc-value">
            {WalletUtils.formatBtcAmount(btcEquivalent)}
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Cross-chain wallet dashboard
 */
export interface CrossChainDashboardProps {
  className?: string;
  onTransfer?: (fromChain: string, toChain: string, amount: bigint) => void;
}

export function CrossChainDashboard({ 
  className = '',
  onTransfer
}: CrossChainDashboardProps) {
  const crossChainWallet = useCrossChainWallet();
  const [transferAmount, setTransferAmount] = useState<string>('');
  const [transferTo, setTransferTo] = useState<string>('');
  const [isTransferring, setIsTransferring] = useState(false);

  const handleTransfer = useCallback(async () => {
    if (!transferAmount || !transferTo) return;

    setIsTransferring(true);
    try {
      const amount = BigInt(transferAmount);
      // Mock cross-chain transfer - in real scenario, would use bridge
      console.log('Cross-chain transfer:', { amount, to: transferTo });
      onTransfer?.('evm', 'solana', amount);
    } catch (error) {
      console.error('Transfer failed:', error);
    } finally {
      setIsTransferring(false);
    }
  }, [transferAmount, transferTo, onTransfer]);

  return (
    <div className={`cross-chain-dashboard ${className}`}>
      <h3 className="cross-chain-dashboard__title">Cross-Chain Dashboard</h3>
      
      <div className="cross-chain-dashboard__wallets">
        <div className="cross-chain-dashboard__wallet">
          <h4>EVM Wallet</h4>
          <WalletStatus walletType={WalletType.METAMASK} />
        </div>
        
        <div className="cross-chain-dashboard__wallet">
          <h4>Solana Wallet</h4>
          <WalletStatus walletType={WalletType.PHANTOM} />
        </div>
      </div>

      <div className="cross-chain-dashboard__transfer">
        <h4>Cross-Chain Transfer</h4>
        <div className="cross-chain-dashboard__transfer-form">
          <input
            type="text"
            placeholder="Amount (BLOOM)"
            value={transferAmount}
            onChange={(e) => setTransferAmount(e.target.value)}
            className="cross-chain-dashboard__input"
          />
          <input
            type="text"
            placeholder="To Address"
            value={transferTo}
            onChange={(e) => setTransferTo(e.target.value)}
            className="cross-chain-dashboard__input"
          />
          <button
            onClick={handleTransfer}
            disabled={isTransferring || !transferAmount || !transferTo}
            className="cross-chain-dashboard__button"
          >
            {isTransferring ? 'Transferring...' : 'Transfer'}
          </button>
        </div>
      </div>

      <div className="cross-chain-dashboard__stats">
        <h4>Total Balance</h4>
        <div className="cross-chain-dashboard__total-balance">
          <span>BLOOM: {WalletUtils.formatBloomAmount(crossChainWallet.getTotalBloomBalance() || 0n)}</span>
          <span>BTC: {WalletUtils.formatBtcAmount(crossChainWallet.getTotalBloomBalanceInBtc() || 0)}</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Wallet provider component for React context
 */
export interface WalletProviderProps {
  children: React.ReactNode;
  sdkConfig?: any;
  bridgeConfig?: any;
}

export function WalletProvider({ children, sdkConfig, bridgeConfig }: WalletProviderProps) {
  return (
    <div className="wallet-provider">
      {children}
    </div>
  );
}
