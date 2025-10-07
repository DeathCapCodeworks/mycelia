// Performance Budget CLI - Bundle size and TTI enforcement

import * as fs from 'fs';
import * as path from 'path';
import { Command } from 'commander';

export interface PerformanceBudgets {
  sandbox_bundle_kb_max: number;
  docs_bundle_kb_max: number;
  tti_p95_ms_max: number;
  battery_cost_per_minute_max: number;
  cpu_usage_percent_max: number;
  memory_usage_mb_max: number;
}

export interface BundleStats {
  name: string;
  size_kb: number;
  gzip_size_kb: number;
  chunks: number;
  assets: number;
}

export interface PerformanceMetrics {
  tti_p95_ms: number;
  battery_cost_per_minute: number;
  cpu_usage_percent: number;
  memory_usage_mb: number;
  lighthouse_score: number;
}

export interface BudgetReport {
  passed: boolean;
  budgets: PerformanceBudgets;
  bundle_stats: BundleStats[];
  performance_metrics: PerformanceMetrics;
  violations: BudgetViolation[];
  summary: string;
}

export interface BudgetViolation {
  metric: string;
  actual: number;
  budget: number;
  severity: 'warning' | 'error';
  message: string;
}

export class PerformanceBudgetChecker {
  private budgets: PerformanceBudgets;

  constructor(budgetsPath: string) {
    this.budgets = this.loadBudgets(budgetsPath);
  }

  private loadBudgets(budgetsPath: string): PerformanceBudgets {
    try {
      const budgetsData = fs.readFileSync(budgetsPath, 'utf-8');
      return JSON.parse(budgetsData);
    } catch (error) {
      console.error('Failed to load performance budgets:', error);
      process.exit(1);
    }
  }

  checkBundleStats(bundleStatsPath: string): BundleStats[] {
    try {
      const statsData = fs.readFileSync(bundleStatsPath, 'utf-8');
      const stats = JSON.parse(statsData);
      
      // Convert webpack/vite stats to our format
      const bundles: BundleStats[] = [];
      
      if (stats.assets) {
        // Webpack format
        let totalSize = 0;
        let totalGzipSize = 0;
        
        stats.assets.forEach((asset: any) => {
          totalSize += asset.size;
          if (asset.gzipSize) {
            totalGzipSize += asset.gzipSize;
          }
        });

        bundles.push({
          name: 'sandbox',
          size_kb: Math.round(totalSize / 1024),
          gzip_size_kb: Math.round(totalGzipSize / 1024),
          chunks: stats.chunks?.length || 0,
          assets: stats.assets?.length || 0
        });
      } else if (stats.bundles) {
        // Vite format
        stats.bundles.forEach((bundle: any) => {
          bundles.push({
            name: bundle.name || 'unknown',
            size_kb: Math.round(bundle.size / 1024),
            gzip_size_kb: Math.round((bundle.gzipSize || bundle.size) / 1024),
            chunks: bundle.chunks?.length || 1,
            assets: bundle.assets?.length || 1
          });
        });
      }

      return bundles;
    } catch (error) {
      console.error('Failed to load bundle stats:', error);
      return [];
    }
  }

  checkPerformanceMetrics(metricsPath: string): PerformanceMetrics {
    try {
      const metricsData = fs.readFileSync(metricsPath, 'utf-8');
      const metrics = JSON.parse(metricsData);
      
      return {
        tti_p95_ms: metrics.tti_p95_ms || 0,
        battery_cost_per_minute: metrics.battery_cost_per_minute || 0,
        cpu_usage_percent: metrics.cpu_usage_percent || 0,
        memory_usage_mb: metrics.memory_usage_mb || 0,
        lighthouse_score: metrics.lighthouse_score || 0
      };
    } catch (error) {
      console.error('Failed to load performance metrics:', error);
      return {
        tti_p95_ms: 0,
        battery_cost_per_minute: 0,
        cpu_usage_percent: 0,
        memory_usage_mb: 0,
        lighthouse_score: 0
      };
    }
  }

  checkBudgets(bundleStats: BundleStats[], performanceMetrics: PerformanceMetrics): BudgetReport {
    const violations: BudgetViolation[] = [];

    // Check bundle size budgets
    bundleStats.forEach(bundle => {
      if (bundle.name === 'sandbox' && bundle.size_kb > this.budgets.sandbox_bundle_kb_max) {
        violations.push({
          metric: 'sandbox_bundle_kb',
          actual: bundle.size_kb,
          budget: this.budgets.sandbox_bundle_kb_max,
          severity: 'error',
          message: `Sandbox bundle size ${bundle.size_kb}KB exceeds budget of ${this.budgets.sandbox_bundle_kb_max}KB`
        });
      }

      if (bundle.name === 'docs' && bundle.size_kb > this.budgets.docs_bundle_kb_max) {
        violations.push({
          metric: 'docs_bundle_kb',
          actual: bundle.size_kb,
          budget: this.budgets.docs_bundle_kb_max,
          severity: 'error',
          message: `Docs bundle size ${bundle.size_kb}KB exceeds budget of ${this.budgets.docs_bundle_kb_max}KB`
        });
      }
    });

    // Check TTI budget
    if (performanceMetrics.tti_p95_ms > this.budgets.tti_p95_ms_max) {
      violations.push({
        metric: 'tti_p95_ms',
        actual: performanceMetrics.tti_p95_ms,
        budget: this.budgets.tti_p95_ms_max,
        severity: 'error',
        message: `TTI p95 ${performanceMetrics.tti_p95_ms}ms exceeds budget of ${this.budgets.tti_p95_ms_max}ms`
      });
    }

    // Check battery cost budget
    if (performanceMetrics.battery_cost_per_minute > this.budgets.battery_cost_per_minute_max) {
      violations.push({
        metric: 'battery_cost_per_minute',
        actual: performanceMetrics.battery_cost_per_minute,
        budget: this.budgets.battery_cost_per_minute_max,
        severity: 'warning',
        message: `Battery cost ${performanceMetrics.battery_cost_per_minute}/min exceeds budget of ${this.budgets.battery_cost_per_minute_max}/min`
      });
    }

    // Check CPU usage budget
    if (performanceMetrics.cpu_usage_percent > this.budgets.cpu_usage_percent_max) {
      violations.push({
        metric: 'cpu_usage_percent',
        actual: performanceMetrics.cpu_usage_percent,
        budget: this.budgets.cpu_usage_percent_max,
        severity: 'warning',
        message: `CPU usage ${performanceMetrics.cpu_usage_percent}% exceeds budget of ${this.budgets.cpu_usage_percent_max}%`
      });
    }

    // Check memory usage budget
    if (performanceMetrics.memory_usage_mb > this.budgets.memory_usage_mb_max) {
      violations.push({
        metric: 'memory_usage_mb',
        actual: performanceMetrics.memory_usage_mb,
        budget: this.budgets.memory_usage_mb_max,
        severity: 'warning',
        message: `Memory usage ${performanceMetrics.memory_usage_mb}MB exceeds budget of ${this.budgets.memory_usage_mb_max}MB`
      });
    }

    const errorViolations = violations.filter(v => v.severity === 'error');
    const passed = errorViolations.length === 0;

    const summary = passed 
      ? `✅ All performance budgets passed (${violations.length} warnings)`
      : `❌ ${errorViolations.length} performance budget violations found`;

    return {
      passed,
      budgets: this.budgets,
      bundle_stats: bundleStats,
      performance_metrics: performanceMetrics,
      violations,
      summary
    };
  }

  generateReport(report: BudgetReport): string {
    let output = `# Performance Budget Report\n\n`;
    output += `${report.summary}\n\n`;

    if (report.bundle_stats.length > 0) {
      output += `## Bundle Statistics\n\n`;
      output += `| Bundle | Size (KB) | Gzip (KB) | Chunks | Assets |\n`;
      output += `|--------|-----------|-----------|--------|--------|\n`;
      
      report.bundle_stats.forEach(bundle => {
        output += `| ${bundle.name} | ${bundle.size_kb} | ${bundle.gzip_size_kb} | ${bundle.chunks} | ${bundle.assets} |\n`;
      });
      output += `\n`;
    }

    output += `## Performance Metrics\n\n`;
    output += `| Metric | Value | Budget | Status |\n`;
    output += `|--------|-------|--------|--------|\n`;
    
    const metrics = [
      { name: 'TTI p95 (ms)', value: report.performance_metrics.tti_p95_ms, budget: report.budgets.tti_p95_ms_max },
      { name: 'Battery Cost/min', value: report.performance_metrics.battery_cost_per_minute, budget: report.budgets.battery_cost_per_minute_max },
      { name: 'CPU Usage (%)', value: report.performance_metrics.cpu_usage_percent, budget: report.budgets.cpu_usage_percent_max },
      { name: 'Memory Usage (MB)', value: report.performance_metrics.memory_usage_mb, budget: report.budgets.memory_usage_mb_max }
    ];

    metrics.forEach(metric => {
      const status = metric.value <= metric.budget ? '✅ Pass' : '❌ Fail';
      output += `| ${metric.name} | ${metric.value} | ${metric.budget} | ${status} |\n`;
    });
    output += `\n`;

    if (report.violations.length > 0) {
      output += `## Violations\n\n`;
      report.violations.forEach(violation => {
        const icon = violation.severity === 'error' ? '❌' : '⚠️';
        output += `${icon} **${violation.metric}**: ${violation.message}\n`;
      });
      output += `\n`;
    }

    return output;
  }
}

// CLI Implementation
const program = new Command();

program
  .name('perf-budget')
  .description('Performance budget checker for Mycelia Web4')
  .version('0.1.0');

program.command('check')
  .description('Check performance budgets against current metrics')
  .option('-b, --budgets <path>', 'Path to budgets JSON file', 'release/mainnet/perf-budgets.json')
  .option('-s, --stats <path>', 'Path to bundle stats JSON file', 'dist/bundle-stats.json')
  .option('-m, --metrics <path>', 'Path to performance metrics JSON file', 'dist/performance-metrics.json')
  .option('-o, --output <path>', 'Output report to file')
  .option('--json', 'Output JSON format')
  .action(async (options) => {
    try {
      const checker = new PerformanceBudgetChecker(options.budgets);
      
      const bundleStats = checker.checkBundleStats(options.stats);
      const performanceMetrics = checker.checkPerformanceMetrics(options.metrics);
      const report = checker.checkBudgets(bundleStats, performanceMetrics);

      if (options.json) {
        const jsonOutput = JSON.stringify(report, null, 2);
        if (options.output) {
          fs.writeFileSync(options.output, jsonOutput);
          console.log(`Report written to ${options.output}`);
        } else {
          console.log(jsonOutput);
        }
      } else {
        const markdownOutput = checker.generateReport(report);
        if (options.output) {
          fs.writeFileSync(options.output, markdownOutput);
          console.log(`Report written to ${options.output}`);
        } else {
          console.log(markdownOutput);
        }
      }

      // Exit with error code if budgets failed
      if (!report.passed) {
        process.exit(1);
      }
    } catch (error) {
      console.error('Performance budget check failed:', error);
      process.exit(1);
    }
  });

program.command('budgets')
  .description('Show current performance budgets')
  .option('-b, --budgets <path>', 'Path to budgets JSON file', 'release/mainnet/perf-budgets.json')
  .action((options) => {
    try {
      const checker = new PerformanceBudgetChecker(options.budgets);
      console.log('Current Performance Budgets:');
      console.log(JSON.stringify(checker['budgets'], null, 2));
    } catch (error) {
      console.error('Failed to load budgets:', error);
      process.exit(1);
    }
  });

program.command('mock-stats')
  .description('Generate mock bundle stats for testing')
  .option('-o, --output <path>', 'Output file path', 'dist/bundle-stats.json')
  .action((options) => {
    const mockStats = {
      assets: [
        { name: 'sandbox.js', size: 300000, gzipSize: 80000 },
        { name: 'docs.js', size: 200000, gzipSize: 60000 },
        { name: 'vendor.js', size: 500000, gzipSize: 150000 }
      ],
      chunks: [
        { id: 'sandbox', size: 300000 },
        { id: 'docs', size: 200000 },
        { id: 'vendor', size: 500000 }
      ]
    };

    fs.writeFileSync(options.output, JSON.stringify(mockStats, null, 2));
    console.log(`Mock bundle stats written to ${options.output}`);
  });

program.command('mock-metrics')
  .description('Generate mock performance metrics for testing')
  .option('-o, --output <path>', 'Output file path', 'dist/performance-metrics.json')
  .action((options) => {
    const mockMetrics = {
      tti_p95_ms: 1200,
      battery_cost_per_minute: 0.3,
      cpu_usage_percent: 45,
      memory_usage_mb: 80,
      lighthouse_score: 92
    };

    fs.writeFileSync(options.output, JSON.stringify(mockMetrics, null, 2));
    console.log(`Mock performance metrics written to ${options.output}`);
  });

program.parse(process.argv);
