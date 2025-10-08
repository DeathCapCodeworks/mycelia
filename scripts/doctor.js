#!/usr/bin/env node

/**
 * GA Doctor - Preflight health checks for v1.0.0 release
 */

const { execSync } = require('child_process');
const { readFileSync, existsSync } = require('fs');
const { join } = require('path');

function runChecks() {
  console.log('🔍 GA Doctor - Preflight Health Checks\n');
  
  const checks = [
    {
      name: 'Node Version',
      check: () => {
        const version = process.version;
        const major = parseInt(version.slice(1).split('.')[0]);
        return major >= 20;
      },
      message: 'Node 20+ required for GA'
    },
    {
      name: 'Corepack Enabled',
      check: () => {
        try {
          execSync('corepack --version', { stdio: 'pipe' });
          return true;
        } catch {
          return false;
        }
      },
      message: 'Corepack must be enabled for pnpm'
    },
    {
      name: 'Lockfile Present',
      check: () => existsSync('pnpm-lock.yaml'),
      message: 'pnpm-lock.yaml must exist'
    },
    {
      name: 'GA Config Present',
      check: () => existsSync('release/cfg/workspaces-ga.txt'),
      message: 'GA workspace configuration must exist'
    },
    {
      name: 'Release Directory',
      check: () => existsSync('release'),
      message: 'Release directory must exist'
    },
    {
      name: 'Package.json Version',
      check: () => {
        try {
          const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
          return pkg.version.startsWith('0.9.0-rc');
        } catch {
          return false;
        }
      },
      message: 'Package version must be RC before GA promotion'
    }
  ];
  
  let allPassed = true;
  
  for (const check of checks) {
    try {
      const passed = check.check();
      const status = passed ? '✅' : '❌';
      console.log(`${status} ${check.name}: ${passed ? 'PASS' : 'FAIL'}`);
      
      if (!passed) {
        console.log(`   ${check.message}`);
        allPassed = false;
      }
    } catch (error) {
      console.log(`❌ ${check.name}: ERROR`);
      console.log(`   ${error instanceof Error ? error.message : String(error)}`);
      allPassed = false;
    }
  }
  
  console.log(`\n${allPassed ? '✅ All checks passed' : '❌ Some checks failed'}`);
  
  if (!allPassed) {
    console.log('\nNEXT ACTION: Fix failing checks before proceeding with GA promotion');
    process.exit(1);
  }
  
  return true;
}

if (require.main === module) {
  runChecks();
}