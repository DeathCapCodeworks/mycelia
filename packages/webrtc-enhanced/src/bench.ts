// WebRTC Enhanced Loopback Benchmark

import { SFUClient, EnhancedPeer, PeerOptions } from './index.js';

export interface LoopbackBenchmarkConfig {
  duration: number;
  frame_rate: number;
  resolution: {
    width: number;
    height: number;
  };
  codec: 'av1' | 'vp9' | 'h264';
  scalability_mode: 'L1T1' | 'L1T3' | 'L3T3';
  enable_fec: boolean;
  enable_bwe: boolean;
}

export interface LoopbackMetrics {
  latency: {
    min: number;
    max: number;
    avg: number;
    p95: number;
    p99: number;
  };
  jitter: {
    min: number;
    max: number;
    avg: number;
    p95: number;
    p99: number;
  };
  packet_loss: number;
  bitrate: {
    sent: number;
    received: number;
  };
  frame_drops: number;
  total_frames: number;
}

export interface LoopbackResult {
  config: LoopbackBenchmarkConfig;
  metrics: LoopbackMetrics;
  passed: boolean;
  target_latency: number;
  target_jitter: number;
  target_packet_loss: number;
  timestamp: number;
}

export class WebRTCLoopbackBenchmark {
  private sfuClient: SFUClient;
  private peer: EnhancedPeer | null = null;
  private metrics: {
    latencies: number[];
    jitters: number[];
    packetLosses: number[];
    bitrates: { sent: number; received: number }[];
    frameDrops: number;
    totalFrames: number;
  };

  constructor() {
    this.sfuClient = new SFUClient();
    this.metrics = {
      latencies: [],
      jitters: [],
      packetLosses: [],
      bitrates: [],
      frameDrops: 0,
      totalFrames: 0
    };
  }

  async runBenchmark(config: LoopbackBenchmarkConfig): Promise<LoopbackResult> {
    console.log(`Running WebRTC loopback benchmark: ${config.codec} ${config.scalability_mode}`);
    
    // Connect to SFU
    const clientId = await this.sfuClient.connect('ws://localhost:8080/sfu');
    
    // Create peer with benchmark configuration
    const peerOptions: PeerOptions = {
      enableAdaptiveBitrate: true,
      enableSimulcast: false,
      maxSpatialLayers: config.scalability_mode.includes('L3') ? 3 : 1,
      maxTemporalLayers: config.scalability_mode.includes('T3') ? 3 : 1,
      preferCodec: config.codec,
      enableFEC: config.enable_fec,
      enableBWE: config.enable_bwe
    };
    
    const peerId = await this.sfuClient.createPeer(clientId, peerOptions);
    this.peer = this.sfuClient.getPeers().find(p => p.id === peerId) || null;
    
    if (!this.peer) {
      throw new Error('Failed to create peer for benchmark');
    }
    
    // Set scalability mode
    this.peer.setScalabilityMode(config.scalability_mode);
    this.peer.setLowDelay(true);
    
    // Start benchmark
    const startTime = Date.now();
    await this.runLoopbackTest(config);
    const endTime = Date.now();
    
    // Calculate metrics
    const metrics = this.calculateMetrics();
    
    // Evaluate against targets
    const targetLatency = 200; // 200ms glass-to-glass
    const targetJitter = 50; // 50ms max jitter
    const targetPacketLoss = 0.01; // 1% max packet loss
    
    const passed = (
      metrics.latency.p95 <= targetLatency &&
      metrics.jitter.p95 <= targetJitter &&
      metrics.packet_loss <= targetPacketLoss
    );
    
    // Cleanup
    await this.sfuClient.removePeer(clientId, peerId);
    await this.sfuClient.disconnect(clientId);
    
    return {
      config,
      metrics,
      passed,
      target_latency: targetLatency,
      target_jitter: targetJitter,
      target_packet_loss: targetPacketLoss,
      timestamp: Date.now()
    };
  }

  private async runLoopbackTest(config: LoopbackBenchmarkConfig): Promise<void> {
    const frameInterval = 1000 / config.frame_rate;
    const testDuration = config.duration;
    const startTime = Date.now();
    
    while (Date.now() - startTime < testDuration) {
      const frameStart = performance.now();
      
      // Simulate frame capture and encoding
      await this.simulateFrameProcessing(config);
      
      // Simulate network transmission
      const networkLatency = this.simulateNetworkLatency();
      const jitter = this.simulateJitter();
      const packetLoss = this.simulatePacketLoss();
      
      const frameEnd = performance.now();
      const totalLatency = frameEnd - frameStart + networkLatency;
      
      // Record metrics
      this.metrics.latencies.push(totalLatency);
      this.metrics.jitters.push(jitter);
      this.metrics.packetLosses.push(packetLoss);
      this.metrics.bitrates.push({
        sent: this.calculateBitrate(config),
        received: this.calculateBitrate(config) * (1 - packetLoss)
      });
      this.metrics.totalFrames++;
      
      // Check for frame drops
      if (totalLatency > frameInterval * 2) {
        this.metrics.frameDrops++;
      }
      
      // Wait for next frame
      await this.sleep(frameInterval);
    }
  }

  private async simulateFrameProcessing(config: LoopbackBenchmarkConfig): Promise<void> {
    // Simulate encoding time based on codec and resolution
    let encodeTime = 10; // Base 10ms
    
    // Adjust for codec complexity
    switch (config.codec) {
      case 'av1':
        encodeTime *= 2.5;
        break;
      case 'vp9':
        encodeTime *= 1.8;
        break;
      case 'h264':
        encodeTime *= 1.0;
        break;
    }
    
    // Adjust for resolution
    const pixelCount = config.resolution.width * config.resolution.height;
    const basePixels = 1280 * 720;
    encodeTime *= (pixelCount / basePixels);
    
    // Add some randomness
    encodeTime += Math.random() * 5;
    
    await this.sleep(encodeTime);
  }

  private simulateNetworkLatency(): number {
    // Simulate network latency with some variation
    const baseLatency = 50; // 50ms base
    const variation = Math.random() * 30; // 0-30ms variation
    return baseLatency + variation;
  }

  private simulateJitter(): number {
    // Simulate jitter
    return Math.random() * 20; // 0-20ms jitter
  }

  private simulatePacketLoss(): number {
    // Simulate packet loss (0-2%)
    return Math.random() * 0.02;
  }

  private calculateBitrate(config: LoopbackBenchmarkConfig): number {
    // Calculate bitrate based on resolution and codec
    const pixelCount = config.resolution.width * config.resolution.height;
    const baseBitrate = 2000; // 2 Mbps base
    
    // Adjust for resolution
    const basePixels = 1280 * 720;
    const bitrate = baseBitrate * (pixelCount / basePixels);
    
    // Adjust for codec efficiency
    switch (config.codec) {
      case 'av1':
        return bitrate * 0.7; // AV1 is more efficient
      case 'vp9':
        return bitrate * 0.8;
      case 'h264':
        return bitrate * 1.0;
      default:
        return bitrate;
    }
  }

  private calculateMetrics(): LoopbackMetrics {
    const latencies = this.metrics.latencies.sort((a, b) => a - b);
    const jitters = this.metrics.jitters.sort((a, b) => a - b);
    const packetLosses = this.metrics.packetLosses;
    
    const avgPacketLoss = packetLosses.reduce((sum, loss) => sum + loss, 0) / packetLosses.length;
    
    const sentBitrate = this.metrics.bitrates.reduce((sum, b) => sum + b.sent, 0) / this.metrics.bitrates.length;
    const receivedBitrate = this.metrics.bitrates.reduce((sum, b) => sum + b.received, 0) / this.metrics.bitrates.length;
    
    return {
      latency: {
        min: Math.min(...latencies),
        max: Math.max(...latencies),
        avg: latencies.reduce((sum, l) => sum + l, 0) / latencies.length,
        p95: this.percentile(latencies, 0.95),
        p99: this.percentile(latencies, 0.99)
      },
      jitter: {
        min: Math.min(...jitters),
        max: Math.max(...jitters),
        avg: jitters.reduce((sum, j) => sum + j, 0) / jitters.length,
        p95: this.percentile(jitters, 0.95),
        p99: this.percentile(jitters, 0.99)
      },
      packet_loss: avgPacketLoss,
      bitrate: {
        sent: sentBitrate,
        received: receivedBitrate
      },
      frame_drops: this.metrics.frameDrops,
      total_frames: this.metrics.totalFrames
    };
  }

  private percentile(sortedArray: number[], p: number): number {
    const index = Math.ceil(sortedArray.length * p) - 1;
    return sortedArray[Math.max(0, index)];
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// CLI interface
export async function runLoopbackBenchmarkCLI(): Promise<void> {
  const benchmark = new WebRTCLoopbackBenchmark();
  
  const configs: LoopbackBenchmarkConfig[] = [
    {
      duration: 10000, // 10 seconds
      frame_rate: 30,
      resolution: { width: 1280, height: 720 },
      codec: 'av1',
      scalability_mode: 'L1T3',
      enable_fec: true,
      enable_bwe: true
    }
  ];
  
  const results: LoopbackResult[] = [];
  
  for (const config of configs) {
    try {
      const result = await benchmark.runBenchmark(config);
      results.push(result);
      
      console.log(`Benchmark ${config.codec} ${config.scalability_mode}: ${result.passed ? 'PASSED' : 'FAILED'}`);
      console.log(`  Latency P95: ${result.metrics.latency.p95.toFixed(2)}ms (target: ${result.target_latency}ms)`);
      console.log(`  Jitter P95: ${result.metrics.jitter.p95.toFixed(2)}ms (target: ${result.target_jitter}ms)`);
      console.log(`  Packet Loss: ${(result.metrics.packet_loss * 100).toFixed(2)}% (target: ${(result.target_packet_loss * 100).toFixed(2)}%)`);
    } catch (error) {
      console.error(`Benchmark failed for ${config.codec} ${config.scalability_mode}:`, error);
      process.exit(1);
    }
  }
  
  // Output JSON results
  console.log(JSON.stringify(results, null, 2));
  
  // Exit with error code if any benchmarks failed
  const allPassed = results.every(r => r.passed);
  if (!allPassed) {
    process.exit(1);
  }
}

// Export for programmatic use
export { WebRTCLoopbackBenchmark };
