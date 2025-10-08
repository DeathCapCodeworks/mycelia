#!/usr/bin/env node

/**
 * Flags Snapshot and Lock for GA Release
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

interface FeatureFlag {
  name: string;
  enabled: boolean;
  description: string;
  category: 'core' | 'experimental' | 'governance' | 'security';
  requires_governance?: boolean;
}

interface FlagsSnapshot {
  version: string;
  timestamp: string;
  flags: Record<string, FeatureFlag>;
}

function createFlagsSnapshot(): FlagsSnapshot {
  console.log('📸 Creating flags snapshot for v1.0.0...');
  
  // GA-safe flags configuration
  const flags: Record<string, FeatureFlag> = {
    // Core features - ON
    'evm_provider': {
      name: 'evm_provider',
      enabled: true,
      description: 'EVM-compatible provider for Ethereum dApps',
      category: 'core'
    },
    'databox_v0': {
      name: 'databox_v0',
      enabled: true,
      description: 'Personal data vault v0',
      category: 'core'
    },
    'nft_envelopes': {
      name: 'nft_envelopes',
      enabled: true,
      description: 'NFT-based data envelopes (private by default)',
      category: 'core'
    },
    'presence_v0': {
      name: 'presence_v0',
      enabled: true,
      description: 'Presence system v0 (default OFF for users)',
      category: 'core'
    },
    'engine_av1_decode': {
      name: 'engine_av1_decode',
      enabled: true,
      description: 'AV1 video decoding support',
      category: 'core'
    },
    'engine_av1_encode': {
      name: 'engine_av1_encode',
      enabled: true,
      description: 'AV1 video encoding support',
      category: 'core'
    },
    'engine_av1_svc': {
      name: 'engine_av1_svc',
      enabled: true,
      description: 'AV1 scalable video coding',
      category: 'core'
    },
    'observability': {
      name: 'observability',
      enabled: true,
      description: 'System observability and monitoring',
      category: 'core'
    },
    'status_surfaces': {
      name: 'status_surfaces',
      enabled: true,
      description: 'Status and health monitoring surfaces',
      category: 'core'
    },
    
    // Governance-gated features - OFF (require community vote)
    'btc_mainnet_redemption': {
      name: 'btc_mainnet_redemption',
      enabled: false,
      description: 'Bitcoin mainnet redemption (requires governance)',
      category: 'governance',
      requires_governance: true
    },
    'staking_slashing': {
      name: 'staking_slashing',
      enabled: false,
      description: 'Staking slashing mechanisms',
      category: 'governance',
      requires_governance: true
    },
    'radio_payouts_demo': {
      name: 'radio_payouts_demo',
      enabled: false,
      description: 'Radio payouts demonstration mode',
      category: 'experimental'
    },
    'public_directory': {
      name: 'public_directory',
      enabled: false,
      description: 'Public directory service (policy not finalized)',
      category: 'governance',
      requires_governance: true
    },
    'evm_aa': {
      name: 'evm_aa',
      enabled: false,
      description: 'EVM Account Abstraction (ERC-4337)',
      category: 'experimental'
    },
    'engine_webgpu_sr': {
      name: 'engine_webgpu_sr',
      enabled: false,
      description: 'WebGPU super-resolution (pilot-only)',
      category: 'experimental'
    }
  };
  
  const snapshot: FlagsSnapshot = {
    version: 'v1.0.0',
    timestamp: new Date().toISOString(),
    flags
  };
  
  return snapshot;
}

function writeFlagsSnapshot(snapshot: FlagsSnapshot): void {
  const releaseDir = 'release';
  if (!existsSync(releaseDir)) {
    mkdirSync(releaseDir, { recursive: true });
  }
  
  const snapshotPath = join(releaseDir, 'flags-v1.0.0.json');
  writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2));
  console.log(`📁 Flags snapshot written to ${snapshotPath}`);
}

function createFlagsLock(snapshot: FlagsSnapshot): void {
  const cfgDir = 'release/cfg';
  if (!existsSync(cfgDir)) {
    mkdirSync(cfgDir, { recursive: true });
  }
  
  const lockPath = join(cfgDir, 'flags.lock.json');
  writeFileSync(lockPath, JSON.stringify(snapshot, null, 2));
  console.log(`🔒 Flags lock written to ${lockPath}`);
}

function createFlagsTable(snapshot: FlagsSnapshot): void {
  const docsDir = 'apps/docs/static/status';
  if (!existsSync(docsDir)) {
    mkdirSync(docsDir, { recursive: true });
  }
  
  const tablePath = join(docsDir, 'flags-v1.0.0.md');
  
  let content = `# Feature Flags at Launch (v1.0.0)\n\n`;
  content += `*Generated: ${snapshot.timestamp}*\n\n`;
  
  content += `## Core Features (Enabled)\n\n`;
  content += `| Flag | Description | Category |\n`;
  content += `|------|-------------|----------|\n`;
  
  Object.values(snapshot.flags)
    .filter(flag => flag.enabled)
    .forEach(flag => {
      content += `| \`${flag.name}\` | ${flag.description} | ${flag.category} |\n`;
    });
  
  content += `\n## Governance-Gated Features (Disabled)\n\n`;
  content += `| Flag | Description | Governance Required |\n`;
  content += `|------|-------------|---------------------|\n`;
  
  Object.values(snapshot.flags)
    .filter(flag => !flag.enabled && flag.requires_governance)
    .forEach(flag => {
      content += `| \`${flag.name}\` | ${flag.description} | ✅ |\n`;
    });
  
  content += `\n## Experimental Features (Disabled)\n\n`;
  content += `| Flag | Description | Status |\n`;
  content += `|------|-------------|--------|\n`;
  
  Object.values(snapshot.flags)
    .filter(flag => !flag.enabled && !flag.requires_governance)
    .forEach(flag => {
      content += `| \`${flag.name}\` | ${flag.description} | Experimental |\n`;
    });
  
  content += `\n---\n\n`;
  content += `**Note**: Governance-gated features require community approval via governance proposals before activation.\n`;
  
  writeFileSync(tablePath, content);
  console.log(`📊 Flags table written to ${tablePath}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const snapshot = createFlagsSnapshot();
  writeFlagsSnapshot(snapshot);
  createFlagsLock(snapshot);
  createFlagsTable(snapshot);
  
  console.log('✅ Flags snapshot and lock created for GA');
  process.exit(0);
}
