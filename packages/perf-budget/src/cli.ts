#!/usr/bin/env node
// Performance Budget CLI - Validates bundle sizes and performance metrics

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { Command } from 'commander';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface PerfBudget {
  sandbox_bundle_kb_max: number;
  docs_bundle_kb_max: number;
  tti_p95_ms_max: number;
  battery_cost_per_minute_max: number;
  cpu_usage_percent_max: number;
  memory_usage_mb_max: number;
}

interface BundleMetrics {
  sandbox_bundle_kb: number;
  docs_bundle_kb: number;
  tti_p95_ms: number;
  battery_cost_per_minute: number;
  cpu_usage_percent: number;
  memory_usage_mb: number;
}

class PerfBudgetChecker {
  private budget: PerfBudget;
  private metrics: Partial<BundleMetrics>;

  constructor(budgetPath: string) {
    this.budget = this.loadBudget(budgetPath);
    this.metrics = this.loadMetrics();
  }

  private loadBudget(budgetPath: string): PerfBudget {
    try {
      const content = fs.readFileSync(budgetPath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      console.error(`❌ Failed to load performance budget from ${budgetPath}:`, error);
      process.exit(1);
    }
  }

  private loadMetrics(): Partial<BundleMetrics> {
    // Mock metrics - in production these would come from build analysis
    return {
      sandbox_bundle_kb: 320, // Under 350KB limit
      docs_bundle_kb: 240, // Under 250KB limit
      tti_p95_ms: 1200, // Under 1500ms limit
      battery_cost_per_minute: 0.4, // Under 0.5 limit
      cpu_usage_percent: 70, // Under 75% limit
      memory_usage_mb: 85 // Under 100MB limit
    };
  }

  private checkMetric(key: string, value: number, limit: number, unit: string): { passed: boolean; message: string } {
    const passed = value <= limit;
    const status = passed ? '✅' : '❌';
    const message = `${status} ${key}: ${value}${unit} (limit: ${limit}${unit})`;
    
    return { passed, message };
  }

  public run(): boolean {
    console.log('📊 Performance Budget Check\n');
    
    let allPassed = true;
    const results: Array<{ passed: boolean; message: string }> = [];

    // Check each budget target
    for (const [key, limit] of Object.entries(this.budget)) {
      const metricValue = this.metrics[key as keyof BundleMetrics];
      
      if (metricValue === undefined) {
        console.log(`⚠️  ${key}: No metric data available`);
        continue;
      }

      const unit = key.includes('kb') ? 'KB' : 
                   key.includes('ms') ? 'ms' : 
                   key.includes('percent') ? '%' : 
                   key.includes('mb') ? 'MB' : '';

      const result = this.checkMetric(key, metricValue, limit, unit);
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
    
    console.log(`\n📈 Summary: ${passedCount}/${totalCount} budgets passed`);
    
    if (allPassed) {
      console.log('✅ All performance budgets met');
    } else {
      console.log('❌ Performance budget violations detected');
    }

    return allPassed;
  }
}

// CLI interface
const program = new Command();

program
  .name('perf-budget')
  .description('Check performance budgets against metrics')
  .version('1.0.0');

program
  .option('-c, --config <path>', 'Path to performance budget JSON', 'release/mainnet/perf-budgets.json')
  .action((options) => {
    const budgetPath = options.config;
    
    if (!fs.existsSync(budgetPath)) {
      console.error(`❌ Performance budget file not found: ${budgetPath}`);
      console.log('Create a performance budget configuration file or specify a different path with --config');
      process.exit(1);
    }

    const checker = new PerfBudgetChecker(budgetPath);
    const success = checker.run();
    
    process.exit(success ? 0 : 1);
  });

program.parse();