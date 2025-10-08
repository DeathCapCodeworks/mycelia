#!/usr/bin/env node
// Project Mycelia Doctor - Environment Health Check
// Checks Node, corepack, pnpm, git availability and prints actionable remediation

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

function checkCommand(cmd, args = [], description) {
  try {
    const result = spawnSync(cmd, args, { encoding: 'utf8', timeout: 5000 });
    return {
      available: result.status === 0,
      version: result.stdout?.trim() || 'unknown',
      error: result.stderr?.trim()
    };
  } catch (error) {
    return {
      available: false,
      version: 'not found',
      error: error.message
    };
  }
}

function checkNodeVersion() {
  const version = process.version;
  const major = parseInt(version.slice(1).split('.')[0]);
  const minor = parseInt(version.slice(1).split('.')[1]);
  
  return {
    version,
    meets: major >= 20 && minor >= 14,
    required: '>=20.14'
  };
}

function checkCorepack() {
  return checkCommand('corepack', ['--version'], 'Corepack');
}

function checkPnpm() {
  return checkCommand('pnpm', ['--version'], 'pnpm');
}

function checkGit() {
  return checkCommand('git', ['--version'], 'Git');
}

function printStatus(name, status, details = '') {
  const icon = status ? `${GREEN}✓${RESET}` : `${RED}✗${RESET}`;
  console.log(`${icon} ${name}: ${details}`);
}

function printRemediation(issues) {
  if (issues.length === 0) {
    console.log(`\n${GREEN}All checks passed! Environment is ready.${RESET}`);
    return;
  }

  console.log(`\n${YELLOW}Remediation needed:${RESET}`);
  issues.forEach((issue, i) => {
    console.log(`${i + 1}. ${issue}`);
  });
}

function main() {
  console.log('🔍 Project Mycelia Doctor - Environment Health Check\n');

  const issues = [];

  // Check Node version
  const nodeCheck = checkNodeVersion();
  printStatus('Node', nodeCheck.meets, `${nodeCheck.version} (required: ${nodeCheck.required})`);
  if (!nodeCheck.meets) {
    issues.push(`Upgrade Node to ${nodeCheck.required} or later. Current: ${nodeCheck.version}`);
  }

  // Check corepack
  const corepackCheck = checkCorepack();
  printStatus('Corepack', corepackCheck.available, corepackCheck.version);
  if (!corepackCheck.available) {
    issues.push('Enable corepack: corepack enable');
  }

  // Check pnpm
  const pnpmCheck = checkPnpm();
  printStatus('pnpm', pnpmCheck.available, pnpmCheck.version);
  if (!pnpmCheck.available) {
    issues.push('Install pnpm via corepack: corepack enable && pnpm --version');
  }

  // Check Git
  const gitCheck = checkGit();
  printStatus('Git', gitCheck.available, gitCheck.version);
  if (!gitCheck.available) {
    issues.push('Install Git from https://git-scm.com/');
  }

  // Check workspace structure
  const hasPackageJson = fs.existsSync('package.json');
  const hasPnpmWorkspace = fs.existsSync('pnpm-workspace.yaml');
  const hasPackagesDir = fs.existsSync('packages');
  const hasAppsDir = fs.existsSync('apps');

  printStatus('package.json', hasPackageJson);
  if (!hasPackageJson) {
    issues.push('Run this script from the repository root');
  }

  printStatus('pnpm-workspace.yaml', hasPnpmWorkspace);
  if (!hasPnpmWorkspace) {
    issues.push('Create pnpm-workspace.yaml with workspace configuration');
  }

  printStatus('packages/ directory', hasPackagesDir);
  if (!hasPackagesDir) {
    issues.push('Create packages/ directory for workspace packages');
  }

  printStatus('apps/ directory', hasAppsDir);
  if (!hasAppsDir) {
    issues.push('Create apps/ directory for applications');
  }

  printRemediation(issues);

  // Exit with appropriate code
  process.exit(issues.length > 0 ? 1 : 0);
}

if (require.main === module) {
  main();
}
