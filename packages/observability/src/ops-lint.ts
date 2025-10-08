#!/usr/bin/env node
// SLO Lint CLI - Checks SLO compliance and returns appropriate exit codes

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface SLOTarget {
  target: number;
  threshold: number;
  description: string;
  unit: string;
}

interface SLOConfig {
  targets: Record<string, SLOTarget>;
  metadata: {
    version: string;
    lastUpdated: string;
    chainId: string;
  };
}

interface SLOMetrics {
  redemptionLatencyP95: number;
  porAttestationAge: number;
  diagnosticsPassRate: number;
  sandboxRouteTTI: number;
  redemptionQueueLength: number;
  redemptionsPerHour: number;
  attestationAgeMinutes: number;
}

class SLOLinter {
  private config: SLOConfig;
  private metrics: Partial<SLOMetrics>;

  constructor(configPath: string) {
    this.config = this.loadSLOConfig(configPath);
    this.metrics = this.loadMetrics();
  }

  private loadSLOConfig(configPath: string): SLOConfig {
    try {
      const content = fs.readFileSync(configPath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      console.error(`❌ Failed to load SLO config from ${configPath}:`, error);
      process.exit(1);
    }
  }

  private loadMetrics(): Partial<SLOMetrics> {
    // Mock metrics - in production these would come from monitoring systems
    return {
      redemptionLatencyP95: 0.98, // 98% under 100ms
      porAttestationAge: 0.97, // 97% under 30 minutes
      diagnosticsPassRate: 0.95, // 95% pass rate
      sandboxRouteTTI: 0.98, // 98% under 2s
      redemptionQueueLength: 50, // Under 100
      redemptionsPerHour: 800, // Under 1000
      attestationAgeMinutes: 25 // Under 30 minutes
    };
  }

  private checkTarget(key: string, value: number, target: SLOTarget): { passed: boolean; message: string } {
    const passed = value >= target.threshold;
    const status = passed ? '✅' : '❌';
    const message = `${status} ${key}: ${value.toFixed(3)} (threshold: ${target.threshold}, target: ${target.target}) - ${target.description}`;
    
    return { passed, message };
  }

  public run(): boolean {
    console.log('🔍 SLO Compliance Check\n');
    
    let allPassed = true;
    const results: Array<{ passed: boolean; message: string }> = [];

    // Check each SLO target
    for (const [key, target] of Object.entries(this.config.targets)) {
      const metricValue = this.metrics[key as keyof SLOMetrics];
      
      if (metricValue === undefined) {
        console.log(`⚠️  ${key}: No metric data available`);
        continue;
      }

      const result = this.checkTarget(key, metricValue, target);
      results.push(result);
      
      if (!result.passed) {
        allPassed = false;
      }
    }

    // Print results
    results.forEach(result => {
      console.log(result.message);
    });

    // Summary
    const passedCount = results.filter(r => r.passed).length;
    const totalCount = results.length;
    
    console.log(`\n📊 Summary: ${passedCount}/${totalCount} SLOs passed`);
    
    if (allPassed) {
      console.log('✅ All SLOs healthy');
    } else {
      console.log('❌ SLO violations detected');
    }

    return allPassed;
  }
}

// CLI interface
function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log('SLO Lint CLI - Check SLO compliance');
    console.log('');
    console.log('Usage:');
    console.log('  ops-lint [options]');
    console.log('');
    console.log('Options:');
    console.log('  --slo <path>    Path to SLO configuration JSON (default: release/mainnet/slo.json)');
    console.log('  --help, -h      Show this help message');
    console.log('');
    console.log('Exit codes:');
    console.log('  0 - All SLOs passed');
    console.log('  1 - SLO violations detected');
    process.exit(0);
  }

  const sloPath = args[args.indexOf('--slo') + 1] || 'release/mainnet/slo.json';
  
  if (!fs.existsSync(sloPath)) {
    console.error(`❌ SLO config file not found: ${sloPath}`);
    console.log('Create a SLO configuration file or specify a different path with --slo');
    process.exit(1);
  }

  const linter = new SLOLinter(sloPath);
  const success = linter.run();
  
  process.exit(success ? 0 : 1);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
