// Data Dividend Meter - Live meter for Rewards showing estimated earnings and data exposure

import { rewardsEngine } from '@mycelia/bloom-rewards';
import { observability } from '@mycelia/observability';

export interface DataExposure {
  type: 'oracle_query' | 'social_interaction' | 'file_access' | 'calendar_event' | 'wallet_transaction';
  timestamp: number;
  dataSize: number;
  sensitivity: 'low' | 'medium' | 'high';
  purpose: string;
  earnings: number; // BLOOM tokens earned
}

export interface EarningsEstimate {
  currentSession: number;
  hourlyRate: number;
  dailyProjection: number;
  weeklyProjection: number;
  monthlyProjection: number;
  totalLifetime: number;
}

export interface ExposureMetrics {
  totalDataExposed: number; // bytes
  highSensitivityCount: number;
  mediumSensitivityCount: number;
  lowSensitivityCount: number;
  averageEarningsPerMB: number;
  exposureRate: number; // MB per hour
}

export interface DividendSettings {
  autoThrottleAds: boolean;
  exposureThreshold: number; // MB per hour
  earningsGoal: number; // BLOOM per day
  sensitivityWeighting: {
    low: number;
    medium: number;
    high: number;
  };
}

export class DataDividendMeter {
  private exposures: DataExposure[] = [];
  private earnings: EarningsEstimate;
  private metrics: ExposureMetrics;
  private settings: DividendSettings;
  private isThrottlingAds = false;
  private sessionStartTime: number;
  private updateInterval: number | null = null;

  constructor(settings?: Partial<DividendSettings>) {
    this.sessionStartTime = Date.now();
    this.settings = {
      autoThrottleAds: true,
      exposureThreshold: 100, // 100 MB per hour
      earningsGoal: 100, // 100 BLOOM per day
      sensitivityWeighting: {
        low: 1.0,
        medium: 2.0,
        high: 5.0
      },
      ...settings
    };

    this.earnings = {
      currentSession: 0,
      hourlyRate: 0,
      dailyProjection: 0,
      weeklyProjection: 0,
      monthlyProjection: 0,
      totalLifetime: 0
    };

    this.metrics = {
      totalDataExposed: 0,
      highSensitivityCount: 0,
      mediumSensitivityCount: 0,
      lowSensitivityCount: 0,
      averageEarningsPerMB: 0,
      exposureRate: 0
    };

    this.startMonitoring();
  }

  private startMonitoring(): void {
    // Update metrics every 5 seconds
    this.updateInterval = window.setInterval(() => {
      this.updateMetrics();
      this.checkThrottlingThreshold();
    }, 5000);

    // Listen for data exposure events
    document.addEventListener('data-exposure', (event: any) => {
      this.recordExposure(event.detail);
    });

    // Listen for earnings events
    document.addEventListener('earnings-update', (event: any) => {
      this.updateEarnings(event.detail);
    });
  }

  recordExposure(exposure: DataExposure): void {
    this.exposures.push(exposure);
    
    // Calculate earnings based on data type and sensitivity
    const baseEarnings = this.calculateBaseEarnings(exposure);
    const sensitivityMultiplier = this.settings.sensitivityWeighting[exposure.sensitivity];
    const finalEarnings = baseEarnings * sensitivityMultiplier;
    
    exposure.earnings = finalEarnings;
    
    // Update metrics
    this.updateMetrics();
    
    // Emit observability event
    observability.logEvent('data_exposure_recorded', {
      type: exposure.type,
      size: exposure.dataSize,
      sensitivity: exposure.sensitivity,
      earnings: finalEarnings
    });

    // Emit earnings update event
    const earningsEvent = new CustomEvent('earnings-update', {
      detail: { amount: finalEarnings, source: exposure.type }
    });
    document.dispatchEvent(earningsEvent);
  }

  private calculateBaseEarnings(exposure: DataExposure): number {
    // Base earnings calculation (BLOOM tokens per MB)
    const baseRate = 0.1; // 0.1 BLOOM per MB
    const dataSizeMB = exposure.dataSize / (1024 * 1024);
    
    // Adjust based on data type
    const typeMultipliers = {
      'oracle_query': 1.0,
      'social_interaction': 1.5,
      'file_access': 2.0,
      'calendar_event': 1.2,
      'wallet_transaction': 3.0
    };
    
    const typeMultiplier = typeMultipliers[exposure.type] || 1.0;
    
    return baseRate * dataSizeMB * typeMultiplier;
  }

  private updateMetrics(): void {
    const now = Date.now();
    const sessionDuration = (now - this.sessionStartTime) / 1000 / 60 / 60; // hours
    
    // Calculate exposure metrics
    this.metrics.totalDataExposed = this.exposures.reduce((total, exp) => total + exp.dataSize, 0);
    this.metrics.highSensitivityCount = this.exposures.filter(exp => exp.sensitivity === 'high').length;
    this.metrics.mediumSensitivityCount = this.exposures.filter(exp => exp.sensitivity === 'medium').length;
    this.metrics.lowSensitivityCount = this.exposures.filter(exp => exp.sensitivity === 'low').length;
    
    if (this.metrics.totalDataExposed > 0) {
      this.metrics.averageEarningsPerMB = this.earnings.currentSession / (this.metrics.totalDataExposed / (1024 * 1024));
    }
    
    if (sessionDuration > 0) {
      this.metrics.exposureRate = (this.metrics.totalDataExposed / (1024 * 1024)) / sessionDuration;
    }

    // Update earnings estimates
    this.earnings.currentSession = this.exposures.reduce((total, exp) => total + exp.earnings, 0);
    
    if (sessionDuration > 0) {
      this.earnings.hourlyRate = this.earnings.currentSession / sessionDuration;
      this.earnings.dailyProjection = this.earnings.hourlyRate * 24;
      this.earnings.weeklyProjection = this.earnings.dailyProjection * 7;
      this.earnings.monthlyProjection = this.earnings.dailyProjection * 30;
    }

    // Update lifetime earnings (mock - would come from persistent storage)
    this.earnings.totalLifetime += this.earnings.currentSession * 0.1; // Simulate some persistence
  }

  private checkThrottlingThreshold(): void {
    if (!this.settings.autoThrottleAds) return;

    const shouldThrottle = this.metrics.exposureRate > this.settings.exposureThreshold;
    
    if (shouldThrottle && !this.isThrottlingAds) {
      this.enableAdThrottling();
    } else if (!shouldThrottle && this.isThrottlingAds) {
      this.disableAdThrottling();
    }
  }

  private enableAdThrottling(): void {
    this.isThrottlingAds = true;
    
    // Emit throttling event
    const event = new CustomEvent('ad-throttling-enabled', {
      detail: {
        reason: 'high_data_exposure',
        exposureRate: this.metrics.exposureRate,
        threshold: this.settings.exposureThreshold
      }
    });
    document.dispatchEvent(event);

    // Log observability event
    observability.logEvent('ad_throttling_enabled', {
      exposureRate: this.metrics.exposureRate,
      threshold: this.settings.exposureThreshold
    });
  }

  private disableAdThrottling(): void {
    this.isThrottlingAds = false;
    
    // Emit throttling event
    const event = new CustomEvent('ad-throttling-disabled', {
      detail: {
        reason: 'normal_data_exposure',
        exposureRate: this.metrics.exposureRate,
        threshold: this.settings.exposureThreshold
      }
    });
    document.dispatchEvent(event);

    // Log observability event
    observability.logEvent('ad_throttling_disabled', {
      exposureRate: this.metrics.exposureRate,
      threshold: this.settings.exposureThreshold
    });
  }

  private updateEarnings(detail: any): void {
    // This would typically update from rewards engine
    // For now, we'll use the exposure-based calculation
  }

  getCurrentEarnings(): EarningsEstimate {
    return { ...this.earnings };
  }

  getExposureMetrics(): ExposureMetrics {
    return { ...this.metrics };
  }

  getRecentExposures(limit = 10): DataExposure[] {
    return this.exposures
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  getExposureByType(type: DataExposure['type']): DataExposure[] {
    return this.exposures.filter(exp => exp.type === type);
  }

  getExposureBySensitivity(sensitivity: DataExposure['sensitivity']): DataExposure[] {
    return this.exposures.filter(exp => exp.sensitivity === sensitivity);
  }

  getSettings(): DividendSettings {
    return { ...this.settings };
  }

  updateSettings(newSettings: Partial<DividendSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    
    // Recheck throttling with new settings
    this.checkThrottlingThreshold();
  }

  isAdThrottlingActive(): boolean {
    return this.isThrottlingAds;
  }

  getThrottlingStatus(): {
    active: boolean;
    reason?: string;
    exposureRate: number;
    threshold: number;
  } {
    return {
      active: this.isThrottlingAds,
      reason: this.isThrottlingAds ? 'high_data_exposure' : undefined,
      exposureRate: this.metrics.exposureRate,
      threshold: this.settings.exposureThreshold
    };
  }

  // Utility methods for external integration
  simulateDataExposure(type: DataExposure['type'], sizeMB: number, sensitivity: DataExposure['sensitivity'] = 'medium'): void {
    const exposure: DataExposure = {
      type,
      timestamp: Date.now(),
      dataSize: sizeMB * 1024 * 1024,
      sensitivity,
      purpose: 'simulated_test',
      earnings: 0 // Will be calculated in recordExposure
    };

    this.recordExposure(exposure);
  }

  exportData(): {
    exposures: DataExposure[];
    earnings: EarningsEstimate;
    metrics: ExposureMetrics;
    settings: DividendSettings;
    sessionStartTime: number;
  } {
    return {
      exposures: [...this.exposures],
      earnings: { ...this.earnings },
      metrics: { ...this.metrics },
      settings: { ...this.settings },
      sessionStartTime: this.sessionStartTime
    };
  }

  resetSession(): void {
    this.exposures = [];
    this.earnings.currentSession = 0;
    this.earnings.hourlyRate = 0;
    this.earnings.dailyProjection = 0;
    this.earnings.weeklyProjection = 0;
    this.earnings.monthlyProjection = 0;
    this.sessionStartTime = Date.now();
    this.metrics = {
      totalDataExposed: 0,
      highSensitivityCount: 0,
      mediumSensitivityCount: 0,
      lowSensitivityCount: 0,
      averageEarningsPerMB: 0,
      exposureRate: 0
    };
    this.isThrottlingAds = false;
  }

  destroy(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }
}

// Global data dividend meter instance
let globalDataDividendMeter: DataDividendMeter | null = null;

export function getDataDividendMeter(settings?: Partial<DividendSettings>): DataDividendMeter {
  if (!globalDataDividendMeter) {
    globalDataDividendMeter = new DataDividendMeter(settings);
  }
  return globalDataDividendMeter;
}

// Convenience exports
export const dataDividendMeter = {
  getCurrentEarnings: () => getDataDividendMeter().getCurrentEarnings(),
  getExposureMetrics: () => getDataDividendMeter().getExposureMetrics(),
  getRecentExposures: (limit?: number) => getDataDividendMeter().getRecentExposures(limit),
  getSettings: () => getDataDividendMeter().getSettings(),
  updateSettings: (settings: Partial<DividendSettings>) => getDataDividendMeter().updateSettings(settings),
  isThrottling: () => getDataDividendMeter().isAdThrottlingActive(),
  getThrottlingStatus: () => getDataDividendMeter().getThrottlingStatus(),
  simulateExposure: (type: DataExposure['type'], sizeMB: number, sensitivity?: DataExposure['sensitivity']) => 
    getDataDividendMeter().simulateDataExposure(type, sizeMB, sensitivity),
  exportData: () => getDataDividendMeter().exportData(),
  resetSession: () => getDataDividendMeter().resetSession()
};
