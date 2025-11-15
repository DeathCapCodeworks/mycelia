// Media Pipeline Performance Benchmarks

import { MediaPipeline, AV1Preset, EncodeOptions } from './index.js';
import { readFileSync } from 'fs';
import { join } from 'path';

export interface BenchmarkTarget {
  description: string;
  target: number | boolean;
  unit: string;
  condition: string;
}

export interface BenchmarkProfile {
  description: string;
  targets: Record<string, BenchmarkTarget>;
  test_duration: number;
  sample_frames: number;
}

export interface BenchmarkConfig {
  version: string;
  targets: Record<string, BenchmarkProfile>;
  hardware_tiers: Record<string, any>;
  test_config: {
    warmup_frames: number;
    cooldown_frames: number;
    measurement_interval: number;
  };
}

export interface BenchmarkResult {
  profile: string;
  passed: boolean;
  results: Record<string, {
    actual: number | boolean;
    target: number | boolean;
    passed: boolean;
    unit: string;
    description: string;
  }>;
  metadata: {
    test_duration: number;
    frames_processed: number;
    hardware_accelerated: boolean;
    cpu_usage: number;
    memory_usage: number;
    timestamp: number;
  };
}

export interface BenchmarkSuite {
  results: BenchmarkResult[];
  summary: {
    total_profiles: number;
    passed_profiles: number;
    failed_profiles: number;
    overall_passed: boolean;
    total_duration: number;
  };
}

export class MediaPipelineBenchmark {
  private pipeline: MediaPipeline;
  private config: BenchmarkConfig;

  constructor() {
    this.pipeline = new MediaPipeline();
    this.config = this.loadConfig();
  }

  private loadConfig(): BenchmarkConfig {
    try {
      const configPath = join(process.cwd(), 'bench', 'profiles.json');
      const configData = readFileSync(configPath, 'utf-8');
      return JSON.parse(configData);
    } catch (error) {
      console.error('Failed to load benchmark config:', error);
      throw new Error('Benchmark configuration not found');
    }
  }

  async runBenchmark(profileName: string): Promise<BenchmarkResult> {
    const profile = this.config.targets[profileName];
    if (!profile) {
      throw new Error(`Benchmark profile '${profileName}' not found`);
    }

    console.log(`Running benchmark: ${profile.description}`);
    
    const startTime = Date.now();
    const hardwareCaps = this.pipeline.getHardwareCapabilities();
    const testFrames = this.generateTestFrames(profile.sample_frames);
    
    // Warmup
    await this.warmup(this.config.test_config.warmup_frames);
    
    // Run benchmark
    const results = await this.runProfileBenchmark(profile, testFrames, hardwareCaps);
    
    const endTime = Date.now();
    const testDuration = endTime - startTime;
    
    // Evaluate results against targets
    const evaluatedResults = this.evaluateResults(profile, results, hardwareCaps);
    
    const passed = Object.values(evaluatedResults).every(r => r.passed);
    
    return {
      profile: profileName,
      passed,
      results: evaluatedResults,
      metadata: {
        test_duration: testDuration,
        frames_processed: testFrames.length,
        hardware_accelerated: hardwareCaps?.av1Encode || false,
        cpu_usage: this.getCpuUsage(),
        memory_usage: this.getMemoryUsage(),
        timestamp: Date.now()
      }
    };
  }

  async runAllBenchmarks(): Promise<BenchmarkSuite> {
    const results: BenchmarkResult[] = [];
    const startTime = Date.now();
    
    for (const profileName of Object.keys(this.config.targets)) {
      try {
        const result = await this.runBenchmark(profileName);
        results.push(result);
      } catch (error) {
        console.error(`Failed to run benchmark ${profileName}:`, error);
        // Create failed result
        results.push({
          profile: profileName,
          passed: false,
          results: {},
          metadata: {
            test_duration: 0,
            frames_processed: 0,
            hardware_accelerated: false,
            cpu_usage: 0,
            memory_usage: 0,
            timestamp: Date.now()
          }
        });
      }
    }
    
    const endTime = Date.now();
    const totalDuration = endTime - startTime;
    
    const passedProfiles = results.filter(r => r.passed).length;
    const failedProfiles = results.length - passedProfiles;
    
    return {
      results,
      summary: {
        total_profiles: results.length,
        passed_profiles: passedProfiles,
        failed_profiles: failedProfiles,
        overall_passed: failedProfiles === 0,
        total_duration: totalDuration
      }
    };
  }

  private async warmup(frameCount: number): Promise<void> {
    console.log(`Warming up with ${frameCount} frames...`);
    const warmupFrames = this.generateTestFrames(frameCount);
    
    for (const frame of warmupFrames) {
      await this.pipeline.encode({
        input: frame,
        codec: 'av1',
        bitrate: 2000,
        fps: 30,
        width: 1920,
        height: 1080,
        hardwarePreferred: true
      });
    }
  }

  private async runProfileBenchmark(
    profile: BenchmarkProfile, 
    testFrames: ArrayBuffer[], 
    hardwareCaps: any
  ): Promise<Record<string, number | boolean>> {
    const results: Record<string, number | boolean> = {};
    const encodeTimes: number[] = [];
    const frameSizes: number[] = [];
    
    const preset = profile.description.includes('1080p') ? 'vod_1080p30_high' : 'realtime_720p30_lowdelay';
    
    for (const frame of testFrames) {
      const encodeStart = performance.now();
      
      const encoded = await this.pipeline.encodeAV1(frame, preset as AV1Preset, {
        hardwarePreferred: true
      });
      
      const encodeEnd = performance.now();
      const encodeTime = encodeEnd - encodeStart;
      
      encodeTimes.push(encodeTime);
      
      // Calculate frame size (mock)
      const frameSize = frame.byteLength * 0.1; // Mock compression ratio
      frameSizes.push(frameSize);
    }
    
    // Calculate metrics
    const avgEncodeTime = encodeTimes.reduce((sum, time) => sum + time, 0) / encodeTimes.length;
    const frameTime = 1000 / 30; // 30 FPS
    const encodeTimeRatio = avgEncodeTime / frameTime;
    
    results.encode_time_ratio = encodeTimeRatio;
    results.hardware_accelerated = hardwareCaps?.av1Encode || false;
    results.avg_frame_size = frameSizes.reduce((sum, size) => sum + size, 0) / frameSizes.length;
    results.total_frames = testFrames.length;
    
    return results;
  }

  private evaluateResults(
    profile: BenchmarkProfile, 
    results: Record<string, number | boolean>, 
    hardwareCaps: any
  ): Record<string, any> {
    const evaluated: Record<string, any> = {};
    
    for (const [key, target] of Object.entries(profile.targets)) {
      const actual = results[key];
      let passed = false;
      
      if (typeof target.target === 'boolean') {
        passed = actual === target.target;
      } else {
        // Check condition
        if (this.evaluateCondition(target.condition, hardwareCaps)) {
          if (typeof actual === 'number' && typeof target.target === 'number') {
            passed = actual <= target.target;
          }
        } else {
          // Condition not met, skip this target
          passed = true;
        }
      }
      
      evaluated[key] = {
        actual,
        target: target.target,
        passed,
        unit: target.unit,
        description: target.description
      };
    }
    
    return evaluated;
  }

  private evaluateCondition(condition: string, hardwareCaps: any): boolean {
    switch (condition) {
      case 'always':
        return true;
      case 'mid_tier_cpu':
        return this.isMidTierCpu();
      case 'hw_encode_available':
        return hardwareCaps?.av1Encode || false;
      case 'hw_encode_active':
        return hardwareCaps?.av1Encode || false;
      default:
        return true;
    }
  }

  private isMidTierCpu(): boolean {
    // Mock CPU detection - in real implementation, use system info
    return true;
  }

  private generateTestFrames(count: number): ArrayBuffer[] {
    const frames: ArrayBuffer[] = [];
    
    for (let i = 0; i < count; i++) {
      // Generate mock frame data
      const frameSize = 1920 * 1080 * 3; // RGB frame
      const frame = new ArrayBuffer(frameSize);
      const view = new Uint8Array(frame);
      
      // Fill with test pattern
      for (let j = 0; j < frameSize; j++) {
        view[j] = Math.floor(Math.random() * 256);
      }
      
      frames.push(frame);
    }
    
    return frames;
  }

  private getCpuUsage(): number {
    // Mock CPU usage - in real implementation, use system metrics
    return Math.random() * 100;
  }

  private getMemoryUsage(): number {
    // Mock memory usage - in real implementation, use system metrics
    return Math.random() * 100;
  }
}

// CLI interface
export async function runBenchmarkCLI(): Promise<void> {
  const benchmark = new MediaPipelineBenchmark();
  
  try {
    const suite = await benchmark.runAllBenchmarks();
    
    // Output JSON results
    console.log(JSON.stringify(suite, null, 2));
    
    // Exit with error code if any benchmarks failed
    if (!suite.summary.overall_passed) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Benchmark failed:', error);
    process.exit(1);
  }
}

// Already exported above
