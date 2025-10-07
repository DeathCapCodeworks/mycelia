#!/usr/bin/env node
// Observability package for Mycelia - structured logging and metrics

export interface LogEvent {
  timestamp: number;
  level: 'info' | 'warn' | 'error' | 'debug';
  name: string;
  fields: Record<string, any>;
  message?: string;
}

export interface Metric {
  name: string;
  type: 'counter' | 'gauge';
  value: number;
  timestamp: number;
  labels?: Record<string, string>;
}

export interface SLO {
  name: string;
  target: number; // Target value (e.g., 0.99 for 99%)
  threshold: number; // Alert threshold (e.g., 0.95 for 95%)
  current: number; // Current value
  status: 'healthy' | 'warning' | 'critical';
  lastUpdated: number;
}

export class SLOManager {
  private slos = new Map<string, SLO>();

  constructor() {
    this.initializeDefaultSLOs();
  }

  /**
   * Initialize default SLOs for Mycelia
   */
  private initializeDefaultSLOs(): void {
    this.registerSLO({
      name: 'redemption_quote_latency_p95',
      target: 0.99, // 99% of quotes under 100ms
      threshold: 0.95, // Alert if under 95%
      current: 0.98, // Mock current value
      status: 'healthy',
      lastUpdated: Date.now()
    });

    this.registerSLO({
      name: 'por_attestation_age',
      target: 0.99, // 99% of attestations under 30 minutes
      threshold: 0.95, // Alert if under 95%
      current: 0.97, // Mock current value
      status: 'healthy',
      lastUpdated: Date.now()
    });

    this.registerSLO({
      name: 'diagnostics_pass_rate',
      target: 0.99, // 99% pass rate
      threshold: 0.95, // Alert if under 95%
      current: 0.95, // Mock current value
      status: 'warning',
      lastUpdated: Date.now()
    });

    this.registerSLO({
      name: 'sandbox_route_tti',
      target: 0.99, // 99% of routes under 2s TTI
      threshold: 0.95, // Alert if under 95%
      current: 0.98, // Mock current value
      status: 'healthy',
      lastUpdated: Date.now()
    });
  }

  /**
   * Register an SLO
   */
  registerSLO(slo: SLO): void {
    this.slos.set(slo.name, slo);
  }

  /**
   * Update SLO value
   */
  updateSLO(name: string, value: number): void {
    const slo = this.slos.get(name);
    if (!slo) {
      throw new Error(`SLO not found: ${name}`);
    }

    slo.current = value;
    slo.lastUpdated = Date.now();

    // Update status based on thresholds
    if (value >= slo.target) {
      slo.status = 'healthy';
    } else if (value >= slo.threshold) {
      slo.status = 'warning';
    } else {
      slo.status = 'critical';
    }
  }

  /**
   * Get SLO by name
   */
  getSLO(name: string): SLO | undefined {
    return this.slos.get(name);
  }

  /**
   * Get all SLOs
   */
  getAllSLOs(): SLO[] {
    return Array.from(this.slos.values());
  }

  /**
   * Get SLO status summary
   */
  getSLOStatus(): {
    total: number;
    healthy: number;
    warning: number;
    critical: number;
    slos: SLO[];
  } {
    const allSLOs = this.getAllSLOs();
    
    return {
      total: allSLOs.length,
      healthy: allSLOs.filter(s => s.status === 'healthy').length,
      warning: allSLOs.filter(s => s.status === 'warning').length,
      critical: allSLOs.filter(s => s.status === 'critical').length,
      slos: allSLOs
    };
  }

  /**
   * Check if any SLOs are in critical state
   */
  hasCriticalSLOs(): boolean {
    return this.getAllSLOs().some(slo => slo.status === 'critical');
  }

  /**
   * Get SLOs that need attention
   */
  getSLOsNeedingAttention(): SLO[] {
    return this.getAllSLOs().filter(slo => 
      slo.status === 'warning' || slo.status === 'critical'
    );
  }
}

export class Counter {
  private value: number = 0;
  private labels: Record<string, string>;

  constructor(private name: string, labels: Record<string, string> = {}) {
    this.labels = labels;
  }

  inc(n: number = 1): void {
    this.value += n;
  }

  getValue(): number {
    return this.value;
  }

  getName(): string {
    return this.name;
  }

  getLabels(): Record<string, string> {
    return this.labels;
  }
}

export class Gauge {
  private value: number = 0;
  private labels: Record<string, string>;

  constructor(private name: string, labels: Record<string, string> = {}) {
    this.labels = labels;
  }

  set(value: number): void {
    this.value = value;
  }

  inc(n: number = 1): void {
    this.value += n;
  }

  dec(n: number = 1): void {
    this.value -= n;
  }

  getValue(): number {
    return this.value;
  }

  getName(): string {
    return this.name;
  }

  getLabels(): Record<string, string> {
    return this.labels;
  }
}

export class ObservabilityManager {
  private counters = new Map<string, Counter>();
  private gauges = new Map<string, Gauge>();
  private events: LogEvent[] = [];
  private maxEvents: number = 10000; // Keep last 10k events
  private sloManager = new SLOManager();

  /**
   * Log a structured event
   */
  logEvent(name: string, fields: Record<string, any>, level: 'info' | 'warn' | 'error' | 'debug' = 'info'): void {
    const redactedFields = redactPii(fields);
    
    const event: LogEvent = {
      timestamp: Date.now(),
      level,
      name,
      fields: redactedFields,
      message: `${name}: ${JSON.stringify(redactedFields)}`
    };

    this.events.push(event);
    
    // Keep only recent events
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    // Console output for development
    console.log(`[${level.toUpperCase()}] ${event.message}`);
  }

  /**
   * Get or create a counter
   */
  counter(name: string, labels: Record<string, string> = {}): Counter {
    const key = `${name}:${JSON.stringify(labels)}`;
    
    if (!this.counters.has(key)) {
      this.counters.set(key, new Counter(name, labels));
    }
    
    return this.counters.get(key)!;
  }

  /**
   * Get or create a gauge
   */
  gauge(name: string, labels: Record<string, string> = {}): Gauge {
    const key = `${name}:${JSON.stringify(labels)}`;
    
    if (!this.gauges.has(key)) {
      this.gauges.set(key, new Gauge(name, labels));
    }
    
    return this.gauges.get(key)!;
  }

  /**
   * Export metrics to JSON Lines format
   */
  exportMetrics(): string {
    const metrics: Metric[] = [];
    
    // Export counters
    for (const counter of this.counters.values()) {
      metrics.push({
        name: counter.getName(),
        type: 'counter',
        value: counter.getValue(),
        timestamp: Date.now(),
        labels: counter.getLabels()
      });
    }
    
    // Export gauges
    for (const gauge of this.gauges.values()) {
      metrics.push({
        name: gauge.getName(),
        type: 'gauge',
        value: gauge.getValue(),
        timestamp: Date.now(),
        labels: gauge.getLabels()
      });
    }
    
    return metrics.map(m => JSON.stringify(m)).join('\n');
  }

  /**
   * Export events to JSON Lines format
   */
  exportEvents(): string {
    return this.events.map(e => JSON.stringify(e)).join('\n');
  }

  /**
   * Get recent events
   */
  getRecentEvents(limit: number = 100): LogEvent[] {
    return this.events.slice(-limit);
  }

  /**
   * Clear all metrics and events
   */
  clear(): void {
    this.counters.clear();
    this.gauges.clear();
    this.events = [];
  }

  /**
   * Get SLO manager
   */
  getSLOManager(): SLOManager {
    return this.sloManager;
  }

  /**
   * Export status JSON for health endpoints
   */
  exportStatus(): string {
    const status = {
      timestamp: Date.now(),
      buildSha: process.env.BUILD_SHA || 'unknown',
      diagnostics: this.getDiagnosticsSummary(),
      slos: this.sloManager.getSLOStatus(),
      metrics: {
        counters: Array.from(this.counters.values()).map(c => ({
          name: c.getName(),
          value: c.getValue(),
          labels: c.getLabels()
        })),
        gauges: Array.from(this.gauges.values()).map(g => ({
          name: g.getName(),
          value: g.getValue(),
          labels: g.getLabels()
        }))
      },
      recentEvents: this.getRecentEvents(10),
      // Additional status fields for public status.json
      redemptionQueueLength: this.getRedemptionQueueLength(),
      redemptionsPerHour: this.getRedemptionsPerHour(),
      attestationAgeMinutes: this.getAttestationAgeMinutes(),
      sandboxRouteTTIP95: this.getSandboxRouteTTIP95()
    };

    return JSON.stringify(status, null, 2);
  }

  /**
   * Get diagnostics summary
   */
  private getDiagnosticsSummary(): { passRate: number; lastRun: number } {
    // Mock diagnostics summary - in production would integrate with diagnostics package
    return {
      passRate: 0.95, // 95% pass rate
      lastRun: Date.now() - 300000 // 5 minutes ago
    };
  }

  /**
   * Get redemption queue length
   */
  private getRedemptionQueueLength(): number {
    // Mock redemption queue length
    return 45;
  }

  /**
   * Get redemptions per hour
   */
  private getRedemptionsPerHour(): number {
    // Mock redemptions per hour
    return 750;
  }

  /**
   * Get attestation age in minutes
   */
  private getAttestationAgeMinutes(): number {
    // Mock attestation age
    return 15;
  }

  /**
   * Get sandbox route TTI P95
   */
  private getSandboxRouteTTIP95(): number {
    // Mock sandbox route TTI P95
    return 0.98;
  }
}

/**
 * Redact PII from data
 */
export function redactPii(data: any): any {
  if (typeof data !== 'object' || data === null) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => redactPii(item));
  }

  const redacted: any = {};
  
  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    
    // Redact sensitive fields
    if (lowerKey.includes('email') || 
        lowerKey.includes('address') || 
        lowerKey.includes('key') ||
        lowerKey.includes('secret') ||
        lowerKey.includes('password') ||
        lowerKey.includes('token')) {
      redacted[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      redacted[key] = redactPii(value);
    } else {
      redacted[key] = value;
    }
  }
  
  return redacted;
}

// Global observability instance
let globalObservability: ObservabilityManager | null = null;

export function getObservability(): ObservabilityManager {
  if (!globalObservability) {
    globalObservability = new ObservabilityManager();
  }
  return globalObservability;
}

// Convenience functions
export function logEvent(name: string, fields: Record<string, any>, level: 'info' | 'warn' | 'error' | 'debug' = 'info'): void {
  getObservability().logEvent(name, fields, level);
}

export function counter(name: string, labels: Record<string, string> = {}): Counter {
  return getObservability().counter(name, labels);
}

export function gauge(name: string, labels: Record<string, string> = {}): Gauge {
  return getObservability().gauge(name, labels);
}

export function getSLOManager(): SLOManager {
  return getObservability().getSLOManager();
}

export function exportStatus(): string {
  return getObservability().exportStatus();
}

// CLI for tailing logs
if (import.meta.url === `file://${process.argv[1]}`) {
  const manager = getObservability();
  
  // Simulate some events for demo
  manager.logEvent('system-start', { version: '0.1.0', node: process.version });
  manager.logEvent('user-login', { userId: 'user123', ip: '192.168.1.1' });
  
  const counter = manager.counter('requests');
  counter.inc(5);
  
  const gauge = manager.gauge('active-connections');
  gauge.set(42);
  
  console.log('\n=== Recent Events ===');
  console.log(manager.exportEvents());
  
  console.log('\n=== Metrics ===');
  console.log(manager.exportMetrics());
}

// Battery monitoring and power cost estimation
export interface BatteryStatus {
  charging: boolean;
  chargingTime: number;
  dischargingTime: number;
  level: number; // 0.0 to 1.0
  available: boolean;
}

export interface PowerCostEstimate {
  battery_cost_per_minute: number;
  cpu_load_percent: number;
  thermal_state: 'normal' | 'warm' | 'hot';
  power_mode: 'high' | 'balanced' | 'low';
}

export class BatteryMonitor {
  private batteryStatus: BatteryStatus | null = null;
  private powerCostEstimate: PowerCostEstimate | null = null;
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeBatteryAPI();
  }

  private async initializeBatteryAPI(): Promise<void> {
    try {
      // Check if Battery Status API is available
      if ('getBattery' in navigator) {
        const battery = await (navigator as any).getBattery();
        this.batteryStatus = {
          charging: battery.charging,
          chargingTime: battery.chargingTime,
          dischargingTime: battery.dischargingTime,
          level: battery.level,
          available: true
        };

        // Listen for battery changes
        battery.addEventListener('chargingchange', () => {
          this.batteryStatus!.charging = battery.charging;
          this.updatePowerCostEstimate();
        });

        battery.addEventListener('levelchange', () => {
          this.batteryStatus!.level = battery.level;
          this.updatePowerCostEstimate();
        });

        this.startMonitoring();
      } else {
        this.batteryStatus = {
          charging: false,
          chargingTime: Infinity,
          dischargingTime: Infinity,
          level: 1.0,
          available: false
        };
      }
    } catch (error) {
      console.warn('Battery API not available:', error);
      this.batteryStatus = {
        charging: false,
        chargingTime: Infinity,
        dischargingTime: Infinity,
        level: 1.0,
        available: false
      };
    }
  }

  private startMonitoring(): void {
    this.monitoringInterval = setInterval(() => {
      this.updatePowerCostEstimate();
    }, 5000); // Update every 5 seconds
  }

  private updatePowerCostEstimate(): void {
    if (!this.batteryStatus) return;

    // Estimate CPU load (mock implementation)
    const cpuLoad = this.estimateCpuLoad();
    
    // Calculate battery cost per minute
    let batteryCostPerMinute = 0;
    if (this.batteryStatus.available && !this.batteryStatus.charging) {
      // Estimate based on CPU load and battery level
      batteryCostPerMinute = cpuLoad * 0.1; // Base cost
      if (cpuLoad > 50) {
        batteryCostPerMinute *= 1.5; // Higher cost for high CPU usage
      }
    }

    // Determine thermal state based on CPU load
    let thermalState: 'normal' | 'warm' | 'hot' = 'normal';
    if (cpuLoad > 70) thermalState = 'warm';
    if (cpuLoad > 90) thermalState = 'hot';

    // Determine power mode
    let powerMode: 'high' | 'balanced' | 'low' = 'balanced';
    if (cpuLoad < 30) powerMode = 'low';
    if (cpuLoad > 70) powerMode = 'high';

    this.powerCostEstimate = {
      battery_cost_per_minute: batteryCostPerMinute,
      cpu_load_percent: cpuLoad,
      thermal_state: thermalState,
      power_mode: powerMode
    };

    // Log power metrics
    observability.logEvent('power_metrics', {
      battery_cost_per_minute: batteryCostPerMinute,
      cpu_load_percent: cpuLoad,
      thermal_state: thermalState,
      power_mode: powerMode,
      battery_level: this.batteryStatus.level,
      battery_charging: this.batteryStatus.charging
    });
  }

  private estimateCpuLoad(): number {
    // Mock CPU load estimation
    // In real implementation, this would use Performance API or other methods
    const baseLoad = 20;
    const randomVariation = Math.random() * 40;
    const timeBasedLoad = Math.sin(Date.now() / 10000) * 20;
    
    return Math.max(0, Math.min(100, baseLoad + randomVariation + timeBasedLoad));
  }

  getBatteryStatus(): BatteryStatus | null {
    return this.batteryStatus;
  }

  getPowerCostEstimate(): PowerCostEstimate | null {
    return this.powerCostEstimate;
  }

  isLowPowerMode(): boolean {
    return this.powerCostEstimate?.power_mode === 'low';
  }

  isThermalThrottling(): boolean {
    return this.powerCostEstimate?.thermal_state === 'hot';
  }

  getPowerRecommendations(): string[] {
    const recommendations: string[] = [];
    
    if (!this.powerCostEstimate) return recommendations;

    if (this.powerCostEstimate.battery_cost_per_minute > 0.5) {
      recommendations.push('High battery usage detected. Consider reducing video quality or frame rate.');
    }

    if (this.powerCostEstimate.cpu_load_percent > 75) {
      recommendations.push('High CPU usage detected. Consider enabling low power mode.');
    }

    if (this.powerCostEstimate.thermal_state === 'hot') {
      recommendations.push('Device is running hot. Thermal throttling may occur.');
    }

    if (this.powerCostEstimate.power_mode === 'high') {
      recommendations.push('High performance mode active. Battery life may be reduced.');
    }

    return recommendations;
  }

  destroy(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }
}

// Global battery monitor instance
let globalBatteryMonitor: BatteryMonitor | null = null;

export function getBatteryMonitor(): BatteryMonitor {
  if (!globalBatteryMonitor) {
    globalBatteryMonitor = new BatteryMonitor();
  }
  return globalBatteryMonitor;
}

// Convenience exports
export const batteryMonitor = {
  getBatteryStatus: () => getBatteryMonitor().getBatteryStatus(),
  getPowerCostEstimate: () => getBatteryMonitor().getPowerCostEstimate(),
  isLowPowerMode: () => getBatteryMonitor().isLowPowerMode(),
  isThermalThrottling: () => getBatteryMonitor().isThermalThrottling(),
  getPowerRecommendations: () => getBatteryMonitor().getPowerRecommendations()
};
