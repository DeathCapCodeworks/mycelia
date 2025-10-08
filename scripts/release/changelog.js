#!/usr/bin/env node

const { readFileSync, writeFileSync, existsSync } = require('fs');
const { execSync } = require('child_process');

function getLastTag() {
  try {
    const output = execSync('git describe --tags --abbrev=0', { encoding: 'utf8' }).trim();
    return output || null;
  } catch (error) {
    return null;
  }
}

function getCommitsSinceTag(tag) {
  try {
    const range = tag ? `${tag}..HEAD` : 'HEAD';
    const output = execSync(`git log --oneline --no-merges ${range}`, { encoding: 'utf8' });
    return output.trim().split('\n').filter(line => line.length > 0);
  } catch (error) {
    console.error('Failed to get commits:', error);
    return [];
  }
}

function parseCommit(commitLine) {
  const [hash, ...rest] = commitLine.split(' ');
  const message = rest.join(' ');
  
  // Parse conventional commit format: type(scope): description
  const match = message.match(/^(\w+)(?:\(([^)]+)\))?(!)?:\s*(.+)$/);
  
  if (match) {
    const [, type, scope, breaking, description] = match;
    return {
      hash: hash.substring(0, 7),
      type,
      scope,
      description,
      breaking: !!breaking
    };
  }
  
  // Fallback for non-conventional commits
  return {
    hash: hash.substring(0, 7),
    type: 'chore',
    description: message
  };
}

function categorizeCommits(commits) {
  const categories = {
    Features: [],
    Fixes: [],
    Docs: [],
    Chore: [],
    Build: [],
    CI: [],
    Refactor: [],
    Perf: []
  };

  for (const commit of commits) {
    const type = commit.type.toLowerCase();
    
    switch (type) {
      case 'feat':
      case 'feature':
        categories.Features.push(commit);
        break;
      case 'fix':
      case 'bugfix':
        categories.Fixes.push(commit);
        break;
      case 'docs':
      case 'doc':
        categories.Docs.push(commit);
        break;
      case 'build':
        categories.Build.push(commit);
        break;
      case 'ci':
        categories.CI.push(commit);
        break;
      case 'refactor':
        categories.Refactor.push(commit);
        break;
      case 'perf':
      case 'performance':
        categories.Perf.push(commit);
        break;
      default:
        categories.Chore.push(commit);
    }
  }

  return categories;
}

function getCompareUrl() {
  try {
    const remoteUrl = execSync('git config --get remote.origin.url', { encoding: 'utf8' }).trim();
    const lastTag = getLastTag();
    
    if (remoteUrl.includes('github.com') && lastTag) {
      const repo = remoteUrl.replace(/^git@github.com:|^https:\/\/github.com\//, '').replace(/\.git$/, '');
      return `https://github.com/${repo}/compare/${lastTag}...HEAD`;
    }
  } catch (error) {
    console.warn('Could not determine compare URL:', error);
  }
  
  return null;
}

function generateChangelog() {
  const lastTag = getLastTag();
  const commits = getCommitsSinceTag(lastTag);
  
  console.log(`Found ${commits.length} commits since ${lastTag || 'beginning'}`);
  
  const parsedCommits = commits.map(parseCommit);
  const categories = categorizeCommits(parsedCommits);
  
  const version = readFileSync('release/VERSION', 'utf8').trim();
  const date = new Date().toISOString().split('T')[0];
  
  let changelog = `# Changelog\n\n`;
  changelog += `## [${version}] - ${date}\n\n`;
  
  // Add highlights section
  changelog += `### Highlights\n\n`;
  changelog += `- **Diagnostics Gates**: Comprehensive system health checks and SLO monitoring\n`;
  changelog += `- **Feature Flags Registry**: Unified registry with CLI for flag management\n`;
  changelog += `- **Ethereum Rails**: Complete EVM integration with Account Abstraction and Paymaster\n`;
  changelog += `- **Docker/IPFS**: Clean deployment configuration and IPFS publishing\n`;
  changelog += `- **Demo Recorder**: Golden Path demonstration with watermarking\n`;
  changelog += `- **PoR Freshness**: Proof-of-Reserves attestation freshness guards\n\n`;
  
  // Add categorized changes
  for (const [category, commits] of Object.entries(categories)) {
    if (commits.length > 0) {
      changelog += `### ${category}\n\n`;
      
      for (const commit of commits) {
        const scope = commit.scope ? `**${commit.scope}**: ` : '';
        const breaking = commit.breaking ? ' **BREAKING CHANGE**' : '';
        changelog += `- ${scope}${commit.description} (${commit.hash})${breaking}\n`;
      }
      
      changelog += '\n';
    }
  }
  
  // Add compare URL if available
  const compareUrl = getCompareUrl();
  if (compareUrl) {
    changelog += `[Full Changelog](${compareUrl})\n\n`;
  }
  
  return changelog;
}

function main() {
  console.log('📝 Generating changelog...');
  
  try {
    const changelog = generateChangelog();
    
    // Read existing changelog if it exists
    let existingChangelog = '';
    if (existsSync('CHANGELOG.md')) {
      existingChangelog = readFileSync('CHANGELOG.md', 'utf8');
    }
    
    // Prepend new changelog
    const fullChangelog = changelog + '\n' + existingChangelog;
    writeFileSync('CHANGELOG.md', fullChangelog);
    
    console.log('✅ Changelog generated successfully');
    console.log(`📄 Written to CHANGELOG.md`);
    
  } catch (error) {
    console.error('❌ Failed to generate changelog:', error);
    process.exit(1);
  }
}

main();
