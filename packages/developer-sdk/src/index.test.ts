import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  MyceliaSDK,
  UniversalWallet,
  BlockchainNetwork,
  useMyceliaSDK,
  useWallet,
  CrossChainUtils,
  ContractDeployment,
  setupMyceliaSDK
} from './index';

// Mock the compatibility layers
vi.mock('@mycelia/evm-compat', () => ({
  createMyceliaProvider: vi.fn().mockReturnValue({
    getNetworkInfo: vi.fn().mockResolvedValue({
      chainId: 1337,
      name: 'mycelia-testnet',
      pegStatus: 'active'
    })
  }),
  createMyceliaSigner: vi.fn().mockReturnValue({
    getAddress: vi.fn().mockResolvedValue('0x1234567890123456789012345678901234567890'),
    getBloomBalance: vi.fn().mockResolvedValue(1000000000n), // 1 BLOOM
    sendBloom: vi.fn().mockResolvedValue({ hash: '0x123' }),
    signMessage: vi.fn().mockResolvedValue('0xsignature')
  }),
  MYCELIA_CONTRACTS: {
    BLOOM_TOKEN: ['function balanceOf(address owner) view returns (uint256)']
  }
}));

vi.mock('@mycelia/solana-compat', () => ({
  createMyceliaSolanaConnection: vi.fn().mockReturnValue({
    getNetworkInfo: vi.fn().mockResolvedValue({
      cluster: 'devnet',
      pegStatus: 'active'
    })
  }),
  createMyceliaSolanaWallet: vi.fn().mockReturnValue({
    publicKey: { toBase58: () => 'SolanaWallet123456789012345678901234567890123456789' },
    getBloomBalance: vi.fn().mockResolvedValue(2000000000n), // 2 BLOOM
    sendBloom: vi.fn().mockResolvedValue('solana-signature'),
    signMessage: vi.fn().mockResolvedValue('solana-signature')
  }),
  MYCELIA_SOLANA_ADDRESSES: {
    BLOOM_TOKEN_MINT: 'BloomToken1111111111111111111111111111111111111',
    MINING_PROGRAM: 'MiningProgram111111111111111111111111111111111111'
  }
}));

vi.mock('@mycelia/tokenomics', () => ({
  bloomToSats: vi.fn((bloom) => bloom * 10000000n), // 10M sats per BLOOM
  satsToBloom: vi.fn((sats) => sats / 10000000n),
  assertPeg: vi.fn(() => 'Peg: 10 BLOOM = 1 BTC')
}));

describe('MyceliaSDK', () => {
  let sdk: MyceliaSDK;

  beforeEach(() => {
    sdk = new MyceliaSDK();
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize EVM provider', () => {
      const provider = sdk.initializeEVM(
        'http://localhost:8545',
        '0xBloomToken1234567890123456789012345678901234',
        '0xGasOracle1234567890123456789012345678901234'
      );
      
      expect(provider).toBeDefined();
    });

    it('should initialize Solana connection', () => {
      const connection = sdk.initializeSolana(
        'https://api.devnet.solana.com',
        'BloomToken1111111111111111111111111111111111111',
        'RentOracle111111111111111111111111111111111111'
      );
      
      expect(connection).toBeDefined();
    });
  });

  describe('Wallet Creation', () => {
    it('should create EVM wallet', async () => {
      sdk.initializeEVM(
        'http://localhost:8545',
        '0xBloomToken1234567890123456789012345678901234',
        '0xGasOracle1234567890123456789012345678901234'
      );

      const wallet = sdk.createEVMWallet('0x1234567890123456789012345678901234567890123456789012345678901234');
      
      expect(wallet.network).toBe(BlockchainNetwork.EVM);
      expect(wallet.address).toBe('0x1234567890123456789012345678901234567890');
      
      const balance = await wallet.getBloomBalance();
      expect(balance).toBe(1000000000n);
    });

    it('should create Solana wallet', async () => {
      sdk.initializeSolana(
        'https://api.devnet.solana.com',
        'BloomToken1111111111111111111111111111111111111',
        'RentOracle111111111111111111111111111111111111'
      );

      const wallet = sdk.createSolanaWallet(new Uint8Array(64));
      
      expect(wallet.network).toBe(BlockchainNetwork.SOLANA);
      expect(wallet.address).toBe('SolanaWallet123456789012345678901234567890123456789');
      
      const balance = await wallet.getBloomBalance();
      expect(balance).toBe(2000000000n);
    });

    it('should throw error when creating wallet without initialization', () => {
      expect(() => sdk.createEVMWallet('0x123')).toThrow('EVM not initialized');
      expect(() => sdk.createSolanaWallet(new Uint8Array(64))).toThrow('Solana not initialized');
    });
  });

  describe('Wallet Management', () => {
    it('should get wallet by address', async () => {
      sdk.initializeEVM(
        'http://localhost:8545',
        '0xBloomToken1234567890123456789012345678901234',
        '0xGasOracle1234567890123456789012345678901234'
      );

      const wallet = sdk.createEVMWallet('0x1234567890123456789012345678901234567890123456789012345678901234');
      
      // Wait for address to be set
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const retrievedWallet = sdk.getWallet('0x1234567890123456789012345678901234567890');
      expect(retrievedWallet).toBe(wallet);
    });

    it('should get all wallets', async () => {
      sdk.initializeEVM(
        'http://localhost:8545',
        '0xBloomToken1234567890123456789012345678901234',
        '0xGasOracle1234567890123456789012345678901234'
      );
      sdk.initializeSolana(
        'https://api.devnet.solana.com',
        'BloomToken1111111111111111111111111111111111111',
        'RentOracle111111111111111111111111111111111111'
      );

      sdk.createEVMWallet('0x1234567890123456789012345678901234567890123456789012345678901234');
      sdk.createSolanaWallet(new Uint8Array(64));
      
      const wallets = sdk.getAllWallets();
      expect(wallets).toHaveLength(2);
      expect(wallets[0].network).toBe(BlockchainNetwork.EVM);
      expect(wallets[1].network).toBe(BlockchainNetwork.SOLANA);
    });
  });

  describe('Network Information', () => {
    it('should get network info for both networks', async () => {
      sdk.initializeEVM(
        'http://localhost:8545',
        '0xBloomToken1234567890123456789012345678901234',
        '0xGasOracle1234567890123456789012345678901234'
      );
      sdk.initializeSolana(
        'https://api.devnet.solana.com',
        'BloomToken1111111111111111111111111111111111111',
        'RentOracle111111111111111111111111111111111111'
      );

      const networkInfo = await sdk.getNetworkInfo();
      
      expect(networkInfo.evm).toEqual({
        chainId: 1337,
        name: 'mycelia-testnet',
        pegStatus: 'active'
      });
      
      expect(networkInfo.solana).toEqual({
        cluster: 'devnet',
        pegStatus: 'active'
      });
      
      expect(networkInfo.peg).toEqual({
        bloomPerBtc: 10,
        status: 'Peg: 10 BLOOM = 1 BTC'
      });
    });
  });
});

describe('React Hooks', () => {
  describe('useMyceliaSDK', () => {
    it('should provide SDK instance and state', () => {
      const { result } = renderHook(() => useMyceliaSDK());
      
      expect(result.current.sdk).toBeInstanceOf(MyceliaSDK);
      expect(result.current.wallets).toEqual([]);
      expect(result.current.networkInfo).toBeNull();
    });

    it('should create wallets and update state', async () => {
      const { result } = renderHook(() => useMyceliaSDK());
      
      act(() => {
        result.current.sdk.initializeEVM(
          'http://localhost:8545',
          '0xBloomToken1234567890123456789012345678901234',
          '0xGasOracle1234567890123456789012345678901234'
        );
      });

      act(() => {
        result.current.createEVMWallet('0x1234567890123456789012345678901234567890123456789012345678901234');
      });

      expect(result.current.wallets).toHaveLength(1);
    });
  });

  describe('useWallet', () => {
    it('should provide wallet state and operations', async () => {
      const mockWallet: UniversalWallet = {
        network: BlockchainNetwork.EVM,
        address: '0x123',
        getBloomBalance: vi.fn().mockResolvedValue(1000000000n),
        getBloomBalanceInBtc: vi.fn().mockResolvedValue(0.1),
        sendBloom: vi.fn().mockResolvedValue('0x123'),
        signMessage: vi.fn().mockResolvedValue('0xsignature'),
        getNativeProvider: vi.fn()
      };

      const { result } = renderHook(() => useWallet(mockWallet));
      
      expect(result.current.balance).toBe(0n);
      expect(result.current.btcBalance).toBe(0);
      expect(result.current.loading).toBe(true);
      expect(result.current.wallet).toBe(mockWallet);

      // Wait for balance update
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      expect(result.current.balance).toBe(1000000000n);
      expect(result.current.btcBalance).toBe(0.1);
      expect(result.current.loading).toBe(false);
    });

    it('should handle sendBloom operation', async () => {
      const mockWallet: UniversalWallet = {
        network: BlockchainNetwork.EVM,
        address: '0x123',
        getBloomBalance: vi.fn().mockResolvedValue(1000000000n),
        getBloomBalanceInBtc: vi.fn().mockResolvedValue(0.1),
        sendBloom: vi.fn().mockResolvedValue('0x123'),
        signMessage: vi.fn().mockResolvedValue('0xsignature'),
        getNativeProvider: vi.fn()
      };

      const { result } = renderHook(() => useWallet(mockWallet));
      
      await act(async () => {
        const txHash = await result.current.sendBloom('0x456', 1000000000n);
        expect(txHash).toBe('0x123');
      });
    });
  });
});

describe('CrossChainUtils', () => {
  describe('formatBloomAmount', () => {
    it('should format BLOOM amounts correctly', () => {
      expect(CrossChainUtils.formatBloomAmount(1000000000n)).toBe('1');
      expect(CrossChainUtils.formatBloomAmount(1500000000n)).toBe('1.5');
      expect(CrossChainUtils.formatBloomAmount(123456789n)).toBe('0.123456789');
    });

    it('should handle different decimal places', () => {
      expect(CrossChainUtils.formatBloomAmount(1000000000n, 6)).toBe('1000');
      expect(CrossChainUtils.formatBloomAmount(1500000n, 6)).toBe('1.5');
    });
  });

  describe('parseBloomAmount', () => {
    it('should parse BLOOM amounts correctly', () => {
      expect(CrossChainUtils.parseBloomAmount('1')).toBe(1000000000n);
      expect(CrossChainUtils.parseBloomAmount('1.5')).toBe(1500000000n);
      expect(CrossChainUtils.parseBloomAmount('0.123456789')).toBe(123456789n);
    });

    it('should handle different decimal places', () => {
      expect(CrossChainUtils.parseBloomAmount('1000', 6)).toBe(1000000000n);
      expect(CrossChainUtils.parseBloomAmount('1.5', 6)).toBe(1500000n);
    });
  });

  describe('getExplorerUrl', () => {
    it('should generate correct explorer URLs', () => {
      expect(CrossChainUtils.getExplorerUrl('0x123', BlockchainNetwork.EVM))
        .toBe('https://etherscan.io/tx/0x123');
      
      expect(CrossChainUtils.getExplorerUrl('solana123', BlockchainNetwork.SOLANA, 'devnet'))
        .toBe('https://explorer.solana.com?cluster=devnet/tx/solana123');
      
      expect(CrossChainUtils.getExplorerUrl('solana123', BlockchainNetwork.SOLANA, 'mainnet'))
        .toBe('https://explorer.solana.com/tx/solana123');
    });
  });
});

describe('ContractDeployment', () => {
  describe('deployBloomToken', () => {
    it('should deploy BLOOM token contract', async () => {
      const mockSigner = {
        sendTransaction: vi.fn().mockResolvedValue({ hash: '0x123' })
      };

      const contractAddress = await ContractDeployment.deployBloomToken(mockSigner as any);
      expect(contractAddress).toBeDefined();
    });
  });

  describe('deployMiningProgram', () => {
    it('should deploy mining program', async () => {
      const mockWallet = {};
      const mockConnection = {};

      const programId = await ContractDeployment.deployMiningProgram(
        mockWallet as any,
        mockConnection as any
      );
      
      expect(programId).toBe('MiningProgram111111111111111111111111111111111111');
    });
  });
});

describe('setupMyceliaSDK', () => {
  it('should setup SDK with EVM configuration', () => {
    const sdk = setupMyceliaSDK({
      evm: {
        rpcUrl: 'http://localhost:8545',
        bloomTokenAddress: '0xBloomToken1234567890123456789012345678901234',
        gasOracleAddress: '0xGasOracle1234567890123456789012345678901234'
      }
    });

    expect(sdk).toBeInstanceOf(MyceliaSDK);
  });

  it('should setup SDK with Solana configuration', () => {
    const sdk = setupMyceliaSDK({
      solana: {
        rpcUrl: 'https://api.devnet.solana.com',
        bloomTokenMint: 'BloomToken1111111111111111111111111111111111111',
        rentOracleProgram: 'RentOracle111111111111111111111111111111111111'
      }
    });

    expect(sdk).toBeInstanceOf(MyceliaSDK);
  });

  it('should setup SDK with both configurations', () => {
    const sdk = setupMyceliaSDK({
      evm: {
        rpcUrl: 'http://localhost:8545',
        bloomTokenAddress: '0xBloomToken1234567890123456789012345678901234',
        gasOracleAddress: '0xGasOracle1234567890123456789012345678901234'
      },
      solana: {
        rpcUrl: 'https://api.devnet.solana.com',
        bloomTokenMint: 'BloomToken1111111111111111111111111111111111111',
        rentOracleProgram: 'RentOracle111111111111111111111111111111111111'
      }
    });

    expect(sdk).toBeInstanceOf(MyceliaSDK);
  });
});
