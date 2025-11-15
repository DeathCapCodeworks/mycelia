// Compatibility Matrix - Hardware capability detection and auto-fallback

import { getObservability } from '@mycelia/observability';

export interface HardwareCapabilities {
  os: string;
  gpu_driver: string;
  hw_encode: 'hw' | 'sw' | 'unknown';
  hw_decode: 'hw' | 'sw' | 'unknown';
  success_codes: string[];
  detection_timestamp: number;
  install_id: string;
}

export interface CompatibilityResult {
  capabilities: HardwareCapabilities;
  fallback_decisions: {
    encode_path: 'hw' | 'sw';
    decode_path: 'hw' | 'sw';
    reasons: string[];
  };
  performance_estimate: {
    encode_performance: 'excellent' | 'good' | 'fair' | 'poor';
    decode_performance: 'excellent' | 'good' | 'fair' | 'poor';
    confidence: number;
  };
}

export interface CompatibilityMatrix {
  entries: HardwareCapabilities[];
  aggregated_stats: {
    total_entries: number;
    hw_encode_success_rate: number;
    hw_decode_success_rate: number;
    os_distribution: Record<string, number>;
    gpu_driver_distribution: Record<string, number>;
  };
  last_updated: number;
}

export class CompatibilityMatrixManager {
  private capabilities: Map<string, HardwareCapabilities> = new Map();
  private installId: string;
  private isDemoMode: boolean = false;

  constructor() {
    this.installId = this.generateInstallId();
    this.loadFromStorage();
    this.detectCurrentCapabilities();
  }

  private generateInstallId(): string {
    // Generate a unique install ID for this instance
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2);
    return `install_${timestamp}_${random}`;
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem('mycelia-compat-matrix');
      if (stored) {
        const data = JSON.parse(stored);
        this.capabilities = new Map(data.capabilities || []);
        this.isDemoMode = data.demoMode || false;
      }
    } catch (error) {
      console.warn('Failed to load compatibility matrix from storage:', error);
    }
  }

  private saveToStorage(): void {
    try {
      const data = {
        capabilities: Array.from(this.capabilities.entries()),
        demoMode: this.isDemoMode,
        timestamp: Date.now()
      };
      localStorage.setItem('mycelia-compat-matrix', JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save compatibility matrix to storage:', error);
    }
  }

  async detectCurrentCapabilities(): Promise<HardwareCapabilities> {
    const capabilities: HardwareCapabilities = {
      os: this.detectOS(),
      gpu_driver: await this.detectGPUDriver(),
      hw_encode: await this.detectHardwareEncode(),
      hw_decode: await this.detectHardwareDecode(),
      success_codes: [],
      detection_timestamp: Date.now(),
      install_id: this.installId
    };

    // Test capabilities and record success codes
    capabilities.success_codes = await this.testCapabilities(capabilities);

    // Store capabilities
    this.capabilities.set(this.installId, capabilities);
    this.saveToStorage();

    // Log detection event
    getObservability().logEvent('hardware_capabilities_detected', {
      install_id: this.installId,
      os: capabilities.os,
      gpu_driver: capabilities.gpu_driver,
      hw_encode: capabilities.hw_encode,
      hw_decode: capabilities.hw_decode,
      success_codes: capabilities.success_codes
    });

    return capabilities;
  }

  private detectOS(): string {
    if (typeof navigator === 'undefined') {
      return 'unknown';
    }

    const userAgent = navigator.userAgent;
    
    if (userAgent.includes('Windows')) {
      return 'windows';
    } else if (userAgent.includes('Mac')) {
      return 'macos';
    } else if (userAgent.includes('Linux')) {
      return 'linux';
    } else if (userAgent.includes('Android')) {
      return 'android';
    } else if (userAgent.includes('iOS')) {
      return 'ios';
    } else {
      return 'unknown';
    }
  }

  private async detectGPUDriver(): Promise<string> {
    try {
      // Try to get WebGL context to detect GPU
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl') as WebGLRenderingContext | null;
      
      if (!gl) {
        return 'unknown';
      }

      const debugInfo = (gl as WebGLRenderingContext).getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        const renderer = (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        return this.parseGPUDriver(renderer);
      }

      return 'unknown';
    } catch (error) {
      return 'unknown';
    }
  }

  private parseGPUDriver(renderer: string): string {
    const rendererLower = renderer.toLowerCase();
    
    if (rendererLower.includes('nvidia')) {
      return 'nvidia';
    } else if (rendererLower.includes('amd') || rendererLower.includes('radeon')) {
      return 'amd';
    } else if (rendererLower.includes('intel')) {
      return 'intel';
    } else if (rendererLower.includes('apple')) {
      return 'apple';
    } else if (rendererLower.includes('adreno')) {
      return 'qualcomm';
    } else if (rendererLower.includes('mali')) {
      return 'arm';
    } else {
      return 'unknown';
    }
  }

  private async detectHardwareEncode(): Promise<'hw' | 'sw' | 'unknown'> {
    try {
      // Check for hardware encoding support
      if (typeof navigator !== 'undefined' && 'mediaCapabilities' in navigator) {
        const capabilities = await navigator.mediaCapabilities.decodingInfo({
          type: 'media-source',
          video: {
            contentType: 'video/mp4; codecs="av01.0.08M.08"',
            width: 1920,
            height: 1080,
            bitrate: 2000000,
            framerate: 30
          }
        });

        if (capabilities.supported && capabilities.powerEfficient) {
          return 'hw';
        }
      }

      // Check for WebCodecs support
      if (typeof window !== 'undefined' && 'VideoEncoder' in window) {
        const config = {
          codec: 'av01.0.08M.08',
          width: 1920,
          height: 1080,
          bitrate: 2000000,
          framerate: 30
        };

        const support = await VideoEncoder.isConfigSupported(config);
        if (support.supported) {
          // Assume hardware if supported (could be more sophisticated)
          return 'hw';
        }
      }

      return 'sw';
    } catch (error) {
      return 'unknown';
    }
  }

  private async detectHardwareDecode(): Promise<'hw' | 'sw' | 'unknown'> {
    try {
      // Check for hardware decoding support
      if (typeof navigator !== 'undefined' && 'mediaCapabilities' in navigator) {
        const capabilities = await navigator.mediaCapabilities.decodingInfo({
          type: 'media-source',
          video: {
            contentType: 'video/mp4; codecs="av01.0.08M.08"',
            width: 1920,
            height: 1080,
            bitrate: 2000000,
            framerate: 30
          }
        });

        if (capabilities.supported && capabilities.powerEfficient) {
          return 'hw';
        }
      }

      // Check for WebCodecs decoder support
      if (typeof window !== 'undefined' && 'VideoDecoder' in window) {
        const config = {
          codec: 'av01.0.08M.08',
          codedWidth: 1920,
          codedHeight: 1080
        };

        const support = await VideoDecoder.isConfigSupported(config);
        if (support.supported) {
          return 'hw';
        }
      }

      return 'sw';
    } catch (error) {
      return 'unknown';
    }
  }

  private async testCapabilities(capabilities: HardwareCapabilities): Promise<string[]> {
    const successCodes: string[] = [];

    try {
      // Test AV1 encode
      if (capabilities.hw_encode === 'hw') {
        successCodes.push('av1_encode_hw');
      } else {
        successCodes.push('av1_encode_sw');
      }

      // Test AV1 decode
      if (capabilities.hw_decode === 'hw') {
        successCodes.push('av1_decode_hw');
      } else {
        successCodes.push('av1_decode_sw');
      }

      // Test WebCodecs support
      if (typeof window !== 'undefined' && 'VideoEncoder' in window) {
        successCodes.push('webcodecs_available');
      }

      // Test MSE support
      if (typeof window !== 'undefined' && 'MediaSource' in window) {
        successCodes.push('mse_available');
      }

    } catch (error) {
      successCodes.push('test_error');
    }

    return successCodes;
  }

  getCurrentCapabilities(): HardwareCapabilities | undefined {
    return this.capabilities.get(this.installId);
  }

  getCompatibilityResult(): CompatibilityResult {
    const capabilities = this.getCurrentCapabilities();
    
    if (!capabilities) {
      throw new Error('No capabilities detected. Call detectCurrentCapabilities() first.');
    }

    const fallbackDecisions = this.makeFallbackDecisions(capabilities);
    const performanceEstimate = this.estimatePerformance(capabilities);

    return {
      capabilities,
      fallback_decisions: fallbackDecisions,
      performance_estimate: performanceEstimate
    };
  }

  private makeFallbackDecisions(capabilities: HardwareCapabilities): CompatibilityResult['fallback_decisions'] {
    const reasons: string[] = [];
    let encodePath: 'hw' | 'sw' = 'sw';
    let decodePath: 'hw' | 'sw' = 'sw';

    // Decide encode path
    if (capabilities.hw_encode === 'hw') {
      encodePath = 'hw';
      reasons.push('Hardware encode available');
    } else {
      encodePath = 'sw';
      reasons.push('Hardware encode not available, using software fallback');
    }

    // Decide decode path
    if (capabilities.hw_decode === 'hw') {
      decodePath = 'hw';
      reasons.push('Hardware decode available');
    } else {
      decodePath = 'sw';
      reasons.push('Hardware decode not available, using software fallback');
    }

    return {
      encode_path: encodePath,
      decode_path: decodePath,
      reasons
    };
  }

  private estimatePerformance(capabilities: HardwareCapabilities): CompatibilityResult['performance_estimate'] {
    let encodePerformance: 'excellent' | 'good' | 'fair' | 'poor' = 'fair';
    let decodePerformance: 'excellent' | 'good' | 'fair' | 'poor' = 'fair';
    let confidence = 0.5;

    // Estimate encode performance
    if (capabilities.hw_encode === 'hw') {
      encodePerformance = 'excellent';
      confidence += 0.2;
    } else if (capabilities.hw_encode === 'sw') {
      encodePerformance = 'good';
      confidence += 0.1;
    } else {
      encodePerformance = 'poor';
      confidence -= 0.1;
    }

    // Estimate decode performance
    if (capabilities.hw_decode === 'hw') {
      decodePerformance = 'excellent';
      confidence += 0.2;
    } else if (capabilities.hw_decode === 'sw') {
      decodePerformance = 'good';
      confidence += 0.1;
    } else {
      decodePerformance = 'poor';
      confidence -= 0.1;
    }

    // Adjust based on OS and GPU driver
    if (capabilities.os === 'windows' && capabilities.gpu_driver === 'nvidia') {
      confidence += 0.1;
    } else if (capabilities.os === 'macos' && capabilities.gpu_driver === 'apple') {
      confidence += 0.1;
    } else if (capabilities.os === 'linux' && capabilities.gpu_driver === 'intel') {
      confidence += 0.05;
    }

    confidence = Math.max(0, Math.min(1, confidence));

    return {
      encode_performance: encodePerformance,
      decode_performance: decodePerformance,
      confidence
    };
  }

  // Demo mode for aggregation
  enableDemoMode(): void {
    this.isDemoMode = true;
    this.saveToStorage();
  }

  disableDemoMode(): void {
    this.isDemoMode = false;
    this.saveToStorage();
  }

  isDemoModeEnabled(): boolean {
    return this.isDemoMode;
  }

  // Aggregation for demo mode
  getAggregatedMatrix(): CompatibilityMatrix | null {
    if (!this.isDemoMode) {
      return null;
    }

    const entries = Array.from(this.capabilities.values());
    
    const hwEncodeSuccess = entries.filter(e => e.hw_encode === 'hw').length;
    const hwDecodeSuccess = entries.filter(e => e.hw_decode === 'hw').length;
    
    const osDistribution: Record<string, number> = {};
    const gpuDriverDistribution: Record<string, number> = {};
    
    entries.forEach(entry => {
      osDistribution[entry.os] = (osDistribution[entry.os] || 0) + 1;
      gpuDriverDistribution[entry.gpu_driver] = (gpuDriverDistribution[entry.gpu_driver] || 0) + 1;
    });

    return {
      entries,
      aggregated_stats: {
        total_entries: entries.length,
        hw_encode_success_rate: entries.length > 0 ? hwEncodeSuccess / entries.length : 0,
        hw_decode_success_rate: entries.length > 0 ? hwDecodeSuccess / entries.length : 0,
        os_distribution: osDistribution,
        gpu_driver_distribution: gpuDriverDistribution
      },
      last_updated: Date.now()
    };
  }

  // Export for demo mode
  exportAggregatedData(): string | null {
    const matrix = this.getAggregatedMatrix();
    if (!matrix) {
      return null;
    }

    return JSON.stringify(matrix, null, 2);
  }

  // Override capabilities for testing
  overrideCapabilities(overrides: Partial<HardwareCapabilities>): void {
    const current = this.capabilities.get(this.installId);
    if (current) {
      const updated = { ...current, ...overrides };
      this.capabilities.set(this.installId, updated);
      this.saveToStorage();
    }
  }

  // Clear all data
  clearData(): void {
    this.capabilities.clear();
    this.saveToStorage();
  }

  // Get all capabilities
  getAllCapabilities(): HardwareCapabilities[] {
    return Array.from(this.capabilities.values());
  }

  // Get capabilities by OS
  getCapabilitiesByOS(os: string): HardwareCapabilities[] {
    return Array.from(this.capabilities.values()).filter(c => c.os === os);
  }

  // Get capabilities by GPU driver
  getCapabilitiesByGPUDriver(gpuDriver: string): HardwareCapabilities[] {
    return Array.from(this.capabilities.values()).filter(c => c.gpu_driver === gpuDriver);
  }
}

// Global compatibility matrix manager instance
let globalCompatMatrix: CompatibilityMatrixManager | null = null;

export function getCompatMatrixManager(): CompatibilityMatrixManager {
  if (!globalCompatMatrix) {
    globalCompatMatrix = new CompatibilityMatrixManager();
  }
  return globalCompatMatrix;
}

// Convenience exports
export const compatMatrix = {
  detect: () => getCompatMatrixManager().detectCurrentCapabilities(),
  getCurrent: () => getCompatMatrixManager().getCurrentCapabilities(),
  getResult: () => getCompatMatrixManager().getCompatibilityResult(),
  enableDemoMode: () => getCompatMatrixManager().enableDemoMode(),
  disableDemoMode: () => getCompatMatrixManager().disableDemoMode(),
  isDemoMode: () => getCompatMatrixManager().isDemoModeEnabled(),
  getAggregated: () => getCompatMatrixManager().getAggregatedMatrix(),
  exportAggregated: () => getCompatMatrixManager().exportAggregatedData(),
  override: (overrides: Partial<HardwareCapabilities>) => getCompatMatrixManager().overrideCapabilities(overrides),
  clear: () => getCompatMatrixManager().clearData(),
  getAll: () => getCompatMatrixManager().getAllCapabilities(),
  getByOS: (os: string) => getCompatMatrixManager().getCapabilitiesByOS(os),
  getByGPUDriver: (gpuDriver: string) => getCompatMatrixManager().getCapabilitiesByGPUDriver(gpuDriver)
};
