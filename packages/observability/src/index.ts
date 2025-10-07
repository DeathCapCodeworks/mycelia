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
