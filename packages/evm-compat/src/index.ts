import { ethers } from 'ethers';
import { bloomToSats, satsToBloom } from '@mycelia/tokenomics';

// Re-export common Ethereum types for compatibility
export type { 
  Contract, 
  ContractTransaction, 
  ContractReceipt,
  BigNumberish,
  Overrides,
  CallOverrides 
} from 'ethers';

// Mycelia-specific EVM extensions
export interface MyceliaProvider extends ethers.Provider {
  /**
   * Get current BLOOM token balance for an address
   */
  getBloomBalance(address: string): Promise<bigint>;
  
  /**
   * Get current BTC equivalent of BLOOM balance
   */
  getBloomBalanceInBtc(address: string): Promise<number>;
  
  /**
   * Get current gas price in BLOOM tokens
   */
  getGasPriceInBloom(): Promise<bigint>;
  
  /**
   * Get network information including peg status
   */
  getNetworkInfo(): Promise<{
    chainId: number;
    name: string;
    pegStatus: 'active' | 'maintenance';
    bloomPerBtc: number;
  }>;
}

export interface MyceliaSigner extends ethers.Signer {
  /**
   * Send BLOOM tokens to another address
   */
  sendBloom(to: string, amount: bigint, overrides?: ethers.Overrides): Promise<ethers.ContractTransactionResponse>;
  
  /**
   * Approve BLOOM spending for a contract
   */
  approveBloom(spender: string, amount: bigint, overrides?: ethers.Overrides): Promise<ethers.ContractTransactionResponse>;
  
  /**
   * Get BLOOM balance for this signer
   */
  getBloomBalance(): Promise<bigint>;
}

/**
 * Mycelia EVM Provider that wraps standard Ethereum providers
 * with BLOOM token and peg functionality
 */
export class MyceliaEVMProvider implements MyceliaProvider {
  private provider: ethers.Provider;
  private bloomTokenAddress: string;
  private gasOracleAddress: string;

  constructor(
    provider: ethers.Provider,
    bloomTokenAddress: string,
    gasOracleAddress: string
  ) {
    this.provider = provider;
    this.bloomTokenAddress = bloomTokenAddress;
    this.gasOracleAddress = gasOracleAddress;
  }

  // Standard Provider interface delegation
  getNetwork(): Promise<ethers.Network> {
    return this.provider.getNetwork();
  }

  getBlockNumber(): Promise<number> {
    return this.provider.getBlockNumber();
  }

  getBalance(address: string, blockTag?: ethers.BlockTag): Promise<bigint> {
    return this.provider.getBalance(address, blockTag);
  }

  getTransaction(hash: string): Promise<ethers.TransactionResponse | null> {
    return this.provider.getTransaction(hash);
  }

  getTransactionReceipt(hash: string): Promise<ethers.TransactionReceipt | null> {
    return this.provider.getTransactionReceipt(hash);
  }

  getBlock(block: ethers.BlockTag, includeTransactions?: boolean): Promise<ethers.Block | null> {
    return this.provider.getBlock(block, includeTransactions);
  }

  call(tx: ethers.TransactionRequest, blockTag?: ethers.BlockTag): Promise<string> {
    return this.provider.call(tx, blockTag);
  }

  estimateGas(tx: ethers.TransactionRequest): Promise<bigint> {
    return this.provider.estimateGas(tx);
  }

  sendTransaction(tx: ethers.TransactionRequest): Promise<ethers.TransactionResponse> {
    return this.provider.sendTransaction(tx);
  }

  // Mycelia-specific methods
  async getBloomBalance(address: string): Promise<bigint> {
    const bloomContract = new ethers.Contract(
      this.bloomTokenAddress,
      [
        'function balanceOf(address owner) view returns (uint256)'
      ],
      this.provider
    );
    
    const balance = await bloomContract.balanceOf(address);
    return BigInt(balance.toString());
  }

  async getBloomBalanceInBtc(address: string): Promise<number> {
    const bloomBalance = await this.getBloomBalance(address);
    const sats = bloomToSats(bloomBalance);
    return Number(sats) / 100_000_000; // Convert sats to BTC
  }

  async getGasPriceInBloom(): Promise<bigint> {
    const gasOracle = new ethers.Contract(
      this.gasOracleAddress,
      [
        'function getGasPriceInBloom() view returns (uint256)'
      ],
      this.provider
    );
    
    const gasPrice = await gasOracle.getGasPriceInBloom();
    return BigInt(gasPrice.toString());
  }

  async getNetworkInfo(): Promise<{
    chainId: number;
    name: string;
    pegStatus: 'active' | 'maintenance';
    bloomPerBtc: number;
  }> {
    const network = await this.getNetwork();
    
    return {
      chainId: Number(network.chainId),
      name: network.name,
      pegStatus: 'active', // TODO: Implement actual peg status checking
      bloomPerBtc: 10 // Hard-coded peg ratio
    };
  }
}

/**
 * Mycelia EVM Signer that extends standard signers with BLOOM functionality
 */
export class MyceliaEVMSigner implements MyceliaSigner {
  private signer: ethers.Signer;
  private provider: MyceliaEVMProvider;
  private bloomTokenAddress: string;

  constructor(
    signer: ethers.Signer,
    provider: MyceliaEVMProvider,
    bloomTokenAddress: string
  ) {
    this.signer = signer;
    this.provider = provider;
    this.bloomTokenAddress = bloomTokenAddress;
  }

  // Standard Signer interface delegation
  getAddress(): Promise<string> {
    return this.signer.getAddress();
  }

  getBalance(blockTag?: ethers.BlockTag): Promise<bigint> {
    return this.signer.getBalance(blockTag);
  }

  getTransactionCount(blockTag?: ethers.BlockTag): Promise<number> {
    return this.signer.getTransactionCount(blockTag);
  }

  estimateGas(tx: ethers.TransactionRequest): Promise<bigint> {
    return this.signer.estimateGas(tx);
  }

  call(tx: ethers.TransactionRequest, blockTag?: ethers.BlockTag): Promise<string> {
    return this.signer.call(tx, blockTag);
  }

  sendTransaction(tx: ethers.TransactionRequest): Promise<ethers.TransactionResponse> {
    return this.signer.sendTransaction(tx);
  }

  signTransaction(tx: ethers.TransactionRequest): Promise<string> {
    return this.signer.signTransaction(tx);
  }

  signMessage(message: string | ethers.BytesLike): Promise<string> {
    return this.signer.signMessage(message);
  }

  signTypedData(domain: ethers.TypedDataDomain, types: Record<string, ethers.TypedDataField[]>, value: Record<string, any>): Promise<string> {
    return this.signer.signTypedData(domain, types, value);
  }

  connect(provider: ethers.Provider): ethers.Signer {
    return this.signer.connect(provider);
  }

  // Mycelia-specific methods
  async sendBloom(to: string, amount: bigint, overrides?: ethers.Overrides): Promise<ethers.ContractTransactionResponse> {
    const bloomContract = new ethers.Contract(
      this.bloomTokenAddress,
      [
        'function transfer(address to, uint256 amount) returns (bool)'
      ],
      this.signer
    );
    
    return bloomContract.transfer(to, amount, overrides);
  }

  async approveBloom(spender: string, amount: bigint, overrides?: ethers.Overrides): Promise<ethers.ContractTransactionResponse> {
    const bloomContract = new ethers.Contract(
      this.bloomTokenAddress,
      [
        'function approve(address spender, uint256 amount) returns (bool)'
      ],
      this.signer
    );
    
    return bloomContract.approve(spender, amount, overrides);
  }

  async getBloomBalance(): Promise<bigint> {
    const address = await this.getAddress();
    return this.provider.getBloomBalance(address);
  }
}

/**
 * Factory function to create Mycelia-compatible providers and signers
 */
export function createMyceliaProvider(
  rpcUrl: string,
  bloomTokenAddress: string,
  gasOracleAddress: string
): MyceliaEVMProvider {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  return new MyceliaEVMProvider(provider, bloomTokenAddress, gasOracleAddress);
}

export function createMyceliaSigner(
  privateKey: string,
  provider: MyceliaEVMProvider,
  bloomTokenAddress: string
): MyceliaEVMSigner {
  const signer = new ethers.Wallet(privateKey, provider);
  return new MyceliaEVMSigner(signer, provider, bloomTokenAddress);
}

/**
 * Web3.js compatibility wrapper
 */
export class Web3Compatibility {
  private provider: MyceliaEVMProvider;

  constructor(provider: MyceliaEVMProvider) {
    this.provider = provider;
  }

  /**
   * Get Web3.js compatible provider
   */
  getWeb3Provider(): any {
    // Return a Web3.js compatible provider interface
    return {
      request: async (args: { method: string; params?: any[] }) => {
        switch (args.method) {
          case 'eth_getBalance':
            const balance = await this.provider.getBalance(args.params![0]);
            return `0x${balance.toString(16)}`;
          
          case 'eth_getBloomBalance':
            const bloomBalance = await this.provider.getBloomBalance(args.params![0]);
            return `0x${bloomBalance.toString(16)}`;
          
          case 'mycelia_getNetworkInfo':
            return this.provider.getNetworkInfo();
          
          default:
            throw new Error(`Unsupported method: ${args.method}`);
        }
      }
    };
  }
}

/**
 * Common contract ABIs for Mycelia ecosystem
 */
export const MYCELIA_CONTRACTS = {
  BLOOM_TOKEN: [
    'function name() view returns (string)',
    'function symbol() view returns (string)',
    'function decimals() view returns (uint8)',
    'function totalSupply() view returns (uint256)',
    'function balanceOf(address owner) view returns (uint256)',
    'function transfer(address to, uint256 amount) returns (bool)',
    'function approve(address spender, uint256 amount) returns (bool)',
    'function allowance(address owner, address spender) view returns (uint256)',
    'function transferFrom(address from, address to, uint256 amount) returns (bool)',
    'event Transfer(address indexed from, address indexed to, uint256 value)',
    'event Approval(address indexed owner, address indexed spender, uint256 value)'
  ],
  
  GAS_ORACLE: [
    'function getGasPriceInBloom() view returns (uint256)',
    'function getGasPriceInEth() view returns (uint256)',
    'function updateGasPrice() returns (bool)'
  ],
  
  MINING_REWARDS: [
    'function claimRewards() returns (bool)',
    'function getPendingRewards(address miner) view returns (uint256)',
    'function getContributionScore(address miner) view returns (uint256)',
    'event RewardsClaimed(address indexed miner, uint256 amount)'
  ]
} as const;
