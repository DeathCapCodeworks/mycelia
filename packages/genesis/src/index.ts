import crypto from 'crypto';
import { createFeatureFlags } from '@mycelia/feature-flags';

export interface ValidatorConfig {
  pubkey: string;
  stake: bigint;
}

export interface TreasuryConfig {
  descriptor: string;
  address: string;
}

export interface GenesisConfig {
  chainId: string;
  blockTimeMs: number;
  minGasPrice: number;
  initialValidators: ValidatorConfig[];
  treasury: TreasuryConfig;
  initialSupply?: bigint;
}

export interface Genesis {
  chainId: string;
  blockTimeMs: number;
  minGasPrice: number;
  peg: string;
  initialValidators: ValidatorConfig[];
  treasury: TreasuryConfig;
  initialSupply: bigint;
  timestamp: number;
  hash: string;
}

export interface GenesisManifest {
  chainId: string;
  genesisHash: string;
  timestamp: number;
  validatorCount: number;
  totalStake: bigint;
  treasuryAddress: string;
  enabledFlags: string[];
}

export class GenesisBuilder {
  /**
   * Build genesis configuration
   */
  build(config: GenesisConfig): Genesis {
    // Validate unique validator keys
    const pubkeys = new Set<string>();
    for (const validator of config.initialValidators) {
      if (pubkeys.has(validator.pubkey)) {
        throw new Error(`Duplicate validator pubkey: ${validator.pubkey}`);
      }
      pubkeys.add(validator.pubkey);
    }

    const timestamp = Date.now();
    const genesis: Genesis = {
      chainId: config.chainId,
      blockTimeMs: config.blockTimeMs,
      minGasPrice: config.minGasPrice,
      peg: '10 BLOOM = 1 BTC', // Immutable protocol constant
      initialValidators: config.initialValidators,
      treasury: config.treasury,
      initialSupply: config.initialSupply || 0n,
      timestamp,
      hash: this.calculateHash(config, timestamp)
    };

    return genesis;
  }

  /**
   * Create genesis manifest
   */
  createManifest(genesis: Genesis): GenesisManifest {
    const featureFlags = createFeatureFlags();
    const enabledFlags = featureFlags.getEnabledFlags().map(flag => flag.name);
    
    const totalStake = genesis.initialValidators.reduce(
      (sum, validator) => sum + validator.stake,
      0n
    );

    return {
      chainId: genesis.chainId,
      genesisHash: genesis.hash,
      timestamp: genesis.timestamp,
      validatorCount: genesis.initialValidators.length,
      totalStake,
      treasuryAddress: genesis.treasury.address,
      enabledFlags
    };
  }

  /**
   * Calculate deterministic hash for genesis
   */
  private calculateHash(config: GenesisConfig, timestamp: number): string {
    const hashInput = {
      chainId: config.chainId,
      blockTimeMs: config.blockTimeMs,
      minGasPrice: config.minGasPrice,
      peg: '10 BLOOM = 1 BTC',
      initialValidators: config.initialValidators.sort((a, b) => a.pubkey.localeCompare(b.pubkey)),
      treasury: config.treasury,
      initialSupply: config.initialSupply || 0n,
      timestamp
    };

    const hashString = JSON.stringify(hashInput, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    );

    return crypto.createHash('sha256').update(hashString).digest('hex');
  }

  /**
   * Load validators from JSON file
   */
  async loadValidators(filePath: string): Promise<ValidatorConfig[]> {
    try {
      const fs = await import('fs/promises');
      const content = await fs.readFile(filePath, 'utf8');
      const validators = JSON.parse(content);
      
      return validators.map((v: any) => ({
        pubkey: v.pubkey,
        stake: BigInt(v.stake)
      }));
    } catch (error) {
      throw new Error(`Failed to load validators from ${filePath}: ${error}`);
    }
  }

  /**
   * Load supply from JSON file
   */
  async loadSupply(filePath: string): Promise<bigint | undefined> {
    try {
      const fs = await import('fs/promises');
      const content = await fs.readFile(filePath, 'utf8');
      const supply = JSON.parse(content);
      
      return supply.initialSupply ? BigInt(supply.initialSupply) : undefined;
    } catch (error) {
      // Supply file is optional
      return undefined;
    }
  }

  /**
   * Save genesis to file
   */
  async saveGenesis(genesis: Genesis, filePath: string): Promise<void> {
    try {
      const fs = await import('fs/promises');
      const content = JSON.stringify(genesis, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value,
        2
      );
      
      await fs.writeFile(filePath, content, 'utf8');
    } catch (error) {
      throw new Error(`Failed to save genesis to ${filePath}: ${error}`);
    }
  }

  /**
   * Save genesis hash to file
   */
  async saveHash(hash: string, filePath: string): Promise<void> {
    try {
      const fs = await import('fs/promises');
      await fs.writeFile(filePath, hash, 'utf8');
    } catch (error) {
      throw new Error(`Failed to save hash to ${filePath}: ${error}`);
    }
  }

  /**
   * Save manifest to file
   */
  async saveManifest(manifest: GenesisManifest, filePath: string): Promise<void> {
    try {
      const fs = await import('fs/promises');
      const content = JSON.stringify(manifest, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value,
        2
      );
      
      await fs.writeFile(filePath, content, 'utf8');
    } catch (error) {
      throw new Error(`Failed to save manifest to ${filePath}: ${error}`);
    }
  }
}
