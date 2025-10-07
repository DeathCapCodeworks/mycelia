// SLO Evaluator for Performance Targets

export interface SLOTarget {
  name: string;
  description: string;
  target: number;
  unit: string;
  condition?: string;
  severity: 'critical' | 'warning' | 'info';
}

export interface SLOResult {
  name: string;
  actual: number;
  target: number;
  passed: boolean;
  unit: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  timestamp: number;
}

export interface SLOCheckSuite {
  suite_name: string;
  total_checks: number;
  passed_checks: number;
  failed_checks: number;
  critical_failures: number;
  warning_failures: number;
  overall_passed: boolean;
  results: SLOResult[];
  summary: {
    av1_vod_performance: boolean;
    av1_rtc_performance: boolean;
    mse_playback_performance: boolean;
    webcodecs_performance: boolean;
  };
  timestamp: number;
}

export class SLOEvaluator {
  private targets: Map<string, SLOTarget> = new Map();

  constructor() {
    this.initializeTargets();
  }

  private initializeTargets(): void {
    const targets: SLOTarget[] = [
      {
        name: 'av1_vod_encode_time_ratio',
        description: 'AV1 VOD 1080p30 encode time ratio (≤1.5x realtime)',
        target: 1.5,
        unit: 'ratio',
        severity: 'critical'
      },
      {
        name: 'av1_rtc_latency_p95',
        description: 'AV1 RTC 720p30 glass-to-glass latency P95 (≤200ms)',
        target: 200,
        unit: 'ms',
        severity: 'critical'
      },
      {
        name: 'av1_rtc_jitter_p95',
        description: 'AV1 RTC 720p30 jitter P95 (≤50ms)',
        target: 50,
        unit: 'ms',
        severity: 'warning'
      },
      {
        name: 'av1_rtc_packet_loss',
        description: 'AV1 RTC 720p30 packet loss (≤1%)',
        target: 1.0,
        unit: 'percent',
        severity: 'warning'
      },
      {
        name: 'mse_av1_dropped_frames',
        description: 'MSE AV1 playback dropped frames (≤1%)',
        target: 1.0,
        unit: 'percent',
        severity: 'critical'
      },
      {
        name: 'webcodecs_av1_encode_cpu',
        description: 'WebCodecs AV1 encode CPU usage (≤75%)',
        target: 75.0,
        unit: 'percent',
        severity: 'warning'
      },
      {
        name: 'webcodecs_av1_decode_cpu_hw',
        description: 'WebCodecs AV1 decode CPU usage with HW (≤25%)',
        target: 25.0,
        unit: 'percent',
        condition: 'hardware_decode_available',
        severity: 'warning'
      },
      {
        name: 'webcodecs_av1_decode_cpu_sw',
        description: 'WebCodecs AV1 decode CPU usage SW fallback (≤75%)',
        target: 75.0,
        unit: 'percent',
        condition: 'software_decode_fallback',
        severity: 'warning'
      }
    ];

    targets.forEach(target => {
      this.targets.set(target.name, target);
    });
  }

  evaluateSLOs(metrics: Record<string, number | boolean>): SLOCheckSuite {
    const results: SLOResult[] = [];
    
    for (const [name, target] of this.targets.entries()) {
      const actual = metrics[name];
      
      if (actual === undefined) {
        // Skip if metric not provided
        continue;
      }
      
      const result = this.evaluateTarget(name, target, actual, metrics);
      results.push(result);
    }
    
    const passedChecks = results.filter(r => r.passed).length;
    const failedChecks = results.length - passedChecks;
    const criticalFailures = results.filter(r => !r.passed && r.severity === 'critical').length;
    const warningFailures = results.filter(r => !r.passed && r.severity === 'warning').length;
    
    const overallPassed = criticalFailures === 0;
    
    // Calculate summary
    const summary = this.calculateSummary(results);
    
    return {
      suite_name: 'AV1 Performance SLOs',
      total_checks: results.length,
      passed_checks: passedChecks,
      failed_checks: failedChecks,
      critical_failures: criticalFailures,
      warning_failures: warningFailures,
      overall_passed: overallPassed,
      results,
      summary,
      timestamp: Date.now()
    };
  }

  private evaluateTarget(
    name: string, 
    target: SLOTarget, 
    actual: number | boolean, 
    allMetrics: Record<string, number | boolean>
  ): SLOResult {
    // Check condition if specified
    if (target.condition && !this.evaluateCondition(target.condition, allMetrics)) {
      return {
        name,
        actual: typeof actual === 'number' ? actual : 0,
        target: target.target,
        passed: true,
        unit: target.unit,
        severity: target.severity,
        message: `Condition '${target.condition}' not met, skipping check`,
        timestamp: Date.now()
      };
    }
    
    let passed = false;
    let message = '';
    
    if (typeof actual === 'boolean') {
      passed = actual === (target.target === 1);
      message = passed ? 
        `${target.description}: ${actual}` :
        `${target.description}: expected ${target.target === 1}, got ${actual}`;
    } else {
      passed = actual <= target.target;
      message = passed ?
        `${target.description}: ${actual.toFixed(2)}${target.unit} (target: ≤${target.target}${target.unit})` :
        `${target.description}: ${actual.toFixed(2)}${target.unit} exceeds target of ${target.target}${target.unit}`;
    }
    
    return {
      name,
      actual: typeof actual === 'number' ? actual : (actual ? 1 : 0),
      target: target.target,
      passed,
      unit: target.unit,
      severity: target.severity,
      message,
      timestamp: Date.now()
    };
  }

  private evaluateCondition(condition: string, metrics: Record<string, number | boolean>): boolean {
    switch (condition) {
      case 'hardware_decode_available':
        return metrics.hardware_decode_available === true;
      case 'software_decode_fallback':
        return metrics.hardware_decode_available === false;
      case 'mid_tier_cpu':
        return metrics.cpu_tier === 'mid';
      case 'hw_encode_available':
        return metrics.hardware_encode_available === true;
      default:
        return true;
    }
  }

  private calculateSummary(results: SLOResult[]): SLOCheckSuite['summary'] {
    const av1VodResult = results.find(r => r.name === 'av1_vod_encode_time_ratio');
    const av1RtcResult = results.find(r => r.name === 'av1_rtc_latency_p95');
    const mseResult = results.find(r => r.name === 'mse_av1_dropped_frames');
    const webcodecsResult = results.find(r => 
      r.name === 'webcodecs_av1_encode_cpu' || 
      r.name === 'webcodecs_av1_decode_cpu_hw' || 
      r.name === 'webcodecs_av1_decode_cpu_sw'
    );
    
    return {
      av1_vod_performance: av1VodResult?.passed || false,
      av1_rtc_performance: av1RtcResult?.passed || false,
      mse_playback_performance: mseResult?.passed || false,
      webcodecs_performance: webcodecsResult?.passed || false
    };
  }

  // Utility methods for external integration
  addTarget(target: SLOTarget): void {
    this.targets.set(target.name, target);
  }

  removeTarget(name: string): void {
    this.targets.delete(name);
  }

  getTargets(): SLOTarget[] {
    return Array.from(this.targets.values());
  }

  getTarget(name: string): SLOTarget | undefined {
    return this.targets.get(name);
  }

  // Export targets for configuration
  exportTargets(): string {
    return JSON.stringify(Array.from(this.targets.values()), null, 2);
  }

  // Import targets from configuration
  importTargets(targetsJson: string): void {
    try {
      const targets: SLOTarget[] = JSON.parse(targetsJson);
      targets.forEach(target => {
        this.targets.set(target.name, target);
      });
    } catch (error) {
      console.error('Failed to import SLO targets:', error);
    }
  }
}

// Global SLO evaluator instance
let globalSLOEvaluator: SLOEvaluator | null = null;

export function getSLOEvaluator(): SLOEvaluator {
  if (!globalSLOEvaluator) {
    globalSLOEvaluator = new SLOEvaluator();
  }
  return globalSLOEvaluator;
}

// Convenience exports
export const sloCheck = {
  evaluate: (metrics: Record<string, number | boolean>) => getSLOEvaluator().evaluateSLOs(metrics),
  addTarget: (target: SLOTarget) => getSLOEvaluator().addTarget(target),
  removeTarget: (name: string) => getSLOEvaluator().removeTarget(name),
  getTargets: () => getSLOEvaluator().getTargets(),
  getTarget: (name: string) => getSLOEvaluator().getTarget(name),
  exportTargets: () => getSLOEvaluator().exportTargets(),
  importTargets: (targetsJson: string) => getSLOEvaluator().importTargets(targetsJson)
};
