import { ethers } from 'ethers';
import { observability } from '@mycelia/observability';
import { featureFlags } from '@mycelia/web4-feature-flags';

export interface EVMProviderConfig {
  chainId: number;
  rpcUrl: string;
  name: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  blockExplorerUrl?: string;
}

export interface TransactionRequest {
  to?: string;
  from?: string;
  data?: string;
  value?: string;
  gasLimit?: string;
  gasPrice?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  nonce?: number;
}

export interface TransactionResponse {
  hash: string;
  blockNumber?: number;
  blockHash?: string;
  transactionIndex?: number;
  from: string;
  to?: string;
  value: string;
  data: string;
  gasLimit: string;
  gasPrice?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  nonce: number;
  confirmations: number;
}

export interface NetworkInfo {
  chainId: number;
  name: string;
  rpcUrl: string;
  blockExplorerUrl?: string;
  isTestnet: boolean;
}

export class EVMProvider {
  private provider: ethers.JsonRpcProvider | null = null;
  private config: EVMProviderConfig | null = null;
  private isInitialized = false;

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    if (!featureFlags.isFlagEnabled('evm_provider')) {
      throw new Error('EVM provider feature flag disabled');
    }

    try {
      // Default to Ethereum mainnet
      this.config = {
        chainId: 1,
        rpcUrl: 'https://eth.llamarpc.com',
        name: 'Ethereum Mainnet',
        nativeCurrency: {
          name: 'Ether',
          symbol: 'ETH',
          decimals: 18
        },
        blockExplorerUrl: 'https://etherscan.io'
      };

      this.provider = new ethers.JsonRpcProvider(this.config.rpcUrl);
      this.isInitialized = true;

      // Inject into window.ethereum
      this.injectEthereumProvider();

      observability.logEvent('evm_provider_initialized', {
        chain_id: this.config.chainId,
        network_name: this.config.name
      });

    } catch (error) {
      console.error('Failed to initialize EVM Provider:', error);
      observability.logEvent('evm_provider_init_failed', {
        error: (error as Error).message
      });
      throw error;
    }
  }

  private injectEthereumProvider(): void {
    if (typeof window !== 'undefined') {
      (window as any).ethereum = {
        isMetaMask: false,
        isMycelia: true,
        request: async (request: { method: string; params?: any[] }) => {
          return this.handleEthereumRequest(request);
        },
        on: (event: string, callback: (data: any) => void) => {
          console.log(`Ethereum event listener: ${event}`);
        },
        removeListener: (event: string, callback: (data: any) => void) => {
          console.log(`Ethereum event listener removed: ${event}`);
        }
      };
    }
  }

  private async handleEthereumRequest(request: { method: string; params?: any[] }): Promise<any> {
    if (!this.isInitialized || !this.provider) {
      throw new Error('EVM Provider not initialized');
    }

    try {
      switch (request.method) {
        case 'eth_chainId':
          return `0x${this.config!.chainId.toString(16)}`;

        case 'eth_blockNumber':
          const blockNumber = await this.provider.getBlockNumber();
          return `0x${blockNumber.toString(16)}`;

        case 'eth_getBalance':
          if (!request.params || request.params.length < 2) {
            throw new Error('Invalid parameters for eth_getBalance');
          }
          const balance = await this.provider.getBalance(request.params[0], request.params[1]);
          return `0x${balance.toString(16)}`;

        case 'eth_sendTransaction':
          if (!request.params || request.params.length < 1) {
            throw new Error('Invalid parameters for eth_sendTransaction');
          }
          return await this.sendTransaction(request.params[0]);

        case 'eth_call':
          if (!request.params || request.params.length < 2) {
            throw new Error('Invalid parameters for eth_call');
          }
          return await this.call(request.params[0], request.params[1]);

        case 'eth_estimateGas':
          if (!request.params || request.params.length < 1) {
            throw new Error('Invalid parameters for eth_estimateGas');
          }
          return await this.estimateGas(request.params[0]);

        case 'eth_getTransactionReceipt':
          if (!request.params || request.params.length < 1) {
            throw new Error('Invalid parameters for eth_getTransactionReceipt');
          }
          return await this.getTransactionReceipt(request.params[0]);

        case 'wallet_switchEthereumChain':
          if (!request.params || request.params.length < 1) {
            throw new Error('Invalid parameters for wallet_switchEthereumChain');
          }
          return await this.switchChain(request.params[0].chainId);

        case 'wallet_addEthereumChain':
          if (!request.params || request.params.length < 1) {
            throw new Error('Invalid parameters for wallet_addEthereumChain');
          }
          return await this.addChain(request.params[0]);

        case 'eth_accounts':
          return await this.getAccounts();

        case 'eth_requestAccounts':
          return await this.requestAccounts();

        default:
          throw new Error(`Unsupported method: ${request.method}`);
      }

    } catch (error) {
      console.error(`EVM Provider request failed: ${request.method}`, error);
      observability.logEvent('evm_provider_request_failed', {
        method: request.method,
        error: (error as Error).message
      });
      throw error;
    }
  }

  async switchChain(chainId: string): Promise<void> {
    const chainIdNumber = parseInt(chainId, 16);
    
    // Mock implementation - would switch to different network
    console.log(`Switching to chain: ${chainIdNumber}`);
    
    observability.logEvent('evm_chain_switched', {
      chain_id: chainIdNumber
    });
  }

  async addChain(chainParams: any): Promise<void> {
    console.log('Adding new chain:', chainParams);
    
    observability.logEvent('evm_chain_added', {
      chain_id: chainParams.chainId,
      chain_name: chainParams.chainName
    });
  }

  async getAccounts(): Promise<string[]> {
    // Mock implementation - would return connected accounts
    return ['0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6'];
  }

  async requestAccounts(): Promise<string[]> {
    // Mock implementation - would request account access
    return await this.getAccounts();
  }

  async sendTransaction(tx: TransactionRequest): Promise<string> {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }

    try {
      // Mock transaction sending
      const txResponse: TransactionResponse = {
        hash: '0x' + Math.random().toString(16).substr(2, 64),
        from: tx.from || '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        to: tx.to,
        value: tx.value || '0x0',
        data: tx.data || '0x',
        gasLimit: tx.gasLimit || '0x5208',
        gasPrice: tx.gasPrice,
        maxFeePerGas: tx.maxFeePerGas,
        maxPriorityFeePerGas: tx.maxPriorityFeePerGas,
        nonce: tx.nonce || 0,
        confirmations: 0
      };

      observability.logEvent('evm_transaction_sent', {
        hash: txResponse.hash,
        to: tx.to,
        value: tx.value
      });

      return txResponse.hash;

    } catch (error) {
      console.error('Failed to send transaction:', error);
      observability.logEvent('evm_transaction_send_failed', {
        error: (error as Error).message
      });
      throw error;
    }
  }

  async call(tx: TransactionRequest, blockTag?: string): Promise<string> {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }

    try {
      // Mock call
      const result = await this.provider.call(tx, blockTag);
      
      observability.logEvent('evm_call_executed', {
        to: tx.to,
        data: tx.data
      });

      return result;

    } catch (error) {
      console.error('Failed to execute call:', error);
      observability.logEvent('evm_call_failed', {
        error: (error as Error).message
      });
      throw error;
    }
  }

  async estimateGas(tx: TransactionRequest): Promise<string> {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }

    try {
      const gasEstimate = await this.provider.estimateGas(tx);
      return `0x${gasEstimate.toString(16)}`;

    } catch (error) {
      console.error('Failed to estimate gas:', error);
      throw error;
    }
  }

  async getTransactionReceipt(hash: string): Promise<any> {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }

    try {
      const receipt = await this.provider.getTransactionReceipt(hash);
      return receipt;

    } catch (error) {
      console.error('Failed to get transaction receipt:', error);
      throw error;
    }
  }

  async getNetworkInfo(): Promise<NetworkInfo> {
    if (!this.config) {
      throw new Error('Provider not configured');
    }

    return {
      chainId: this.config.chainId,
      name: this.config.name,
      rpcUrl: this.config.rpcUrl,
      blockExplorerUrl: this.config.blockExplorerUrl,
      isTestnet: this.config.chainId !== 1
    };
  }

  async getBlockNumber(): Promise<number> {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }

    return await this.provider.getBlockNumber();
  }

  async getBalance(address: string, blockTag?: string): Promise<string> {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }

    const balance = await this.provider.getBalance(address, blockTag);
    return balance.toString();
  }

  async destroy(): Promise<void> {
    this.provider = null;
    this.config = null;
    this.isInitialized = false;
  }
}

// Global instance
let globalEVMProvider: EVMProvider | null = null;

export function getEVMProvider(): EVMProvider {
  if (!globalEVMProvider) {
    globalEVMProvider = new EVMProvider();
  }
  return globalEVMProvider;
}

// Convenience exports
export const evmProvider = {
  getNetworkInfo: () => getEVMProvider().getNetworkInfo(),
  getBlockNumber: () => getEVMProvider().getBlockNumber(),
  getBalance: (address: string, blockTag?: string) => getEVMProvider().getBalance(address, blockTag),
  sendTransaction: (tx: TransactionRequest) => getEVMProvider().sendTransaction(tx),
  call: (tx: TransactionRequest, blockTag?: string) => getEVMProvider().call(tx, blockTag),
  estimateGas: (tx: TransactionRequest) => getEVMProvider().estimateGas(tx),
  getTransactionReceipt: (hash: string) => getEVMProvider().getTransactionReceipt(hash),
  switchChain: (chainId: string) => getEVMProvider().switchChain(chainId),
  addChain: (chainParams: any) => getEVMProvider().addChain(chainParams),
  getAccounts: () => getEVMProvider().getAccounts(),
  requestAccounts: () => getEVMProvider().requestAccounts()
};
