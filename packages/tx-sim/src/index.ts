import { ethers } from 'ethers';
import { observability } from '@mycelia/observability';
import { featureFlags } from '@mycelia/web4-feature-flags';

export interface TransactionSimulation {
  success: boolean;
  gasUsed: string;
  gasPrice: string;
  totalCost: string;
  balanceChange: string;
  allowanceChanges: AllowanceChange[];
  tokenTransfers: TokenTransfer[];
  contractCalls: ContractCall[];
  warnings: string[];
  errors: string[];
}

export interface AllowanceChange {
  token: string;
  spender: string;
  currentAllowance: string;
  newAllowance: string;
  isUnlimited: boolean;
  isIncrease: boolean;
}

export interface TokenTransfer {
  token: string;
  from: string;
  to: string;
  amount: string;
  symbol?: string;
  decimals?: number;
}

export interface ContractCall {
  contract: string;
  method: string;
  parameters: any[];
  value: string;
}

export interface PreflightOptions {
  maxGasPrice?: string;
  maxGasLimit?: string;
  maxAllowance?: string;
  blockUnlimitedApprovals?: boolean;
  requireConfirmation?: boolean;
}

export class TransactionSimulator {
  private provider: ethers.JsonRpcProvider | null = null;
  private isInitialized = false;

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      this.provider = new ethers.JsonRpcProvider('https://eth.llamarpc.com');
      this.isInitialized = true;

      observability.logEvent('tx_simulator_initialized');

    } catch (error) {
      console.error('Failed to initialize Transaction Simulator:', error);
      observability.logEvent('tx_simulator_init_failed', {
        error: (error as Error).message
      });
      throw error;
    }
  }

  async simulateTransaction(
    tx: ethers.TransactionRequest,
    options: PreflightOptions = {}
  ): Promise<TransactionSimulation> {
    if (!this.isInitialized || !this.provider) {
      throw new Error('Transaction Simulator not initialized');
    }

    try {
      const simulation: TransactionSimulation = {
        success: true,
        gasUsed: '0x0',
        gasPrice: '0x0',
        totalCost: '0x0',
        balanceChange: '0x0',
        allowanceChanges: [],
        tokenTransfers: [],
        contractCalls: [],
        warnings: [],
        errors: []
      };

      // Estimate gas
      const gasEstimate = await this.provider.estimateGas(tx);
      simulation.gasUsed = gasEstimate.toString();

      // Get gas price
      const feeData = await this.provider.getFeeData();
      simulation.gasPrice = (feeData.gasPrice || 0).toString();

      // Calculate total cost
      const totalCost = gasEstimate * (feeData.gasPrice || 0);
      simulation.totalCost = totalCost.toString();

      // Check balance change
      if (tx.value) {
        simulation.balanceChange = tx.value.toString();
      }

      // Analyze contract calls
      if (tx.to && tx.data) {
        const contractCall = await this.analyzeContractCall(tx.to, tx.data);
        simulation.contractCalls.push(contractCall);

        // Check for allowance changes
        const allowanceChanges = await this.detectAllowanceChanges(tx.to, tx.data);
        simulation.allowanceChanges.push(...allowanceChanges);

        // Check for token transfers
        const tokenTransfers = await this.detectTokenTransfers(tx.to, tx.data);
        simulation.tokenTransfers.push(...tokenTransfers);
      }

      // Apply safety checks
      this.applySafetyChecks(simulation, options);

      observability.logEvent('tx_simulation_completed', {
        success: simulation.success,
        gas_used: simulation.gasUsed,
        total_cost: simulation.totalCost,
        warnings_count: simulation.warnings.length,
        errors_count: simulation.errors.length
      });

      return simulation;

    } catch (error) {
      console.error('Failed to simulate transaction:', error);
      observability.logEvent('tx_simulation_failed', {
        error: (error as Error).message
      });
      
      return {
        success: false,
        gasUsed: '0x0',
        gasPrice: '0x0',
        totalCost: '0x0',
        balanceChange: '0x0',
        allowanceChanges: [],
        tokenTransfers: [],
        contractCalls: [],
        warnings: [],
        errors: [(error as Error).message]
      };
    }
  }

  async clampAllowance(
    token: string,
    spender: string,
    requestedAmount: string,
    maxAllowance: string
  ): Promise<string> {
    try {
      const requested = BigInt(requestedAmount);
      const max = BigInt(maxAllowance);

      if (requested > max) {
        observability.logEvent('tx_allowance_clamped', {
          token,
          spender,
          requested_amount: requestedAmount,
          clamped_amount: maxAllowance
        });
        return maxAllowance;
      }

      return requestedAmount;

    } catch (error) {
      console.error('Failed to clamp allowance:', error);
      observability.logEvent('tx_allowance_clamp_failed', {
        token,
        spender,
        error: (error as Error).message
      });
      return requestedAmount;
    }
  }

  async detectUnlimitedApprovals(tx: ethers.TransactionRequest): Promise<AllowanceChange[]> {
    if (!tx.to || !tx.data) {
      return [];
    }

    try {
      const allowanceChanges = await this.detectAllowanceChanges(tx.to, tx.data);
      return allowanceChanges.filter(change => change.isUnlimited);

    } catch (error) {
      console.error('Failed to detect unlimited approvals:', error);
      return [];
    }
  }

  async generateHumanReadableDiff(simulation: TransactionSimulation): Promise<string[]> {
    const diffs: string[] = [];

    try {
      // Balance changes
      if (simulation.balanceChange !== '0x0') {
        const balanceChange = ethers.formatEther(simulation.balanceChange);
        if (balanceChange.startsWith('-')) {
          diffs.push(`Send ${balanceChange.substring(1)} ETH`);
        } else {
          diffs.push(`Receive ${balanceChange} ETH`);
        }
      }

      // Token transfers
      for (const transfer of simulation.tokenTransfers) {
        const amount = ethers.formatUnits(transfer.amount, transfer.decimals || 18);
        diffs.push(`Transfer ${amount} ${transfer.symbol || 'tokens'} from ${transfer.from} to ${transfer.to}`);
      }

      // Allowance changes
      for (const allowance of simulation.allowanceChanges) {
        if (allowance.isUnlimited) {
          diffs.push(`Grant unlimited ${allowance.token} allowance to ${allowance.spender}`);
        } else {
          const currentAmount = ethers.formatEther(allowance.currentAllowance);
          const newAmount = ethers.formatEther(allowance.newAllowance);
          diffs.push(`Change ${allowance.token} allowance for ${allowance.spender} from ${currentAmount} to ${newAmount}`);
        }
      }

      // Contract calls
      for (const call of simulation.contractCalls) {
        diffs.push(`Call ${call.method} on ${call.contract} with ${ethers.formatEther(call.value)} ETH`);
      }

      // Gas cost
      const gasCost = ethers.formatEther(simulation.totalCost);
      diffs.push(`Pay ${gasCost} ETH in gas fees`);

      observability.logEvent('tx_human_readable_diff_generated', {
        diffs_count: diffs.length
      });

      return diffs;

    } catch (error) {
      console.error('Failed to generate human readable diff:', error);
      observability.logEvent('tx_human_readable_diff_failed', {
        error: (error as Error).message
      });
      return ['Failed to generate transaction summary'];
    }
  }

  private async analyzeContractCall(contract: string, data: string): Promise<ContractCall> {
    try {
      // Mock contract call analysis
      const method = 'transfer'; // Would decode from data
      const parameters = ['0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6', '1000000000000000000']; // Would decode from data
      const value = '0x0';

      return {
        contract,
        method,
        parameters,
        value
      };

    } catch (error) {
      console.error('Failed to analyze contract call:', error);
      return {
        contract,
        method: 'unknown',
        parameters: [],
        value: '0x0'
      };
    }
  }

  private async detectAllowanceChanges(contract: string, data: string): Promise<AllowanceChange[]> {
    try {
      // Mock allowance change detection
      const changes: AllowanceChange[] = [];

      // Check if this is an approval transaction
      if (data.startsWith('0x095ea7b3')) { // approve function selector
        changes.push({
          token: contract,
          spender: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
          currentAllowance: '0x0',
          newAllowance: '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
          isUnlimited: true,
          isIncrease: true
        });
      }

      return changes;

    } catch (error) {
      console.error('Failed to detect allowance changes:', error);
      return [];
    }
  }

  private async detectTokenTransfers(contract: string, data: string): Promise<TokenTransfer[]> {
    try {
      // Mock token transfer detection
      const transfers: TokenTransfer[] = [];

      // Check if this is a transfer transaction
      if (data.startsWith('0xa9059cbb')) { // transfer function selector
        transfers.push({
          token: contract,
          from: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
          to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
          amount: '1000000000000000000',
          symbol: 'USDC',
          decimals: 6
        });
      }

      return transfers;

    } catch (error) {
      console.error('Failed to detect token transfers:', error);
      return [];
    }
  }

  private applySafetyChecks(simulation: TransactionSimulation, options: PreflightOptions): void {
    // Check gas price limits
    if (options.maxGasPrice) {
      const gasPrice = BigInt(simulation.gasPrice);
      const maxGasPrice = BigInt(options.maxGasPrice);
      if (gasPrice > maxGasPrice) {
        simulation.warnings.push(`Gas price ${simulation.gasPrice} exceeds maximum ${options.maxGasPrice}`);
      }
    }

    // Check gas limit limits
    if (options.maxGasLimit) {
      const gasUsed = BigInt(simulation.gasUsed);
      const maxGasLimit = BigInt(options.maxGasLimit);
      if (gasUsed > maxGasLimit) {
        simulation.warnings.push(`Gas limit ${simulation.gasUsed} exceeds maximum ${options.maxGasLimit}`);
      }
    }

    // Check for unlimited approvals
    if (options.blockUnlimitedApprovals) {
      const unlimitedApprovals = simulation.allowanceChanges.filter(change => change.isUnlimited);
      if (unlimitedApprovals.length > 0) {
        simulation.warnings.push(`Transaction contains ${unlimitedApprovals.length} unlimited approval(s)`);
      }
    }

    // Check allowance limits
    if (options.maxAllowance) {
      for (const allowance of simulation.allowanceChanges) {
        const newAllowance = BigInt(allowance.newAllowance);
        const maxAllowance = BigInt(options.maxAllowance);
        if (newAllowance > maxAllowance) {
          simulation.warnings.push(`Allowance ${allowance.newAllowance} exceeds maximum ${options.maxAllowance}`);
        }
      }
    }
  }

  async destroy(): Promise<void> {
    this.provider = null;
    this.isInitialized = false;
  }
}

// Global instance
let globalTxSim: TransactionSimulator | null = null;

export function getTransactionSimulator(): TransactionSimulator {
  if (!globalTxSim) {
    globalTxSim = new TransactionSimulator();
  }
  return globalTxSim;
}

// Convenience exports
export const txSimulator = {
  simulateTransaction: (tx: ethers.TransactionRequest, options?: PreflightOptions) => 
    getTransactionSimulator().simulateTransaction(tx, options),
  clampAllowance: (token: string, spender: string, requestedAmount: string, maxAllowance: string) => 
    getTransactionSimulator().clampAllowance(token, spender, requestedAmount, maxAllowance),
  detectUnlimitedApprovals: (tx: ethers.TransactionRequest) => 
    getTransactionSimulator().detectUnlimitedApprovals(tx),
  generateHumanReadableDiff: (simulation: TransactionSimulation) => 
    getTransactionSimulator().generateHumanReadableDiff(simulation)
};
