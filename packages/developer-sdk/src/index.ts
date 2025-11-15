import React from 'react';
import { 
  MyceliaEVMProvider, 
  MyceliaEVMSigner, 
  createMyceliaProvider as createEVMProvider,
  createMyceliaSigner as createEVMSigner,
  Web3Compatibility,
  MYCELIA_CONTRACTS
} from '@mycelia/evm-compat';
import {
  MyceliaSolanaConnection,
  MyceliaSolanaWallet,
  createMyceliaSolanaConnection,
  createMyceliaSolanaWallet,
  createMyceliaAnchorProvider,
  createMyceliaAnchorProgram,
  MYCELIA_SOLANA_ADDRESSES,
  SPLTokenCompatibility
} from '@mycelia/solana-compat';
import { bloomToSats, satsToBloom, assertPeg, type ReserveFeed, type SupplyFeed } from '@mycelia/tokenomics';

// Re-export compatibility layers
export * from '@mycelia/evm-compat';
export * from '@mycelia/solana-compat';
export * from '@mycelia/tokenomics';

/**
 * Supported blockchain networks
 */
export enum BlockchainNetwork {
  EVM = 'evm',
  SOLANA = 'solana'
}

/**
 * Unified wallet interface that works across all supported blockchains
 */
export interface UniversalWallet {
  network: BlockchainNetwork;
  address: string;
  
  /**
   * Get BLOOM token balance
   */
  getBloomBalance(): Promise<bigint>;
  
  /**
   * Get BLOOM balance in BTC equivalent
   */
  getBloomBalanceInBtc(): Promise<number>;
  
  /**
   * Send BLOOM tokens to another address
   */
  sendBloom(to: string, amount: bigint): Promise<string>;
  
  /**
   * Sign a message
   */
  signMessage(message: string): Promise<string>;
  
  /**
   * Get network-specific provider/signer
   */
  getNativeProvider(): any;
}

/**
 * Universal Mycelia SDK that provides a unified interface
 * for interacting with Mycelia across all supported blockchains
 */
export class MyceliaSDK {
  private evmProvider?: MyceliaEVMProvider;
  private solanaConnection?: MyceliaSolanaConnection;
  private wallets = new Map<string, UniversalWallet>();
  private reserveFeed?: ReserveFeed;
  private supplyFeed?: SupplyFeed;

  constructor(options?: {
    reserveFeed?: ReserveFeed;
    supplyFeed?: SupplyFeed;
  }) {
    this.reserveFeed = options?.reserveFeed;
    this.supplyFeed = options?.supplyFeed;
  }

  /**
   * Initialize EVM compatibility
   */
  initializeEVM(
    rpcUrl: string,
    bloomTokenAddress: string,
    gasOracleAddress: string
  ): MyceliaEVMProvider {
    this.evmProvider = createEVMProvider(rpcUrl, bloomTokenAddress, gasOracleAddress, {
      reserveFeed: this.reserveFeed,
      supplyFeed: this.supplyFeed
    });
    return this.evmProvider;
  }

  /**
   * Initialize Solana compatibility
   */
  initializeSolana(
    rpcUrl: string,
    bloomTokenMint: string,
    rentOracleProgram: string
  ): MyceliaSolanaConnection {
    this.solanaConnection = createMyceliaSolanaConnection(rpcUrl, bloomTokenMint, rentOracleProgram, {
      reserveFeed: this.reserveFeed,
      supplyFeed: this.supplyFeed
    });
    return this.solanaConnection;
  }

  /**
   * Create EVM wallet
   */
  createEVMWallet(privateKey: string): UniversalWallet {
    if (!this.evmProvider) {
      throw new Error('EVM not initialized. Call initializeEVM() first.');
    }

    const evmSigner = createEVMSigner(privateKey, this.evmProvider, this.evmProvider['bloomTokenAddress']);
    
    const wallet: UniversalWallet = {
      network: BlockchainNetwork.EVM,
      address: '',
      
      async getBloomBalance(): Promise<bigint> {
        return evmSigner.getBloomBalance();
      },
      
      async getBloomBalanceInBtc(): Promise<number> {
        const balance = await evmSigner.getBloomBalance();
        const sats = bloomToSats(balance);
        return Number(sats) / 100_000_000;
      },
      
      async sendBloom(to: string, amount: bigint): Promise<string> {
        const tx = await evmSigner.sendBloom(to, amount);
        return tx.hash;
      },
      
      async signMessage(message: string): Promise<string> {
        return evmSigner.signMessage(message);
      },
      
      getNativeProvider() {
        return evmSigner;
      }
    };

    // Get address asynchronously
    evmSigner.getAddress().then(address => {
      wallet.address = address;
    });

    this.wallets.set(wallet.address, wallet);
    return wallet;
  }

  /**
   * Create Solana wallet
   */
  createSolanaWallet(privateKey: Uint8Array): UniversalWallet {
    if (!this.solanaConnection) {
      throw new Error('Solana not initialized. Call initializeSolana() first.');
    }

    const solanaWallet = createMyceliaSolanaWallet(
      privateKey,
      this.solanaConnection,
      MYCELIA_SOLANA_ADDRESSES.BLOOM_TOKEN_MINT
    );
    
    const wallet: UniversalWallet = {
      network: BlockchainNetwork.SOLANA,
      address: solanaWallet.publicKey.toBase58(),
      
      async getBloomBalance(): Promise<bigint> {
        return solanaWallet.getBloomBalance();
      },
      
      async getBloomBalanceInBtc(): Promise<number> {
        const balance = await solanaWallet.getBloomBalance();
        const sats = bloomToSats(balance);
        return Number(sats) / 100_000_000;
      },
      
      async sendBloom(to: string, amount: bigint): Promise<string> {
        const { PublicKey } = await import('@solana/web3.js');
        return solanaWallet.sendBloom(new PublicKey(to), amount);
      },
      
      async signMessage(message: string): Promise<string> {
        // Solana message signing would be implemented here
        return `solana-signature-${message}`;
      },
      
      getNativeProvider() {
        return solanaWallet;
      }
    };

    this.wallets.set(wallet.address, wallet);
    return wallet;
  }

  /**
   * Get wallet by address
   */
  getWallet(address: string): UniversalWallet | undefined {
    return this.wallets.get(address);
  }

  /**
   * Get all wallets
   */
  getAllWallets(): UniversalWallet[] {
    return Array.from(this.wallets.values());
  }

  /**
   * Get network information
   */
  async getNetworkInfo(): Promise<{
    evm?: {
      chainId: number;
      name: string;
      pegStatus: 'active' | 'maintenance';
    };
    solana?: {
      cluster: string;
      pegStatus: 'active' | 'maintenance';
    };
    peg: {
      bloomPerBtc: number;
      status: string;
    };
  }> {
    const info: any = {
      peg: {
        bloomPerBtc: 10,
        status: assertPeg()
      }
    };

    if (this.evmProvider) {
      const evmInfo = await this.evmProvider.getNetworkInfo();
      info.evm = {
        chainId: evmInfo.chainId,
        name: evmInfo.name,
        pegStatus: evmInfo.pegStatus
      };
    }

    if (this.solanaConnection) {
      const solanaInfo = await this.solanaConnection.getNetworkInfo();
      info.solana = {
        cluster: solanaInfo.cluster,
        pegStatus: solanaInfo.pegStatus
      };
    }

    return info;
  }
}

/**
 * React hooks for Mycelia SDK
 */
export function useMyceliaSDK() {
  const [sdk] = React.useState(() => new MyceliaSDK());
  const [wallets, setWallets] = React.useState<UniversalWallet[]>([]);
  const [networkInfo, setNetworkInfo] = React.useState<any>(null);

  React.useEffect(() => {
    const updateWallets = () => {
      setWallets(sdk.getAllWallets());
    };

    const updateNetworkInfo = async () => {
      const info = await sdk.getNetworkInfo();
      setNetworkInfo(info);
    };

    updateWallets();
    updateNetworkInfo();
  }, [sdk]);

  return {
    sdk,
    wallets,
    networkInfo,
    createEVMWallet: (privateKey: string) => {
      const wallet = sdk.createEVMWallet(privateKey);
      setWallets(sdk.getAllWallets());
      return wallet;
    },
    createSolanaWallet: (privateKey: Uint8Array) => {
      const wallet = sdk.createSolanaWallet(privateKey);
      setWallets(sdk.getAllWallets());
      return wallet;
    }
  };
}

/**
 * React hook for wallet operations
 */
export function useWallet(wallet: UniversalWallet | null) {
  const [balance, setBalance] = React.useState<bigint>(0n);
  const [btcBalance, setBtcBalance] = React.useState<number>(0);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!wallet) return;

    const updateBalance = async () => {
      setLoading(true);
      try {
        const [bloomBalance, btcEquivalent] = await Promise.all([
          wallet.getBloomBalance(),
          wallet.getBloomBalanceInBtc()
        ]);
        setBalance(bloomBalance);
        setBtcBalance(btcEquivalent);
      } catch (error) {
        console.error('Failed to update balance:', error);
      } finally {
        setLoading(false);
      }
    };

    updateBalance();
    const interval = setInterval(updateBalance, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, [wallet]);

  const sendBloom = React.useCallback(async (to: string, amount: bigint) => {
    if (!wallet) throw new Error('No wallet connected');
    setLoading(true);
    try {
      const txHash = await wallet.sendBloom(to, amount);
      // Refresh balance after successful send
      setTimeout(() => {
        const updateBalance = async () => {
          const [bloomBalance, btcEquivalent] = await Promise.all([
            wallet.getBloomBalance(),
            wallet.getBloomBalanceInBtc()
          ]);
          setBalance(bloomBalance);
          setBtcBalance(btcEquivalent);
        };
        updateBalance();
      }, 2000);
      return txHash;
    } finally {
      setLoading(false);
    }
  }, [wallet]);

  return {
    balance,
    btcBalance,
    loading,
    sendBloom,
    wallet
  };
}

/**
 * Utility functions for cross-chain operations
 */
export class CrossChainUtils {
  /**
   * Convert BLOOM amount between different precision formats
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
   * Parse BLOOM amount from string
   */
  static parseBloomAmount(amount: string, decimals: number = 9): bigint {
    const [whole, fraction = ''] = amount.split('.');
    const paddedFraction = fraction.padEnd(decimals, '0').slice(0, decimals);
    return BigInt(whole) * BigInt(10 ** decimals) + BigInt(paddedFraction);
  }

  /**
   * Get transaction explorer URL
   */
  static getExplorerUrl(txHash: string, network: BlockchainNetwork, cluster?: string): string {
    switch (network) {
      case BlockchainNetwork.EVM:
        return `https://etherscan.io/tx/${txHash}`;
      case BlockchainNetwork.SOLANA:
        const baseUrl = cluster === 'mainnet' ? 'https://explorer.solana.com' : `https://explorer.solana.com?cluster=${cluster}`;
        return `${baseUrl}/tx/${txHash}`;
      default:
        return `https://explorer.mycelia.com/tx/${txHash}`;
    }
  }
}

/**
 * Contract deployment utilities
 */
export class ContractDeployment {
  /**
   * Deploy BLOOM token contract (EVM)
   */
  static async deployBloomToken(
    signer: MyceliaEVMSigner,
    name: string = 'BLOOM Token',
    symbol: string = 'BLOOM',
    decimals: number = 9
  ): Promise<string> {
    const factory = new (await import('ethers')).ContractFactory(
      MYCELIA_CONTRACTS.BLOOM_TOKEN,
      `
        constructor(string memory name, string memory symbol, uint8 decimals) {
          // BLOOM token implementation
        }
      `,
      signer
    );

    const contract = await factory.deploy(name, symbol, decimals);
    await contract.waitForDeployment();
    return await contract.getAddress();
  }

  /**
   * Deploy mining program (Solana)
   */
  static async deployMiningProgram(
    wallet: MyceliaSolanaWallet,
    connection: MyceliaSolanaConnection
  ): Promise<string> {
    // This would deploy the actual Solana program
    // For now, return a mock program ID
    return MYCELIA_SOLANA_ADDRESSES.MINING_PROGRAM;
  }
}

/**
 * Default SDK instance for quick setup
 */
export const myceliaSDK = new MyceliaSDK();

/**
 * Quick setup function for common use cases
 */
export function setupMyceliaSDK(config: {
  evm?: {
    rpcUrl: string;
    bloomTokenAddress: string;
    gasOracleAddress: string;
  };
  solana?: {
    rpcUrl: string;
    bloomTokenMint: string;
    rentOracleProgram: string;
  };
  reserveFeed?: ReserveFeed;
  supplyFeed?: SupplyFeed;
}): MyceliaSDK {
  const sdk = new MyceliaSDK({
    reserveFeed: config.reserveFeed,
    supplyFeed: config.supplyFeed
  });

  if (config.evm) {
    sdk.initializeEVM(
      config.evm.rpcUrl,
      config.evm.bloomTokenAddress,
      config.evm.gasOracleAddress
    );
  }

  if (config.solana) {
    sdk.initializeSolana(
      config.solana.rpcUrl,
      config.solana.bloomTokenMint,
      config.solana.rentOracleProgram
    );
  }

  return sdk;
}
