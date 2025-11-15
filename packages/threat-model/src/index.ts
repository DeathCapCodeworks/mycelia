#!/usr/bin/env node
// Threat Model package for Mycelia - STRIDE analysis and risk management

export enum STRIDE {
  SPOOFING = 'Spoofing',
  TAMPERING = 'Tampering',
  REPUDIATION = 'Repudiation',
  INFORMATION_DISCLOSURE = 'Information Disclosure',
  DENIAL_OF_SERVICE = 'Denial of Service',
  ELEVATION_OF_PRIVILEGE = 'Elevation of Privilege'
}

export enum RiskLevel {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High',
  CRITICAL = 'Critical'
}

export interface Threat {
  id: string;
  title: string;
  description: string;
  category: STRIDE;
  severity: RiskLevel;
  mitigation: string;
  owner: string;
  status?: 'Open' | 'Mitigated' | 'Accepted';
  lastReviewed?: string;
}

export interface ThreatModel {
  component: string;
  threats: Threat[];
}

export class ThreatModelBuilder {
  private component: string;
  private threats: Threat[] = [];

  constructor(component: string) {
    this.component = component;
  }

  addThreat(category: STRIDE, threat: Omit<Threat, 'category'>): this {
    this.threats.push({
      ...threat,
      category,
      status: threat.status || 'Open',
      lastReviewed: threat.lastReviewed || new Date().toISOString()
    });
    return this;
  }

  build(): ThreatModel {
    return {
      component: this.component,
      threats: this.threats
    };
  }
}

export function createThreatModel(component: string): ThreatModelBuilder {
  return new ThreatModelBuilder(component);
}

export interface RiskRegister {
  version: string;
  generatedAt: string;
  components: ThreatModel[];
  totalThreats: number;
  riskDistribution: Record<RiskLevel, number>;
  highRiskCount: number;
  criticalRiskCount: number;
}

export function generateRiskRegister(models: ThreatModel[]): RiskRegister {
  const allThreats = models.flatMap(m => m.threats);
  const riskDistribution = {
    [RiskLevel.LOW]: 0,
    [RiskLevel.MEDIUM]: 0,
    [RiskLevel.HIGH]: 0,
    [RiskLevel.CRITICAL]: 0
  };

  allThreats.forEach(threat => {
    riskDistribution[threat.severity]++;
  });

  return {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    components: models,
    totalThreats: allThreats.length,
    riskDistribution,
    highRiskCount: riskDistribution[RiskLevel.HIGH],
    criticalRiskCount: riskDistribution[RiskLevel.CRITICAL]
  };
}

export function generateMarkdownReport(models: ThreatModel[]): string {
  const register = generateRiskRegister(models);
  
  let markdown = `# Threat Model Report\n\n`;
  markdown += `**Generated:** ${register.generatedAt}\n`;
  markdown += `**Version:** ${register.version}\n\n`;
  
  markdown += `## Risk Summary\n\n`;
  markdown += `- **Total Threats:** ${register.totalThreats}\n`;
  markdown += `- **High Risk:** ${register.highRiskCount}\n`;
  markdown += `- **Critical Risk:** ${register.criticalRiskCount}\n\n`;
  
  markdown += `## Risk Distribution\n\n`;
  Object.entries(register.riskDistribution).forEach(([level, count]) => {
    markdown += `- **${level}:** ${count}\n`;
  });
  markdown += `\n`;
  
  markdown += `## Component Analysis\n\n`;
  
  models.forEach(model => {
    markdown += `### ${model.component}\n\n`;
    
    // Group threats by STRIDE category
    const threatsByCategory = model.threats.reduce((acc, threat) => {
      if (!acc[threat.category]) {
        acc[threat.category] = [];
      }
      acc[threat.category].push(threat);
      return acc;
    }, {} as Record<STRIDE, Threat[]>);
    
    Object.entries(threatsByCategory).forEach(([category, threats]) => {
      markdown += `#### ${category}\n\n`;
      
      threats.forEach(threat => {
        markdown += `**${threat.id}: ${threat.title}** (${threat.severity})\n\n`;
        markdown += `*Description:* ${threat.description}\n\n`;
        markdown += `*Mitigation:* ${threat.mitigation}\n\n`;
        markdown += `*Owner:* ${threat.owner}\n\n`;
        markdown += `*Status:* ${threat.status}\n\n`;
        markdown += `---\n\n`;
      });
    });
  });
  
  return markdown;
}

// Pre-defined threat models for Mycelia components
export function createChainThreatModel(): ThreatModel {
  return createThreatModel('Chain')
    .addThreat(STRIDE.SPOOFING, {
      id: 'CHAIN-001',
      title: 'Validator Identity Spoofing',
      description: 'Malicious actor impersonates legitimate validator',
      severity: RiskLevel.HIGH,
      mitigation: 'Cryptographic validator keys and reputation system',
      owner: 'Consensus Team'
    })
    .addThreat(STRIDE.TAMPERING, {
      id: 'CHAIN-002',
      title: 'Block Data Tampering',
      description: 'Attacker modifies block data or transactions',
      severity: RiskLevel.CRITICAL,
      mitigation: 'Cryptographic hashing and consensus validation',
      owner: 'Consensus Team'
    })
    .addThreat(STRIDE.DENIAL_OF_SERVICE, {
      id: 'CHAIN-003',
      title: 'Network DoS Attack',
      description: 'Attacker floods network with invalid transactions',
      severity: RiskLevel.HIGH,
      mitigation: 'Rate limiting and transaction fees',
      owner: 'Network Team'
    })
    .build();
}

export function createWalletThreatModel(): ThreatModel {
  return createThreatModel('Wallet')
    .addThreat(STRIDE.SPOOFING, {
      id: 'WALLET-001',
      title: 'Private Key Theft',
      description: 'Attacker gains access to user private keys',
      severity: RiskLevel.CRITICAL,
      mitigation: 'Hardware security modules and encrypted storage',
      owner: 'Security Team'
    })
    .addThreat(STRIDE.TAMPERING, {
      id: 'WALLET-002',
      title: 'Transaction Tampering',
      description: 'Attacker modifies transaction data before signing',
      severity: RiskLevel.HIGH,
      mitigation: 'Transaction verification and user confirmation',
      owner: 'Wallet Team'
    })
    .addThreat(STRIDE.INFORMATION_DISCLOSURE, {
      id: 'WALLET-003',
      title: 'Balance Information Leakage',
      description: 'User balance information exposed to unauthorized parties',
      severity: RiskLevel.MEDIUM,
      mitigation: 'Privacy-preserving balance queries',
      owner: 'Privacy Team'
    })
    .build();
}

export function createOracleThreatModel(): ThreatModel {
  return createThreatModel('Oracle')
    .addThreat(STRIDE.SPOOFING, {
      id: 'ORACLE-001',
      title: 'Oracle Data Spoofing',
      description: 'Malicious oracle provides false data',
      severity: RiskLevel.HIGH,
      mitigation: 'Multiple oracle sources and reputation system',
      owner: 'Oracle Team'
    })
    .addThreat(STRIDE.TAMPERING, {
      id: 'ORACLE-002',
      title: 'Data Feed Tampering',
      description: 'Attacker modifies oracle data feeds',
      severity: RiskLevel.HIGH,
      mitigation: 'Cryptographic signatures and data validation',
      owner: 'Oracle Team'
    })
    .addThreat(STRIDE.DENIAL_OF_SERVICE, {
      id: 'ORACLE-003',
      title: 'Oracle Service Disruption',
      description: 'Oracle service becomes unavailable',
      severity: RiskLevel.MEDIUM,
      mitigation: 'Redundant oracle sources and fallback mechanisms',
      owner: 'Infrastructure Team'
    })
    .build();
}

export function createRewardsThreatModel(): ThreatModel {
  return createThreatModel('Rewards')
    .addThreat(STRIDE.TAMPERING, {
      id: 'REWARDS-001',
      title: 'Reward Calculation Manipulation',
      description: 'Attacker manipulates reward calculations',
      severity: RiskLevel.HIGH,
      mitigation: 'Transparent reward formulas and audit trails',
      owner: 'Rewards Team'
    })
    .addThreat(STRIDE.REPUDIATION, {
      id: 'REWARDS-002',
      title: 'Reward Payment Denial',
      description: 'System denies legitimate reward payments',
      severity: RiskLevel.MEDIUM,
      mitigation: 'Immutable reward records and dispute resolution',
      owner: 'Rewards Team'
    })
    .addThreat(STRIDE.ELEVATION_OF_PRIVILEGE, {
      id: 'REWARDS-003',
      title: 'Unauthorized Reward Access',
      description: 'Attacker gains unauthorized access to reward system',
      severity: RiskLevel.HIGH,
      mitigation: 'Access controls and privilege separation',
      owner: 'Security Team'
    })
    .build();
}

export function createSocialGraphThreatModel(): ThreatModel {
  return createThreatModel('Social Graph')
    .addThreat(STRIDE.INFORMATION_DISCLOSURE, {
      id: 'GRAPH-001',
      title: 'Social Graph Data Leakage',
      description: 'User social connections exposed without consent',
      severity: RiskLevel.MEDIUM,
      mitigation: 'Privacy controls and data encryption',
      owner: 'Privacy Team'
    })
    .addThreat(STRIDE.TAMPERING, {
      id: 'GRAPH-002',
      title: 'Graph Data Manipulation',
      description: 'Attacker modifies social graph relationships',
      severity: RiskLevel.MEDIUM,
      mitigation: 'Cryptographic verification of graph updates',
      owner: 'Social Graph Team'
    })
    .addThreat(STRIDE.SPOOFING, {
      id: 'GRAPH-003',
      title: 'Identity Impersonation',
      description: 'Attacker impersonates user in social graph',
      severity: RiskLevel.HIGH,
      mitigation: 'Decentralized identity verification',
      owner: 'Identity Team'
    })
    .build();
}

export function createStakingThreatModel(): ThreatModel {
  return createThreatModel('Staking')
    .addThreat(STRIDE.TAMPERING, {
      id: 'STAKING-001',
      title: 'Stake Manipulation',
      description: 'Attacker manipulates stake amounts or delegations',
      severity: RiskLevel.CRITICAL,
      mitigation: 'Cryptographic stake records and validation',
      owner: 'Staking Team'
    })
    .addThreat(STRIDE.DENIAL_OF_SERVICE, {
      id: 'STAKING-002',
      title: 'Staking Service Disruption',
      description: 'Staking service becomes unavailable',
      severity: RiskLevel.HIGH,
      mitigation: 'Decentralized staking and redundancy',
      owner: 'Infrastructure Team'
    })
    .addThreat(STRIDE.ELEVATION_OF_PRIVILEGE, {
      id: 'STAKING-003',
      title: 'Unauthorized Staking Access',
      description: 'Attacker gains unauthorized access to staking system',
      severity: RiskLevel.HIGH,
      mitigation: 'Access controls and multi-signature requirements',
      owner: 'Security Team'
    })
    .build();
}

export function createRedemptionThreatModel(): ThreatModel {
  return createThreatModel('Redemption')
    .addThreat(STRIDE.TAMPERING, {
      id: 'REDEMPTION-001',
      title: 'HTLC Manipulation',
      description: 'Attacker manipulates HTLC parameters or timing',
      severity: RiskLevel.CRITICAL,
      mitigation: 'Cryptographic HTLC validation and time locks',
      owner: 'Redemption Team'
    })
    .addThreat(STRIDE.SPOOFING, {
      id: 'REDEMPTION-002',
      title: 'Redemption Request Spoofing',
      description: 'Attacker creates unauthorized redemption requests',
      severity: RiskLevel.HIGH,
      mitigation: 'Signed redemption intents and rate limiting',
      owner: 'Security Team'
    })
    .addThreat(STRIDE.DENIAL_OF_SERVICE, {
      id: 'REDEMPTION-003',
      title: 'Redemption Service Disruption',
      description: 'Redemption service becomes unavailable',
      severity: RiskLevel.HIGH,
      mitigation: 'Decentralized redemption and fallback mechanisms',
      owner: 'Infrastructure Team'
    })
    .build();
}

// CLI implementation
import { Command } from 'commander';
import { promises as fs } from 'fs';

export const program = new Command();

program
  .name('mycelia-threat')
  .description('Mycelia Threat Model CLI')
  .version('1.0.0');

program
  .command('generate')
  .description('Generate threat model report')
  .option('-o, --output <file>', 'Output file path')
  .option('-f, --format <format>', 'Output format (json|md)', 'md')
  .action(async (options) => {
    const models = [
      createChainThreatModel(),
      createWalletThreatModel(),
      createOracleThreatModel(),
      createRewardsThreatModel(),
      createSocialGraphThreatModel(),
      createStakingThreatModel(),
      createRedemptionThreatModel()
    ];

    if (options.format === 'json') {
      const register = generateRiskRegister(models);
      const output = JSON.stringify(register, null, 2);
      
      if (options.output) {
        await fs.writeFile(options.output, output);
        console.log(`Risk register written to ${options.output}`);
      } else {
        console.log(output);
      }
    } else {
      const markdown = generateMarkdownReport(models);
      
      if (options.output) {
        await fs.writeFile(options.output, markdown);
        console.log(`Threat model report written to ${options.output}`);
      } else {
        console.log(markdown);
      }
    }
  });

program
  .command('validate')
  .description('Validate threat model completeness')
  .action(() => {
    const models = [
      createChainThreatModel(),
      createWalletThreatModel(),
      createOracleThreatModel(),
      createRewardsThreatModel(),
      createSocialGraphThreatModel(),
      createStakingThreatModel(),
      createRedemptionThreatModel()
    ];

    const register = generateRiskRegister(models);
    
    console.log('Threat Model Validation Report');
    console.log('==============================');
    console.log(`Total Components: ${register.components.length}`);
    console.log(`Total Threats: ${register.totalThreats}`);
    console.log(`High Risk: ${register.highRiskCount}`);
    console.log(`Critical Risk: ${register.criticalRiskCount}`);
    
    if (register.criticalRiskCount > 0) {
      console.log('\n⚠️  Critical risks require immediate attention');
      process.exit(1);
    } else {
      console.log('\n✅ Threat model validation passed');
    }
  });

if (import.meta.url === `file://${process.argv[1]}`) {
  program.parse();
}
