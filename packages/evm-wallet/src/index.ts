import { ethers } from 'ethers';
import { observability } from '@mycelia/observability';
import { featureFlags } from '@mycelia/web4-feature-flags';

export interface WalletAccount {
  address: string;
  publicKey: string;
  isHardware: boolean;
  deviceType?: 'ledger' | 'trezor' | 'keystone';
  derivationPath?: string;
}

export interface WebAuthnCredential {
  id: string;
  publicKey: string;
  counter: number;
  createdAt: number;
  lastUsed: number;
}

export interface SessionKey {
  id: string;
  address: string;
  publicKey: string;
  expiresAt: number;
  permissions: string[];
  spendingCap: string;
  usedAmount: string;
}

export interface HardwareWalletInfo {
  type: 'ledger' | 'trezor' | 'keystone';
  connected: boolean;
  accounts: WalletAccount[];
  error?: string;
}

export class EVMWallet {
  private accounts: Map<string, WalletAccount> = new Map();
  private sessionKeys: Map<string, SessionKey> = new Map();
  private webAuthnCredentials: Map<string, WebAuthnCredential> = new Map();
  private isInitialized = false;

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      this.isInitialized = true;
      
      // Load existing accounts from storage
      await this.loadAccountsFromStorage();
      
      // Initialize WebAuthn if available
      await this.initializeWebAuthn();

      observability.logEvent('evm_wallet_initialized', {
        accounts_count: this.accounts.size,
        session_keys_count: this.sessionKeys.size
      });

    } catch (error) {
      console.error('Failed to initialize EVM Wallet:', error);
      observability.logEvent('evm_wallet_init_failed', {
        error: (error as Error).message
      });
      throw error;
    }
  }

  async createAccount(password?: string): Promise<WalletAccount> {
    try {
      const wallet = ethers.Wallet.createRandom();
      
      const account: WalletAccount = {
        address: wallet.address,
        publicKey: wallet.publicKey,
        isHardware: false
      };

      this.accounts.set(account.address, account);
      await this.saveAccountsToStorage();

      observability.logEvent('evm_account_created', {
        address: account.address,
        is_hardware: false
      });

      return account;

    } catch (error) {
      console.error('Failed to create account:', error);
      observability.logEvent('evm_account_create_failed', {
        error: (error as Error).message
      });
      throw error;
    }
  }

  async importAccount(privateKey: string, password?: string): Promise<WalletAccount> {
    try {
      const wallet = new ethers.Wallet(privateKey);
      
      const account: WalletAccount = {
        address: wallet.address,
        publicKey: wallet.publicKey,
        isHardware: false
      };

      this.accounts.set(account.address, account);
      await this.saveAccountsToStorage();

      observability.logEvent('evm_account_imported', {
        address: account.address,
        is_hardware: false
      });

      return account;

    } catch (error) {
      console.error('Failed to import account:', error);
      observability.logEvent('evm_account_import_failed', {
        error: (error as Error).message
      });
      throw error;
    }
  }

  async connectHardwareWallet(type: 'ledger' | 'trezor' | 'keystone'): Promise<HardwareWalletInfo> {
    try {
      // Mock hardware wallet connection
      const accounts: WalletAccount[] = [
        {
          address: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
          publicKey: '0x04...',
          isHardware: true,
          deviceType: type,
          derivationPath: "m/44'/60'/0'/0/0"
        }
      ];

      // Add accounts to wallet
      for (const account of accounts) {
        this.accounts.set(account.address, account);
      }
      await this.saveAccountsToStorage();

      const info: HardwareWalletInfo = {
        type,
        connected: true,
        accounts
      };

      observability.logEvent('evm_hardware_wallet_connected', {
        type,
        accounts_count: accounts.length
      });

      return info;

    } catch (error) {
      console.error('Failed to connect hardware wallet:', error);
      observability.logEvent('evm_hardware_wallet_connect_failed', {
        type,
        error: (error as Error).message
      });
      
      return {
        type,
        connected: false,
        accounts: [],
        error: (error as Error).message
      };
    }
  }

  async disconnectHardwareWallet(type: 'ledger' | 'trezor' | 'keystone'): Promise<void> {
    try {
      // Remove hardware wallet accounts
      const hardwareAccounts = Array.from(this.accounts.values())
        .filter(account => account.isHardware && account.deviceType === type);
      
      for (const account of hardwareAccounts) {
        this.accounts.delete(account.address);
      }
      
      await this.saveAccountsToStorage();

      observability.logEvent('evm_hardware_wallet_disconnected', {
        type,
        accounts_removed: hardwareAccounts.length
      });

    } catch (error) {
      console.error('Failed to disconnect hardware wallet:', error);
      observability.logEvent('evm_hardware_wallet_disconnect_failed', {
        type,
        error: (error as Error).message
      });
      throw error;
    }
  }

  async createWebAuthnCredential(): Promise<WebAuthnCredential> {
    try {
      if (!navigator.credentials) {
        throw new Error('WebAuthn not supported');
      }

      // Mock WebAuthn credential creation
      const credential: WebAuthnCredential = {
        id: 'webauthn_' + Math.random().toString(36).substr(2, 9),
        publicKey: '0x04...',
        counter: 0,
        createdAt: Date.now(),
        lastUsed: Date.now()
      };

      this.webAuthnCredentials.set(credential.id, credential);
      await this.saveWebAuthnCredentialsToStorage();

      observability.logEvent('evm_webauthn_credential_created', {
        credential_id: credential.id
      });

      return credential;

    } catch (error) {
      console.error('Failed to create WebAuthn credential:', error);
      observability.logEvent('evm_webauthn_credential_create_failed', {
        error: (error as Error).message
      });
      throw error;
    }
  }

  async authenticateWithWebAuthn(): Promise<boolean> {
    try {
      if (!navigator.credentials) {
        throw new Error('WebAuthn not supported');
      }

      // Mock WebAuthn authentication
      const credential = Array.from(this.webAuthnCredentials.values())[0];
      if (!credential) {
        throw new Error('No WebAuthn credentials found');
      }

      credential.counter++;
      credential.lastUsed = Date.now();
      this.webAuthnCredentials.set(credential.id, credential);
      await this.saveWebAuthnCredentialsToStorage();

      observability.logEvent('evm_webauthn_authentication_success', {
        credential_id: credential.id,
        counter: credential.counter
      });

      return true;

    } catch (error) {
      console.error('Failed to authenticate with WebAuthn:', error);
      observability.logEvent('evm_webauthn_authentication_failed', {
        error: (error as Error).message
      });
      return false;
    }
  }

  async createSessionKey(
    address: string,
    permissions: string[],
    spendingCap: string,
    expiresInHours: number = 24
  ): Promise<SessionKey> {
    try {
      const sessionKey: SessionKey = {
        id: 'session_' + Math.random().toString(36).substr(2, 9),
        address,
        publicKey: '0x04...',
        expiresAt: Date.now() + (expiresInHours * 60 * 60 * 1000),
        permissions,
        spendingCap,
        usedAmount: '0'
      };

      this.sessionKeys.set(sessionKey.id, sessionKey);
      await this.saveSessionKeysToStorage();

      observability.logEvent('evm_session_key_created', {
        session_id: sessionKey.id,
        address,
        permissions_count: permissions.length,
        spending_cap: spendingCap,
        expires_in_hours: expiresInHours
      });

      return sessionKey;

    } catch (error) {
      console.error('Failed to create session key:', error);
      observability.logEvent('evm_session_key_create_failed', {
        error: (error as Error).message
      });
      throw error;
    }
  }

  async revokeSessionKey(sessionKeyId: string): Promise<void> {
    try {
      const sessionKey = this.sessionKeys.get(sessionKeyId);
      if (!sessionKey) {
        throw new Error('Session key not found');
      }

      this.sessionKeys.delete(sessionKeyId);
      await this.saveSessionKeysToStorage();

      observability.logEvent('evm_session_key_revoked', {
        session_id: sessionKeyId,
        address: sessionKey.address
      });

    } catch (error) {
      console.error('Failed to revoke session key:', error);
      observability.logEvent('evm_session_key_revoke_failed', {
        session_id: sessionKeyId,
        error: (error as Error).message
      });
      throw error;
    }
  }

  async getAccounts(): Promise<WalletAccount[]> {
    return Array.from(this.accounts.values());
  }

  async getSessionKeys(): Promise<SessionKey[]> {
    return Array.from(this.sessionKeys.values());
  }

  async getWebAuthnCredentials(): Promise<WebAuthnCredential[]> {
    return Array.from(this.webAuthnCredentials.values());
  }

  async getAccount(address: string): Promise<WalletAccount | null> {
    return this.accounts.get(address) || null;
  }

  async getSessionKey(sessionKeyId: string): Promise<SessionKey | null> {
    return this.sessionKeys.get(sessionKeyId) || null;
  }

  async isSessionKeyValid(sessionKeyId: string): Promise<boolean> {
    const sessionKey = this.sessionKeys.get(sessionKeyId);
    if (!sessionKey) {
      return false;
    }

    const now = Date.now();
    const isValid = now < sessionKey.expiresAt;
    
    if (!isValid) {
      // Auto-cleanup expired session key
      this.sessionKeys.delete(sessionKeyId);
      await this.saveSessionKeysToStorage();
    }

    return isValid;
  }

  async checkSpendingCap(sessionKeyId: string, amount: string): Promise<boolean> {
    const sessionKey = this.sessionKeys.get(sessionKeyId);
    if (!sessionKey) {
      return false;
    }

    const currentUsed = BigInt(sessionKey.usedAmount);
    const spendingCap = BigInt(sessionKey.spendingCap);
    const requestedAmount = BigInt(amount);

    return (currentUsed + requestedAmount) <= spendingCap;
  }

  async updateSessionKeyUsage(sessionKeyId: string, amount: string): Promise<void> {
    const sessionKey = this.sessionKeys.get(sessionKeyId);
    if (!sessionKey) {
      throw new Error('Session key not found');
    }

    const currentUsed = BigInt(sessionKey.usedAmount);
    const additionalAmount = BigInt(amount);
    sessionKey.usedAmount = (currentUsed + additionalAmount).toString();

    this.sessionKeys.set(sessionKeyId, sessionKey);
    await this.saveSessionKeysToStorage();

    observability.logEvent('evm_session_key_usage_updated', {
      session_id: sessionKeyId,
      additional_amount: amount,
      total_used: sessionKey.usedAmount
    });
  }

  private async initializeWebAuthn(): Promise<void> {
    try {
      if (navigator.credentials && 'create' in navigator.credentials) {
        console.log('WebAuthn support detected');
      } else {
        console.log('WebAuthn not supported');
      }
    } catch (error) {
      console.warn('WebAuthn initialization failed:', error);
    }
  }

  private async loadAccountsFromStorage(): Promise<void> {
    try {
      // Mock implementation - would load from encrypted storage
      const mockAccounts: WalletAccount[] = [
        {
          address: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
          publicKey: '0x04...',
          isHardware: false
        }
      ];

      for (const account of mockAccounts) {
        this.accounts.set(account.address, account);
      }
    } catch (error) {
      console.warn('Failed to load accounts from storage:', error);
    }
  }

  private async saveAccountsToStorage(): Promise<void> {
    try {
      // Mock implementation - would save to encrypted storage
      console.log('Saving accounts to storage:', this.accounts.size);
    } catch (error) {
      console.warn('Failed to save accounts to storage:', error);
    }
  }

  private async saveSessionKeysToStorage(): Promise<void> {
    try {
      // Mock implementation - would save to encrypted storage
      console.log('Saving session keys to storage:', this.sessionKeys.size);
    } catch (error) {
      console.warn('Failed to save session keys to storage:', error);
    }
  }

  private async saveWebAuthnCredentialsToStorage(): Promise<void> {
    try {
      // Mock implementation - would save to encrypted storage
      console.log('Saving WebAuthn credentials to storage:', this.webAuthnCredentials.size);
    } catch (error) {
      console.warn('Failed to save WebAuthn credentials to storage:', error);
    }
  }

  async destroy(): Promise<void> {
    this.accounts.clear();
    this.sessionKeys.clear();
    this.webAuthnCredentials.clear();
    this.isInitialized = false;
  }
}

// Global instance
let globalEVMWallet: EVMWallet | null = null;

export function getEVMWallet(): EVMWallet {
  if (!globalEVMWallet) {
    globalEVMWallet = new EVMWallet();
  }
  return globalEVMWallet;
}

// Convenience exports
export const evmWallet = {
  createAccount: (password?: string) => getEVMWallet().createAccount(password),
  importAccount: (privateKey: string, password?: string) => getEVMWallet().importAccount(privateKey, password),
  connectHardwareWallet: (type: 'ledger' | 'trezor' | 'keystone') => getEVMWallet().connectHardwareWallet(type),
  disconnectHardwareWallet: (type: 'ledger' | 'trezor' | 'keystone') => getEVMWallet().disconnectHardwareWallet(type),
  createWebAuthnCredential: () => getEVMWallet().createWebAuthnCredential(),
  authenticateWithWebAuthn: () => getEVMWallet().authenticateWithWebAuthn(),
  createSessionKey: (address: string, permissions: string[], spendingCap: string, expiresInHours?: number) => 
    getEVMWallet().createSessionKey(address, permissions, spendingCap, expiresInHours),
  revokeSessionKey: (sessionKeyId: string) => getEVMWallet().revokeSessionKey(sessionKeyId),
  getAccounts: () => getEVMWallet().getAccounts(),
  getSessionKeys: () => getEVMWallet().getSessionKeys(),
  getWebAuthnCredentials: () => getEVMWallet().getWebAuthnCredentials(),
  getAccount: (address: string) => getEVMWallet().getAccount(address),
  getSessionKey: (sessionKeyId: string) => getEVMWallet().getSessionKey(sessionKeyId),
  isSessionKeyValid: (sessionKeyId: string) => getEVMWallet().isSessionKeyValid(sessionKeyId),
  checkSpendingCap: (sessionKeyId: string, amount: string) => getEVMWallet().checkSpendingCap(sessionKeyId, amount),
  updateSessionKeyUsage: (sessionKeyId: string, amount: string) => getEVMWallet().updateSessionKeyUsage(sessionKeyId, amount)
};
