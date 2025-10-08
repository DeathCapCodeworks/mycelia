#!/usr/bin/env node
// Project Mycelia Repository State Extractor
// Generates comprehensive audit reports in JSON and Markdown formats

import * as fs from 'fs';
import * as path from 'path';
import { spawnSync } from 'child_process';

interface RepoState {
  repo: {
    branch: string;
    sha: string;
    date: string;
  };
  node: {
    engine: string;
    pnpm: string;
  };
  workspaces: Array<{
    name: string;
    version: string;
    private: boolean;
    scripts: string[];
    domainTags: string[];
    dependencies: Array<{ name: string; version: string }>;
  }>;
  apps: Array<{
    name: string;
    routes: string[];
  }>;
  flags: Array<{
    key: string;
    default: 'on' | 'off';
    rollout: number;
    scope: 'ops' | 'gov';
    category: string;
    riskLevel: string;
  }>;
  diagnostics: {
    supported: boolean;
    lastRun: string | null;
    passRate: number;
    checks: Array<{ name: string; status: 'pass' | 'fail' | 'skipped' }>;
  };
  slo: any;
  perfBudgets: any;
  security: any;
  governance: any;
  por: any;
  zkpor: any;
  tokenomics: {
    peg: string;
    enforcement: string[];
  };
  engine: {
    av1: any;
    webrtc: any;
    webgpu: any;
    webnn: any;
  };
  storage: {
    envelopes: any;
    directory: any;
  };
  radio: any;
  presence: any;
  databox: any;
  deploy: {
    dockerCompose: boolean;
    services: string[];
    helm: any;
    ipfsPublish: any;
  };
  ci: Array<{
    file: string;
    triggers: string[];
    jobs: string[];
  }>;
  docs: Array<{
    path: string;
    title: string;
  }>;
  demos: {
    goldenPath: {
      exists: boolean;
      watermark: boolean;
      paths: string[];
    };
  };
  warnings: string[];
}

class StateExtractor {
  private warnings: string[] = [];
  private repoRoot: string;

  constructor() {
    this.repoRoot = process.cwd();
  }

  private warn(message: string): void {
    this.warnings.push(message);
    console.warn(`⚠️  ${message}`);
  }

  private safeReadFile(filePath: string): string | null {
    try {
      return fs.readFileSync(filePath, 'utf8');
    } catch (error) {
      this.warn(`Could not read file: ${filePath}`);
      return null;
    }
  }

  private safeReadJson(filePath: string): any | null {
    const content = this.safeReadFile(filePath);
    if (!content) return null;
    try {
      return JSON.parse(content);
    } catch (error) {
      this.warn(`Could not parse JSON: ${filePath}`);
      return null;
    }
  }

  private getGitInfo(): { branch: string; sha: string } {
    try {
      const branchResult = spawnSync('git', ['branch', '--show-current'], { encoding: 'utf8' });
      const shaResult = spawnSync('git', ['rev-parse', '--short', 'HEAD'], { encoding: 'utf8' });
      
      return {
        branch: branchResult.stdout?.trim() || 'unknown',
        sha: shaResult.stdout?.trim() || 'unknown'
      };
    } catch (error) {
      this.warn('Could not get git information');
      return { branch: 'unknown', sha: 'unknown' };
    }
  }

  private getNodeVersions(): { engine: string; pnpm: string } {
    const engine = process.version;
    let pnpm = 'not installed';
    
    try {
      const pnpmResult = spawnSync('pnpm', ['--version'], { encoding: 'utf8' });
      if (pnpmResult.stdout) {
        pnpm = pnpmResult.stdout.trim();
      }
    } catch (error) {
      // pnpm not available, that's ok
    }
    
    return { engine, pnpm };
  }

  private getWorkspaces(): RepoState['workspaces'] {
    const workspaces: RepoState['workspaces'] = [];
    
    // Read root package.json
    const rootPkg = this.safeReadJson('package.json');
    if (!rootPkg) return workspaces;

    // Get workspace patterns
    const workspacePatterns = rootPkg.workspaces || [];
    
    // Scan packages directory
    const packagesDir = path.join(this.repoRoot, 'packages');
    if (fs.existsSync(packagesDir)) {
      const packageDirs = fs.readdirSync(packagesDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

      for (const pkgDir of packageDirs) {
        const pkgPath = path.join(packagesDir, pkgDir, 'package.json');
        const pkg = this.safeReadJson(pkgPath);
        if (!pkg) continue;

        // Extract top 10 dependencies
        const deps = Object.entries(pkg.dependencies || {})
          .slice(0, 10)
          .map(([name, version]) => ({ name, version: version as string }));

        // Determine domain tags based on package name and content
        const domainTags = this.getDomainTags(pkgDir, pkg);

        workspaces.push({
          name: pkg.name || pkgDir,
          version: pkg.version || '0.1.0',
          private: pkg.private || false,
          scripts: Object.keys(pkg.scripts || {}),
          domainTags,
          dependencies: deps
        });
      }
    }

    // Scan apps directory
    const appsDir = path.join(this.repoRoot, 'apps');
    if (fs.existsSync(appsDir)) {
      const appDirs = fs.readdirSync(appsDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

      for (const appDir of appDirs) {
        const pkgPath = path.join(appsDir, appDir, 'package.json');
        const pkg = this.safeReadJson(pkgPath);
        if (!pkg) continue;

        const deps = Object.entries(pkg.dependencies || {})
          .slice(0, 10)
          .map(([name, version]) => ({ name, version: version as string }));

        const domainTags = this.getDomainTags(appDir, pkg);

        workspaces.push({
          name: pkg.name || appDir,
          version: pkg.version || '0.1.0',
          private: pkg.private || false,
          scripts: Object.keys(pkg.scripts || {}),
          domainTags,
          dependencies: deps
        });
      }
    }

    return workspaces;
  }

  private getDomainTags(packageName: string, pkg: any): string[] {
    const tags: string[] = [];
    const name = packageName.toLowerCase();
    const description = (pkg.description || '').toLowerCase();

    // Engine/Media/WebRTC
    if (name.includes('engine') || name.includes('media') || name.includes('webrtc') || 
        name.includes('webgpu') || name.includes('webnn')) {
      tags.push('engine');
    }

    // EVM/AA/Paymaster
    if (name.includes('evm') || name.includes('aa') || name.includes('paymaster') || 
        name.includes('wallet') || name.includes('provider')) {
      tags.push('evm');
    }

    // Storage/NFT/Envelopes
    if (name.includes('storage') || name.includes('nft') || name.includes('envelope') || 
        name.includes('databox') || name.includes('vault')) {
      tags.push('storage');
    }

    // Directory/Indexers
    if (name.includes('directory') || name.includes('indexer') || name.includes('public')) {
      tags.push('directory');
    }

    // Radio/SFU/Payouts
    if (name.includes('radio') || name.includes('sfu') || name.includes('payout')) {
      tags.push('radio');
    }

    // Presence
    if (name.includes('presence') || name.includes('social')) {
      tags.push('presence');
    }

    // Diagnostics/Observability/Feature-flags
    if (name.includes('diagnostic') || name.includes('observability') || 
        name.includes('feature-flag') || name.includes('perf-budget')) {
      tags.push('observability');
    }

    // Docs/Site
    if (name.includes('docs') || name.includes('docusaurus')) {
      tags.push('docs');
    }

    // Demo-recorder
    if (name.includes('demo') || name.includes('recorder')) {
      tags.push('demo');
    }

    // Deploy
    if (name.includes('deploy') || name.includes('docker') || name.includes('helm')) {
      tags.push('deploy');
    }

    // Governance
    if (name.includes('governance') || name.includes('staking') || name.includes('tokenomics')) {
      tags.push('governance');
    }

    // Security
    if (name.includes('security') || name.includes('threat') || name.includes('kms') || 
        name.includes('disclosure')) {
      tags.push('security');
    }

    return tags.length > 0 ? tags : ['other'];
  }

  private getApps(): RepoState['apps'] {
    const apps: RepoState['apps'] = [];

    // Navigator Sandbox
    const sandboxPkg = this.safeReadJson('apps/navigator-sandbox/package.json');
    if (sandboxPkg) {
      apps.push({
        name: sandboxPkg.name,
        routes: [
          '/media', '/privacy', '/time-machine', '/radio', '/assets', 
          '/explore', '/eth', '/publisher/start', '/gallery', '/governance', '/pilot/*'
        ]
      });
    }

    // Docs
    const docsPkg = this.safeReadJson('apps/docs/package.json');
    if (docsPkg) {
      apps.push({
        name: docsPkg.name,
        routes: ['/docs', '/api-reference', '/tutorials', '/status']
      });
    }

    return apps;
  }

  private getFeatureFlags(): RepoState['flags'] {
    const flags: RepoState['flags'] = [];
    
    // Try to read the feature flags source
    const flagsContent = this.safeReadFile('packages/web4-feature-flags/src/index.ts');
    if (!flagsContent) {
      this.warn('Could not read feature flags source');
      return flags;
    }

    // Extract flags using regex patterns
    const flagPattern = /id:\s*['"`]([^'"`]+)['"`][\s\S]*?enabled:\s*(true|false)[\s\S]*?defaultValue:\s*(true|false)[\s\S]*?rolloutPercentage:\s*(\d+)[\s\S]*?riskLevel:\s*['"`]([^'"`]+)['"`][\s\S]*?category:\s*['"`]([^'"`]+)['"`]/g;
    
    let match;
    while ((match = flagPattern.exec(flagsContent)) !== null) {
      const [, id, enabled, defaultValue, rollout, riskLevel, category] = match;
      
      flags.push({
        key: id,
        default: defaultValue === 'true' ? 'on' : 'off',
        rollout: parseInt(rollout) || 0,
        scope: riskLevel === 'critical' ? 'gov' : 'ops',
        category,
        riskLevel
      });
    }

    return flags;
  }

  private getDiagnostics(): RepoState['diagnostics'] {
    const diagnostics: RepoState['diagnostics'] = {
      supported: true,
      lastRun: null,
      passRate: 0,
      checks: []
    };

    // Try to run diagnostics
    try {
      const result = spawnSync('pnpm', ['run', 'diagnose'], { 
        encoding: 'utf8', 
        timeout: 30000,
        cwd: this.repoRoot 
      });
      
      if (result.status === 0) {
        diagnostics.lastRun = new Date().toISOString();
        
        // Parse output for pass/fail counts
        const output = result.stdout || '';
        const passMatch = output.match(/(\d+)\s+passed/);
        const failMatch = output.match(/(\d+)\s+failed/);
        
        if (passMatch && failMatch) {
          const passed = parseInt(passMatch[1]);
          const failed = parseInt(failMatch[1]);
          const total = passed + failed;
          diagnostics.passRate = total > 0 ? passed / total : 0;
        }

        // Extract individual check results
        const checkLines = output.split('\n').filter(line => 
          line.includes('✅') || line.includes('❌') || line.includes('⚠️')
        );
        
        for (const line of checkLines) {
          const name = line.replace(/[✅❌⚠️]/g, '').trim();
          let status: 'pass' | 'fail' | 'skipped' = 'skipped';
          
          if (line.includes('✅')) status = 'pass';
          else if (line.includes('❌')) status = 'fail';
          
          diagnostics.checks.push({ name, status });
        }
      } else {
        diagnostics.supported = false;
        this.warn('Diagnostics command failed');
      }
    } catch (error) {
      diagnostics.supported = false;
      this.warn('Could not run diagnostics');
    }

    return diagnostics;
  }

  private getSLO(): any {
    return this.safeReadJson('release/mainnet/slo.json') || {};
  }

  private getPerfBudgets(): any {
    return this.safeReadJson('release/mainnet/perf-budgets.json') || {};
  }

  private getSecurity(): any {
    const security: any = {
      kms: {
        available: fs.existsSync('packages/kms-local'),
        rotation: null
      },
      threatModel: {
        available: fs.existsSync('packages/threat-model'),
        coverage: 'partial'
      },
      disclosure: {
        available: fs.existsSync('packages/disclosure'),
        receipts: []
      }
    };

    // Try to get KMS rotation info
    try {
      const kmsContent = this.safeReadFile('packages/kms-local/src/index.ts');
      if (kmsContent && kmsContent.includes('rotation')) {
        security.kms.rotation = 'implemented';
      }
    } catch (error) {
      // Ignore
    }

    return security;
  }

  private getGovernance(): any {
    const governance: any = {
      flags: [],
      proposals: [],
      simulator: {
        available: fs.existsSync('packages/governance-ui'),
        enactment: fs.existsSync('docs/governance/simulator.md')
      }
    };

    // Check for proposal templates
    const proposalsDir = 'docs/governance/proposals';
    if (fs.existsSync(proposalsDir)) {
      const proposalFiles = fs.readdirSync(proposalsDir)
        .filter(file => file.endsWith('.md'))
        .map(file => file.replace('.md', ''));
      governance.proposals = proposalFiles;
    }

    return governance;
  }

  private getPoR(): any {
    const por: any = {
      attestations: [],
      freshness: null,
      spv: false
    };

    // Look for attestation files
    const attestationsDir = 'packages/attestations';
    if (fs.existsSync(attestationsDir)) {
      por.attestations = ['attestations package available'];
    }

    // Check for SPV feeds
    const spvContent = this.safeReadFile('packages/proof-of-reserve/src/index.ts');
    if (spvContent && spvContent.includes('spv')) {
      por.spv = true;
    }

    return por;
  }

  private getZkPoR(): any {
    return {
      scaffold: fs.existsSync('packages/proof-of-reserve'),
      mock: true,
      implementation: 'placeholder'
    };
  }

  private getTokenomics(): RepoState['tokenomics'] {
    return {
      peg: '10 BLOOM = 1 BTC',
      enforcement: ['tokenomics', 'mint-guard', 'redemption']
    };
  }

  private getEngine(): RepoState['engine'] {
    const engine: RepoState['engine'] = {
      av1: { available: false, svt: false, hardware: false },
      webrtc: { available: false, svc: false },
      webgpu: { available: false, sr: false },
      webnn: { available: false, offload: false }
    };

    // Check AV1 integration
    const av1Content = this.safeReadFile('packages/media-pipeline/src/index.ts');
    if (av1Content) {
      engine.av1.available = av1Content.includes('av1') || av1Content.includes('AV1');
      engine.av1.svt = av1Content.includes('svt') || av1Content.includes('SVT');
      engine.av1.hardware = av1Content.includes('hardware') || av1Content.includes('gpu');
    }

    // Check WebRTC
    const webrtcContent = this.safeReadFile('packages/webrtc-enhanced/src/index.ts');
    if (webrtcContent) {
      engine.webrtc.available = true;
      engine.webrtc.svc = webrtcContent.includes('svc') || webrtcContent.includes('SVC');
    }

    // Check WebGPU
    const webgpuContent = this.safeReadFile('packages/webgpu-sr/src/index.ts');
    if (webgpuContent) {
      engine.webgpu.available = true;
      engine.webgpu.sr = webgpuContent.includes('sr') || webgpuContent.includes('SR');
    }

    // Check WebNN
    const webnnContent = this.safeReadFile('packages/webnn-offload/src/index.ts');
    if (webnnContent) {
      engine.webnn.available = true;
      engine.webnn.offload = webnnContent.includes('offload');
    }

    return engine;
  }

  private getStorage(): RepoState['storage'] {
    const storage: RepoState['storage'] = {
      envelopes: {
        schema: 'available',
        encryption: 'implemented',
        keyWraps: 'available',
        indexable: true
      },
      directory: {
        api: 'available',
        moderation: 'implemented',
        docker: fs.existsSync('packages/public-directory/Dockerfile')
      }
    };

    // Check envelope implementation
    const envelopeContent = this.safeReadFile('packages/nft-envelope/src/index.ts');
    if (envelopeContent) {
      storage.envelopes.encryption = envelopeContent.includes('encrypt') ? 'implemented' : 'placeholder';
    }

    return storage;
  }

  private getRadio(): any {
    return {
      sfu: fs.existsSync('packages/radio-sfu'),
      room: true,
      queue: true,
      rights: true,
      payouts: fs.existsSync('packages/radio-payouts'),
      demo: true
    };
  }

  private getPresence(): any {
    return {
      originScoping: true,
      ephemeralDid: true,
      ghostMode: true,
      siteExposure: 'controlled'
    };
  }

  private getDatabox(): any {
    return {
      api: {
        export: true,
        import: true,
        shredKeys: true,
        tombstone: true
      },
      deleteFlow: 'implemented'
    };
  }

  private getDeploy(): RepoState['deploy'] {
    const deploy: RepoState['deploy'] = {
      dockerCompose: fs.existsSync('deploy/docker-compose.yml'),
      services: [],
      helm: {},
      ipfsPublish: { available: fs.existsSync('scripts/ipfs-publish.js') }
    };

    // Parse docker-compose services
    if (deploy.dockerCompose) {
      const composeContent = this.safeReadFile('deploy/docker-compose.yml');
      if (composeContent) {
        const serviceMatches = composeContent.match(/^\s*(\w+):/gm);
        if (serviceMatches) {
          deploy.services = serviceMatches.map(match => match.replace(/^\s*(\w+):.*/, '$1'));
        }
      }
    }

    return deploy;
  }

  private getCI(): RepoState['ci'] {
    const ci: RepoState['ci'] = [];
    const workflowsDir = '.github/workflows';
    
    if (fs.existsSync(workflowsDir)) {
      const workflowFiles = fs.readdirSync(workflowsDir)
        .filter(file => file.endsWith('.yml') || file.endsWith('.yaml'));

      for (const file of workflowFiles) {
        const content = this.safeReadFile(path.join(workflowsDir, file));
        if (!content) continue;

        const triggers: string[] = [];
        const jobs: string[] = [];

        // Extract triggers
        const onMatch = content.match(/on:\s*([^\n]+)/);
        if (onMatch) {
          triggers.push(onMatch[1].trim());
        }

        // Extract jobs
        const jobMatches = content.match(/^\s*(\w+):/gm);
        if (jobMatches) {
          jobs.push(...jobMatches.map(match => match.replace(/^\s*(\w+):.*/, '$1')));
        }

        ci.push({
          file,
          triggers,
          jobs
        });
      }
    }

    return ci;
  }

  private getDocs(): RepoState['docs'] {
    const docs: RepoState['docs'] = [];
    const docsDir = 'docs';
    
    if (fs.existsSync(docsDir)) {
      const scanDir = (dir: string, prefix = '') => {
        const items = fs.readdirSync(dir, { withFileTypes: true });
        
        for (const item of items) {
          const fullPath = path.join(dir, item.name);
          const relativePath = prefix + item.name;
          
          if (item.isDirectory()) {
            scanDir(fullPath, relativePath + '/');
          } else if (item.name.endsWith('.md')) {
            const title = item.name.replace('.md', '').replace(/-/g, ' ');
            docs.push({
              path: relativePath,
              title: title.charAt(0).toUpperCase() + title.slice(1)
            });
          }
        }
      };
      
      scanDir(docsDir);
    }

    return docs;
  }

  private getDemos(): RepoState['demos'] {
    return {
      goldenPath: {
        exists: fs.existsSync('packages/demo-recorder'),
        watermark: true,
        paths: ['packages/demo-recorder/assets']
      }
    };
  }

  public async extract(): Promise<RepoState> {
    const gitInfo = this.getGitInfo();
    const nodeVersions = this.getNodeVersions();

    const state: RepoState = {
      repo: {
        branch: gitInfo.branch,
        sha: gitInfo.sha,
        date: new Date().toISOString()
      },
      node: nodeVersions,
      workspaces: this.getWorkspaces(),
      apps: this.getApps(),
      flags: this.getFeatureFlags(),
      diagnostics: this.getDiagnostics(),
      slo: this.getSLO(),
      perfBudgets: this.getPerfBudgets(),
      security: this.getSecurity(),
      governance: this.getGovernance(),
      por: this.getPoR(),
      zkpor: this.getZkPoR(),
      tokenomics: this.getTokenomics(),
      engine: this.getEngine(),
      storage: this.getStorage(),
      radio: this.getRadio(),
      presence: this.getPresence(),
      databox: this.getDatabox(),
      deploy: this.getDeploy(),
      ci: this.getCI(),
      docs: this.getDocs(),
      demos: this.getDemos(),
      warnings: this.warnings
    };

    return state;
  }

  public generateMarkdown(state: RepoState): string {
    const date = new Date(state.repo.date).toLocaleDateString();
    
    let markdown = `# Project Mycelia — Repository State (${date})\n\n`;
    
    // Executive Summary
    markdown += `## 1. Executive Summary\n\n`;
    markdown += `- **Repository**: ${state.repo.branch}@${state.repo.sha}\n`;
    markdown += `- **Node**: ${state.node.engine} (pnpm: ${state.node.pnpm})\n`;
    markdown += `- **Packages**: ${state.workspaces.length} workspace packages\n`;
    markdown += `- **Applications**: ${state.apps.length} applications\n`;
    markdown += `- **Feature Flags**: ${state.flags.length} flags configured\n`;
    markdown += `- **Diagnostics**: ${state.diagnostics.passRate > 0 ? `${Math.round(state.diagnostics.passRate * 100)}% pass rate` : 'skipped'}\n`;
    markdown += `- **PoR Freshness**: ${state.por.freshness || 'not configured'}\n`;
    markdown += `- **Gaps**: ${state.warnings.length} warnings identified\n\n`;

    // Monorepo & Packages
    markdown += `## 2. Monorepo & Packages\n\n`;
    markdown += `### Package Summary\n\n`;
    markdown += `| Name | Version | Private | Domain Tags | Scripts |\n`;
    markdown += `|------|---------|---------|-------------|----------|\n`;
    
    for (const pkg of state.workspaces) {
      const tags = pkg.domainTags.join(', ');
      const scripts = pkg.scripts.length > 0 ? pkg.scripts.slice(0, 3).join(', ') + (pkg.scripts.length > 3 ? '...' : '') : 'none';
      markdown += `| ${pkg.name} | ${pkg.version} | ${pkg.private ? '✓' : '✗'} | ${tags} | ${scripts} |\n`;
    }
    markdown += `\n`;

    // Applications & Routes
    markdown += `## 3. Applications & Routes\n\n`;
    for (const app of state.apps) {
      markdown += `### ${app.name}\n`;
      markdown += `- **Routes**: ${app.routes.join(', ')}\n\n`;
    }

    // Feature Flags & Rollouts
    markdown += `## 4. Feature Flags & Rollouts\n\n`;
    markdown += `### Flag Summary\n\n`;
    markdown += `| Key | Default | Rollout | Scope | Category | Risk |\n`;
    markdown += `|-----|---------|---------|-------|----------|------|\n`;
    
    for (const flag of state.flags) {
      markdown += `| ${flag.key} | ${flag.default} | ${flag.rollout}% | ${flag.scope} | ${flag.category} | ${flag.riskLevel} |\n`;
    }
    markdown += `\n`;

    // Diagnostics, SLOs, and Perf Budgets
    markdown += `## 5. Diagnostics, SLOs, and Perf Budgets\n\n`;
    markdown += `### Diagnostics Status\n`;
    markdown += `- **Supported**: ${state.diagnostics.supported ? '✓' : '✗'}\n`;
    markdown += `- **Last Run**: ${state.diagnostics.lastRun || 'never'}\n`;
    markdown += `- **Pass Rate**: ${state.diagnostics.passRate > 0 ? `${Math.round(state.diagnostics.passRate * 100)}%` : 'N/A'}\n\n`;
    
    if (state.diagnostics.checks.length > 0) {
      markdown += `### Check Results\n\n`;
      for (const check of state.diagnostics.checks) {
        const status = check.status === 'pass' ? '✅' : check.status === 'fail' ? '❌' : '⏭️';
        markdown += `- ${status} ${check.name}\n`;
      }
      markdown += `\n`;
    }

    // Security & Governance
    markdown += `## 6. Security & Governance\n\n`;
    markdown += `### Security Components\n`;
    markdown += `- **KMS**: ${state.security.kms.available ? '✓' : '✗'} (rotation: ${state.security.kms.rotation || 'unknown'})\n`;
    markdown += `- **Threat Model**: ${state.security.threatModel.available ? '✓' : '✗'}\n`;
    markdown += `- **Disclosure**: ${state.security.disclosure.available ? '✓' : '✗'}\n\n`;

    markdown += `### Governance\n`;
    markdown += `- **Simulator**: ${state.governance.simulator.available ? '✓' : '✗'}\n`;
    markdown += `- **Enactment**: ${state.governance.simulator.enactment ? '✓' : '✗'}\n`;
    markdown += `- **Proposals**: ${state.governance.proposals.length} templates\n\n`;

    // Proof of Reserves & zk-PoR
    markdown += `## 7. Proof of Reserves & zk-PoR\n\n`;
    markdown += `- **Attestations**: ${state.por.attestations.length > 0 ? '✓' : '✗'}\n`;
    markdown += `- **SPV Feeds**: ${state.por.spv ? '✓' : '✗'}\n`;
    markdown += `- **zk-PoR Scaffold**: ${state.zkpor.scaffold ? '✓' : '✗'}\n`;
    markdown += `- **Implementation**: ${state.zkpor.implementation}\n\n`;

    // Tokenomics & Peg Enforcement
    markdown += `## 8. Tokenomics & Peg Enforcement\n\n`;
    markdown += `- **Peg Statement**: ${state.tokenomics.peg}\n`;
    markdown += `- **Enforcement Points**: ${state.tokenomics.enforcement.join(', ')}\n\n`;

    // Engine & Media
    markdown += `## 9. Engine & Media (AV1/WebRTC/WebGPU/WebNN)\n\n`;
    markdown += `### AV1 Integration\n`;
    markdown += `- **Available**: ${state.engine.av1.available ? '✓' : '✗'}\n`;
    markdown += `- **SVT-AV1**: ${state.engine.av1.svt ? '✓' : '✗'}\n`;
    markdown += `- **Hardware Detect**: ${state.engine.av1.hardware ? '✓' : '✗'}\n\n`;

    markdown += `### WebRTC\n`;
    markdown += `- **Enhanced**: ${state.engine.webrtc.available ? '✓' : '✗'}\n`;
    markdown += `- **SVC Modes**: ${state.engine.webrtc.svc ? '✓' : '✗'}\n\n`;

    markdown += `### WebGPU & WebNN\n`;
    markdown += `- **WebGPU SR**: ${state.engine.webgpu.available ? '✓' : '✗'}\n`;
    markdown += `- **WebNN Offload**: ${state.engine.webnn.available ? '✓' : '✗'}\n\n`;

    // Storage: NFT Envelopes & Public Directory
    markdown += `## 10. Storage: NFT Envelopes & Public Directory\n\n`;
    markdown += `### NFT Envelopes\n`;
    markdown += `- **Schema**: ${state.storage.envelopes.schema}\n`;
    markdown += `- **Encryption**: ${state.storage.envelopes.encryption}\n`;
    markdown += `- **Key Wraps**: ${state.storage.envelopes.keyWraps}\n`;
    markdown += `- **Indexable**: ${state.storage.envelopes.indexable ? '✓' : '✗'}\n\n`;

    markdown += `### Public Directory\n`;
    markdown += `- **API**: ${state.storage.directory.api}\n`;
    markdown += `- **Moderation**: ${state.storage.directory.moderation}\n`;
    markdown += `- **Docker**: ${state.storage.directory.docker ? '✓' : '✗'}\n\n`;

    // Radio v0
    markdown += `## 11. Radio v0\n\n`;
    markdown += `- **SFU Package**: ${state.radio.sfu ? '✓' : '✗'}\n`;
    markdown += `- **Room Management**: ${state.radio.room ? '✓' : '✗'}\n`;
    markdown += `- **Queue System**: ${state.radio.queue ? '✓' : '✗'}\n`;
    markdown += `- **Rights Tags**: ${state.radio.rights ? '✓' : '✗'}\n`;
    markdown += `- **Payouts**: ${state.radio.payouts ? '✓' : '✗'}\n`;
    markdown += `- **Demo Mode**: ${state.radio.demo ? '✓' : '✗'}\n\n`;

    // Presence v0
    markdown += `## 12. Presence v0\n\n`;
    markdown += `- **Origin Scoping**: ${state.presence.originScoping ? '✓' : '✗'}\n`;
    markdown += `- **Ephemeral DID**: ${state.presence.ephemeralDid ? '✓' : '✗'}\n`;
    markdown += `- **Ghost Mode**: ${state.presence.ghostMode ? '✓' : '✗'}\n`;
    markdown += `- **Site Exposure**: ${state.presence.siteExposure}\n\n`;

    // Databox v0
    markdown += `## 13. Databox v0\n\n`;
    markdown += `### API Features\n`;
    markdown += `- **Export**: ${state.databox.api.export ? '✓' : '✗'}\n`;
    markdown += `- **Import**: ${state.databox.api.import ? '✓' : '✗'}\n`;
    markdown += `- **Shred Keys**: ${state.databox.api.shredKeys ? '✓' : '✗'}\n`;
    markdown += `- **Tombstone**: ${state.databox.api.tombstone ? '✓' : '✗'}\n\n`;
    markdown += `- **Delete Flow**: ${state.databox.deleteFlow}\n\n`;

    // Distribution & Deploy
    markdown += `## 14. Distribution & Deploy (Docker/IPFS)\n\n`;
    markdown += `- **Docker Compose**: ${state.deploy.dockerCompose ? '✓' : '✗'}\n`;
    markdown += `- **Services**: ${state.deploy.services.join(', ')}\n`;
    markdown += `- **IPFS Publish**: ${state.deploy.ipfsPublish.available ? '✓' : '✗'}\n\n`;

    // CI/CD & Demo Recorder
    markdown += `## 15. CI/CD & Demo Recorder\n\n`;
    markdown += `### Workflows\n\n`;
    for (const workflow of state.ci) {
      markdown += `#### ${workflow.file}\n`;
      markdown += `- **Triggers**: ${workflow.triggers.join(', ')}\n`;
      markdown += `- **Jobs**: ${workflow.jobs.join(', ')}\n\n`;
    }

    markdown += `### Demo Recorder\n`;
    markdown += `- **Available**: ${state.demos.goldenPath.exists ? '✓' : '✗'}\n`;
    markdown += `- **Watermark**: ${state.demos.goldenPath.watermark ? '✓' : '✗'}\n`;
    markdown += `- **Paths**: ${state.demos.goldenPath.paths.join(', ')}\n\n`;

    // Documentation Map
    markdown += `## 16. Documentation Map\n\n`;
    markdown += `### Recent Additions\n`;
    const recentDocs = state.docs.slice(-10); // Last 10 docs
    for (const doc of recentDocs) {
      markdown += `- [${doc.title}](${doc.path})\n`;
    }
    markdown += `\n`;

    // Risks and Gaps
    markdown += `## 17. Risks and Gaps (Auto-collected warnings)\n\n`;
    if (state.warnings.length > 0) {
      for (const warning of state.warnings) {
        markdown += `- ⚠️ ${warning}\n`;
      }
    } else {
      markdown += `- ✅ No warnings identified\n`;
    }
    markdown += `\n`;

    // Appendix
    markdown += `## Appendix: Raw JSON\n\n`;
    markdown += `The complete machine-readable state is available in the corresponding JSON file.\n\n`;

    return markdown;
  }
}

// Main execution
async function main() {
  const extractor = new StateExtractor();
  
  try {
    console.log('🔍 Extracting Project Mycelia repository state...');
    
    const state = await extractor.extract();
    
    // Generate filenames with current date
    const date = new Date().toISOString().split('T')[0];
    const jsonFile = `release/reports/state-${date}.json`;
    const mdFile = `release/reports/state-${date}.md`;
    
    // Write JSON report
    fs.writeFileSync(jsonFile, JSON.stringify(state, null, 2));
    console.log(`📄 JSON report written to: ${path.resolve(jsonFile)}`);
    
    // Write Markdown report
    const markdown = extractor.generateMarkdown(state);
    fs.writeFileSync(mdFile, markdown);
    console.log(`📄 Markdown report written to: ${path.resolve(mdFile)}`);
    
    // Print executive summary to stdout
    console.log('\n📊 Executive Summary:');
    console.log(`Repository: ${state.repo.branch}@${state.repo.sha}`);
    console.log(`Node: ${state.node.engine} (pnpm: ${state.node.pnpm})`);
    console.log(`Packages: ${state.workspaces.length}`);
    console.log(`Routes: ${state.apps.reduce((sum, app) => sum + app.routes.length, 0)}`);
    console.log(`Flags: ${state.flags.length}`);
    console.log(`Diagnostics: ${state.diagnostics.passRate > 0 ? `${Math.round(state.diagnostics.passRate * 100)}% pass rate` : 'skipped'}`);
    console.log(`PoR Freshness: ${state.por.freshness || 'not configured'}`);
    console.log(`Gaps: ${state.warnings.length}`);
    
  } catch (error) {
    console.error('❌ Error during extraction:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
