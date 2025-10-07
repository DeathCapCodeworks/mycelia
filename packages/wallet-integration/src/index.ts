import { ethers } from 'ethers';
import { PublicKey, Connection, Keypair } from '@solana/web3.js';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { 
  MyceliaSDK, 
  type MyceliaSDKConfig,
  type IMyceliaWallet 
} from '@mycelia/developer-sdk';
import { 
  CrossChainBridge, 
  BridgeFactory, 
  BridgeChain,
  type BridgeConfig 
} from '@mycelia/bridge-infrastructure';
import { bloomToSats, satsToBloom } from '@mycelia/tokenomics';

/**
 * Supported wallet types
 */
export enum WalletType {
  METAMASK = 'metamask',
  PHANTOM = 'phantom',
  SOLFLARE = 'solflare',
  BACKPACK = 'backpack',
  COINBASE = 'coinbase',
  WALLETCONNECT = 'walletconnect'
}

/**
 * Wallet connection status
 */
export enum WalletStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  ERROR = 'error'
}

/**
 * Wallet information
 */
export interface WalletInfo {
  type: WalletType;
  name: string;
  icon: string;
  installed: boolean;
  supported: boolean;
}

/**
 * Wallet connection state
 */
export interface WalletState {
  status: WalletStatus;
  address?: string;
  publicKey?: PublicKey;
  balance?: bigint;
  btcEquivalent?: number;
  error?: string;
  connectedAt?: number;
}

/**
 * Cross-chain wallet state
 */
export interface CrossChainWalletState {
  evm: WalletState;
  solana: WalletState;
  bridge?: CrossChainBridge;
}

/**
 * Wallet event types
 */
export type WalletEventType = 
  | 'connect'
  | 'disconnect'
  | 'accountChanged'
  | 'balanceChanged'
  | 'error';

/**
 * Wallet event listener
 */
export type WalletEventListener = (event: {
  type: WalletEventType;
  wallet: WalletType;
  data?: any;
}) => void;

/**
 * EVM Wallet Manager
 */
export class EVMWalletManager {
  private provider?: ethers.BrowserProvider;
  private signer?: ethers.JsonRpcSigner;
  private listeners = new Map<WalletEventListener, WalletEventListener>();
  private state: WalletState = { status: WalletStatus.DISCONNECTED };

  constructor() {
    this.setupEventListeners();
  }

  /**
   * Connect to MetaMask
   */
  async connectMetaMask(): Promise<WalletState> {
    try {
      this.state.status = WalletStatus.CONNECTING;
      this.notifyListeners('connect', WalletType.METAMASK);

      if (!window.ethereum) {
        throw new Error('MetaMask not installed');
      }

      this.provider = new ethers.BrowserProvider(window.ethereum);
      this.signer = await this.provider.getSigner();
      
      const address = await this.signer.getAddress();
      const balance = await this.provider.getBalance(address);

      this.state = {
        status: WalletStatus.CONNECTED,
        address,
        balance,
        connectedAt: Date.now()
      };

      this.notifyListeners('connect', WalletType.METAMASK, this.state);
      return this.state;

    } catch (error) {
      this.state = {
        status: WalletStatus.ERROR,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      this.notifyListeners('error', WalletType.METAMASK, error);
      throw error;
    }
  }

  /**
   * Connect to Coinbase Wallet
   */
  async connectCoinbase(): Promise<WalletState> {
    try {
      this.state.status = WalletStatus.CONNECTING;
      this.notifyListeners('connect', WalletType.COINBASE);

      if (!window.ethereum?.isCoinbaseWallet) {
        throw new Error('Coinbase Wallet not installed');
      }

      this.provider = new ethers.BrowserProvider(window.ethereum);
      this.signer = await this.provider.getSigner();
      
      const address = await this.signer.getAddress();
      const balance = await this.provider.getBalance(address);

      this.state = {
        status: WalletStatus.CONNECTED,
        address,
        balance,
        connectedAt: Date.now()
      };

      this.notifyListeners('connect', WalletType.COINBASE, this.state);
      return this.state;

    } catch (error) {
      this.state = {
        status: WalletStatus.ERROR,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      this.notifyListeners('error', WalletType.COINBASE, error);
      throw error;
    }
  }

  /**
   * Disconnect wallet
   */
  async disconnect(): Promise<void> {
    this.state = { status: WalletStatus.DISCONNECTED };
    this.provider = undefined;
    this.signer = undefined;
    this.notifyListeners('disconnect', WalletType.METAMASK);
  }

  /**
   * Get current state
   */
  getState(): WalletState {
    return { ...this.state };
  }

  /**
   * Get BLOOM balance
   */
  async getBloomBalance(): Promise<bigint> {
    if (!this.signer || !this.state.address) {
      throw new Error('Wallet not connected');
    }

    // Mock implementation - in real scenario, would call BLOOM token contract
    return 1000000000000000000n; // 1 BLOOM
  }

  /**
   * Get BLOOM balance in BTC equivalent
   */
  async getBloomBalanceInBtc(): Promise<number> {
    const bloomBalance = await this.getBloomBalance();
    const sats = bloomToSats(bloomBalance);
    return Number(sats) / 100_000_000; // Convert to BTC
  }

  /**
   * Send BLOOM tokens
   */
  async sendBloom(to: string, amount: bigint): Promise<string> {
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }

    // Mock implementation - in real scenario, would call BLOOM token contract
    const tx = await this.signer.sendTransaction({
      to,
      value: amount,
      gasLimit: 21000
    });

    return tx.hash;
  }

  /**
   * Add event listener
   */
  addEventListener(listener: WalletEventListener): void {
    this.listeners.set(listener, listener);
  }

  /**
   * Remove event listener
   */
  removeEventListener(listener: WalletEventListener): void {
    this.listeners.delete(listener);
  }

  /**
   * Check if MetaMask is installed
   */
  static isMetaMaskInstalled(): boolean {
    return typeof window !== 'undefined' && !!window.ethereum?.isMetaMask;
  }

  /**
   * Check if Coinbase Wallet is installed
   */
  static isCoinbaseInstalled(): boolean {
    return typeof window !== 'undefined' && !!window.ethereum?.isCoinbaseWallet;
  }

  private setupEventListeners(): void {
    if (typeof window === 'undefined') return;

    // Listen for account changes
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length === 0) {
          this.disconnect();
        } else {
          this.state.address = accounts[0];
          this.notifyListeners('accountChanged', WalletType.METAMASK, accounts[0]);
        }
      });

      // Listen for chain changes
      window.ethereum.on('chainChanged', () => {
        this.notifyListeners('accountChanged', WalletType.METAMASK);
      });
    }
  }

  private notifyListeners(type: WalletEventType, wallet: WalletType, data?: any): void {
    this.listeners.forEach(listener => {
      listener({ type, wallet, data });
    });
  }
}

/**
 * Solana Wallet Manager
 */
export class SolanaWalletManager {
  private connection?: Connection;
  private publicKey?: PublicKey;
  private listeners = new Map<WalletEventListener, WalletEventListener>();
  private state: WalletState = { status: WalletStatus.DISCONNECTED };

  constructor(rpcUrl: string = 'https://api.mainnet-beta.solana.com') {
    this.connection = new Connection(rpcUrl, 'confirmed');
  }

  /**
   * Connect to Phantom
   */
  async connectPhantom(): Promise<WalletState> {
    try {
      this.state.status = WalletStatus.CONNECTING;
      this.notifyListeners('connect', WalletType.PHANTOM);

      if (!window.solana?.isPhantom) {
        throw new Error('Phantom wallet not installed');
      }

      const response = await window.solana.connect();
      this.publicKey = response.publicKey;
      
      const balance = await this.getBloomBalance();

      this.state = {
        status: WalletStatus.CONNECTED,
        publicKey: this.publicKey,
        balance,
        connectedAt: Date.now()
      };

      this.notifyListeners('connect', WalletType.PHANTOM, this.state);
      return this.state;

    } catch (error) {
      this.state = {
        status: WalletStatus.ERROR,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      this.notifyListeners('error', WalletType.PHANTOM, error);
      throw error;
    }
  }

  /**
   * Connect to Solflare
   */
  async connectSolflare(): Promise<WalletState> {
    try {
      this.state.status = WalletStatus.CONNECTING;
      this.notifyListeners('connect', WalletType.SOLFLARE);

      if (!window.solflare) {
        throw new Error('Solflare wallet not installed');
      }

      const response = await window.solflare.connect();
      this.publicKey = response.publicKey;
      
      const balance = await this.getBloomBalance();

      this.state = {
        status: WalletStatus.CONNECTED,
        publicKey: this.publicKey,
        balance,
        connectedAt: Date.now()
      };

      this.notifyListeners('connect', WalletType.SOLFLARE, this.state);
      return this.state;

    } catch (error) {
      this.state = {
        status: WalletStatus.ERROR,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      this.notifyListeners('error', WalletType.SOLFLARE, error);
      throw error;
    }
  }

  /**
   * Connect to Backpack
   */
  async connectBackpack(): Promise<WalletState> {
    try {
      this.state.status = WalletStatus.CONNECTING;
      this.notifyListeners('connect', WalletType.BACKPACK);

      if (!window.backpack) {
        throw new Error('Backpack wallet not installed');
      }

      const response = await window.backpack.connect();
      this.publicKey = response.publicKey;
      
      const balance = await this.getBloomBalance();

      this.state = {
        status: WalletStatus.CONNECTED,
        publicKey: this.publicKey,
        balance,
        connectedAt: Date.now()
      };

      this.notifyListeners('connect', WalletType.BACKPACK, this.state);
      return this.state;

    } catch (error) {
      this.state = {
        status: WalletStatus.ERROR,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      this.notifyListeners('error', WalletType.BACKPACK, error);
      throw error;
    }
  }

  /**
   * Disconnect wallet
   */
  async disconnect(): Promise<void> {
    if (window.solana?.disconnect) {
      await window.solana.disconnect();
    }
    
    this.state = { status: WalletStatus.DISCONNECTED };
    this.publicKey = undefined;
    this.notifyListeners('disconnect', WalletType.PHANTOM);
  }

  /**
   * Get current state
   */
  getState(): WalletState {
    return { ...this.state };
  }

  /**
   * Get BLOOM balance
   */
  async getBloomBalance(): Promise<bigint> {
    if (!this.publicKey || !this.connection) {
      throw new Error('Wallet not connected');
    }

    // Mock implementation - in real scenario, would call BLOOM token program
    return 2000000000000000000n; // 2 BLOOM
  }

  /**
   * Get BLOOM balance in BTC equivalent
   */
  async getBloomBalanceInBtc(): Promise<number> {
    const bloomBalance = await this.getBloomBalance();
    const sats = bloomToSats(bloomBalance);
    return Number(sats) / 100_000_000; // Convert to BTC
  }

  /**
   * Send BLOOM tokens
   */
  async sendBloom(to: PublicKey, amount: bigint): Promise<string> {
    if (!this.publicKey || !window.solana) {
      throw new Error('Wallet not connected');
    }

    // Mock implementation - in real scenario, would create and sign transaction
    const transaction = {
      to: to.toBase58(),
      amount: amount.toString(),
      timestamp: Date.now()
    };

    return `solana_tx_${Date.now()}`;
  }

  /**
   * Add event listener
   */
  addEventListener(listener: WalletEventListener): void {
    this.listeners.set(listener, listener);
  }

  /**
   * Remove event listener
   */
  removeEventListener(listener: WalletEventListener): void {
    this.listeners.delete(listener);
  }

  /**
   * Check if Phantom is installed
   */
  static isPhantomInstalled(): boolean {
    return typeof window !== 'undefined' && !!window.solana?.isPhantom;
  }

  /**
   * Check if Solflare is installed
   */
  static isSolflareInstalled(): boolean {
    return typeof window !== 'undefined' && !!window.solflare;
  }

  /**
   * Check if Backpack is installed
   */
  static isBackpackInstalled(): boolean {
    return typeof window !== 'undefined' && !!window.backpack;
  }

  private notifyListeners(type: WalletEventType, wallet: WalletType, data?: any): void {
    this.listeners.forEach(listener => {
      listener({ type, wallet, data });
    });
  }
}

/**
 * Cross-Chain Wallet Manager
 */
export class CrossChainWalletManager {
  private evmManager: EVMWalletManager;
  private solanaManager: SolanaWalletManager;
  private sdk?: MyceliaSDK;
  private bridge?: CrossChainBridge;
  private listeners = new Map<WalletEventListener, WalletEventListener>();
  private state: CrossChainWalletState = {
    evm: { status: WalletStatus.DISCONNECTED },
    solana: { status: WalletStatus.DISCONNECTED }
  };

  constructor(sdkConfig?: MyceliaSDKConfig, bridgeConfig?: BridgeConfig) {
    this.evmManager = new EVMWalletManager();
    this.solanaManager = new SolanaWalletManager();

    if (sdkConfig) {
      this.sdk = new MyceliaSDK(sdkConfig);
    }

    if (bridgeConfig) {
      this.bridge = BridgeFactory.createBridge(bridgeConfig);
    }

    this.setupEventListeners();
  }

  /**
   * Connect EVM wallet
   */
  async connectEVM(walletType: WalletType): Promise<WalletState> {
    let state: WalletState;
    
    switch (walletType) {
      case WalletType.METAMASK:
        state = await this.evmManager.connectMetaMask();
        break;
      case WalletType.COINBASE:
        state = await this.evmManager.connectCoinbase();
        break;
      default:
        throw new Error(`Unsupported EVM wallet type: ${walletType}`);
    }

    this.state.evm = state;
    this.notifyListeners('connect', walletType, state);
    return state;
  }

  /**
   * Connect Solana wallet
   */
  async connectSolana(walletType: WalletType): Promise<WalletState> {
    let state: WalletState;
    
    switch (walletType) {
      case WalletType.PHANTOM:
        state = await this.solanaManager.connectPhantom();
        break;
      case WalletType.SOLFLARE:
        state = await this.solanaManager.connectSolflare();
        break;
      case WalletType.BACKPACK:
        state = await this.solanaManager.connectBackpack();
        break;
      default:
        throw new Error(`Unsupported Solana wallet type: ${walletType}`);
    }

    this.state.solana = state;
    this.notifyListeners('connect', walletType, state);
    return state;
  }

  /**
   * Disconnect EVM wallet
   */
  async disconnectEVM(): Promise<void> {
    await this.evmManager.disconnect();
    this.state.evm = { status: WalletStatus.DISCONNECTED };
    this.notifyListeners('disconnect', WalletType.METAMASK);
  }

  /**
   * Disconnect Solana wallet
   */
  async disconnectSolana(): Promise<void> {
    await this.solanaManager.disconnect();
    this.state.solana = { status: WalletStatus.DISCONNECTED };
    this.notifyListeners('disconnect', WalletType.PHANTOM);
  }

  /**
   * Disconnect all wallets
   */
  async disconnectAll(): Promise<void> {
    await Promise.all([
      this.disconnectEVM(),
      this.disconnectSolana()
    ]);
  }

  /**
   * Get cross-chain state
   */
  getState(): CrossChainWalletState {
    return {
      evm: this.evmManager.getState(),
      solana: this.solanaManager.getState(),
      bridge: this.bridge
    };
  }

  /**
   * Get total BLOOM balance across chains
   */
  async getTotalBloomBalance(): Promise<bigint> {
    let total = 0n;

    try {
      if (this.state.evm.status === WalletStatus.CONNECTED) {
        total += await this.evmManager.getBloomBalance();
      }
    } catch (error) {
      console.warn('Failed to get EVM balance:', error);
    }

    try {
      if (this.state.solana.status === WalletStatus.CONNECTED) {
        total += await this.solanaManager.getBloomBalance();
      }
    } catch (error) {
      console.warn('Failed to get Solana balance:', error);
    }

    return total;
  }

  /**
   * Get total BLOOM balance in BTC equivalent
   */
  async getTotalBloomBalanceInBtc(): Promise<number> {
    const totalBalance = await this.getTotalBloomBalance();
    const sats = bloomToSats(totalBalance);
    return Number(sats) / 100_000_000; // Convert to BTC
  }

  /**
   * Cross-chain transfer
   */
  async crossChainTransfer(
    fromChain: BridgeChain,
    toChain: BridgeChain,
    toAddress: string,
    amount: bigint
  ): Promise<string> {
    if (!this.bridge) {
      throw new Error('Bridge not configured');
    }

    const fromAddress = fromChain === BridgeChain.EVM 
      ? this.state.evm.address 
      : this.state.solana.publicKey?.toBase58();

    if (!fromAddress) {
      throw new Error(`No connected wallet for ${fromChain} chain`);
    }

    // Mock private key - in real scenario, would use wallet's private key
    const privateKey = '0x1234567890123456789012345678901234567890123456789012345678901234';

    const transaction = await this.bridge.crossChainTransfer(
      fromChain,
      toChain,
      fromAddress,
      toAddress,
      amount,
      privateKey
    );

    return transaction.id;
  }

  /**
   * Get available wallets
   */
  getAvailableWallets(): WalletInfo[] {
    const wallets: WalletInfo[] = [];

    // EVM wallets
    wallets.push({
      type: WalletType.METAMASK,
      name: 'MetaMask',
      icon: '🦊',
      installed: EVMWalletManager.isMetaMaskInstalled(),
      supported: true
    });

    wallets.push({
      type: WalletType.COINBASE,
      name: 'Coinbase Wallet',
      icon: '🔵',
      installed: EVMWalletManager.isCoinbaseInstalled(),
      supported: true
    });

    // Solana wallets
    wallets.push({
      type: WalletType.PHANTOM,
      name: 'Phantom',
      icon: '👻',
      installed: SolanaWalletManager.isPhantomInstalled(),
      supported: true
    });

    wallets.push({
      type: WalletType.SOLFLARE,
      name: 'Solflare',
      icon: '☀️',
      installed: SolanaWalletManager.isSolflareInstalled(),
      supported: true
    });

    wallets.push({
      type: WalletType.BACKPACK,
      name: 'Backpack',
      icon: '🎒',
      installed: SolanaWalletManager.isBackpackInstalled(),
      supported: true
    });

    return wallets;
  }

  /**
   * Add event listener
   */
  addEventListener(listener: WalletEventListener): void {
    this.listeners.set(listener, listener);
    this.evmManager.addEventListener(listener);
    this.solanaManager.addEventListener(listener);
  }

  /**
   * Remove event listener
   */
  removeEventListener(listener: WalletEventListener): void {
    this.listeners.delete(listener);
    this.evmManager.removeEventListener(listener);
    this.solanaManager.removeEventListener(listener);
  }

  private setupEventListeners(): void {
    // Listen for balance changes
    const balanceListener: WalletEventListener = (event) => {
      if (event.type === 'balanceChanged') {
        this.notifyListeners('balanceChanged', event.wallet, event.data);
      }
    };

    this.evmManager.addEventListener(balanceListener);
    this.solanaManager.addEventListener(balanceListener);
  }

  private notifyListeners(type: WalletEventType, wallet: WalletType, data?: any): void {
    this.listeners.forEach(listener => {
      listener({ type, wallet, data });
    });
  }
}

/**
 * Wallet utility functions
 */
export class WalletUtils {
  /**
   * Format wallet address for display
   */
  static formatAddress(address: string, length: number = 6): string {
    if (address.length <= length * 2) {
      return address;
    }
    return `${address.slice(0, length)}...${address.slice(-length)}`;
  }

  /**
   * Format BLOOM amount for display
   */
  static formatBloomAmount(amount: bigint, decimals: number = 9): string {
    const divisor = BigInt(10 ** decimals);
    const whole = amount / divisor;
    const fraction = amount % divisor;
    
    if (fraction === 0n) {
      return whole.toString();
    }
    
    const fractionStr = fraction.toString().padStart(decimals, '0');
    const trimmedFraction = fractionStr.replace(/0+$/, '');
    
    return trimmedFraction ? `${whole}.${trimmedFraction}` : whole.toString();
  }

  /**
   * Format BTC amount for display
   */
  static formatBtcAmount(amount: number): string {
    return amount.toFixed(8);
  }

  /**
   * Get wallet icon URL
   */
  static getWalletIconUrl(walletType: WalletType): string {
    const icons: Record<WalletType, string> = {
      [WalletType.METAMASK]: 'https://raw.githubusercontent.com/MetaMask/brand-resources/master/SVG/metamask-fox.svg',
      [WalletType.PHANTOM]: 'https://raw.githubusercontent.com/solana-labs/wallet-adapter/master/packages/wallets/icons/phantom.svg',
      [WalletType.SOLFLARE]: 'https://raw.githubusercontent.com/solana-labs/wallet-adapter/master/packages/wallets/icons/solflare.svg',
      [WalletType.BACKPACK]: 'https://raw.githubusercontent.com/solana-labs/wallet-adapter/master/packages/wallets/icons/backpack.svg',
      [WalletType.COINBASE]: 'https://raw.githubusercontent.com/coinbase/wallet-sdk/master/packages/wallet-sdk/assets/coinbase-wallet-logo.png',
      [WalletType.WALLETCONNECT]: 'https://raw.githubusercontent.com/WalletConnect/walletconnect-assets/master/Icon/Gradient/Icon.png'
    };
    
    return icons[walletType] || '';
  }

  /**
   * Validate wallet address
   */
  static validateAddress(address: string, chain: 'evm' | 'solana'): boolean {
    if (chain === 'evm') {
      return ethers.isAddress(address);
    } else if (chain === 'solana') {
      try {
        new PublicKey(address);
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }

  /**
   * Get wallet download URL
   */
  static getWalletDownloadUrl(walletType: WalletType): string {
    const urls: Record<WalletType, string> = {
      [WalletType.METAMASK]: 'https://metamask.io/download/',
      [WalletType.PHANTOM]: 'https://phantom.app/download',
      [WalletType.SOLFLARE]: 'https://solflare.com/download',
      [WalletType.BACKPACK]: 'https://backpack.app/download',
      [WalletType.COINBASE]: 'https://www.coinbase.com/wallet',
      [WalletType.WALLETCONNECT]: 'https://walletconnect.com/'
    };
    
    return urls[walletType] || '';
  }
}

// Global window extensions for wallet detection
declare global {
  interface Window {
    ethereum?: {
      isMetaMask?: boolean;
      isCoinbaseWallet?: boolean;
      on?: (event: string, callback: (data: any) => void) => void;
      request?: (args: any) => Promise<any>;
    };
    solana?: {
      isPhantom?: boolean;
      connect?: () => Promise<{ publicKey: PublicKey }>;
      disconnect?: () => Promise<void>;
      on?: (event: string, callback: (data: any) => void) => void;
    };
    solflare?: {
      connect?: () => Promise<{ publicKey: PublicKey }>;
      disconnect?: () => Promise<void>;
    };
    backpack?: {
      connect?: () => Promise<{ publicKey: PublicKey }>;
      disconnect?: () => Promise<void>;
    };
  }
}
