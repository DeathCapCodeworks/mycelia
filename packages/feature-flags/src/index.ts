export type FeatureFlagVersion = '1.0.0' | '2.0.0' | '3.0.0';
export type RiskLevel = 'low' | 'medium' | 'high';

export interface FeatureFlag {
  name: string;
  version: FeatureFlagVersion;
  enabled: boolean;
  description: string;
  riskLevel: RiskLevel;
  versioned?: boolean;
  dependencies?: string[];
  rolloutPercentage?: number;
  targetUsers?: string[];
  targetEnvironments?: string[];
}

export class FeatureFlags {
  private flags = new Map<string, FeatureFlag>();

  /**
   * Register a feature flag
   */
  register(flag: FeatureFlag): void {
    this.flags.set(flag.name, flag);
  }

  /**
   * Check if a feature flag is enabled
   */
  isEnabled(flagName: string): boolean {
    const flag = this.flags.get(flagName);
    if (!flag) {
      throw new Error(`Feature flag not found: ${flagName}`);
    }
    return flag.enabled;
  }

  /**
   * Get a feature flag by name
   */
  getFlag(flagName: string): FeatureFlag | undefined {
    return this.flags.get(flagName);
  }

  /**
   * Get the version of a feature flag
   */
  getVersion(flagName: string): FeatureFlagVersion {
    const flag = this.flags.get(flagName);
    if (!flag) {
      throw new Error(`Feature flag not found: ${flagName}`);
    }
    return flag.version;
  }

  /**
   * Get the risk level of a feature flag
   */
  getRiskLevel(flagName: string): RiskLevel {
    const flag = this.flags.get(flagName);
    if (!flag) {
      throw new Error(`Feature flag not found: ${flagName}`);
    }
    return flag.riskLevel;
  }

  /**
   * Check if a feature flag is versioned
   */
  isVersioned(flagName: string): boolean {
    const flag = this.flags.get(flagName);
    if (!flag) {
      throw new Error(`Feature flag not found: ${flagName}`);
    }
    return flag.versioned || false;
  }

  /**
   * Enable a feature flag
   */
  enable(flagName: string): void {
    const flag = this.flags.get(flagName);
    if (!flag) {
      throw new Error(`Feature flag not found: ${flagName}`);
    }
    flag.enabled = true;
  }

  /**
   * Disable a feature flag
   */
  disable(flagName: string): void {
    const flag = this.flags.get(flagName);
    if (!flag) {
      throw new Error(`Feature flag not found: ${flagName}`);
    }
    flag.enabled = false;
  }

  /**
   * Check if a feature flag exists
   */
  exists(flagName: string): boolean {
    return this.flags.has(flagName);
  }

  /**
   * Get all feature flags
   */
  getAllFlags(): FeatureFlag[] {
    return Array.from(this.flags.values());
  }

  /**
   * Get enabled feature flags
   */
  getEnabledFlags(): FeatureFlag[] {
    return Array.from(this.flags.values()).filter(flag => flag.enabled);
  }

  /**
   * Get disabled feature flags
   */
  getDisabledFlags(): FeatureFlag[] {
    return Array.from(this.flags.values()).filter(flag => !flag.enabled);
  }

  /**
   * Get feature flags by risk level
   */
  getFlagsByRiskLevel(riskLevel: RiskLevel): FeatureFlag[] {
    return Array.from(this.flags.values()).filter(flag => flag.riskLevel === riskLevel);
  }

  /**
   * Get feature flags by version
   */
  getFlagsByVersion(version: FeatureFlagVersion): FeatureFlag[] {
    return Array.from(this.flags.values()).filter(flag => flag.version === version);
  }

  /**
   * Check if all dependencies are enabled
   */
  areDependenciesEnabled(flagName: string): boolean {
    const flag = this.flags.get(flagName);
    if (!flag || !flag.dependencies) {
      return true;
    }

    return flag.dependencies.every(dep => this.isEnabled(dep));
  }

  /**
   * Get feature flags that depend on a given flag
   */
  getDependentFlags(flagName: string): FeatureFlag[] {
    return Array.from(this.flags.values()).filter(flag => 
      flag.dependencies && flag.dependencies.includes(flagName)
    );
  }

  /**
   * Remove a feature flag
   */
  remove(flagName: string): boolean {
    return this.flags.delete(flagName);
  }

  /**
   * Clear all feature flags
   */
  clear(): void {
    this.flags.clear();
  }

  /**
   * Get feature flag count
   */
  getCount(): number {
    return this.flags.size;
  }

  /**
   * Get ops-controlled flags (safe to change without governance)
   */
  getOpsControlledFlags(): FeatureFlag[] {
    const opsFlags = ['rewards_slow_mode', 'oracle_read_scope_max'];
    return Array.from(this.flags.values()).filter(flag => 
      opsFlags.includes(flag.name)
    );
  }

  /**
   * Get governance-controlled flags (require governance approval)
   */
  getGovernanceControlledFlags(): FeatureFlag[] {
    const governanceFlags = [
      'btc_mainnet_redemption', 
      'staking_slashing', 
      'rewards_mainnet', 
      'governance_v1'
    ];
    return Array.from(this.flags.values()).filter(flag => 
      governanceFlags.includes(flag.name)
    );
  }
}

/**
 * Predefined feature flags for Mycelia
 */
export const PREDEFINED_FLAGS: FeatureFlag[] = [
  {
    name: 'btc_mainnet_redemption',
    version: '1.0.0',
    enabled: false,
    description: 'Enable Bitcoin mainnet redemption (requires governance proposal P-0001)',
    riskLevel: 'high',
    versioned: true
  },
  {
    name: 'staking_slashing',
    version: '1.0.0',
    enabled: true,
    description: 'Enable staking slashing penalties',
    riskLevel: 'medium',
    versioned: true
  },
  {
    name: 'rewards_mainnet',
    version: '1.0.0',
    enabled: true,
    description: 'Enable mainnet rewards distribution',
    riskLevel: 'medium',
    versioned: true
  },
  {
    name: 'governance_v1',
    version: '1.0.0',
    enabled: true,
    description: 'Enable governance v1 features',
    riskLevel: 'low',
    versioned: true
  },
  {
    name: 'spv_proofs',
    version: '1.0.0',
    enabled: true,
    description: 'Enable SPV proof verification',
    riskLevel: 'low',
    versioned: true
  },
  {
    name: 'testnet_features',
    version: '1.0.0',
    enabled: false,
    description: 'Enable testnet-specific features (disabled on mainnet)',
    riskLevel: 'low',
    versioned: false
  },
  {
    name: 'rewards_slow_mode',
    version: '1.0.0',
    enabled: false,
    description: 'Enable slow mode for rewards processing (ops controlled)',
    riskLevel: 'low',
    versioned: false
  },
  {
    name: 'oracle_read_scope_max',
    version: '1.0.0',
    enabled: true,
    description: 'Maximum Oracle read scope limit (numeric cap, ops controlled)',
    riskLevel: 'medium',
    versioned: false
  }
];

/**
 * Create a feature flags instance with predefined flags
 */
export function createFeatureFlags(): FeatureFlags {
  const flags = new FeatureFlags();
  PREDEFINED_FLAGS.forEach(flag => flags.register(flag));
  return flags;
}

/**
 * Check if a feature is safe to enable
 */
export function isFeatureSafeToEnable(flag: FeatureFlag): boolean {
  // High risk features require additional checks
  if (flag.riskLevel === 'high') {
    return false;
  }

  // Versioned features should be enabled gradually
  if (flag.versioned && flag.rolloutPercentage && flag.rolloutPercentage < 100) {
    return false;
  }

  return true;
}

/**
 * Get feature flag summary
 */
export function getFeatureFlagSummary(flags: FeatureFlags): {
  total: number;
  enabled: number;
  disabled: number;
  highRisk: number;
  mediumRisk: number;
  lowRisk: number;
} {
  const allFlags = flags.getAllFlags();
  
  return {
    total: allFlags.length,
    enabled: allFlags.filter(f => f.enabled).length,
    disabled: allFlags.filter(f => !f.enabled).length,
    highRisk: allFlags.filter(f => f.riskLevel === 'high').length,
    mediumRisk: allFlags.filter(f => f.riskLevel === 'medium').length,
    lowRisk: allFlags.filter(f => f.riskLevel === 'low').length
  };
}
