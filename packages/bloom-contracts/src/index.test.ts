import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  BloomTokenEVM,
  MintGuardEVM,
  MiningRewardsEVM,
  BloomTokenSolana,
  ContractDeployment,
  ContractUtils
} from './index';
import { ethers } from 'ethers';
import { PublicKey, Keypair } from '@solana/web3.js';

// Mock ethers
vi.mock('ethers', () => ({
  ethers: {
    Contract: vi.fn().mockImplementation(() => ({
      name: vi.fn().mockResolvedValue('BLOOM Token'),
      symbol: vi.fn().mockResolvedValue('BLOOM'),
      decimals: vi.fn().mockResolvedValue(9),
      totalSupply: vi.fn().mockResolvedValue({ toString: () => '1000000000000000000' }),
      balanceOf: vi.fn().mockResolvedValue({ toString: () => '500000000000000000' }),
      transfer: vi.fn().mockResolvedValue({ hash: '0x123' }),
      approve: vi.fn().mockResolvedValue({ hash: '0x456' }),
      allowance: vi.fn().mockResolvedValue({ toString: () => '100000000000000000' }),
      transferFrom: vi.fn().mockResolvedValue({ hash: '0x789' }),
      mint: vi.fn().mockResolvedValue({ hash: '0xabc' }),
      burn: vi.fn().mockResolvedValue({ hash: '0xdef' }),
      burnFrom: vi.fn().mockResolvedValue({ hash: '0xghi' }),
      getSupplyStats: vi.fn().mockResolvedValue([
        { toString: () => '1000000000000000000' }, // totalSupply
        { toString: () => '1500000000000000000' }, // totalMinted
        { toString: () => '500000000000000000' },  // totalBurned
        { toString: () => '0' }                    // maxSupply
      ]),
      getPegStatement: vi.fn().mockResolvedValue('Peg: 10 BLOOM = 1 BTC'),
      bloomToSats: vi.fn().mockResolvedValue({ toString: () => '100000000000000000' }),
      satsToBloom: vi.fn().mockResolvedValue({ toString: () => '1000000000000000000' }),
      canMint: vi.fn().mockResolvedValue(true),
      getCollateralizationRatio: vi.fn().mockResolvedValue({ toString: () => '1200000000000000000' }),
      isFullyReserved: vi.fn().mockResolvedValue(true),
      getMaxMintable: vi.fn().mockResolvedValue({ toString: () => '500000000000000000' }),
      getPegInfo: vi.fn().mockResolvedValue([
        { toString: (): '10' },  // bloomPerBtc
        { toString: (): '10000000' } // satsPerBloom
      ]),
      setBloomToken: vi.fn().mockResolvedValue({ hash: '0xset1' }),
      setReserveFeed: vi.fn().mockResolvedValue({ hash: '0xset2' }),
      registerMiner: vi.fn().mockResolvedValue({ hash: '0xreg' }),
      recordContribution: vi.fn().mockResolvedValue({ hash: '0xrec' }),
      claimRewards: vi.fn().mockResolvedValue({ hash: '0xclaim' }),
      getMinerData: vi.fn().mockResolvedValue([
        { toString: () => '1000000000' }, // totalContributed
        { toString: () => '500000000' },  // totalRewards
        { toString: () => '1640995200' }, // lastContribution
        { toString: () => '150' },        // contributionScore
        true                              // isActive
      ]),
      getActiveMiners: vi.fn().mockResolvedValue(['0x123', '0x456']),
      getContributionTier: vi.fn().mockResolvedValue([
        { toString: () => '100' },  // minScore
        { toString: () => '1100000000000000000' } // multiplier
      ]),
      deactivateMiner: vi.fn().mockResolvedValue({ hash: '0xdeact' }),
      updateContributionTier: vi.fn().mockResolvedValue({ hash: '0xupdate' })
    }),
    ContractFactory: vi.fn().mockImplementation(() => ({
      deploy: vi.fn().mockResolvedValue({
        waitForDeployment: vi.fn().mockResolvedValue(undefined),
        getAddress: vi.fn().mockResolvedValue('0xBloomToken1234567890123456789012345678901234')
      })
    }))
  }
}));

// Mock Solana
vi.mock('@solana/web3.js', () => ({
  PublicKey: vi.fn().mockImplementation((key) => ({
    toBase58: () => key || 'SolanaPublicKey123456789012345678901234567890123456789',
    toString: () => key || 'SolanaPublicKey123456789012345678901234567890123456789'
  })),
  Keypair: {
    generate: vi.fn().mockReturnValue({
      publicKey: { toBase58: () => 'GeneratedKeypair123456789012345678901234567890123456789' }
    })
  }
}));

// Mock Anchor
vi.mock('@coral-xyz/anchor', () => ({
  Program: vi.fn().mockImplementation(() => ({
    methods: {
      initializeBloomMint: vi.fn().mockReturnValue({
        accounts: vi.fn().mockReturnValue({
          rpc: vi.fn().mockResolvedValue('solana-tx-signature')
        })
      }),
      setMintGuard: vi.fn().mockReturnValue({
        accounts: vi.fn().mockReturnValue({
          rpc: vi.fn().mockResolvedValue('solana-tx-signature')
        })
      }),
      setReserveFeed: vi.fn().mockReturnValue({
        accounts: vi.fn().mockReturnValue({
          rpc: vi.fn().mockResolvedValue('solana-tx-signature')
        })
      }),
      mintBloom: vi.fn().mockReturnValue({
        accounts: vi.fn().mockReturnValue({
          rpc: vi.fn().mockResolvedValue('solana-tx-signature')
        })
      }),
      burnBloom: vi.fn().mockReturnValue({
        accounts: vi.fn().mockReturnValue({
          rpc: vi.fn().mockResolvedValue('solana-tx-signature')
        })
      }),
      getPegInfo: vi.fn().mockReturnValue({
        accounts: vi.fn().mockReturnValue({
          view: vi.fn().mockResolvedValue({
            bloomPerBtc: { toString: () => '10' },
            satsPerBloom: { toString: () => '10000000' },
            pegStatement: 'Peg: 10 BLOOM = 1 BTC'
          })
        })
      })
    },
    account: {
      mintData: {
        fetch: vi.fn().mockResolvedValue({
          name: 'BLOOM Token',
          symbol: 'BLOOM',
          decimals: 9,
          totalSupply: { toString: () => '1000000000000000000' },
          totalMinted: { toString: () => '1500000000000000000' },
          totalBurned: { toString: () => '500000000000000000' },
          mintAuthority: { toBase58: () => 'MintAuthority123456789012345678901234567890123456789' },
          mintGuard: { toBase58: () => 'MintGuard123456789012345678901234567890123456789' },
          reserveFeed: { toBase58: () => 'ReserveFeed123456789012345678901234567890123456789' }
        })
      }
    },
    provider: {
      wallet: {
        publicKey: { toBase58: () => 'ProviderWallet123456789012345678901234567890123456789' }
      }
    },
    programId: { toBase58: () => 'BloomToken1111111111111111111111111111111111111' }
  })),
  AnchorProvider: vi.fn().mockImplementation(() => ({}))
}));

describe('BloomTokenEVM', () => {
  let contract: BloomTokenEVM;
  let mockSigner: any;

  beforeEach(() => {
    mockSigner = {
      getAddress: vi.fn().mockResolvedValue('0x1234567890123456789012345678901234567890')
    };
    contract = new BloomTokenEVM('0xBloomToken1234567890123456789012345678901234', mockSigner);
  });

  describe('Token Information', () => {
    it('should get token name', async () => {
      const name = await contract.name();
      expect(name).toBe('BLOOM Token');
    });

    it('should get token symbol', async () => {
      const symbol = await contract.symbol();
      expect(symbol).toBe('BLOOM');
    });

    it('should get token decimals', async () => {
      const decimals = await contract.decimals();
      expect(decimals).toBe(9);
    });

    it('should get total supply', async () => {
      const supply = await contract.totalSupply();
      expect(supply).toBe(1000000000000000000n);
    });

    it('should get balance of address', async () => {
      const balance = await contract.balanceOf('0x123');
      expect(balance).toBe(500000000000000000n);
    });
  });

  describe('Token Operations', () => {
    it('should transfer tokens', async () => {
      const tx = await contract.transfer('0x456', 1000000000000000000n);
      expect(tx.hash).toBe('0x123');
    });

    it('should approve spender', async () => {
      const tx = await contract.approve('0x456', 1000000000000000000n);
      expect(tx.hash).toBe('0x456');
    });

    it('should get allowance', async () => {
      const allowance = await contract.allowance('0x123', '0x456');
      expect(allowance).toBe(100000000000000000n);
    });

    it('should transfer from', async () => {
      const tx = await contract.transferFrom('0x123', '0x456', 1000000000000000000n);
      expect(tx.hash).toBe('0x789');
    });
  });

  describe('Minting and Burning', () => {
    it('should mint tokens', async () => {
      const tx = await contract.mint('0x456', 1000000000000000000n, 'Mining reward');
      expect(tx.hash).toBe('0xabc');
    });

    it('should burn tokens', async () => {
      const tx = await contract.burn(1000000000000000000n);
      expect(tx.hash).toBe('0xdef');
    });

    it('should burn from address', async () => {
      const tx = await contract.burnFrom('0x123', 1000000000000000000n, 'Redemption');
      expect(tx.hash).toBe('0xghi');
    });
  });

  describe('Supply Statistics', () => {
    it('should get supply stats', async () => {
      const stats = await contract.getSupplyStats();
      expect(stats.totalSupply).toBe(1000000000000000000n);
      expect(stats.totalMinted).toBe(1500000000000000000n);
      expect(stats.totalBurned).toBe(500000000000000000n);
      expect(stats.maxSupply).toBe(0n);
    });
  });

  describe('Peg Functions', () => {
    it('should get peg statement', async () => {
      const statement = await contract.getPegStatement();
      expect(statement).toBe('Peg: 10 BLOOM = 1 BTC');
    });

    it('should convert BLOOM to sats', async () => {
      const sats = await contract.bloomToSats(1000000000000000000n);
      expect(sats).toBe(100000000000000000n);
    });

    it('should convert sats to BLOOM', async () => {
      const bloom = await contract.satsToBloom(100000000000000000n);
      expect(bloom).toBe(1000000000000000000n);
    });
  });
});

describe('MintGuardEVM', () => {
  let contract: MintGuardEVM;
  let mockSigner: any;

  beforeEach(() => {
    mockSigner = {
      getAddress: vi.fn().mockResolvedValue('0x1234567890123456789012345678901234567890')
    };
    contract = new MintGuardEVM('0xMintGuard1234567890123456789012345678901234', mockSigner);
  });

  describe('Mint Control', () => {
    it('should check if minting is allowed', async () => {
      const canMint = await contract.canMint(1000000000000000000n);
      expect(canMint).toBe(true);
    });

    it('should get collateralization ratio', async () => {
      const ratio = await contract.getCollateralizationRatio();
      expect(ratio).toBe(1.2); // 120%
    });

    it('should check if fully reserved', async () => {
      const isReserved = await contract.isFullyReserved();
      expect(isReserved).toBe(true);
    });

    it('should get max mintable amount', async () => {
      const maxMintable = await contract.getMaxMintable();
      expect(maxMintable).toBe(500000000000000000n);
    });
  });

  describe('Peg Information', () => {
    it('should get peg info', async () => {
      const info = await contract.getPegInfo();
      expect(info.bloomPerBtc).toBe(10n);
      expect(info.satsPerBloom).toBe(10000000n);
    });
  });

  describe('Configuration', () => {
    it('should set BLOOM token address', async () => {
      const tx = await contract.setBloomToken('0xNewBloomToken1234567890123456789012345678901234');
      expect(tx.hash).toBe('0xset1');
    });

    it('should set reserve feed address', async () => {
      const tx = await contract.setReserveFeed('0xNewReserveFeed1234567890123456789012345678901234');
      expect(tx.hash).toBe('0xset2');
    });
  });
});

describe('MiningRewardsEVM', () => {
  let contract: MiningRewardsEVM;
  let mockSigner: any;

  beforeEach(() => {
    mockSigner = {
      getAddress: vi.fn().mockResolvedValue('0x1234567890123456789012345678901234567890')
    };
    contract = new MiningRewardsEVM('0xMiningRewards1234567890123456789012345678901234', mockSigner);
  });

  describe('Miner Management', () => {
    it('should register miner', async () => {
      const tx = await contract.registerMiner();
      expect(tx.hash).toBe('0xreg');
    });

    it('should record contribution', async () => {
      const tx = await contract.recordContribution(
        1024 * 1024 * 1024n, // 1GB storage
        100 * 1024 * 1024n,  // 100MB bandwidth
        5n                   // 5 content pieces
      );
      expect(tx.hash).toBe('0xrec');
    });

    it('should claim rewards', async () => {
      const tx = await contract.claimRewards();
      expect(tx.hash).toBe('0xclaim');
    });
  });

  describe('Miner Data', () => {
    it('should get miner data', async () => {
      const data = await contract.getMinerData('0x123');
      expect(data.totalContributed).toBe(1000000000n);
      expect(data.totalRewards).toBe(500000000n);
      expect(data.lastContribution).toBe(1640995200n);
      expect(data.contributionScore).toBe(150n);
      expect(data.isActive).toBe(true);
    });

    it('should get active miners', async () => {
      const miners = await contract.getActiveMiners();
      expect(miners).toEqual(['0x123', '0x456']);
    });

    it('should get contribution tier', async () => {
      const tier = await contract.getContributionTier(1n);
      expect(tier.minScore).toBe(100n);
      expect(tier.multiplier).toBe(1100000000000000000n);
    });
  });
});

describe('BloomTokenSolana', () => {
  let contract: BloomTokenSolana;
  let mockProgram: any;
  let mockMintData: PublicKey;
  let mockMint: PublicKey;

  beforeEach(() => {
    mockProgram = {
      methods: {
        initializeBloomMint: vi.fn().mockReturnValue({
          accounts: vi.fn().mockReturnValue({
            rpc: vi.fn().mockResolvedValue('solana-tx-signature')
          })
        }),
        setMintGuard: vi.fn().mockReturnValue({
          accounts: vi.fn().mockReturnValue({
            rpc: vi.fn().mockResolvedValue('solana-tx-signature')
          })
        }),
        setReserveFeed: vi.fn().mockReturnValue({
          accounts: vi.fn().mockReturnValue({
            rpc: vi.fn().mockResolvedValue('solana-tx-signature')
          })
        }),
        mintBloom: vi.fn().mockReturnValue({
          accounts: vi.fn().mockReturnValue({
            rpc: vi.fn().mockResolvedValue('solana-tx-signature')
          })
        }),
        burnBloom: vi.fn().mockReturnValue({
          accounts: vi.fn().mockReturnValue({
            rpc: vi.fn().mockResolvedValue('solana-tx-signature')
          })
        }),
        getPegInfo: vi.fn().mockReturnValue({
          accounts: vi.fn().mockReturnValue({
            view: vi.fn().mockResolvedValue({
              bloomPerBtc: { toString: () => '10' },
              satsPerBloom: { toString: () => '10000000' },
              pegStatement: 'Peg: 10 BLOOM = 1 BTC'
            })
          })
        })
      },
      account: {
        mintData: {
          fetch: vi.fn().mockResolvedValue({
            name: 'BLOOM Token',
            symbol: 'BLOOM',
            decimals: 9,
            totalSupply: { toString: () => '1000000000000000000' },
            totalMinted: { toString: () => '1500000000000000000' },
            totalBurned: { toString: () => '500000000000000000' },
            mintAuthority: { toBase58: () => 'MintAuthority123456789012345678901234567890123456789' },
            mintGuard: { toBase58: () => 'MintGuard123456789012345678901234567890123456789' },
            reserveFeed: { toBase58: () => 'ReserveFeed123456789012345678901234567890123456789' }
          })
        }
      },
      provider: {
        wallet: {
          publicKey: { toBase58: () => 'ProviderWallet123456789012345678901234567890123456789' }
        }
      }
    };
    
    mockMintData = new PublicKey('MintData123456789012345678901234567890123456789');
    mockMint = new PublicKey('Mint123456789012345678901234567890123456789');
    
    contract = new BloomTokenSolana(mockProgram, mockMintData, mockMint);
  });

  describe('Initialization', () => {
    it('should initialize BLOOM token mint', async () => {
      const tx = await contract.initializeBloomMint('BLOOM Token', 'BLOOM', 9);
      expect(tx).toBe('solana-tx-signature');
    });

    it('should set mint guard', async () => {
      const mintGuard = new PublicKey('MintGuard123456789012345678901234567890123456789');
      const tx = await contract.setMintGuard(mintGuard);
      expect(tx).toBe('solana-tx-signature');
    });

    it('should set reserve feed', async () => {
      const reserveFeed = new PublicKey('ReserveFeed123456789012345678901234567890123456789');
      const tx = await contract.setReserveFeed(reserveFeed);
      expect(tx).toBe('solana-tx-signature');
    });
  });

  describe('Token Operations', () => {
    it('should mint BLOOM tokens', async () => {
      const to = new PublicKey('ToAddress123456789012345678901234567890123456789');
      const tx = await contract.mintBloom(to, 1000000000000000000n, 'Mining reward');
      expect(tx).toBe('solana-tx-signature');
    });

    it('should burn BLOOM tokens', async () => {
      const from = new PublicKey('FromAddress123456789012345678901234567890123456789');
      const tx = await contract.burnBloom(from, 1000000000000000000n, 'Redemption');
      expect(tx).toBe('solana-tx-signature');
    });
  });

  describe('Peg Information', () => {
    it('should get peg info', async () => {
      const info = await contract.getPegInfo();
      expect(info.bloomPerBtc).toBe(10n);
      expect(info.satsPerBloom).toBe(10000000n);
      expect(info.pegStatement).toBe('Peg: 10 BLOOM = 1 BTC');
    });
  });

  describe('Mint Data', () => {
    it('should get mint data', async () => {
      const data = await contract.getMintData();
      expect(data.name).toBe('BLOOM Token');
      expect(data.symbol).toBe('BLOOM');
      expect(data.decimals).toBe(9);
      expect(data.totalSupply).toBe(1000000000000000000n);
      expect(data.totalMinted).toBe(1500000000000000000n);
      expect(data.totalBurned).toBe(500000000000000000n);
    });
  });
});

describe('ContractDeployment', () => {
  let mockSigner: any;
  let mockProvider: any;

  beforeEach(() => {
    mockSigner = {
      getAddress: vi.fn().mockResolvedValue('0x1234567890123456789012345678901234567890')
    };
    mockProvider = {
      wallet: {
        publicKey: { toBase58: () => 'ProviderWallet123456789012345678901234567890123456789' }
      }
    };
  });

  describe('EVM Deployment', () => {
    it('should deploy BLOOM token contract', async () => {
      const result = await ContractDeployment.deployBloomTokenEVM(mockSigner);
      expect(result.contract).toBeInstanceOf(BloomTokenEVM);
      expect(result.address).toBe('0xBloomToken1234567890123456789012345678901234');
    });

    it('should deploy mint guard contract', async () => {
      const result = await ContractDeployment.deployMintGuardEVM(
        mockSigner,
        '0xBloomToken1234567890123456789012345678901234',
        '0xReserveFeed1234567890123456789012345678901234'
      );
      expect(result.contract).toBeInstanceOf(MintGuardEVM);
      expect(result.address).toBe('0xBloomToken1234567890123456789012345678901234');
    });

    it('should deploy mining rewards contract', async () => {
      const result = await ContractDeployment.deployMiningRewardsEVM(
        mockSigner,
        '0xBloomToken1234567890123456789012345678901234',
        '0xMintGuard1234567890123456789012345678901234'
      );
      expect(result.contract).toBeInstanceOf(MiningRewardsEVM);
      expect(result.address).toBe('0xBloomToken1234567890123456789012345678901234');
    });
  });

  describe('Solana Deployment', () => {
    it('should deploy BLOOM token program', async () => {
      const result = await ContractDeployment.deployBloomTokenSolana(mockProvider, {});
      expect(result.program).toBeDefined();
      expect(result.mintData).toBeDefined();
      expect(result.mint).toBeDefined();
    });
  });
});

describe('ContractUtils', () => {
  describe('formatBloomAmount', () => {
    it('should format BLOOM amounts correctly', () => {
      expect(ContractUtils.formatBloomAmount(1000000000000000000n)).toBe('1');
      expect(ContractUtils.formatBloomAmount(1500000000000000000n)).toBe('1.5');
      expect(ContractUtils.formatBloomAmount(123456789n)).toBe('0.123456789');
    });

    it('should handle different decimal places', () => {
      expect(ContractUtils.formatBloomAmount(1000000000000000000n, 6)).toBe('1000');
      expect(ContractUtils.formatBloomAmount(1500000n, 6)).toBe('1.5');
    });
  });

  describe('parseBloomAmount', () => {
    it('should parse BLOOM amounts correctly', () => {
      expect(ContractUtils.parseBloomAmount('1')).toBe(1000000000000000000n);
      expect(ContractUtils.parseBloomAmount('1.5')).toBe(1500000000000000000n);
      expect(ContractUtils.parseBloomAmount('0.123456789')).toBe(123456789n);
    });

    it('should handle different decimal places', () => {
      expect(ContractUtils.parseBloomAmount('1000', 6)).toBe(1000000000000000000n);
      expect(ContractUtils.parseBloomAmount('1.5', 6)).toBe(1500000n);
    });
  });

  describe('getContractExplorerUrl', () => {
    it('should generate correct explorer URLs', () => {
      expect(ContractUtils.getContractExplorerUrl('0x123', 'evm'))
        .toBe('https://etherscan.io/address/0x123');
      
      expect(ContractUtils.getContractExplorerUrl('Solana123', 'solana'))
        .toBe('https://explorer.solana.com/address/Solana123');
    });
  });
});
