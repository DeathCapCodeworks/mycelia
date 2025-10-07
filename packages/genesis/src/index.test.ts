import { describe, it, expect, beforeEach } from 'vitest';
import { GenesisBuilder, GenesisConfig, ValidatorConfig } from './index';

describe('GenesisBuilder', () => {
  let builder: GenesisBuilder;

  beforeEach(() => {
    builder = new GenesisBuilder();
  });

  it('should create a new instance', () => {
    expect(builder).toBeDefined();
  });

  it('should build genesis with default config', () => {
    const config: GenesisConfig = {
      chainId: 'mycelia-mainnet-1',
      blockTimeMs: 1000,
      minGasPrice: 0,
      initialValidators: [
        {
          pubkey: 'validator1-pubkey',
          stake: 1000000n
        }
      ],
      treasury: {
        descriptor: 'cash-backed-custodian-policy',
        address: 'bc1qtreasury123456789'
      }
    };

    const genesis = builder.build(config);
    
    expect(genesis.chainId).toBe('mycelia-mainnet-1');
    expect(genesis.blockTimeMs).toBe(1000);
    expect(genesis.minGasPrice).toBe(0);
    expect(genesis.peg).toBe('10 BLOOM = 1 BTC');
    expect(genesis.initialValidators).toHaveLength(1);
    expect(genesis.initialSupply).toBe(0n);
  });

  it('should validate unique validator keys', () => {
    const config: GenesisConfig = {
      chainId: 'mycelia-mainnet-1',
      blockTimeMs: 1000,
      minGasPrice: 0,
      initialValidators: [
        {
          pubkey: 'validator1-pubkey',
          stake: 1000000n
        },
        {
          pubkey: 'validator1-pubkey', // Duplicate
          stake: 2000000n
        }
      ],
      treasury: {
        descriptor: 'cash-backed-custodian-policy',
        address: 'bc1qtreasury123456789'
      }
    };

    expect(() => builder.build(config)).toThrow('Duplicate validator pubkey: validator1-pubkey');
  });

  it('should include custom initial supply', () => {
    const config: GenesisConfig = {
      chainId: 'mycelia-mainnet-1',
      blockTimeMs: 1000,
      minGasPrice: 0,
      initialValidators: [],
      treasury: {
        descriptor: 'cash-backed-custodian-policy',
        address: 'bc1qtreasury123456789'
      },
      initialSupply: 1000000n
    };

    const genesis = builder.build(config);
    expect(genesis.initialSupply).toBe(1000000n);
  });

  it('should generate deterministic hash', () => {
    const config: GenesisConfig = {
      chainId: 'mycelia-mainnet-1',
      blockTimeMs: 1000,
      minGasPrice: 0,
      initialValidators: [
        {
          pubkey: 'validator1-pubkey',
          stake: 1000000n
        }
      ],
      treasury: {
        descriptor: 'cash-backed-custodian-policy',
        address: 'bc1qtreasury123456789'
      }
    };

    const genesis1 = builder.build(config);
    const genesis2 = builder.build(config);
    
    expect(genesis1.hash).toBe(genesis2.hash);
  });

  it('should create manifest', () => {
    const config: GenesisConfig = {
      chainId: 'mycelia-mainnet-1',
      blockTimeMs: 1000,
      minGasPrice: 0,
      initialValidators: [
        {
          pubkey: 'validator1-pubkey',
          stake: 1000000n
        }
      ],
      treasury: {
        descriptor: 'cash-backed-custodian-policy',
        address: 'bc1qtreasury123456789'
      }
    };

    const genesis = builder.build(config);
    const manifest = builder.createManifest(genesis);
    
    expect(manifest.chainId).toBe('mycelia-mainnet-1');
    expect(manifest.genesisHash).toBe(genesis.hash);
    expect(manifest.timestamp).toBeDefined();
    expect(manifest.validatorCount).toBe(1);
  });
});
