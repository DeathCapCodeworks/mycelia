#!/usr/bin/env tsx

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { FEATURE_FLAG_REGISTRY, isEnabled, scopeOf, riskOf } from '../../packages/web4-feature-flags/src/registry';

interface FlagSnapshot {
  id: string;
  name: string;
  description: string;
  category: string;
  defaultValue: boolean;
  rolloutPercentage: number;
  canaryEnabled: boolean;
  riskLevel: string;
  scope: string;
  enabled: boolean;
}

function getVersion(): string {
  try {
    return readFileSync('release/VERSION', 'utf8').trim();
  } catch (error) {
    console.error('Failed to read VERSION file:', error);
    process.exit(1);
  }
}

function generateFlagsSnapshot(): FlagSnapshot[] {
  console.log('🚩 Generating feature flags snapshot...');
  
  const snapshot: FlagSnapshot[] = [];
  
  for (const flag of FEATURE_FLAG_REGISTRY) {
    const enabled = isEnabled(flag.id);
    
    snapshot.push({
      id: flag.id,
      name: flag.name,
      description: flag.description,
      category: flag.category,
      defaultValue: flag.defaultValue,
      rolloutPercentage: flag.rolloutPercentage,
      canaryEnabled: flag.canaryEnabled,
      riskLevel: flag.riskLevel,
      scope: flag.scope,
      enabled
    });
  }
  
  return snapshot;
}

function writeJsonSnapshot(snapshot: FlagSnapshot[], version: string): void {
  const outputDir = 'release';
  const filename = `flags-${version}.json`;
  const filepath = join(outputDir, filename);
  
  const data = {
    version,
    timestamp: new Date().toISOString(),
    totalFlags: snapshot.length,
    enabledFlags: snapshot.filter(f => f.enabled).length,
    disabledFlags: snapshot.filter(f => !f.enabled).length,
    flags: snapshot
  };
  
  writeFileSync(filepath, JSON.stringify(data, null, 2));
  console.log(`✅ JSON snapshot written to ${filepath}`);
}

function writeMarkdownSnapshot(snapshot: FlagSnapshot[], version: string): void {
  const outputDir = 'apps/docs/static/status';
  
  // Ensure directory exists
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }
  
  const filename = `flags-${version}.md`;
  const filepath = join(outputDir, filename);
  
  let markdown = `# Feature Flags Snapshot - ${version}\n\n`;
  markdown += `Generated: ${new Date().toISOString()}\n\n`;
  
  // Summary
  const enabledCount = snapshot.filter(f => f.enabled).length;
  const disabledCount = snapshot.filter(f => !f.enabled).length;
  
  markdown += `## Summary\n\n`;
  markdown += `- **Total Flags**: ${snapshot.length}\n`;
  markdown += `- **Enabled**: ${enabledCount}\n`;
  markdown += `- **Disabled**: ${disabledCount}\n\n`;
  
  // Group by category
  const categories = [...new Set(snapshot.map(f => f.category))];
  
  for (const category of categories) {
    const categoryFlags = snapshot.filter(f => f.category === category);
    
    markdown += `## ${category.charAt(0).toUpperCase() + category.slice(1)}\n\n`;
    markdown += `| Flag ID | Name | Status | Rollout | Risk | Scope |\n`;
    markdown += `|---------|------|--------|---------|------|-------|\n`;
    
    for (const flag of categoryFlags) {
      const status = flag.enabled ? '✅ Enabled' : '❌ Disabled';
      const rollout = flag.rolloutPercentage > 0 ? `${flag.rolloutPercentage}%` : '0%';
      const risk = flag.riskLevel.charAt(0).toUpperCase() + flag.riskLevel.slice(1);
      const scope = flag.scope.charAt(0).toUpperCase() + flag.scope.slice(1);
      
      markdown += `| \`${flag.id}\` | ${flag.name} | ${status} | ${rollout} | ${risk} | ${scope} |\n`;
    }
    
    markdown += '\n';
  }
  
  // Detailed descriptions
  markdown += `## Detailed Descriptions\n\n`;
  
  for (const flag of snapshot) {
    markdown += `### ${flag.name} (\`${flag.id}\`)\n\n`;
    markdown += `${flag.description}\n\n`;
    markdown += `- **Category**: ${flag.category}\n`;
    markdown += `- **Default**: ${flag.defaultValue ? 'Enabled' : 'Disabled'}\n`;
    markdown += `- **Rollout**: ${flag.rolloutPercentage}%\n`;
    markdown += `- **Canary**: ${flag.canaryEnabled ? 'Yes' : 'No'}\n`;
    markdown += `- **Risk Level**: ${flag.riskLevel}\n`;
    markdown += `- **Scope**: ${flag.scope}\n`;
    markdown += `- **Current Status**: ${flag.enabled ? 'Enabled' : 'Disabled'}\n\n`;
  }
  
  writeFileSync(filepath, markdown);
  console.log(`✅ Markdown snapshot written to ${filepath}`);
}

function main(): void {
  console.log('🚩 Creating feature flags snapshot...');
  
  const version = getVersion();
  console.log(`Version: ${version}`);
  
  const snapshot = generateFlagsSnapshot();
  
  // Write JSON snapshot
  writeJsonSnapshot(snapshot, version);
  
  // Write Markdown snapshot
  writeMarkdownSnapshot(snapshot, version);
  
  console.log(`\n📊 Flags Snapshot Summary:`);
  console.log(`  Total flags: ${snapshot.length}`);
  console.log(`  Enabled: ${snapshot.filter(f => f.enabled).length}`);
  console.log(`  Disabled: ${snapshot.filter(f => !f.enabled).length}`);
  console.log(`  Categories: ${[...new Set(snapshot.map(f => f.category))].length}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
