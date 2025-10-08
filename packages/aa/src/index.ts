import { ethers } from 'ethers';
import { observability } from '@mycelia/observability';
import { featureFlags } from '@mycelia/web4-feature-flags';

export interface UserOperation {
  sender: string;
  nonce: string;
  initCode: string;
  callData: string;
  callGasLimit: string;
  verificationGasLimit: string;
  preVerificationGas: string;
  maxFeePerGas: string;
  maxPriorityFeePerGas: string;
  paymasterAndData: string;
  signature: string;
}

export interface UserOperationReceipt {
  userOpHash: string;
  sender: string;
  nonce: string;
  actualGasCost: string;
  actualGasUsed: string;
  success: boolean;
  logs: any[];
  receipt: any;
}

export interface SmartAccountConfig {
  factory: string;
  singleton: string;
  entryPoint: string;
  bundlerUrl: string;
  paymasterUrl?: string;
}

export interface SessionKeyConfig {
  address: string;
  permissions: string[];
  spendingCap: string;
  expiresAt: number;
}

export class AccountAbstraction {
  private config: SmartAccountConfig | null = null;
  private isInitialized = false;
  private bundlerProvider: ethers.JsonRpcProvider | null = null;

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    if (!featureFlags.isFlagEnabled('evm_aa')) {
      throw new Error('EVM Account Abstraction feature flag disabled');
    }

    try {
      // Default configuration for testnet
      this.config = {
        factory: '0x9406Cc6185a346906296840746125a0E44976454', // EntryPoint v0.6.0 factory
        singleton: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789', // EntryPoint v0.6.0 singleton
        entryPoint: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789', // EntryPoint v0.6.0
        bundlerUrl: 'https://api.stackup.sh/v1/rpc/1/your-api-key', // Stackup bundler
        paymasterUrl: 'https://api.stackup.sh/v1/paymaster/1/your-api-key'
      };

      this.bundlerProvider = new ethers.JsonRpcProvider(this.config.bundlerUrl);
      this.isInitialized = true;

      observability.logEvent('aa_initialized', {
        factory: this.config.factory,
        entry_point: this.config.entryPoint,
        bundler_url: this.config.bundlerUrl
      });

    } catch (error) {
      console.error('Failed to initialize Account Abstraction:', error);
      observability.logEvent('aa_init_failed', {
        error: (error as Error).message
      });
      throw error;
    }
  }

  async createSmartAccount(sender: string, initCode?: string): Promise<string> {
    if (!this.isInitialized || !this.config) {
      throw new Error('Account Abstraction not initialized');
    }

    try {
      // Mock smart account creation
      const smartAccountAddress = ethers.getCreateAddress({
        from: this.config.factory,
        nonce: 0
      });

      observability.logEvent('aa_smart_account_created', {
        sender,
        smart_account_address: smartAccountAddress
      });

      return smartAccountAddress;

    } catch (error) {
      console.error('Failed to create smart account:', error);
      observability.logEvent('aa_smart_account_create_failed', {
        sender,
        error: (error as Error).message
      });
      throw error;
    }
  }

  async createUserOperation(
    sender: string,
    to: string,
    value: string,
    data: string,
    nonce?: string
  ): Promise<UserOperation> {
    if (!this.isInitialized || !this.config) {
      throw new Error('Account Abstraction not initialized');
    }

    try {
      const userOp: UserOperation = {
        sender,
        nonce: nonce || '0x0',
        initCode: '0x',
        callData: this.encodeCallData(to, value, data),
        callGasLimit: '0x5208', // 21000 gas
        verificationGasLimit: '0x186a0', // 100000 gas
        preVerificationGas: '0x5208', // 21000 gas
        maxFeePerGas: '0x3b9aca00', // 1 gwei
        maxPriorityFeePerGas: '0x3b9aca00', // 1 gwei
        paymasterAndData: '0x',
        signature: '0x'
      };

      observability.logEvent('aa_user_operation_created', {
        sender,
        to,
        value,
        call_data_length: data.length
      });

      return userOp;

    } catch (error) {
      console.error('Failed to create user operation:', error);
      observability.logEvent('aa_user_operation_create_failed', {
        sender,
        error: (error as Error).message
      });
      throw error;
    }
  }

  async signUserOperation(userOp: UserOperation, privateKey: string): Promise<UserOperation> {
    try {
      const wallet = new ethers.Wallet(privateKey);
      
      // Create user operation hash
      const userOpHash = this.getUserOperationHash(userOp);
      
      // Sign the hash
      const signature = await wallet.signMessage(ethers.getBytes(userOpHash));
      
      const signedUserOp: UserOperation = {
        ...userOp,
        signature
      };

      observability.logEvent('aa_user_operation_signed', {
        sender: userOp.sender,
        signature_length: signature.length
      });

      return signedUserOp;

    } catch (error) {
      console.error('Failed to sign user operation:', error);
      observability.logEvent('aa_user_operation_sign_failed', {
        sender: userOp.sender,
        error: (error as Error).message
      });
      throw error;
    }
  }

  async sendUserOperation(userOp: UserOperation): Promise<string> {
    if (!this.bundlerProvider) {
      throw new Error('Bundler provider not initialized');
    }

    try {
      // Send user operation to bundler
      const userOpHash = await this.bundlerProvider.send('eth_sendUserOperation', [
        userOp,
        this.config!.entryPoint
      ]);

      observability.logEvent('aa_user_operation_sent', {
        sender: userOp.sender,
        user_op_hash: userOpHash
      });

      return userOpHash;

    } catch (error) {
      console.error('Failed to send user operation:', error);
      observability.logEvent('aa_user_operation_send_failed', {
        sender: userOp.sender,
        error: (error as Error).message
      });
      throw error;
    }
  }

  async getUserOperationReceipt(userOpHash: string): Promise<UserOperationReceipt | null> {
    if (!this.bundlerProvider) {
      throw new Error('Bundler provider not initialized');
    }

    try {
      const receipt = await this.bundlerProvider.send('eth_getUserOperationReceipt', [userOpHash]);
      
      if (!receipt) {
        return null;
      }

      const userOpReceipt: UserOperationReceipt = {
        userOpHash: receipt.userOpHash,
        sender: receipt.sender,
        nonce: receipt.nonce,
        actualGasCost: receipt.actualGasCost,
        actualGasUsed: receipt.actualGasUsed,
        success: receipt.success,
        logs: receipt.logs,
        receipt: receipt.receipt
      };

      observability.logEvent('aa_user_operation_receipt_received', {
        user_op_hash: userOpHash,
        success: receipt.success,
        gas_cost: receipt.actualGasCost
      });

      return userOpReceipt;

    } catch (error) {
      console.error('Failed to get user operation receipt:', error);
      observability.logEvent('aa_user_operation_receipt_failed', {
        user_op_hash: userOpHash,
        error: (error as Error).message
      });
      throw error;
    }
  }

  async waitForUserOperation(userOpHash: string, timeout: number = 60000): Promise<UserOperationReceipt> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const receipt = await this.getUserOperationReceipt(userOpHash);
      if (receipt) {
        return receipt;
      }
      
      // Wait 2 seconds before checking again
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    throw new Error('User operation timeout');
  }

  async createSessionKey(config: SessionKeyConfig): Promise<string> {
    try {
      // Mock session key creation
      const sessionKeyAddress = ethers.Wallet.createRandom().address;
      
      observability.logEvent('aa_session_key_created', {
        session_key_address: sessionKeyAddress,
        permissions_count: config.permissions.length,
        spending_cap: config.spendingCap,
        expires_at: config.expiresAt
      });

      return sessionKeyAddress;

    } catch (error) {
      console.error('Failed to create session key:', error);
      observability.logEvent('aa_session_key_create_failed', {
        error: (error as Error).message
      });
      throw error;
    }
  }

  async revokeSessionKey(sessionKeyAddress: string): Promise<void> {
    try {
      // Mock session key revocation
      console.log('Revoking session key:', sessionKeyAddress);
      
      observability.logEvent('aa_session_key_revoked', {
        session_key_address: sessionKeyAddress
      });

    } catch (error) {
      console.error('Failed to revoke session key:', error);
      observability.logEvent('aa_session_key_revoke_failed', {
        session_key_address: sessionKeyAddress,
        error: (error as Error).message
      });
      throw error;
    }
  }

  async estimateUserOperationGas(userOp: UserOperation): Promise<{
    callGasLimit: string;
    verificationGasLimit: string;
    preVerificationGas: string;
  }> {
    if (!this.bundlerProvider) {
      throw new Error('Bundler provider not initialized');
    }

    try {
      const gasEstimate = await this.bundlerProvider.send('eth_estimateUserOperationGas', [
        userOp,
        this.config!.entryPoint
      ]);

      observability.logEvent('aa_user_operation_gas_estimated', {
        sender: userOp.sender,
        call_gas_limit: gasEstimate.callGasLimit,
        verification_gas_limit: gasEstimate.verificationGasLimit,
        pre_verification_gas: gasEstimate.preVerificationGas
      });

      return gasEstimate;

    } catch (error) {
      console.error('Failed to estimate user operation gas:', error);
      observability.logEvent('aa_user_operation_gas_estimate_failed', {
        sender: userOp.sender,
        error: (error as Error).message
      });
      throw error;
    }
  }

  private encodeCallData(to: string, value: string, data: string): string {
    // Simple call data encoding
    const iface = new ethers.Interface([
      'function execute(address to, uint256 value, bytes calldata data)'
    ]);
    
    return iface.encodeFunctionData('execute', [to, value, data]);
  }

  private getUserOperationHash(userOp: UserOperation): string {
    // Simplified user operation hash calculation
    // In real implementation, this would follow ERC-4337 specification
    const packed = ethers.solidityPacked(
      ['address', 'uint256', 'bytes32', 'bytes32'],
      [
        userOp.sender,
        userOp.nonce,
        ethers.keccak256(userOp.initCode),
        ethers.keccak256(userOp.callData)
      ]
    );
    
    return ethers.keccak256(packed);
  }

  async destroy(): Promise<void> {
    this.bundlerProvider = null;
    this.config = null;
    this.isInitialized = false;
  }
}

// Global instance
let globalAA: AccountAbstraction | null = null;

export function getAccountAbstraction(): AccountAbstraction {
  if (!globalAA) {
    globalAA = new AccountAbstraction();
  }
  return globalAA;
}

// Convenience exports
export const accountAbstraction = {
  createSmartAccount: (sender: string, initCode?: string) => 
    getAccountAbstraction().createSmartAccount(sender, initCode),
  createUserOperation: (sender: string, to: string, value: string, data: string, nonce?: string) => 
    getAccountAbstraction().createUserOperation(sender, to, value, data, nonce),
  signUserOperation: (userOp: UserOperation, privateKey: string) => 
    getAccountAbstraction().signUserOperation(userOp, privateKey),
  sendUserOperation: (userOp: UserOperation) => 
    getAccountAbstraction().sendUserOperation(userOp),
  getUserOperationReceipt: (userOpHash: string) => 
    getAccountAbstraction().getUserOperationReceipt(userOpHash),
  waitForUserOperation: (userOpHash: string, timeout?: number) => 
    getAccountAbstraction().waitForUserOperation(userOpHash, timeout),
  createSessionKey: (config: SessionKeyConfig) => 
    getAccountAbstraction().createSessionKey(config),
  revokeSessionKey: (sessionKeyAddress: string) => 
    getAccountAbstraction().revokeSessionKey(sessionKeyAddress),
  estimateUserOperationGas: (userOp: UserOperation) => 
    getAccountAbstraction().estimateUserOperationGas(userOp)
};
