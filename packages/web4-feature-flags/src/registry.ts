// Unified Feature Flag Registry for Project Mycelia
// Single source of truth for all feature flags with defaults, rollouts, scope, and risk levels

export interface FeatureFlag {
  key: string;
  name: string;
  description: string;
  category: 'engine' | 'ux' | 'privacy' | 'performance' | 'experimental' | 'governance' | 'security';
  default: boolean;
  rollout: number; // 0-100 percentage
  scope: 'ops' | 'gov'; // Operational vs Governance controlled
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  dependencies: string[];
  conflicts: string[];
  requiresRestart: boolean;
  lastModified: number;
}

export interface FlagContext {
  userId?: string;
  sessionId?: string;
  canaryMode?: boolean;
  canaryAllowlist?: Set<string>;
}

// Registry of all feature flags
export const FEATURE_FLAGS: Record<string, FeatureFlag> = {
  // Engine flags
  engine_av1_encode: {
    key: 'engine_av1_encode',
    name: 'AV1 Encoding',
    description: 'Enable AV1 video encoding in media pipeline',
    category: 'engine',
    default: true,
    rollout: 100,
    scope: 'ops',
    riskLevel: 'low',
    dependencies: [],
    conflicts: [],
    requiresRestart: false,
    lastModified: Date.now()
  },
  
  av1_decode_rollout: {
    key: 'av1_decode_rollout',
    name: 'AV1 Decode Rollout',
    description: 'Rollout percentage for AV1 decoding',
    category: 'engine',
    default: true,
    rollout: 100,
    scope: 'ops',
    riskLevel: 'low',
    dependencies: [],
    conflicts: [],
    requiresRestart: false,
    lastModified: Date.now()
  },

  engine_av1_svc: {
    key: 'engine_av1_svc',
    name: 'AV1 SVC',
    description: 'Enable AV1 Scalable Video Coding',
    category: 'engine',
    default: true,
    rollout: 100,
    scope: 'ops',
    riskLevel: 'medium',
    dependencies: ['engine_av1_encode'],
    conflicts: [],
    requiresRestart: false,
    lastModified: Date.now()
  },

  engine_quic_transport: {
    key: 'engine_quic_transport',
    name: 'QUIC Transport',
    description: 'Enable QUIC transport protocol',
    category: 'engine',
    default: true,
    rollout: 100,
    scope: 'ops',
    riskLevel: 'medium',
    dependencies: [],
    conflicts: [],
    requiresRestart: false,
    lastModified: Date.now()
  },

  // UX flags
  intent_bar_v1: {
    key: 'intent_bar_v1',
    name: 'Intent Bar v1',
    description: 'Enable Intent Bar for composing actions',
    category: 'ux',
    default: false,
    rollout: 0,
    scope: 'ops',
    riskLevel: 'low',
    dependencies: [],
    conflicts: [],
    requiresRestart: false,
    lastModified: Date.now()
  },

  applets_v1_rollout: {
    key: 'applets_v1_rollout',
    name: 'Portable Applets v1 Rollout',
    description: 'Rollout percentage for Portable Applets v1',
    category: 'ux',
    default: false,
    rollout: 0,
    scope: 'ops',
    riskLevel: 'low',
    dependencies: [],
    conflicts: [],
    requiresRestart: false,
    lastModified: Date.now()
  },

  live_captions_rollout: {
    key: 'live_captions_rollout',
    name: 'Live Captions Rollout',
    description: 'Rollout percentage for Live Captions Vault',
    category: 'ux',
    default: false,
    rollout: 0,
    scope: 'ops',
    riskLevel: 'low',
    dependencies: [],
    conflicts: [],
    requiresRestart: false,
    lastModified: Date.now()
  },

  // Storage flags
  nft_envelopes: {
    key: 'nft_envelopes',
    name: 'NFT Envelopes',
    description: 'Enable NFT envelope creation and management',
    category: 'ux',
    default: true,
    rollout: 100,
    scope: 'ops',
    riskLevel: 'low',
    dependencies: [],
    conflicts: [],
    requiresRestart: false,
    lastModified: Date.now()
  },

  public_directory: {
    key: 'public_directory',
    name: 'Public Directory',
    description: 'Enable public directory indexing and browsing',
    category: 'ux',
    default: false,
    rollout: 0,
    scope: 'ops',
    riskLevel: 'medium',
    dependencies: ['nft_envelopes'],
    conflicts: [],
    requiresRestart: false,
    lastModified: Date.now()
  },

  // Radio flags
  radio_v0: {
    key: 'radio_v0',
    name: 'Radio v0',
    description: 'Enable WebRTC SFU radio rooms with rights tags',
    category: 'ux',
    default: false,
    rollout: 0,
    scope: 'ops',
    riskLevel: 'medium',
    dependencies: [],
    conflicts: [],
    requiresRestart: false,
    lastModified: Date.now()
  },

  radio_payouts_demo: {
    key: 'radio_payouts_demo',
    name: 'Radio Payouts Demo',
    description: 'Enable provisional BLOOM payouts for radio contributions',
    category: 'experimental',
    default: false,
    rollout: 0,
    scope: 'gov',
    riskLevel: 'high',
    dependencies: ['radio_v0'],
    conflicts: [],
    requiresRestart: false,
    lastModified: Date.now()
  },

  // Presence flags
  presence_v0: {
    key: 'presence_v0',
    name: 'Presence v0',
    description: 'Enable opt-in ephemeral presence sharing',
    category: 'privacy',
    default: false,
    rollout: 0,
    scope: 'ops',
    riskLevel: 'medium',
    dependencies: [],
    conflicts: [],
    requiresRestart: false,
    lastModified: Date.now()
  },

  // Databox flags
  databox_v0: {
    key: 'databox_v0',
    name: 'Databox v0',
    description: 'Enable encrypted personal ledger with key-shred deletion',
    category: 'privacy',
    default: true,
    rollout: 100,
    scope: 'ops',
    riskLevel: 'low',
    dependencies: [],
    conflicts: [],
    requiresRestart: false,
    lastModified: Date.now()
  },

  // EVM flags
  evm_provider: {
    key: 'evm_provider',
    name: 'EVM Provider',
    description: 'Enable Ethereum-compatible blockchain provider',
    category: 'engine',
    default: true,
    rollout: 100,
    scope: 'ops',
    riskLevel: 'medium',
    dependencies: [],
    conflicts: [],
    requiresRestart: false,
    lastModified: Date.now()
  },

  evm_aa: {
    key: 'evm_aa',
    name: 'EVM Account Abstraction',
    description: 'Enable ERC-4337 smart account functionality',
    category: 'experimental',
    default: false,
    rollout: 0,
    scope: 'gov',
    riskLevel: 'high',
    dependencies: ['evm_provider'],
    conflicts: [],
    requiresRestart: false,
    lastModified: Date.now()
  },

  evm_paymaster: {
    key: 'evm_paymaster',
    name: 'EVM Paymaster',
    description: 'Enable gas sponsorship and cross-experience fees',
    category: 'experimental',
    default: false,
    rollout: 0,
    scope: 'gov',
    riskLevel: 'high',
    dependencies: ['evm_aa'],
    conflicts: [],
    requiresRestart: false,
    lastModified: Date.now()
  },

  // Engine flags
  engine_webgpu_sr: {
    key: 'engine_webgpu_sr',
    name: 'WebGPU Super Resolution',
    description: 'Enable WebGPU-based super resolution',
    category: 'engine',
    default: false,
    rollout: 0,
    scope: 'ops',
    riskLevel: 'medium',
    dependencies: [],
    conflicts: [],
    requiresRestart: false,
    lastModified: Date.now()
  },

  oracle_webnn_offload: {
    key: 'oracle_webnn_offload',
    name: 'WebNN Offload',
    description: 'Enable WebNN offloading for oracle computations',
    category: 'engine',
    default: false,
    rollout: 0,
    scope: 'ops',
    riskLevel: 'medium',
    dependencies: [],
    conflicts: [],
    requiresRestart: false,
    lastModified: Date.now()
  },

  // Governance flags
  btc_mainnet_redemption: {
    key: 'btc_mainnet_redemption',
    name: 'BTC Mainnet Redemption',
    description: 'Enable Bitcoin mainnet redemption (CRITICAL)',
    category: 'governance',
    default: false,
    rollout: 0,
    scope: 'gov',
    riskLevel: 'critical',
    dependencies: [],
    conflicts: [],
    requiresRestart: true,
    lastModified: Date.now()
  },

  staking_slashing: {
    key: 'staking_slashing',
    name: 'Staking Slashing',
    description: 'Enable staking slashing mechanisms',
    category: 'governance',
    default: false,
    rollout: 0,
    scope: 'gov',
    riskLevel: 'critical',
    dependencies: [],
    conflicts: [],
    requiresRestart: true,
    lastModified: Date.now()
  },

  rewards_mainnet: {
    key: 'rewards_mainnet',
    name: 'Rewards Mainnet',
    description: 'Enable mainnet rewards distribution',
    category: 'governance',
    default: false,
    rollout: 0,
    scope: 'gov',
    riskLevel: 'critical',
    dependencies: [],
    conflicts: [],
    requiresRestart: true,
    lastModified: Date.now()
  },

  governance_v1: {
    key: 'governance_v1',
    name: 'Governance v1',
    description: 'Enable governance v1 features',
    category: 'governance',
    default: false,
    rollout: 0,
    scope: 'gov',
    riskLevel: 'high',
    dependencies: [],
    conflicts: [],
    requiresRestart: false,
    lastModified: Date.now()
  }
};

// Helper functions
export function isEnabled(key: string, context: FlagContext = {}): boolean {
  const flag = FEATURE_FLAGS[key];
  if (!flag) {
    return false;
  }

  // Check if explicitly enabled
  if (flag.default) {
    return true;
  }

  // Check rollout percentage with stable hashing
  if (flag.rollout > 0 && context.userId) {
    const userHash = stableHash(context.userId);
    const rolloutValue = userHash % 100;
    return rolloutValue < flag.rollout;
  }

  // Check canary mode
  if (context.canaryMode && context.canaryAllowlist && context.userId) {
    return context.canaryAllowlist.has(context.userId);
  }

  return false;
}

export function scopeOf(key: string): 'ops' | 'gov' | undefined {
  return FEATURE_FLAGS[key]?.scope;
}

export function riskOf(key: string): 'low' | 'medium' | 'high' | 'critical' | undefined {
  return FEATURE_FLAGS[key]?.riskLevel;
}

export function getAllFlags(): FeatureFlag[] {
  return Object.values(FEATURE_FLAGS);
}

export function getFlagsByCategory(category: FeatureFlag['category']): FeatureFlag[] {
  return Object.values(FEATURE_FLAGS).filter(flag => flag.category === category);
}

export function getFlagsByScope(scope: 'ops' | 'gov'): FeatureFlag[] {
  return Object.values(FEATURE_FLAGS).filter(flag => flag.scope === scope);
}

export function getFlagsByRisk(riskLevel: FeatureFlag['riskLevel']): FeatureFlag[] {
  return Object.values(FEATURE_FLAGS).filter(flag => flag.riskLevel === riskLevel);
}

// Stable hash function for consistent user bucketing
function stableHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

// CLI helpers
export function formatFlag(flag: FeatureFlag): string {
  const status = flag.default ? 'ON' : 'OFF';
  const rollout = flag.rollout > 0 ? ` (${flag.rollout}%)` : '';
  return `${flag.key}: ${status}${rollout} [${flag.scope}/${flag.riskLevel}] - ${flag.description}`;
}

export function validateFlagKey(key: string): boolean {
  return key in FEATURE_FLAGS;
}

export function getFlagDependencies(key: string): string[] {
  return FEATURE_FLAGS[key]?.dependencies || [];
}

export function getFlagConflicts(key: string): string[] {
  return FEATURE_FLAGS[key]?.conflicts || [];
}
