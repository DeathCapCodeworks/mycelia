import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ethers } from 'ethers';
import {
  MyceliaEVMProvider,
  MyceliaEVMSigner,
  createMyceliaProvider,
  createMyceliaSigner,
  Web3Compatibility,
  MYCELIA_CONTRACTS
} from './index';

// Mock ethers provider
const mockProvider = {
  getNetwork: vi.fn().mockResolvedValue({ chainId: 1337n, name: 'mycelia-testnet' }),
  getBlockNumber: vi.fn().mockResolvedValue(12345),
  getBalance: vi.fn().mockResolvedValue(1000000000000000000n), // 1 ETH
  getTransaction: vi.fn().mockResolvedValue(null),
  getTransactionReceipt: vi.fn().mockResolvedValue(null),
  getBlock: vi.fn().mockResolvedValue(null),
  call: vi.fn().mockResolvedValue('0x'),
  estimateGas: vi.fn().mockResolvedValue(21000n),
  sendTransaction: vi.fn().mockResolvedValue({} as any)
};

// Mock ethers signer
const mockSigner = {
  getAddress: vi.fn().mockResolvedValue('0x1234567890123456789012345678901234567890'),
  getBalance: vi.fn().mockResolvedValue(1000000000000000000n),
  getTransactionCount: vi.fn().mockResolvedValue(5),
  estimateGas: vi.fn().mockResolvedValue(21000n),
  call: vi.fn().mockResolvedValue('0x'),
  sendTransaction: vi.fn().mockResolvedValue({} as any),
  signTransaction: vi.fn().mockResolvedValue('0x'),
  signMessage: vi.fn().mockResolvedValue('0x'),
  signTypedData: vi.fn().mockResolvedValue('0x'),
  connect: vi.fn().mockReturnThis()
};

describe('MyceliaEVMProvider', () => {
  let provider: MyceliaEVMProvider;
  const bloomTokenAddress = '0xBloomToken1234567890123456789012345678901234';
  const gasOracleAddress = '0xGasOracle1234567890123456789012345678901234';

  beforeEach(() => {
    provider = new MyceliaEVMProvider(
      mockProvider as any,
      bloomTokenAddress,
      gasOracleAddress
    );
    vi.clearAllMocks();
  });

  describe('Standard Provider Interface', () => {
    it('should delegate getNetwork calls', async () => {
      const network = await provider.getNetwork();
      expect(mockProvider.getNetwork).toHaveBeenCalled();
      expect(network.chainId).toBe(1337n);
    });

    it('should delegate getBalance calls', async () => {
      const balance = await provider.getBalance('0x123');
      expect(mockProvider.getBalance).toHaveBeenCalledWith('0x123', undefined);
      expect(balance).toBe(1000000000000000000n);
    });

    it('should delegate estimateGas calls', async () => {
      const gas = await provider.estimateGas({ to: '0x123', value: 1000n });
      expect(mockProvider.estimateGas).toHaveBeenCalledWith({ to: '0x123', value: 1000n });
      expect(gas).toBe(21000n);
    });
  });

  describe('Mycelia-specific Methods', () => {
    it('should get BLOOM balance', async () => {
      // Mock contract call
      const mockContract = {
        balanceOf: vi.fn().mockResolvedValue(ethers.parseEther('100'))
      };
      vi.spyOn(ethers, 'Contract').mockReturnValue(mockContract as any);

      const balance = await provider.getBloomBalance('0x123');
      expect(balance).toBe(100000000000000000000n); // 100 BLOOM
    });

    it('should get BLOOM balance in BTC', async () => {
      const mockContract = {
        balanceOf: vi.fn().mockResolvedValue(ethers.parseEther('10')) // 10 BLOOM
      };
      vi.spyOn(ethers, 'Contract').mockReturnValue(mockContract as any);

      const btcBalance = await provider.getBloomBalanceInBtc('0x123');
      expect(btcBalance).toBe(1.0); // 10 BLOOM = 1 BTC
    });

    it('should get gas price in BLOOM', async () => {
      const mockContract = {
        getGasPriceInBloom: vi.fn().mockResolvedValue(ethers.parseEther('0.001'))
      };
      vi.spyOn(ethers, 'Contract').mockReturnValue(mockContract as any);

      const gasPrice = await provider.getGasPriceInBloom();
      expect(gasPrice).toBe(1000000000000000n); // 0.001 BLOOM
    });

    it('should get network info', async () => {
      const networkInfo = await provider.getNetworkInfo();
      expect(networkInfo).toEqual({
        chainId: 1337,
        name: 'mycelia-testnet',
        pegStatus: 'active',
        bloomPerBtc: 10
      });
    });
  });
});

describe('MyceliaEVMSigner', () => {
  let signer: MyceliaEVMSigner;
  let provider: MyceliaEVMProvider;
  const bloomTokenAddress = '0xBloomToken1234567890123456789012345678901234';

  beforeEach(() => {
    provider = new MyceliaEVMProvider(
      mockProvider as any,
      bloomTokenAddress,
      '0xGasOracle1234567890123456789012345678901234'
    );
    signer = new MyceliaEVMSigner(mockSigner as any, provider, bloomTokenAddress);
    vi.clearAllMocks();
  });

  describe('Standard Signer Interface', () => {
    it('should delegate getAddress calls', async () => {
      const address = await signer.getAddress();
      expect(mockSigner.getAddress).toHaveBeenCalled();
      expect(address).toBe('0x1234567890123456789012345678901234567890');
    });

    it('should delegate sendTransaction calls', async () => {
      const tx = { to: '0x123', value: 1000n };
      await signer.sendTransaction(tx);
      expect(mockSigner.sendTransaction).toHaveBeenCalledWith(tx);
    });
  });

  describe('Mycelia-specific Methods', () => {
    it('should send BLOOM tokens', async () => {
      const mockContract = {
        transfer: vi.fn().mockResolvedValue({ hash: '0x123' })
      };
      vi.spyOn(ethers, 'Contract').mockReturnValue(mockContract as any);

      const result = await signer.sendBloom('0x456', 1000000000000000000n); // 1 BLOOM
      expect(mockContract.transfer).toHaveBeenCalledWith('0x456', 1000000000000000000n, undefined);
    });

    it('should approve BLOOM spending', async () => {
      const mockContract = {
        approve: vi.fn().mockResolvedValue({ hash: '0x123' })
      };
      vi.spyOn(ethers, 'Contract').mockReturnValue(mockContract as any);

      const result = await signer.approveBloom('0x456', 1000000000000000000n);
      expect(mockContract.approve).toHaveBeenCalledWith('0x456', 1000000000000000000n, undefined);
    });

    it('should get BLOOM balance', async () => {
      const mockContract = {
        balanceOf: vi.fn().mockResolvedValue(ethers.parseEther('50'))
      };
      vi.spyOn(ethers, 'Contract').mockReturnValue(mockContract as any);

      const balance = await signer.getBloomBalance();
      expect(balance).toBe(50000000000000000000n); // 50 BLOOM
    });
  });
});

describe('Factory Functions', () => {
  it('should create Mycelia provider', () => {
    const provider = createMyceliaProvider(
      'http://localhost:8545',
      '0xBloomToken1234567890123456789012345678901234',
      '0xGasOracle1234567890123456789012345678901234'
    );
    
    expect(provider).toBeInstanceOf(MyceliaEVMProvider);
  });

  it('should create Mycelia signer', () => {
    const provider = createMyceliaProvider(
      'http://localhost:8545',
      '0xBloomToken1234567890123456789012345678901234',
      '0xGasOracle1234567890123456789012345678901234'
    );
    
    const signer = createMyceliaSigner(
      '0x1234567890123456789012345678901234567890123456789012345678901234',
      provider,
      '0xBloomToken1234567890123456789012345678901234'
    );
    
    expect(signer).toBeInstanceOf(MyceliaEVMSigner);
  });
});

describe('Web3Compatibility', () => {
  let provider: MyceliaEVMProvider;
  let web3Compat: Web3Compatibility;

  beforeEach(() => {
    provider = new MyceliaEVMProvider(
      mockProvider as any,
      '0xBloomToken1234567890123456789012345678901234',
      '0xGasOracle1234567890123456789012345678901234'
    );
    web3Compat = new Web3Compatibility(provider);
    vi.clearAllMocks();
  });

  it('should provide Web3.js compatible interface', () => {
    const web3Provider = web3Compat.getWeb3Provider();
    expect(web3Provider).toHaveProperty('request');
    expect(typeof web3Provider.request).toBe('function');
  });

  it('should handle eth_getBalance requests', async () => {
    const web3Provider = web3Compat.getWeb3Provider();
    const balance = await web3Provider.request({
      method: 'eth_getBalance',
      params: ['0x123']
    });
    
    expect(balance).toBe('0xde0b6b3a7640000'); // 1 ETH in hex
  });

  it('should handle eth_getBloomBalance requests', async () => {
    const mockContract = {
      balanceOf: vi.fn().mockResolvedValue(ethers.parseEther('10'))
    };
    vi.spyOn(ethers, 'Contract').mockReturnValue(mockContract as any);

    const web3Provider = web3Compat.getWeb3Provider();
    const balance = await web3Provider.request({
      method: 'eth_getBloomBalance',
      params: ['0x123']
    });
    
    expect(balance).toBe('0x8ac7230489e80000'); // 10 BLOOM in hex
  });

  it('should handle mycelia_getNetworkInfo requests', async () => {
    const web3Provider = web3Compat.getWeb3Provider();
    const networkInfo = await web3Provider.request({
      method: 'mycelia_getNetworkInfo'
    });
    
    expect(networkInfo).toEqual({
      chainId: 1337,
      name: 'mycelia-testnet',
      pegStatus: 'active',
      bloomPerBtc: 10
    });
  });
});

describe('Contract ABIs', () => {
  it('should export BLOOM token ABI', () => {
    expect(MYCELIA_CONTRACTS.BLOOM_TOKEN).toContain('function balanceOf(address owner) view returns (uint256)');
    expect(MYCELIA_CONTRACTS.BLOOM_TOKEN).toContain('function transfer(address to, uint256 amount) returns (bool)');
  });

  it('should export gas oracle ABI', () => {
    expect(MYCELIA_CONTRACTS.GAS_ORACLE).toContain('function getGasPriceInBloom() view returns (uint256)');
  });

  it('should export mining rewards ABI', () => {
    expect(MYCELIA_CONTRACTS.MINING_REWARDS).toContain('function claimRewards() returns (bool)');
  });
});
