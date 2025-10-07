#!/usr/bin/env node
// Mycelia Feature Flags CLI - Manage feature flags

import { createFeatureFlags } from './index.js';

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('[flags] starting CLI');
    console.log('Usage: mycelia-flags <command> [options]');
    console.log('');
    console.log('Commands:');
    console.log('  list                    List all feature flags');
    console.log('  status                  Show feature flag status');
    console.log('  enable <flag>           Enable a feature flag');
    console.log('  disable <flag>          Disable a feature flag');
    console.log('  ops                     Show ops-controlled flags');
    console.log('  governance              Show governance-controlled flags');
    console.log('');
    console.log('Examples:');
    console.log('  mycelia-flags list');
    console.log('  mycelia-flags enable rewards_slow_mode');
    console.log('  mycelia-flags disable oracle_read_scope_max');
    process.exit(1);
  }

  const command = args[0];
  console.log(`[flags] command=${command}`);
  const featureFlags = createFeatureFlags();
  
  try {
    if (command === 'list') {
      await handleList(featureFlags);
    } else if (command === 'status') {
      await handleStatus(featureFlags);
    } else if (command === 'enable') {
      await handleEnable(args.slice(1), featureFlags);
    } else if (command === 'disable') {
      await handleDisable(args.slice(1), featureFlags);
    } else if (command === 'ops') {
      await handleOps(featureFlags);
    } else if (command === 'governance') {
      await handleGovernance(featureFlags);
    } else {
      console.error(`Unknown command: ${command}`);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

async function handleList(featureFlags: any) {
  const allFlags = featureFlags.getAllFlags();
  
  console.log('\n🚩 Feature Flags\n================');
  
  for (const flag of allFlags) {
    const status = flag.enabled ? '✅ ENABLED' : '❌ DISABLED';
    const risk = flag.riskLevel.toUpperCase();
    const control = isOpsControlled(flag.name) ? 'OPS' : 'GOVERNANCE';
    
    console.log(`${status} ${flag.name} (${risk} risk, ${control} controlled)`);
    console.log(`   ${flag.description}`);
    console.log('');
  }
}

async function handleStatus(featureFlags: any) {
  const summary = getFeatureFlagSummary(featureFlags);
  
  console.log('\n📊 Feature Flag Status\n=====================');
  console.log(`Total flags: ${summary.total}`);
  console.log(`Enabled: ${summary.enabled}`);
  console.log(`Disabled: ${summary.disabled}`);
  console.log(`High risk: ${summary.highRisk}`);
  console.log(`Medium risk: ${summary.mediumRisk}`);
  console.log(`Low risk: ${summary.lowRisk}`);
  
  const opsFlags = featureFlags.getOpsControlledFlags();
  const governanceFlags = featureFlags.getGovernanceControlledFlags();
  
  console.log(`\nOps controlled: ${opsFlags.length}`);
  console.log(`Governance controlled: ${governanceFlags.length}`);
}

async function handleEnable(args: string[], featureFlags: any) {
  if (args.length === 0) {
    console.error('Error: enable command requires a flag name');
    process.exit(1);
  }

  const flagName = args[0];
  
  if (!featureFlags.exists(flagName)) {
    console.error(`Error: Feature flag '${flagName}' not found`);
    process.exit(1);
  }

  if (isGovernanceControlled(flagName)) {
    console.error(`Error: '${flagName}' is governance controlled and cannot be changed via CLI`);
    console.error('Use governance proposal to change this flag');
    process.exit(1);
  }

  featureFlags.enable(flagName);
  console.log(`✅ Enabled feature flag: ${flagName}`);
}

async function handleDisable(args: string[], featureFlags: any) {
  if (args.length === 0) {
    console.error('Error: disable command requires a flag name');
    process.exit(1);
  }

  const flagName = args[0];
  
  if (!featureFlags.exists(flagName)) {
    console.error(`Error: Feature flag '${flagName}' not found`);
    process.exit(1);
  }

  if (isGovernanceControlled(flagName)) {
    console.error(`Error: '${flagName}' is governance controlled and cannot be changed via CLI`);
    console.error('Use governance proposal to change this flag');
    process.exit(1);
  }

  featureFlags.disable(flagName);
  console.log(`❌ Disabled feature flag: ${flagName}`);
}

async function handleOps(featureFlags: any) {
  const opsFlags = featureFlags.getOpsControlledFlags();
  
  console.log('\n🔧 Ops-Controlled Flags\n======================');
  console.log('These flags can be changed without governance approval:');
  console.log('');
  
  for (const flag of opsFlags) {
    const status = flag.enabled ? '✅ ENABLED' : '❌ DISABLED';
    console.log(`${status} ${flag.name}`);
    console.log(`   ${flag.description}`);
    console.log('');
  }
}

async function handleGovernance(featureFlags: any) {
  const governanceFlags = featureFlags.getGovernanceControlledFlags();
  
  console.log('\n🏛️  Governance-Controlled Flags\n================================');
  console.log('These flags require governance approval to change:');
  console.log('');
  
  for (const flag of governanceFlags) {
    const status = flag.enabled ? '✅ ENABLED' : '❌ DISABLED';
    console.log(`${status} ${flag.name}`);
    console.log(`   ${flag.description}`);
    console.log('');
  }
}

function isOpsControlled(flagName: string): boolean {
  const opsFlags = ['rewards_slow_mode', 'oracle_read_scope_max'];
  return opsFlags.includes(flagName);
}

function isGovernanceControlled(flagName: string): boolean {
  const governanceFlags = [
    'btc_mainnet_redemption', 
    'staking_slashing', 
    'rewards_mainnet', 
    'governance_v1'
  ];
  return governanceFlags.includes(flagName);
}

function getFeatureFlagSummary(featureFlags: any): {
  total: number;
  enabled: number;
  disabled: number;
  highRisk: number;
  mediumRisk: number;
  lowRisk: number;
} {
  const allFlags = featureFlags.getAllFlags();
  
  return {
    total: allFlags.length,
    enabled: allFlags.filter((f: any) => f.enabled).length,
    disabled: allFlags.filter((f: any) => !f.enabled).length,
    highRisk: allFlags.filter((f: any) => f.riskLevel === 'high').length,
    mediumRisk: allFlags.filter((f: any) => f.riskLevel === 'medium').length,
    lowRisk: allFlags.filter((f: any) => f.riskLevel === 'low').length
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
