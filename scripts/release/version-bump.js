#!/usr/bin/env node

const { readFileSync, writeFileSync, existsSync } = require('fs');
const { execSync } = require('child_process');
const { join } = require('path');

function getCurrentVersion() {
  try {
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
    return packageJson.version;
  } catch (error) {
    console.error('Failed to read package.json:', error);
    process.exit(1);
  }
}

function getLatestTag() {
  try {
    const output = execSync('git describe --tags --abbrev=0', { encoding: 'utf8' }).trim();
    return output || null;
  } catch (error) {
    // No tags exist yet
    return null;
  }
}

function incrementRcVersion(version) {
  const match = version.match(/^(.+)-rc\.(\d+)$/);
  if (match) {
    const baseVersion = match[1];
    const rcNumber = parseInt(match[2], 10);
    return `${baseVersion}-rc.${rcNumber + 1}`;
  }
  return `${version}-rc.1`;
}

function updatePackageJson(path, newVersion) {
  try {
    const packageJson = JSON.parse(readFileSync(path, 'utf8'));
    packageJson.version = newVersion;
    writeFileSync(path, JSON.stringify(packageJson, null, 2) + '\n');
  } catch (error) {
    console.error(`Failed to update ${path}:`, error);
  }
}

function findWorkspacePackages() {
  const packages = [];
  
  // Find packages in packages/ directory
  try {
    const packagesDir = 'packages';
    const items = execSync(`ls ${packagesDir}`, { encoding: 'utf8' }).trim().split('\n');
    
    for (const item of items) {
      const packagePath = join(packagesDir, item, 'package.json');
      if (existsSync(packagePath)) {
        packages.push(packagePath);
      }
    }
  } catch (error) {
    console.warn('Could not find packages directory:', error);
  }

  // Find apps in apps/ directory
  try {
    const appsDir = 'apps';
    const items = execSync(`ls ${appsDir}`, { encoding: 'utf8' }).trim().split('\n');
    
    for (const item of items) {
      const packagePath = join(appsDir, item, 'package.json');
      if (existsSync(packagePath)) {
        packages.push(packagePath);
      }
    }
  } catch (error) {
    console.warn('Could not find apps directory:', error);
  }

  return packages;
}

function main() {
  console.log('🔄 Determining next version...');

  const currentVersion = getCurrentVersion();
  const latestTag = getLatestTag();
  
  let nextVersion;
  
  if (latestTag) {
    console.log(`Latest tag: ${latestTag}`);
    if (latestTag.startsWith('v0.9.0-rc.')) {
      nextVersion = incrementRcVersion(latestTag.substring(1)); // Remove 'v' prefix
    } else {
      nextVersion = 'v0.9.0-rc.1';
    }
  } else {
    console.log('No existing tags found');
    nextVersion = 'v0.9.0-rc.1';
  }

  console.log(`Next version: ${nextVersion}`);

  // Update root package.json
  updatePackageJson('package.json', nextVersion.substring(1)); // Remove 'v' prefix for package.json

  // Update all workspace packages
  const workspacePackages = findWorkspacePackages();
  console.log(`Found ${workspacePackages.length} workspace packages`);
  
  for (const packagePath of workspacePackages) {
    updatePackageJson(packagePath, nextVersion.substring(1));
  }

  // Write VERSION file
  const versionFile = 'release/VERSION';
  try {
    writeFileSync(versionFile, nextVersion + '\n');
    console.log(`Version written to ${versionFile}`);
  } catch (error) {
    console.error('Failed to write VERSION file:', error);
  }

  // Print version to stdout for other scripts
  console.log(nextVersion);
}

main();
