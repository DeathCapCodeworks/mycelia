import { ethers } from 'ethers';
import { observability } from '@mycelia/observability';
import { featureFlags } from '@mycelia/web4-feature-flags';
import { UserOperation } from '@mycelia/aa';

export interface PaymasterConfig {
  paymasterAddress: string;
  rpcUrl: string;
  apiKey?: string;
  supportedChains: number[];
  maxGasPrice: string;
  maxGasLimit: string;
}

export interface SponsorshipPolicy {
  maxGasPrice: string;
  maxGasLimit: string;
  allowedContracts: string[];
  blockedContracts: string[];
  dailyLimit: string;
  perUserLimit: string;
}

export interface SponsorshipRequest {
  userOp: UserOperation;
  entryPoint: string;
  chainId: number;
  userAddress: string;
  gasPrice: string;
  gasLimit: string;
}

export interface SponsorshipResponse {
  paymasterAndData: string;
  preVerificationGas: string;
  verificationGasLimit: string;
  callGasLimit: string;
  maxFeePerGas: string;
  maxPriorityFeePerGas: string;
}

export interface CrossExperienceFee {
  bloomAmount: string;
  ethAmount: string;
  exchangeRate: string;
  timestamp: number;
}

export class EVMPaymaster {
  private config: PaymasterConfig | null = null;
  private policy: SponsorshipPolicy | null = null;
  private provider: ethers.JsonRpcProvider | null = null;
  private isInitialized = false;
  private ethBalance: string = '0';
  private bloomBalance: string = '0';

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    if (!featureFlags.isFlagEnabled('evm_paymaster')) {
      throw new Error('EVM Paymaster feature flag disabled');
    }

    try {
      // Default configuration
      this.config = {
        paymasterAddress: '0x0000000071727De22E5E9d8BAf0edAc6f37da032', // Mock paymaster address
        rpcUrl: 'https://eth.llamarpc.com',
        supportedChains: [1, 11155111], // Ethereum mainnet and Sepolia testnet
        maxGasPrice: '0x3b9aca00', // 1 gwei
        maxGasLimit: '0x186a0' // 100000 gas
      };

      this.policy = {
        maxGasPrice: '0x3b9aca00', // 1 gwei
        maxGasLimit: '0x186a0', // 100000 gas
        allowedContracts: [],
        blockedContracts: [],
        dailyLimit: '0x16345785d8a0000', // 0.1 ETH
        perUserLimit: '0x38d7ea4c68000' // 0.01 ETH
      };

      this.provider = new ethers.JsonRpcProvider(this.config.rpcUrl);
      this.isInitialized = true;

      // Initialize balances
      await this.updateBalances();

      observability.logEvent('evm_paymaster_initialized', {
        paymaster_address: this.config.paymasterAddress,
        supported_chains: this.config.supportedChains,
        eth_balance: this.ethBalance,
        bloom_balance: this.bloomBalance
      });

    } catch (error) {
      console.error('Failed to initialize EVM Paymaster:', error);
      observability.logEvent('evm_paymaster_init_failed', {
        error: (error as Error).message
      });
      throw error;
    }
  }

  async canSponsor(request: SponsorshipRequest): Promise<boolean> {
    if (!this.isInitialized || !this.config || !this.policy) {
      return false;
    }

    try {
      // Check if chain is supported
      if (!this.config.supportedChains.includes(request.chainId)) {
        return false;
      }

      // Check gas price limits
      const gasPrice = BigInt(request.gasPrice);
      const maxGasPrice = BigInt(this.policy.maxGasPrice);
      if (gasPrice > maxGasPrice) {
        return false;
      }

      // Check gas limit limits
      const gasLimit = BigInt(request.gasLimit);
      const maxGasLimit = BigInt(this.policy.maxGasLimit);
      if (gasLimit > maxGasLimit) {
        return false;
      }

      // Check if contract is blocked
      if (this.policy.blockedContracts.includes(request.userOp.to || '')) {
        return false;
      }

      // Check daily limit
      const dailyUsed = await this.getDailyUsage();
      const dailyLimit = BigInt(this.policy.dailyLimit);
      if (dailyUsed >= dailyLimit) {
        return false;
      }

      // Check per-user limit
      const userUsed = await this.getUserUsage(request.userAddress);
      const perUserLimit = BigInt(this.policy.perUserLimit);
      if (userUsed >= perUserLimit) {
        return false;
      }

      // Check ETH balance
      const ethBalance = BigInt(this.ethBalance);
      const estimatedCost = gasPrice * gasLimit;
      if (ethBalance < estimatedCost) {
        return false;
      }

      observability.logEvent('evm_paymaster_sponsorship_check', {
        user_address: request.userAddress,
        chain_id: request.chainId,
        gas_price: request.gasPrice,
        gas_limit: request.gasLimit,
        can_sponsor: true
      });

      return true;

    } catch (error) {
      console.error('Failed to check sponsorship eligibility:', error);
      observability.logEvent('evm_paymaster_sponsorship_check_failed', {
        user_address: request.userAddress,
        error: (error as Error).message
      });
      return false;
    }
  }

  async sponsorUserOperation(request: SponsorshipRequest): Promise<SponsorshipResponse> {
    if (!this.isInitialized || !this.config) {
      throw new Error('EVM Paymaster not initialized');
    }

    try {
      const canSponsor = await this.canSponsor(request);
      if (!canSponsor) {
        throw new Error('User operation cannot be sponsored');
      }

      // Calculate sponsorship parameters
      const response: SponsorshipResponse = {
        paymasterAndData: this.config.paymasterAddress + '0x' + '0'.repeat(64), // Mock paymaster data
        preVerificationGas: '0x5208', // 21000 gas
        verificationGasLimit: '0x186a0', // 100000 gas
        callGasLimit: request.gasLimit,
        maxFeePerGas: request.gasPrice,
        maxPriorityFeePerGas: '0x3b9aca00' // 1 gwei
      };

      // Record sponsorship
      await this.recordSponsorship(request, response);

      observability.logEvent('evm_paymaster_sponsorship_granted', {
        user_address: request.userAddress,
        chain_id: request.chainId,
        gas_price: request.gasPrice,
        gas_limit: request.gasLimit,
        paymaster_address: this.config.paymasterAddress
      });

      return response;

    } catch (error) {
      console.error('Failed to sponsor user operation:', error);
      observability.logEvent('evm_paymaster_sponsorship_failed', {
        user_address: request.userAddress,
        error: (error as Error).message
      });
      throw error;
    }
  }

  async sponsorWithBLOOM(
    request: SponsorshipRequest,
    bloomAmount: string
  ): Promise<SponsorshipResponse> {
    if (!this.isInitialized || !this.config) {
      throw new Error('EVM Paymaster not initialized');
    }

    try {
      // Convert BLOOM to ETH for sponsorship
      const ethAmount = await this.convertBLOOMToETH(bloomAmount);
      
      // Check if we have enough BLOOM balance
      const bloomBalance = BigInt(this.bloomBalance);
      const requestedBloom = BigInt(bloomAmount);
      
      if (bloomBalance < requestedBloom) {
        throw new Error('Insufficient BLOOM balance for sponsorship');
      }

      // Create modified request with ETH amount
      const modifiedRequest: SponsorshipRequest = {
        ...request,
        gasPrice: ethAmount
      };

      const response = await this.sponsorUserOperation(modifiedRequest);

      // Record BLOOM usage
      await this.recordBLOOMUsage(bloomAmount, ethAmount);

      observability.logEvent('evm_paymaster_bloom_sponsorship', {
        user_address: request.userAddress,
        bloom_amount: bloomAmount,
        eth_amount: ethAmount,
        gas_price: request.gasPrice,
        gas_limit: request.gasLimit
      });

      return response;

    } catch (error) {
      console.error('Failed to sponsor with BLOOM:', error);
      observability.logEvent('evm_paymaster_bloom_sponsorship_failed', {
        user_address: request.userAddress,
        bloom_amount: bloomAmount,
        error: (error as Error).message
      });
      throw error;
    }
  }

  async getSponsorshipStatus(): Promise<{
    ethBalance: string;
    bloomBalance: string;
    dailyUsed: string;
    dailyLimit: string;
    isActive: boolean;
  }> {
    if (!this.isInitialized || !this.config || !this.policy) {
      throw new Error('EVM Paymaster not initialized');
    }

    try {
      await this.updateBalances();
      
      const dailyUsed = await this.getDailyUsage();
      
      return {
        ethBalance: this.ethBalance,
        bloomBalance: this.bloomBalance,
        dailyUsed,
        dailyLimit: this.policy.dailyLimit,
        isActive: this.isInitialized
      };

    } catch (error) {
      console.error('Failed to get sponsorship status:', error);
      throw error;
    }
  }

  async updatePolicy(newPolicy: Partial<SponsorshipPolicy>): Promise<void> {
    if (!this.isInitialized || !this.policy) {
      throw new Error('EVM Paymaster not initialized');
    }

    try {
      this.policy = {
        ...this.policy,
        ...newPolicy
      };

      observability.logEvent('evm_paymaster_policy_updated', {
        max_gas_price: this.policy.maxGasPrice,
        max_gas_limit: this.policy.maxGasLimit,
        daily_limit: this.policy.dailyLimit,
        per_user_limit: this.policy.perUserLimit
      });

    } catch (error) {
      console.error('Failed to update policy:', error);
      observability.logEvent('evm_paymaster_policy_update_failed', {
        error: (error as Error).message
      });
      throw error;
    }
  }

  private async updateBalances(): Promise<void> {
    if (!this.provider || !this.config) {
      return;
    }

    try {
      // Get ETH balance
      const ethBalance = await this.provider.getBalance(this.config.paymasterAddress);
      this.ethBalance = ethBalance.toString();

      // Mock BLOOM balance - in real implementation, would query BLOOM contract
      this.bloomBalance = '1000000000000000000000'; // 1000 BLOOM

    } catch (error) {
      console.error('Failed to update balances:', error);
    }
  }

  private async convertBLOOMToETH(bloomAmount: string): Promise<string> {
    // Mock conversion - in real implementation, would use oracle or DEX
    const bloomValue = BigInt(bloomAmount);
    const ethValue = bloomValue / BigInt(200); // Mock rate: 1 ETH = 200 BLOOM
    return ethValue.toString();
  }

  private async getDailyUsage(): Promise<string> {
    // Mock implementation - would query database
    return '0x0';
  }

  private async getUserUsage(userAddress: string): Promise<string> {
    // Mock implementation - would query database
    return '0x0';
  }

  private async recordSponsorship(
    request: SponsorshipRequest,
    response: SponsorshipResponse
  ): Promise<void> {
    // Mock implementation - would record in database
    console.log('Recording sponsorship:', {
      user: request.userAddress,
      gasPrice: request.gasPrice,
      gasLimit: request.gasLimit
    });
  }

  private async recordBLOOMUsage(bloomAmount: string, ethAmount: string): Promise<void> {
    // Mock implementation - would record BLOOM usage
    console.log('Recording BLOOM usage:', {
      bloomAmount,
      ethAmount
    });
  }

  async destroy(): Promise<void> {
    this.provider = null;
    this.config = null;
    this.policy = null;
    this.isInitialized = false;
  }
}

// Global instance
let globalPaymaster: EVMPaymaster | null = null;

export function getEVMPaymaster(): EVMPaymaster {
  if (!globalPaymaster) {
    globalPaymaster = new EVMPaymaster();
  }
  return globalPaymaster;
}

// Convenience exports
export const evmPaymaster = {
  canSponsor: (request: SponsorshipRequest) => getEVMPaymaster().canSponsor(request),
  sponsorUserOperation: (request: SponsorshipRequest) => getEVMPaymaster().sponsorUserOperation(request),
  sponsorWithBLOOM: (request: SponsorshipRequest, bloomAmount: string) => 
    getEVMPaymaster().sponsorWithBLOOM(request, bloomAmount),
  getSponsorshipStatus: () => getEVMPaymaster().getSponsorshipStatus(),
  updatePolicy: (newPolicy: Partial<SponsorshipPolicy>) => getEVMPaymaster().updatePolicy(newPolicy)
};
