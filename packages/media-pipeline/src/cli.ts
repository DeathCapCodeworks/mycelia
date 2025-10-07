#!/usr/bin/env node
// Media Pipeline CLI - Benchmarks and performance testing

import { MediaPipeline, EncodeOptions, TranscodeOptions, EffectOptions } from './index.js';

interface BenchmarkConfig {
  iterations: number;
  codecs: ('av1' | 'vp9' | 'h264')[];
  qualityProfiles: ('speed' | 'balanced' | 'quality')[];
  resolutions: { width: number; height: number; name: string }[];
  effects: EffectOptions['type'][];
}

const DEFAULT_CONFIG: BenchmarkConfig = {
  iterations: 10,
  codecs: ['h264', 'vp9', 'av1'],
  qualityProfiles: ['speed', 'balanced', 'quality'],
  resolutions: [
    { width: 640, height: 480, name: '480p' },
    { width: 1280, height: 720, name: '720p' },
    { width: 1920, height: 1080, name: '1080p' },
    { width: 3840, height: 2160, name: '4K' }
  ],
  effects: ['blur', 'brightness', 'contrast', 'noise_reduction', 'background_removal']
};

function generateTestData(sizeBytes: number): Uint8Array {
  const data = new Uint8Array(sizeBytes);
  for (let i = 0; i < sizeBytes; i++) {
    data[i] = Math.floor(Math.random() * 256);
  }
  return data;
}

async function benchmarkEncode(pipeline: MediaPipeline, config: BenchmarkConfig): Promise<void> {
  console.log('\n=== Encode Benchmark ===');
  
  for (const codec of config.codecs) {
    for (const quality of config.qualityProfiles) {
      for (const resolution of config.resolutions) {
        console.log(`\nTesting ${codec} ${quality} ${resolution.name}...`);
        
        const testData = generateTestData(resolution.width * resolution.height * 3); // RGB data
        const encodeOptions: EncodeOptions = {
          input: testData,
          codec,
          bitrate: resolution.width * resolution.height * 0.1, // Rough bitrate estimate
          fps: 30,
          width: resolution.width,
          height: resolution.height,
          hardwarePreferred: true
        };

        const times: number[] = [];
        
        for (let i = 0; i < config.iterations; i++) {
          const start = performance.now();
          const stream = await pipeline.encode(encodeOptions);
          
          // Consume the stream
          for await (const chunk of stream) {
            // Process chunk
          }
          
          const end = performance.now();
          times.push(end - start);
        }

        const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
        const minTime = Math.min(...times);
        const maxTime = Math.max(...times);
        
        console.log(`  Average: ${avgTime.toFixed(2)}ms`);
        console.log(`  Min: ${minTime.toFixed(2)}ms, Max: ${maxTime.toFixed(2)}ms`);
        console.log(`  Throughput: ${(testData.length / avgTime * 1000 / 1024 / 1024).toFixed(2)} MB/s`);
      }
    }
  }
}

async function benchmarkTranscode(pipeline: MediaPipeline, config: BenchmarkConfig): Promise<void> {
  console.log('\n=== Transcode Benchmark ===');
  
  const testData = generateTestData(1920 * 1080 * 3); // 1080p RGB data
  
  for (const targetCodec of config.codecs) {
    for (const quality of config.qualityProfiles) {
      console.log(`\nTesting transcode to ${targetCodec} ${quality}...`);
      
      const transcodeOptions: TranscodeOptions = {
        input: testData,
        targetCodec,
        qualityProfile: quality
      };

      const times: number[] = [];
      
      for (let i = 0; i < config.iterations; i++) {
        const start = performance.now();
        await pipeline.transcode(transcodeOptions);
        const end = performance.now();
        times.push(end - start);
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      console.log(`  Average: ${avgTime.toFixed(2)}ms`);
    }
  }
}

async function benchmarkEffects(pipeline: MediaPipeline, config: BenchmarkConfig): Promise<void> {
  console.log('\n=== Effects Benchmark ===');
  
  const testData = generateTestData(1920 * 1080 * 3); // 1080p RGB data
  
  for (const effectType of config.effects) {
    console.log(`\nTesting ${effectType} effect...`);
    
    const effectOptions: EffectOptions = {
      type: effectType,
      intensity: 0.5
    };

    const times: number[] = [];
    
    for (let i = 0; i < config.iterations; i++) {
      const start = performance.now();
      await pipeline.applyEffect(testData, effectOptions);
      const end = performance.now();
      times.push(end - start);
    }

    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    console.log(`  Average: ${avgTime.toFixed(2)}ms`);
  }
}

async function runBenchmarks(): Promise<void> {
  const pipeline = new MediaPipeline();
  
  console.log('Media Pipeline Benchmark Suite');
  console.log('==============================');
  
  const startTime = performance.now();
  
  await benchmarkEncode(pipeline, DEFAULT_CONFIG);
  await benchmarkTranscode(pipeline, DEFAULT_CONFIG);
  await benchmarkEffects(pipeline, DEFAULT_CONFIG);
  
  const totalTime = performance.now() - startTime;
  
  console.log('\n=== Summary ===');
  console.log(`Total benchmark time: ${(totalTime / 1000).toFixed(2)}s`);
  
  const avgStats = pipeline.getAverageStats();
  console.log('\nAverage Pipeline Stats:');
  console.log(`  Encode Time: ${avgStats.encodeTime.toFixed(2)}ms`);
  console.log(`  Compression Ratio: ${(avgStats.compressionRatio * 100).toFixed(1)}%`);
  console.log(`  Average FPS: ${avgStats.fps.toFixed(1)}`);
  console.log(`  Average Bitrate: ${(avgStats.bitrate / 1000).toFixed(1)} kbps`);
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'bench':
    case 'benchmark':
      await runBenchmarks();
      break;
    case 'encode':
      console.log('Encode command - use bench for full testing');
      break;
    case 'transcode':
      console.log('Transcode command - use bench for full testing');
      break;
    case 'effects':
      console.log('Effects command - use bench for full testing');
      break;
    case 'help':
    default:
      console.log('Media Pipeline CLI');
      console.log('Usage:');
      console.log('  bench     - Run full benchmark suite');
      console.log('  encode    - Encode test (placeholder)');
      console.log('  transcode - Transcode test (placeholder)');
      console.log('  effects   - Effects test (placeholder)');
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => { console.error(e); process.exit(1); });
}