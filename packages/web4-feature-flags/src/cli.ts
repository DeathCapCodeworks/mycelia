#!/usr/bin/env node
// Feature Flags CLI - Manage feature flags with list/get/set/rollout/canary commands

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import {
  FEATURE_FLAGS,
  getAllFlags,
  getFlagsByCategory,
  getFlagsByScope,
  getFlagsByRisk,
  isEnabled,
  scopeOf,
  riskOf,
  formatFlag,
  validateFlagKey,
  getFlagDependencies,
  getFlagConflicts,
  FeatureFlag,
  FlagContext
} from './registry.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface FlagState {
  flags: Record<string, boolean>;
  rollouts: Record<string, number>;
  canaryMode: boolean;
  canaryAllowlist: string[];
  lastUpdated: number;
}

class FlagManager {
  private statePath: string;
  private state: FlagState;

  constructor(statePath: string = '.flags-state.json') {
    this.statePath = statePath;
    this.state = this.loadState();
  }

  private loadState(): FlagState {
    try {
      if (fs.existsSync(this.statePath)) {
        const content = fs.readFileSync(this.statePath, 'utf8');
        return JSON.parse(content);
      }
    } catch (error) {
      console.warn('Failed to load flag state:', error);
    }

    return {
      flags: {},
      rollouts: {},
      canaryMode: false,
      canaryAllowlist: [],
      lastUpdated: Date.now()
    };
  }

  private saveState(): void {
    try {
      this.state.lastUpdated = Date.now();
      fs.writeFileSync(this.statePath, JSON.stringify(this.state, null, 2));
    } catch (error) {
      console.error('Failed to save flag state:', error);
    }
  }

  public list(options: { category?: string; scope?: string; risk?: string } = {}): void {
    let flags = getAllFlags();

    if (options.category) {
      flags = flags.filter(f => f.category === options.category);
    }
    if (options.scope) {
      flags = flags.filter(f => f.scope === options.scope);
    }
    if (options.risk) {
      flags = flags.filter(f => f.riskLevel === options.risk);
    }

    console.log(`📋 Feature Flags (${flags.length} total)\n`);

    if (flags.length === 0) {
      console.log('No flags match the specified criteria.');
      return;
    }

    flags.forEach(flag => {
      const currentValue = this.state.flags[flag.key] ?? flag.default;
      const currentRollout = this.state.rollouts[flag.key] ?? flag.rollout;
      
      const status = currentValue ? 'ON' : 'OFF';
      const rollout = currentRollout > 0 ? ` (${currentRollout}%)` : '';
      const scope = `[${flag.scope}/${flag.riskLevel}]`;
      
      console.log(`${flag.key}: ${status}${rollout} ${scope}`);
      console.log(`  ${flag.description}`);
      console.log('');
    });
  }

  public get(key: string): void {
    if (!validateFlagKey(key)) {
      console.error(`❌ Unknown flag: ${key}`);
      process.exit(1);
    }

    const flag = FEATURE_FLAGS[key];
    const currentValue = this.state.flags[key] ?? flag.default;
    const currentRollout = this.state.rollouts[key] ?? flag.rollout;

    console.log(`🔍 Flag: ${key}\n`);
    console.log(`Name: ${flag.name}`);
    console.log(`Description: ${flag.description}`);
    console.log(`Category: ${flag.category}`);
    console.log(`Default: ${flag.default ? 'ON' : 'OFF'}`);
    console.log(`Current: ${currentValue ? 'ON' : 'OFF'}`);
    console.log(`Rollout: ${currentRollout}%`);
    console.log(`Scope: ${flag.scope}`);
    console.log(`Risk: ${flag.riskLevel}`);
    console.log(`Requires Restart: ${flag.requiresRestart ? 'Yes' : 'No'}`);

    const dependencies = getFlagDependencies(key);
    if (dependencies.length > 0) {
      console.log(`Dependencies: ${dependencies.join(', ')}`);
    }

    const conflicts = getFlagConflicts(key);
    if (conflicts.length > 0) {
      console.log(`Conflicts: ${conflicts.join(', ')}`);
    }
  }

  public set(key: string, value: 'on' | 'off'): void {
    if (!validateFlagKey(key)) {
      console.error(`❌ Unknown flag: ${key}`);
      process.exit(1);
    }

    const flag = FEATURE_FLAGS[key];
    const newValue = value === 'on';

    // Check dependencies
    if (newValue) {
      const dependencies = getFlagDependencies(key);
      for (const dep of dependencies) {
        const depValue = this.state.flags[dep] ?? FEATURE_FLAGS[dep].default;
        if (!depValue) {
          console.error(`❌ Cannot enable ${key}: dependency ${dep} is disabled`);
          process.exit(1);
        }
      }
    }

    // Check conflicts
    if (newValue) {
      const conflicts = getFlagConflicts(key);
      for (const conflict of conflicts) {
        const conflictValue = this.state.flags[conflict] ?? FEATURE_FLAGS[conflict].default;
        if (conflictValue) {
          console.error(`❌ Cannot enable ${key}: conflicts with enabled flag ${conflict}`);
          process.exit(1);
        }
      }
    }

    this.state.flags[key] = newValue;
    this.saveState();

    console.log(`✅ Set ${key} to ${value.toUpperCase()}`);
    
    if (flag.requiresRestart) {
      console.log('⚠️  This flag requires a restart to take effect');
    }
  }

  public rollout(key: string, percentage: number): void {
    if (!validateFlagKey(key)) {
      console.error(`❌ Unknown flag: ${key}`);
      process.exit(1);
    }

    if (percentage < 0 || percentage > 100) {
      console.error('❌ Rollout percentage must be between 0 and 100');
      process.exit(1);
    }

    this.state.rollouts[key] = percentage;
    this.saveState();

    console.log(`✅ Set ${key} rollout to ${percentage}%`);
  }

  public canary(action: 'add' | 'rm', did: string): void {
    if (action === 'add') {
      if (!this.state.canaryAllowlist.includes(did)) {
        this.state.canaryAllowlist.push(did);
        this.saveState();
        console.log(`✅ Added ${did} to canary allowlist`);
      } else {
        console.log(`ℹ️  ${did} is already in canary allowlist`);
      }
    } else if (action === 'rm') {
      const index = this.state.canaryAllowlist.indexOf(did);
      if (index > -1) {
        this.state.canaryAllowlist.splice(index, 1);
        this.saveState();
        console.log(`✅ Removed ${did} from canary allowlist`);
      } else {
        console.log(`ℹ️  ${did} is not in canary allowlist`);
      }
    }
  }

  public canaryList(): void {
    console.log('🎯 Canary Allowlist:');
    if (this.state.canaryAllowlist.length === 0) {
      console.log('  (empty)');
    } else {
      this.state.canaryAllowlist.forEach(did => {
        console.log(`  - ${did}`);
      });
    }
  }

  public canaryMode(enable: boolean): void {
    this.state.canaryMode = enable;
    this.saveState();
    console.log(`✅ Canary mode ${enable ? 'enabled' : 'disabled'}`);
  }
}

// CLI setup
const program = new Command();

program
  .name('flags')
  .description('Project Mycelia Feature Flags CLI')
  .version('1.0.0');

program
  .command('list')
  .description('List all feature flags')
  .option('-c, --category <category>', 'Filter by category')
  .option('-s, --scope <scope>', 'Filter by scope (ops|gov)')
  .option('-r, --risk <risk>', 'Filter by risk level')
  .action((options) => {
    const manager = new FlagManager();
    manager.list(options);
  });

program
  .command('get <key>')
  .description('Get details for a specific flag')
  .action((key) => {
    const manager = new FlagManager();
    manager.get(key);
  });

program
  .command('set <key> <value>')
  .description('Set a flag to on or off')
  .argument('<key>', 'Flag key')
  .argument('<value>', 'on or off')
  .action((key, value) => {
    if (!['on', 'off'].includes(value)) {
      console.error('❌ Value must be "on" or "off"');
      process.exit(1);
    }
    const manager = new FlagManager();
    manager.set(key, value as 'on' | 'off');
  });

program
  .command('rollout <key> <percentage>')
  .description('Set rollout percentage for a flag')
  .argument('<key>', 'Flag key')
  .argument('<percentage>', 'Percentage (0-100)')
  .action((key, percentage) => {
    const pct = parseInt(percentage);
    if (isNaN(pct)) {
      console.error('❌ Percentage must be a number');
      process.exit(1);
    }
    const manager = new FlagManager();
    manager.rollout(key, pct);
  });

program
  .command('canary <action> <did>')
  .description('Manage canary allowlist')
  .argument('<action>', 'add or rm')
  .argument('<did>', 'DID to add/remove')
  .action((action, did) => {
    if (!['add', 'rm'].includes(action)) {
      console.error('❌ Action must be "add" or "rm"');
      process.exit(1);
    }
    const manager = new FlagManager();
    manager.canary(action as 'add' | 'rm', did);
  });

program
  .command('canary-list')
  .description('List canary allowlist')
  .action(() => {
    const manager = new FlagManager();
    manager.canaryList();
  });

program
  .command('canary-mode <enable>')
  .description('Enable or disable canary mode')
  .argument('<enable>', 'true or false')
  .action((enable) => {
    const enabled = enable === 'true';
    const manager = new FlagManager();
    manager.canaryMode(enabled);
  });

program.parse();