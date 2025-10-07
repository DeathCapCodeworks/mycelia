import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import {
  EVMWalletManager,
  SolanaWalletManager,
  CrossChainWalletManager,
  WalletType,
  WalletStatus,
  WalletUtils,
  type WalletState,
  type CrossChainWalletState
} from './index';
import {
  WalletButton,
  WalletSelector,
  WalletStatus as WalletStatusComponent,
  CrossChainDashboard
} from './components';
import { useEVMWallet, useSolanaWallet, useCrossChainWallet } from './hooks';

// Mock window.ethereum
const mockEthereum = {
  isMetaMask: true,
  isCoinbaseWallet: false,
  request: vi.fn(),
  on: vi.fn()
};

const mockSolana = {
  isPhantom: true,
  connect: vi.fn(),
  disconnect: vi.fn(),
  on: vi.fn()
};

const mockSolflare = {
  connect: vi.fn(),
  disconnect: vi.fn()
};

const mockBackpack = {
  connect: vi.fn(),
  disconnect: vi.fn()
};

// Mock window object
Object.defineProperty(window, 'ethereum', {
  value: mockEthereum,
  writable: true
});

Object.defineProperty(window, 'solana', {
  value: mockSolana,
  writable: true
});

Object.defineProperty(window, 'solflare', {
  value: mockSolflare,
  writable: true
});

Object.defineProperty(window, 'backpack', {
  value: mockBackpack,
  writable: true
});

// Mock ethers
vi.mock('ethers', () => ({
  ethers: {
    BrowserProvider: vi.fn().mockImplementation(() => ({
      getSigner: vi.fn().mockResolvedValue({
        getAddress: vi.fn().mockResolvedValue('0x1234567890123456789012345678901234567890'),
        sendTransaction: vi.fn().mockResolvedValue({ hash: '0x123' })
      }),
      getBalance: vi.fn().mockResolvedValue(1000000000000000000n)
    })),
    isAddress: vi.fn().mockReturnValue(true)
  }
}));

// Mock Solana web3.js
vi.mock('@solana/web3.js', () => ({
  PublicKey: vi.fn().mockImplementation((key) => ({
    toBase58: () => key || 'SolanaPublicKey123456789012345678901234567890123456789',
    toString: () => key || 'SolanaPublicKey123456789012345678901234567890123456789'
  })),
  Connection: vi.fn().mockImplementation(() => ({})),
  Keypair: {
    generate: vi.fn().mockReturnValue({
      publicKey: { toBase58: () => 'GeneratedKeypair123456789012345678901234567890123456789' }
    })
  }
}));

describe('EVMWalletManager', () => {
  let manager: EVMWalletManager;

  beforeEach(() => {
    manager = new EVMWalletManager();
    vi.clearAllMocks();
  });

  describe('MetaMask Integration', () => {
    it('should connect to MetaMask successfully', async () => {
      mockEthereum.request.mockResolvedValue(['0x1234567890123456789012345678901234567890']);

      const state = await manager.connectMetaMask();

      expect(state.status).toBe(WalletStatus.CONNECTED);
      expect(state.address).toBe('0x1234567890123456789012345678901234567890');
      expect(state.balance).toBe(1000000000000000000n);
    });

    it('should handle MetaMask not installed error', async () => {
      Object.defineProperty(window, 'ethereum', { value: undefined, writable: true });

      await expect(manager.connectMetaMask()).rejects.toThrow('MetaMask not installed');
    });

    it('should detect MetaMask installation', () => {
      expect(EVMWalletManager.isMetaMaskInstalled()).toBe(true);
    });

    it('should detect Coinbase Wallet installation', () => {
      expect(EVMWalletManager.isCoinbaseInstalled()).toBe(false);
    });
  });

  describe('Coinbase Wallet Integration', () => {
    it('should connect to Coinbase Wallet successfully', async () => {
      mockEthereum.isCoinbaseWallet = true;
      mockEthereum.request.mockResolvedValue(['0x1234567890123456789012345678901234567890']);

      const state = await manager.connectCoinbase();

      expect(state.status).toBe(WalletStatus.CONNECTED);
      expect(state.address).toBe('0x1234567890123456789012345678901234567890');
    });

    it('should handle Coinbase Wallet not installed error', async () => {
      mockEthereum.isCoinbaseWallet = false;

      await expect(manager.connectCoinbase()).rejects.toThrow('Coinbase Wallet not installed');
    });
  });

  describe('Wallet Operations', () => {
    beforeEach(async () => {
      await manager.connectMetaMask();
    });

    it('should get BLOOM balance', async () => {
      const balance = await manager.getBloomBalance();
      expect(balance).toBe(1000000000000000000n);
    });

    it('should get BLOOM balance in BTC equivalent', async () => {
      const btcBalance = await manager.getBloomBalanceInBtc();
      expect(btcBalance).toBe(0.1); // 1 BLOOM = 0.1 BTC
    });

    it('should send BLOOM tokens', async () => {
      const txHash = await manager.sendBloom('0x456', 1000000000000000000n);
      expect(txHash).toBe('0x123');
    });

    it('should disconnect wallet', async () => {
      await manager.disconnect();
      const state = manager.getState();
      expect(state.status).toBe(WalletStatus.DISCONNECTED);
    });
  });

  describe('Event Listeners', () => {
    it('should add and remove event listeners', () => {
      const listener = vi.fn();
      
      manager.addEventListener(listener);
      expect(manager['listeners'].has(listener)).toBe(true);
      
      manager.removeEventListener(listener);
      expect(manager['listeners'].has(listener)).toBe(false);
    });
  });
});

describe('SolanaWalletManager', () => {
  let manager: SolanaWalletManager;

  beforeEach(() => {
    manager = new SolanaWalletManager();
    vi.clearAllMocks();
  });

  describe('Phantom Integration', () => {
    it('should connect to Phantom successfully', async () => {
      mockSolana.connect.mockResolvedValue({
        publicKey: { toBase58: () => 'PhantomPublicKey123456789012345678901234567890123456789' }
      });

      const state = await manager.connectPhantom();

      expect(state.status).toBe(WalletStatus.CONNECTED);
      expect(state.publicKey).toBeDefined();
    });

    it('should handle Phantom not installed error', async () => {
      Object.defineProperty(window, 'solana', { value: undefined, writable: true });

      await expect(manager.connectPhantom()).rejects.toThrow('Phantom wallet not installed');
    });

    it('should detect Phantom installation', () => {
      expect(SolanaWalletManager.isPhantomInstalled()).toBe(true);
    });
  });

  describe('Solflare Integration', () => {
    it('should connect to Solflare successfully', async () => {
      mockSolflare.connect.mockResolvedValue({
        publicKey: { toBase58: () => 'SolflarePublicKey123456789012345678901234567890123456789' }
      });

      const state = await manager.connectSolflare();

      expect(state.status).toBe(WalletStatus.CONNECTED);
      expect(state.publicKey).toBeDefined();
    });

    it('should handle Solflare not installed error', async () => {
      Object.defineProperty(window, 'solflare', { value: undefined, writable: true });

      await expect(manager.connectSolflare()).rejects.toThrow('Solflare wallet not installed');
    });

    it('should detect Solflare installation', () => {
      expect(SolanaWalletManager.isSolflareInstalled()).toBe(true);
    });
  });

  describe('Backpack Integration', () => {
    it('should connect to Backpack successfully', async () => {
      mockBackpack.connect.mockResolvedValue({
        publicKey: { toBase58: () => 'BackpackPublicKey123456789012345678901234567890123456789' }
      });

      const state = await manager.connectBackpack();

      expect(state.status).toBe(WalletStatus.CONNECTED);
      expect(state.publicKey).toBeDefined();
    });

    it('should handle Backpack not installed error', async () => {
      Object.defineProperty(window, 'backpack', { value: undefined, writable: true });

      await expect(manager.connectBackpack()).rejects.toThrow('Backpack wallet not installed');
    });

    it('should detect Backpack installation', () => {
      expect(SolanaWalletManager.isBackpackInstalled()).toBe(true);
    });
  });

  describe('Wallet Operations', () => {
    beforeEach(async () => {
      await manager.connectPhantom();
    });

    it('should get BLOOM balance', async () => {
      const balance = await manager.getBloomBalance();
      expect(balance).toBe(2000000000000000000n);
    });

    it('should get BLOOM balance in BTC equivalent', async () => {
      const btcBalance = await manager.getBloomBalanceInBtc();
      expect(btcBalance).toBe(0.2); // 2 BLOOM = 0.2 BTC
    });

    it('should send BLOOM tokens', async () => {
      const { PublicKey } = await import('@solana/web3.js');
      const recipient = new PublicKey('Recipient123456789012345678901234567890123456789');
      
      const txHash = await manager.sendBloom(recipient, 1000000000000000000n);
      expect(txHash).toMatch(/^solana_tx_\d+$/);
    });

    it('should disconnect wallet', async () => {
      await manager.disconnect();
      const state = manager.getState();
      expect(state.status).toBe(WalletStatus.DISCONNECTED);
    });
  });
});

describe('CrossChainWalletManager', () => {
  let manager: CrossChainWalletManager;

  beforeEach(() => {
    manager = new CrossChainWalletManager();
    vi.clearAllMocks();
  });

  describe('Cross-Chain Operations', () => {
    it('should connect EVM wallet', async () => {
      const state = await manager.connectEVM(WalletType.METAMASK);
      expect(state.status).toBe(WalletStatus.CONNECTED);
    });

    it('should connect Solana wallet', async () => {
      const state = await manager.connectSolana(WalletType.PHANTOM);
      expect(state.status).toBe(WalletStatus.CONNECTED);
    });

    it('should get cross-chain state', () => {
      const state = manager.getState();
      expect(state.evm.status).toBe(WalletStatus.DISCONNECTED);
      expect(state.solana.status).toBe(WalletStatus.DISCONNECTED);
    });

    it('should get available wallets', () => {
      const wallets = manager.getAvailableWallets();
      expect(wallets.length).toBeGreaterThan(0);
      expect(wallets.some(w => w.type === WalletType.METAMASK)).toBe(true);
      expect(wallets.some(w => w.type === WalletType.PHANTOM)).toBe(true);
    });

    it('should disconnect all wallets', async () => {
      await manager.connectEVM(WalletType.METAMASK);
      await manager.connectSolana(WalletType.PHANTOM);
      
      await manager.disconnectAll();
      
      const state = manager.getState();
      expect(state.evm.status).toBe(WalletStatus.DISCONNECTED);
      expect(state.solana.status).toBe(WalletStatus.DISCONNECTED);
    });
  });

  describe('Balance Operations', () => {
    beforeEach(async () => {
      await manager.connectEVM(WalletType.METAMASK);
      await manager.connectSolana(WalletType.PHANTOM);
    });

    it('should get total BLOOM balance', async () => {
      const totalBalance = await manager.getTotalBloomBalance();
      expect(totalBalance).toBe(3000000000000000000n); // 1 + 2 BLOOM
    });

    it('should get total BLOOM balance in BTC equivalent', async () => {
      const totalBtcBalance = await manager.getTotalBloomBalanceInBtc();
      expect(totalBtcBalance).toBe(0.3); // 3 BLOOM = 0.3 BTC
    });
  });
});

describe('WalletUtils', () => {
  describe('Address Formatting', () => {
    it('should format address correctly', () => {
      const address = '0x1234567890123456789012345678901234567890';
      const formatted = WalletUtils.formatAddress(address, 6);
      expect(formatted).toBe('0x1234...7890');
    });

    it('should handle short addresses', () => {
      const address = '0x1234';
      const formatted = WalletUtils.formatAddress(address, 6);
      expect(formatted).toBe('0x1234');
    });
  });

  describe('Amount Formatting', () => {
    it('should format BLOOM amounts correctly', () => {
      const amount = 1000000000000000000n; // 1 BLOOM
      const formatted = WalletUtils.formatBloomAmount(amount);
      expect(formatted).toBe('1');
    });

    it('should format BLOOM amounts with decimals', () => {
      const amount = 1500000000000000000n; // 1.5 BLOOM
      const formatted = WalletUtils.formatBloomAmount(amount);
      expect(formatted).toBe('1.5');
    });

    it('should format BTC amounts correctly', () => {
      const amount = 0.12345678;
      const formatted = WalletUtils.formatBtcAmount(amount);
      expect(formatted).toBe('0.12345678');
    });
  });

  describe('Wallet Information', () => {
    it('should get wallet icon URL', () => {
      const metamaskUrl = WalletUtils.getWalletIconUrl(WalletType.METAMASK);
      expect(metamaskUrl).toContain('metamask');
    });

    it('should get wallet download URL', () => {
      const metamaskUrl = WalletUtils.getWalletDownloadUrl(WalletType.METAMASK);
      expect(metamaskUrl).toContain('metamask.io');
    });

    it('should validate EVM addresses', () => {
      expect(WalletUtils.validateAddress('0x1234567890123456789012345678901234567890', 'evm')).toBe(true);
      expect(WalletUtils.validateAddress('invalid', 'evm')).toBe(false);
    });

    it('should validate Solana addresses', () => {
      expect(WalletUtils.validateAddress('SolanaPublicKey123456789012345678901234567890123456789', 'solana')).toBe(true);
      expect(WalletUtils.validateAddress('invalid', 'solana')).toBe(false);
    });
  });
});

describe('React Hooks', () => {
  describe('useEVMWallet', () => {
    it('should provide EVM wallet functionality', () => {
      const TestComponent = () => {
        const wallet = useEVMWallet();
        return (
          <div>
            <span data-testid="status">{wallet.state.status}</span>
            <span data-testid="is-connected">{wallet.isConnected.toString()}</span>
          </div>
        );
      };

      render(<TestComponent />);
      
      expect(screen.getByTestId('status')).toHaveTextContent('disconnected');
      expect(screen.getByTestId('is-connected')).toHaveTextContent('false');
    });
  });

  describe('useSolanaWallet', () => {
    it('should provide Solana wallet functionality', () => {
      const TestComponent = () => {
        const wallet = useSolanaWallet();
        return (
          <div>
            <span data-testid="status">{wallet.state.status}</span>
            <span data-testid="is-connected">{wallet.isConnected.toString()}</span>
          </div>
        );
      };

      render(<TestComponent />);
      
      expect(screen.getByTestId('status')).toHaveTextContent('disconnected');
      expect(screen.getByTestId('is-connected')).toHaveTextContent('false');
    });
  });

  describe('useCrossChainWallet', () => {
    it('should provide cross-chain wallet functionality', () => {
      const TestComponent = () => {
        const wallet = useCrossChainWallet();
        return (
          <div>
            <span data-testid="evm-status">{wallet.state.evm.status}</span>
            <span data-testid="solana-status">{wallet.state.solana.status}</span>
            <span data-testid="evm-connected">{wallet.isEVMConnected.toString()}</span>
            <span data-testid="solana-connected">{wallet.isSolanaConnected.toString()}</span>
          </div>
        );
      };

      render(<TestComponent />);
      
      expect(screen.getByTestId('evm-status')).toHaveTextContent('disconnected');
      expect(screen.getByTestId('solana-status')).toHaveTextContent('disconnected');
      expect(screen.getByTestId('evm-connected')).toHaveTextContent('false');
      expect(screen.getByTestId('solana-connected')).toHaveTextContent('false');
    });
  });
});

describe('React Components', () => {
  describe('WalletButton', () => {
    it('should render wallet button', () => {
      render(<WalletButton walletType={WalletType.METAMASK} />);
      expect(screen.getByText('Connect MetaMask')).toBeInTheDocument();
    });

    it('should show install button for uninstalled wallet', () => {
      Object.defineProperty(window, 'ethereum', { value: undefined, writable: true });
      
      render(<WalletButton walletType={WalletType.METAMASK} />);
      expect(screen.getByText('Install MetaMask')).toBeInTheDocument();
    });

    it('should handle wallet connection', async () => {
      const onConnect = vi.fn();
      render(<WalletButton walletType={WalletType.METAMASK} onConnect={onConnect} />);
      
      const button = screen.getByText('Connect MetaMask');
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(onConnect).toHaveBeenCalledWith(WalletType.METAMASK);
      });
    });
  });

  describe('WalletSelector', () => {
    it('should render wallet selector', () => {
      render(<WalletSelector />);
      expect(screen.getByText('Select Wallet')).toBeInTheDocument();
    });

    it('should filter wallets by type', () => {
      render(<WalletSelector showEVM={false} showSolana={true} />);
      // Should only show Solana wallets
      expect(screen.queryByText('Connect MetaMask')).not.toBeInTheDocument();
    });
  });

  describe('WalletStatus', () => {
    it('should render wallet status', () => {
      render(<WalletStatusComponent walletType={WalletType.METAMASK} />);
      expect(screen.getByText('Wallet not connected')).toBeInTheDocument();
    });
  });

  describe('CrossChainDashboard', () => {
    it('should render cross-chain dashboard', () => {
      render(<CrossChainDashboard />);
      expect(screen.getByText('Cross-Chain Dashboard')).toBeInTheDocument();
    });

    it('should handle transfer form', () => {
      const onTransfer = vi.fn();
      render(<CrossChainDashboard onTransfer={onTransfer} />);
      
      const amountInput = screen.getByPlaceholderText('Amount (BLOOM)');
      const toInput = screen.getByPlaceholderText('To Address');
      const transferButton = screen.getByText('Transfer');
      
      fireEvent.change(amountInput, { target: { value: '1000000000000000000' } });
      fireEvent.change(toInput, { target: { value: '0x456' } });
      fireEvent.click(transferButton);
      
      expect(onTransfer).toHaveBeenCalledWith('evm', 'solana', 1000000000000000000n);
    });
  });
});
