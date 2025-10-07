import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  CrossChainWalletManager,
  EVMWalletManager,
  SolanaWalletManager,
  WalletType,
  WalletStatus,
  WalletEventListener,
  type WalletState,
  type CrossChainWalletState,
  type WalletInfo
} from './index';

/**
 * React hook for EVM wallet management
 */
export function useEVMWallet() {
  const [manager] = useState(() => new EVMWalletManager());
  const [state, setState] = useState<WalletState>({ status: WalletStatus.DISCONNECTED });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connectMetaMask = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const newState = await manager.connectMetaMask();
      setState(newState);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect MetaMask');
    } finally {
      setIsLoading(false);
    }
  }, [manager]);

  const connectCoinbase = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const newState = await manager.connectCoinbase();
      setState(newState);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect Coinbase');
    } finally {
      setIsLoading(false);
    }
  }, [manager]);

  const disconnect = useCallback(async () => {
    setIsLoading(true);
    try {
      await manager.disconnect();
      setState({ status: WalletStatus.DISCONNECTED });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect');
    } finally {
      setIsLoading(false);
    }
  }, [manager]);

  const getBloomBalance = useCallback(async () => {
    try {
      return await manager.getBloomBalance();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get balance');
      return 0n;
    }
  }, [manager]);

  const getBloomBalanceInBtc = useCallback(async () => {
    try {
      return await manager.getBloomBalanceInBtc();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get BTC balance');
      return 0;
    }
  }, [manager]);

  const sendBloom = useCallback(async (to: string, amount: bigint) => {
    try {
      return await manager.sendBloom(to, amount);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send BLOOM');
      throw err;
    }
  }, [manager]);

  useEffect(() => {
    const listener: WalletEventListener = (event) => {
      if (event.type === 'connect' || event.type === 'disconnect' || event.type === 'error') {
        setState(manager.getState());
      }
    };

    manager.addEventListener(listener);
    setState(manager.getState());

    return () => {
      manager.removeEventListener(listener);
    };
  }, [manager]);

  return {
    state,
    isLoading,
    error,
    connectMetaMask,
    connectCoinbase,
    disconnect,
    getBloomBalance,
    getBloomBalanceInBtc,
    sendBloom,
    isConnected: state.status === WalletStatus.CONNECTED,
    address: state.address,
    balance: state.balance
  };
}

/**
 * React hook for Solana wallet management
 */
export function useSolanaWallet() {
  const [manager] = useState(() => new SolanaWalletManager());
  const [state, setState] = useState<WalletState>({ status: WalletStatus.DISCONNECTED });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connectPhantom = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const newState = await manager.connectPhantom();
      setState(newState);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect Phantom');
    } finally {
      setIsLoading(false);
    }
  }, [manager]);

  const connectSolflare = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const newState = await manager.connectSolflare();
      setState(newState);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect Solflare');
    } finally {
      setIsLoading(false);
    }
  }, [manager]);

  const connectBackpack = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const newState = await manager.connectBackpack();
      setState(newState);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect Backpack');
    } finally {
      setIsLoading(false);
    }
  }, [manager]);

  const disconnect = useCallback(async () => {
    setIsLoading(true);
    try {
      await manager.disconnect();
      setState({ status: WalletStatus.DISCONNECTED });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect');
    } finally {
      setIsLoading(false);
    }
  }, [manager]);

  const getBloomBalance = useCallback(async () => {
    try {
      return await manager.getBloomBalance();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get balance');
      return 0n;
    }
  }, [manager]);

  const getBloomBalanceInBtc = useCallback(async () => {
    try {
      return await manager.getBloomBalanceInBtc();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get BTC balance');
      return 0;
    }
  }, [manager]);

  const sendBloom = useCallback(async (to: string, amount: bigint) => {
    try {
      // Convert string to PublicKey
      const { PublicKey } = await import('@solana/web3.js');
      const publicKey = new PublicKey(to);
      return await manager.sendBloom(publicKey, amount);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send BLOOM');
      throw err;
    }
  }, [manager]);

  useEffect(() => {
    const listener: WalletEventListener = (event) => {
      if (event.type === 'connect' || event.type === 'disconnect' || event.type === 'error') {
        setState(manager.getState());
      }
    };

    manager.addEventListener(listener);
    setState(manager.getState());

    return () => {
      manager.removeEventListener(listener);
    };
  }, [manager]);

  return {
    state,
    isLoading,
    error,
    connectPhantom,
    connectSolflare,
    connectBackpack,
    disconnect,
    getBloomBalance,
    getBloomBalanceInBtc,
    sendBloom,
    isConnected: state.status === WalletStatus.CONNECTED,
    publicKey: state.publicKey,
    balance: state.balance
  };
}

/**
 * React hook for cross-chain wallet management
 */
export function useCrossChainWallet(sdkConfig?: any, bridgeConfig?: any) {
  const [manager] = useState(() => new CrossChainWalletManager(sdkConfig, bridgeConfig));
  const [state, setState] = useState<CrossChainWalletState>({
    evm: { status: WalletStatus.DISCONNECTED },
    solana: { status: WalletStatus.DISCONNECTED }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connectEVM = useCallback(async (walletType: WalletType) => {
    setIsLoading(true);
    setError(null);
    try {
      const newState = await manager.connectEVM(walletType);
      setState(manager.getState());
      return newState;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect EVM wallet');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [manager]);

  const connectSolana = useCallback(async (walletType: WalletType) => {
    setIsLoading(true);
    setError(null);
    try {
      const newState = await manager.connectSolana(walletType);
      setState(manager.getState());
      return newState;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect Solana wallet');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [manager]);

  const disconnectEVM = useCallback(async () => {
    setIsLoading(true);
    try {
      await manager.disconnectEVM();
      setState(manager.getState());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect EVM wallet');
    } finally {
      setIsLoading(false);
    }
  }, [manager]);

  const disconnectSolana = useCallback(async () => {
    setIsLoading(true);
    try {
      await manager.disconnectSolana();
      setState(manager.getState());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect Solana wallet');
    } finally {
      setIsLoading(false);
    }
  }, [manager]);

  const disconnectAll = useCallback(async () => {
    setIsLoading(true);
    try {
      await manager.disconnectAll();
      setState(manager.getState());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect wallets');
    } finally {
      setIsLoading(false);
    }
  }, [manager]);

  const getTotalBloomBalance = useCallback(async () => {
    try {
      return await manager.getTotalBloomBalance();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get total balance');
      return 0n;
    }
  }, [manager]);

  const getTotalBloomBalanceInBtc = useCallback(async () => {
    try {
      return await manager.getTotalBloomBalanceInBtc();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get total BTC balance');
      return 0;
    }
  }, [manager]);

  const crossChainTransfer = useCallback(async (
    fromChain: any,
    toChain: any,
    toAddress: string,
    amount: bigint
  ) => {
    try {
      return await manager.crossChainTransfer(fromChain, toChain, toAddress, amount);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to perform cross-chain transfer');
      throw err;
    }
  }, [manager]);

  const availableWallets = useMemo(() => {
    return manager.getAvailableWallets();
  }, [manager]);

  useEffect(() => {
    const listener: WalletEventListener = (event) => {
      setState(manager.getState());
    };

    manager.addEventListener(listener);
    setState(manager.getState());

    return () => {
      manager.removeEventListener(listener);
    };
  }, [manager]);

  return {
    state,
    isLoading,
    error,
    connectEVM,
    connectSolana,
    disconnectEVM,
    disconnectSolana,
    disconnectAll,
    getTotalBloomBalance,
    getTotalBloomBalanceInBtc,
    crossChainTransfer,
    availableWallets,
    isEVMConnected: state.evm.status === WalletStatus.CONNECTED,
    isSolanaConnected: state.solana.status === WalletStatus.CONNECTED,
    evmAddress: state.evm.address,
    solanaPublicKey: state.solana.publicKey,
    bridge: state.bridge
  };
}

/**
 * React hook for wallet detection
 */
export function useWalletDetection() {
  const [availableWallets, setAvailableWallets] = useState<WalletInfo[]>([]);

  useEffect(() => {
    const manager = new CrossChainWalletManager();
    setAvailableWallets(manager.getAvailableWallets());
  }, []);

  const isWalletInstalled = useCallback((walletType: WalletType) => {
    return availableWallets.find(w => w.type === walletType)?.installed || false;
  }, [availableWallets]);

  const getWalletInfo = useCallback((walletType: WalletType) => {
    return availableWallets.find(w => w.type === walletType);
  }, [availableWallets]);

  return {
    availableWallets,
    isWalletInstalled,
    getWalletInfo
  };
}

/**
 * React hook for wallet balance monitoring
 */
export function useWalletBalance(walletType: 'evm' | 'solana' | 'both') {
  const evmWallet = useEVMWallet();
  const solanaWallet = useSolanaWallet();
  const crossChainWallet = useCrossChainWallet();

  const [balance, setBalance] = useState<bigint>(0n);
  const [btcEquivalent, setBtcEquivalent] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);

  const refreshBalance = useCallback(async () => {
    setIsLoading(true);
    try {
      let newBalance = 0n;
      let newBtcEquivalent = 0;

      if (walletType === 'evm' || walletType === 'both') {
        if (evmWallet.isConnected) {
          const evmBalance = await evmWallet.getBloomBalance();
          const evmBtc = await evmWallet.getBloomBalanceInBtc();
          newBalance += evmBalance;
          newBtcEquivalent += evmBtc;
        }
      }

      if (walletType === 'solana' || walletType === 'both') {
        if (solanaWallet.isConnected) {
          const solanaBalance = await solanaWallet.getBloomBalance();
          const solanaBtc = await solanaWallet.getBloomBalanceInBtc();
          newBalance += solanaBalance;
          newBtcEquivalent += solanaBtc;
        }
      }

      if (walletType === 'both') {
        const totalBalance = await crossChainWallet.getTotalBloomBalance();
        const totalBtc = await crossChainWallet.getTotalBloomBalanceInBtc();
        newBalance = totalBalance;
        newBtcEquivalent = totalBtc;
      }

      setBalance(newBalance);
      setBtcEquivalent(newBtcEquivalent);
    } catch (error) {
      console.error('Failed to refresh balance:', error);
    } finally {
      setIsLoading(false);
    }
  }, [walletType, evmWallet, solanaWallet, crossChainWallet]);

  useEffect(() => {
    refreshBalance();
  }, [refreshBalance]);

  return {
    balance,
    btcEquivalent,
    isLoading,
    refreshBalance
  };
}
