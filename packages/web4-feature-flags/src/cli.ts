#!/usr/bin/env node

// Web4 Feature Flags CLI

import { getFeatureFlagsManager } from './index.js';

const manager = getFeatureFlagsManager();

function printUsage() {
  console.log(`
Usage: mycelia-flags <command> [options]

Commands:
  list                           List all feature flags
  get <flag-id>                  Get a specific feature flag
  set <flag-id> <true|false>     Set a feature flag value
  rollout <flag-id> <percentage> Set rollout percentage (0-100)
  canary <on|off>                Enable/disable canary mode
  canary-add <user-id>           Add user to canary allowlist
  canary-remove <user-id>        Remove user from canary allowlist
  canary-list                    List canary allowlist
  status                         Show current status
  export                         Export all flags as JSON
  import <file>                  Import flags from JSON file
  help                           Show this help message

Examples:
  mycelia-flags set intent_bar_v1_rollout 10
  mycelia-flags rollout intent_bar_v1_rollout 25
  mycelia-flags canary on
  mycelia-flags canary-add user123
  mycelia-flags status
`);
}

function printFlag(flag: any) {
  console.log(`\n${flag.name} (${flag.id})`);
  console.log(`  Description: ${flag.description}`);
  console.log(`  Category: ${flag.category}`);
  console.log(`  Enabled: ${flag.enabled}`);
  console.log(`  Default: ${flag.defaultValue}`);
  console.log(`  Safe to toggle: ${flag.isSafeToToggle}`);
  console.log(`  Risk level: ${flag.riskLevel}`);
  if (flag.rolloutPercentage !== undefined) {
    console.log(`  Rollout: ${flag.rolloutPercentage}%`);
  }
  if (flag.canaryEnabled !== undefined) {
    console.log(`  Canary enabled: ${flag.canaryEnabled}`);
  }
  console.log(`  Last modified: ${new Date(flag.lastModified).toISOString()}`);
}

function printStatus() {
  const state = manager.getState();
  const stats = manager.getStats();
  
  console.log('\n=== Web4 Feature Flags Status ===');
  console.log(`Total flags: ${stats.totalFlags}`);
  console.log(`Enabled flags: ${stats.enabledFlags}`);
  console.log(`Disabled flags: ${stats.disabledFlags}`);
  console.log(`Canary mode: ${state.canaryMode ? 'ON' : 'OFF'}`);
  console.log(`Canary allowlist size: ${state.canaryAllowlist.size}`);
  
  console.log('\n=== Rollout Percentages ===');
  const rolloutFlags = manager.getAllFlags().filter(flag => 
    flag.id.includes('_rollout') || flag.rolloutPercentage !== undefined
  );
  
  rolloutFlags.forEach(flag => {
    const percentage = flag.rolloutPercentage || 0;
    console.log(`${flag.name}: ${percentage}%`);
  });
  
  console.log('\n=== Flags by Category ===');
  Object.entries(stats.flagsByCategory).forEach(([category, count]) => {
    console.log(`${category}: ${count} flags`);
  });
  
  console.log('\n=== Safety Controls ===');
  console.log(`Total controls: ${stats.totalControls}`);
  console.log(`Enabled controls: ${stats.enabledControls}`);
  console.log(`Triggered controls: ${stats.triggeredControls}`);
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    printUsage();
    process.exit(1);
  }
  
  const command = args[0];
  
  try {
    switch (command) {
      case 'list':
        const flags = manager.getAllFlags();
        console.log(`\nFound ${flags.length} feature flags:\n`);
        flags.forEach(flag => {
          printFlag(flag);
        });
        break;
        
      case 'get':
        if (args.length < 2) {
          console.error('Error: Flag ID required');
          process.exit(1);
        }
        const flag = manager.getFlag(args[1]);
        if (!flag) {
          console.error(`Error: Flag '${args[1]}' not found`);
          process.exit(1);
        }
        printFlag(flag);
        break;
        
      case 'set':
        if (args.length < 3) {
          console.error('Error: Flag ID and value required');
          process.exit(1);
        }
        const flagId = args[1];
        const value = args[2].toLowerCase() === 'true';
        const success = manager.setFlag(flagId, value, 'CLI command');
        if (!success) {
          console.error(`Error: Failed to set flag '${flagId}'`);
          process.exit(1);
        }
        console.log(`Flag '${flagId}' set to ${value}`);
        break;
        
      case 'rollout':
        if (args.length < 3) {
          console.error('Error: Flag ID and percentage required');
          process.exit(1);
        }
        const rolloutFlagId = args[1];
        const percentage = parseInt(args[2]);
        if (isNaN(percentage) || percentage < 0 || percentage > 100) {
          console.error('Error: Percentage must be between 0 and 100');
          process.exit(1);
        }
        const rolloutSuccess = manager.setRolloutPercentage(rolloutFlagId, percentage);
        if (!rolloutSuccess) {
          console.error(`Error: Failed to set rollout percentage for '${rolloutFlagId}'`);
          process.exit(1);
        }
        console.log(`Rollout percentage for '${rolloutFlagId}' set to ${percentage}%`);
        break;
        
      case 'canary':
        if (args.length < 2) {
          console.error('Error: Canary mode state required (on/off)');
          process.exit(1);
        }
        const canaryState = args[1].toLowerCase();
        if (canaryState === 'on') {
          manager.enableCanaryMode();
          console.log('Canary mode enabled');
        } else if (canaryState === 'off') {
          manager.disableCanaryMode();
          console.log('Canary mode disabled');
        } else {
          console.error('Error: Canary mode must be "on" or "off"');
          process.exit(1);
        }
        break;
        
      case 'canary-add':
        if (args.length < 2) {
          console.error('Error: User ID required');
          process.exit(1);
        }
        const userId = args[1];
        manager.addToCanaryAllowlist(userId);
        console.log(`User '${userId}' added to canary allowlist`);
        break;
        
      case 'canary-remove':
        if (args.length < 2) {
          console.error('Error: User ID required');
          process.exit(1);
        }
        const removeUserId = args[1];
        manager.removeFromCanaryAllowlist(removeUserId);
        console.log(`User '${removeUserId}' removed from canary allowlist`);
        break;
        
      case 'canary-list':
        const allowlist = manager.getCanaryAllowlist();
        console.log(`\nCanary allowlist (${allowlist.length} users):`);
        allowlist.forEach(userId => {
          console.log(`  ${userId}`);
        });
        break;
        
      case 'status':
        printStatus();
        break;
        
      case 'export':
        const exported = manager.exportFlags();
        console.log(exported);
        break;
        
      case 'import':
        if (args.length < 2) {
          console.error('Error: File path required');
          process.exit(1);
        }
        // In a real implementation, you would read the file
        console.log('Import functionality not implemented in this demo');
        break;
        
      case 'help':
        printUsage();
        break;
        
      default:
        console.error(`Error: Unknown command '${command}'`);
        printUsage();
        process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run CLI if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
