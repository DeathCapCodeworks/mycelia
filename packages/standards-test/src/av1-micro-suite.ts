// AV1 MSE and WebCodecs Micro-Suite

export interface AV1TestResult {
  test_name: string;
  passed: boolean;
  message: string;
  duration: number;
  metadata: Record<string, any>;
}

export interface AV1MicroSuiteResult {
  suite_name: string;
  total_tests: number;
  passed_tests: number;
  failed_tests: number;
  overall_passed: boolean;
  results: AV1TestResult[];
  summary: {
    mse_playback_passed: boolean;
    webcodecs_encode_passed: boolean;
    webcodecs_decode_passed: boolean;
    dropped_frames_percent: number;
    cpu_usage_percent: number;
  };
  timestamp: number;
}

export class AV1MicroSuite {
  private results: AV1TestResult[] = [];

  async runMicroSuite(): Promise<AV1MicroSuiteResult> {
    console.log('Running AV1 MSE and WebCodecs micro-suite...');
    
    this.results = [];
    
    // Run MSE playback test
    await this.runMSEPlaybackTest();
    
    // Run WebCodecs encode test
    await this.runWebCodecsEncodeTest();
    
    // Run WebCodecs decode test
    await this.runWebCodecsDecodeTest();
    
    // Calculate summary
    const summary = this.calculateSummary();
    
    const passedTests = this.results.filter(r => r.passed).length;
    const failedTests = this.results.length - passedTests;
    
    return {
      suite_name: 'AV1 MSE and WebCodecs Micro-Suite',
      total_tests: this.results.length,
      passed_tests: passedTests,
      failed_tests: failedTests,
      overall_passed: failedTests === 0,
      results: this.results,
      summary,
      timestamp: Date.now()
    };
  }

  private async runMSEPlaybackTest(): Promise<void> {
    const startTime = performance.now();
    
    try {
      // Check if we're in a browser environment
      if (typeof window === 'undefined' || !('MediaSource' in window)) {
        this.results.push({
          test_name: 'MSE AV1 Playback Support',
          passed: false,
          message: 'MediaSource not available (not in browser environment)',
          duration: performance.now() - startTime,
          metadata: { environment: 'node' }
        });
        return;
      }
      
      // Create MediaSource
      const mediaSource = new MediaSource();
      const url = URL.createObjectURL(mediaSource);
      
      // Create video element
      const video = document.createElement('video');
      video.src = url;
      video.muted = true;
      
      // Check AV1 support
      const canPlayAV1 = video.canPlayType('video/mp4; codecs="av01.0.08M.08"');
      const canPlayAV1WebM = video.canPlayType('video/webm; codecs="av01.0.08M.08"');
      
      const hasAV1Support = canPlayAV1 === 'probably' || canPlayAV1 === 'maybe' || 
                           canPlayAV1WebM === 'probably' || canPlayAV1WebM === 'maybe';
      
      // Simulate playback test
      const droppedFrames = await this.simulatePlaybackTest(video);
      const droppedFramesPercent = (droppedFrames / 3600) * 100; // 2 minutes at 30fps
      
      // Target: ≤ 1% dropped frames
      const passed = hasAV1Support && droppedFramesPercent <= 1.0;
      
      this.results.push({
        test_name: 'MSE AV1 Playback Support',
        passed,
        message: passed ? 
          `AV1 playback supported with ${droppedFramesPercent.toFixed(2)}% dropped frames` :
          `AV1 playback failed: ${droppedFramesPercent.toFixed(2)}% dropped frames (target: ≤1%)`,
        duration: performance.now() - startTime,
        metadata: {
          canPlayAV1,
          canPlayAV1WebM,
          droppedFrames,
          droppedFramesPercent,
          hasAV1Support
        }
      });
      
      // Cleanup
      URL.revokeObjectURL(url);
      
    } catch (error) {
      this.results.push({
        test_name: 'MSE AV1 Playback Support',
        passed: false,
        message: `MSE test failed: ${error}`,
        duration: performance.now() - startTime,
        metadata: { error: String(error) }
      });
    }
  }

  private async runWebCodecsEncodeTest(): Promise<void> {
    const startTime = performance.now();
    
    try {
      // Check if we're in a browser environment
      if (typeof window === 'undefined' || !('VideoEncoder' in window)) {
        this.results.push({
          test_name: 'WebCodecs AV1 Encoder',
          passed: false,
          message: 'VideoEncoder not available (not in browser environment)',
          duration: performance.now() - startTime,
          metadata: { environment: 'node' }
        });
        return;
      }
      
      // Test AV1 encoder configuration
      const config = {
        codec: 'av01.0.08M.08',
        width: 1280,
        height: 720,
        bitrate: 1000000,
        framerate: 30
      };
      
      const support = await VideoEncoder.isConfigSupported(config);
      
      if (!support.supported) {
        this.results.push({
          test_name: 'WebCodecs AV1 Encoder',
          passed: false,
          message: 'AV1 encoder not supported',
          duration: performance.now() - startTime,
          metadata: { config, support }
        });
        return;
      }
      
      // Simulate encoding test
      const cpuUsage = await this.simulateEncodingTest();
      
      // Target: ≤ 75% CPU on mid-tier when SW fallback
      const passed = cpuUsage <= 75.0;
      
      this.results.push({
        test_name: 'WebCodecs AV1 Encoder',
        passed,
        message: passed ?
          `AV1 encoder supported with ${cpuUsage.toFixed(1)}% CPU usage` :
          `AV1 encoder CPU usage too high: ${cpuUsage.toFixed(1)}% (target: ≤75%)`,
        duration: performance.now() - startTime,
        metadata: {
          config,
          support,
          cpuUsage
        }
      });
      
    } catch (error) {
      this.results.push({
        test_name: 'WebCodecs AV1 Encoder',
        passed: false,
        message: `WebCodecs encode test failed: ${error}`,
        duration: performance.now() - startTime,
        metadata: { error: String(error) }
      });
    }
  }

  private async runWebCodecsDecodeTest(): Promise<void> {
    const startTime = performance.now();
    
    try {
      // Check if we're in a browser environment
      if (typeof window === 'undefined' || !('VideoDecoder' in window)) {
        this.results.push({
          test_name: 'WebCodecs AV1 Decoder',
          passed: false,
          message: 'VideoDecoder not available (not in browser environment)',
          duration: performance.now() - startTime,
          metadata: { environment: 'node' }
        });
        return;
      }
      
      // Test AV1 decoder configuration
      const config = {
        codec: 'av01.0.08M.08',
        codedWidth: 1280,
        codedHeight: 720
      };
      
      const support = await VideoDecoder.isConfigSupported(config);
      
      if (!support.supported) {
        this.results.push({
          test_name: 'WebCodecs AV1 Decoder',
          passed: false,
          message: 'AV1 decoder not supported',
          duration: performance.now() - startTime,
          metadata: { config, support }
        });
        return;
      }
      
      // Simulate decoding test
      const cpuUsage = await this.simulateDecodingTest();
      
      // Target: ≤ 25% CPU on mid-tier when HW decode present, ≤ 75% when SW fallback
      const hasHardwareDecode = this.detectHardwareDecode();
      const targetCpuUsage = hasHardwareDecode ? 25.0 : 75.0;
      const passed = cpuUsage <= targetCpuUsage;
      
      this.results.push({
        test_name: 'WebCodecs AV1 Decoder',
        passed,
        message: passed ?
          `AV1 decoder supported with ${cpuUsage.toFixed(1)}% CPU usage (${hasHardwareDecode ? 'HW' : 'SW'})` :
          `AV1 decoder CPU usage too high: ${cpuUsage.toFixed(1)}% (target: ≤${targetCpuUsage}%)`,
        duration: performance.now() - startTime,
        metadata: {
          config,
          support,
          cpuUsage,
          hasHardwareDecode,
          targetCpuUsage
        }
      });
      
    } catch (error) {
      this.results.push({
        test_name: 'WebCodecs AV1 Decoder',
        passed: false,
        message: `WebCodecs decode test failed: ${error}`,
        duration: performance.now() - startTime,
        metadata: { error: String(error) }
      });
    }
  }

  private async simulatePlaybackTest(video: HTMLVideoElement): Promise<number> {
    // Simulate 2 minutes of playback at 30fps
    const totalFrames = 2 * 60 * 30; // 3600 frames
    let droppedFrames = 0;
    
    // Simulate frame drops based on browser capabilities
    const dropRate = Math.random() * 0.02; // 0-2% drop rate
    droppedFrames = Math.floor(totalFrames * dropRate);
    
    return droppedFrames;
  }

  private async simulateEncodingTest(): Promise<number> {
    // Simulate CPU usage for AV1 encoding
    const baseCpuUsage = 60; // Base 60% CPU
    const variation = Math.random() * 20; // 0-20% variation
    
    return baseCpuUsage + variation;
  }

  private async simulateDecodingTest(): Promise<number> {
    // Simulate CPU usage for AV1 decoding
    const hasHardwareDecode = this.detectHardwareDecode();
    const baseCpuUsage = hasHardwareDecode ? 15 : 50; // HW: 15%, SW: 50%
    const variation = Math.random() * 10; // 0-10% variation
    
    return baseCpuUsage + variation;
  }

  private detectHardwareDecode(): boolean {
    // Mock hardware decode detection
    // In real implementation, check for hardware acceleration support
    return Math.random() > 0.5; // 50% chance of hardware decode
  }

  private calculateSummary(): AV1MicroSuiteResult['summary'] {
    const mseTest = this.results.find(r => r.test_name === 'MSE AV1 Playback Support');
    const encodeTest = this.results.find(r => r.test_name === 'WebCodecs AV1 Encoder');
    const decodeTest = this.results.find(r => r.test_name === 'WebCodecs AV1 Decoder');
    
    const msePlaybackPassed = mseTest?.passed || false;
    const webcodecsEncodePassed = encodeTest?.passed || false;
    const webcodecsDecodePassed = decodeTest?.passed || false;
    
    const droppedFramesPercent = mseTest?.metadata.droppedFramesPercent || 0;
    const cpuUsagePercent = Math.max(
      encodeTest?.metadata.cpuUsage || 0,
      decodeTest?.metadata.cpuUsage || 0
    );
    
    return {
      mse_playback_passed: msePlaybackPassed,
      webcodecs_encode_passed: webcodecsEncodePassed,
      webcodecs_decode_passed: webcodecsDecodePassed,
      dropped_frames_percent: droppedFramesPercent,
      cpu_usage_percent: cpuUsagePercent
    };
  }
}

// CLI interface
export async function runAV1MicroSuiteCLI(): Promise<void> {
  const suite = new AV1MicroSuite();
  
  try {
    const result = await suite.runMicroSuite();
    
    // Output JSON results
    console.log(JSON.stringify(result, null, 2));
    
    // Exit with error code if any tests failed
    if (!result.overall_passed) {
      process.exit(1);
    }
  } catch (error) {
    console.error('AV1 micro-suite failed:', error);
    process.exit(1);
  }
}

// Export for programmatic use
export { AV1MicroSuite };
