# Media Pipeline

The Media Pipeline is Mycelia's high-performance media processing engine that provides hardware-accelerated video and audio encoding, transcoding, and effects processing.

## Overview

The Media Pipeline leverages native hardware acceleration to deliver performance that's 10-100x faster than software-only solutions. It supports modern codecs, real-time effects, and adaptive quality control.

### Key Features

- **Hardware Acceleration**: GPU and specialized hardware utilization
- **Modern Codecs**: AV1, VP9, H.264 support with optimal settings
- **Real-time Effects**: Blur, brightness, contrast, noise reduction
- **Adaptive Quality**: Dynamic bitrate adjustment based on performance
- **Streaming Output**: Chunked encoding for real-time applications
- **Cross-Platform**: Consistent APIs across Windows, macOS, and Linux

## Architecture

### Core Components

**MediaPipeline Class**
The main interface for all media processing operations:

```typescript
import { MediaPipeline, EncodeOptions, TranscodeOptions, EffectOptions } from '@mycelia/media-pipeline';

const pipeline = new MediaPipeline();
```

**Encoding Engine**
Hardware-accelerated encoding with multiple codec support:

```typescript
const stream = await pipeline.encode({
  input: videoData,
  codec: 'av1',
  bitrate: 2000,
  fps: 30,
  width: 1920,
  height: 1080,
  hardwarePreferred: true
});
```

**Transcoding Engine**
Convert between different codecs and formats:

```typescript
const result = await pipeline.transcode({
  input: videoData,
  targetCodec: 'vp9',
  qualityProfile: 'balanced'
});
```

**Effects Engine**
Real-time video effects processing:

```typescript
const processed = await pipeline.applyEffect(videoData, {
  type: 'blur',
  intensity: 0.5,
  region: { x: 100, y: 100, width: 200, height: 200 }
});
```

## API Reference

### MediaPipeline Class

#### Constructor
```typescript
const pipeline = new MediaPipeline();
```

#### Methods

**encode(options: EncodeOptions): Promise<EncodedChunkStream>**
Encodes video/audio data with hardware acceleration.

```typescript
interface EncodeOptions {
  input: ArrayBuffer | Uint8Array;  // Input media data
  codec: 'av1' | 'vp9' | 'h264';    // Target codec
  bitrate: number;                   // Target bitrate in kbps
  fps: number;                       // Frames per second
  width: number;                     // Video width
  height: number;                    // Video height
  hardwarePreferred?: boolean;       // Use hardware acceleration
}
```

**transcode(options: TranscodeOptions): Promise<MediaFile>**
Converts media between different codecs and formats.

```typescript
interface TranscodeOptions {
  input: ArrayBuffer | Uint8Array;  // Input media data
  targetCodec: 'av1' | 'vp9' | 'h264'; // Target codec
  qualityProfile: 'speed' | 'balanced' | 'quality'; // Quality setting
}
```

**applyEffect(input: ArrayBuffer | Uint8Array, effect: EffectOptions): Promise<Uint8Array>**
Applies real-time effects to media data.

```typescript
interface EffectOptions {
  type: 'blur' | 'brightness' | 'contrast' | 'saturation' | 'noise_reduction' | 'background_removal';
  intensity: number;                // Effect intensity (0-1)
  region?: {                        // Optional region for localized effects
    x: number;
    y: number;
    width: number;
    height: number;
  };
}
```

**getStats(): MediaPipelineStat\1\[]**
Returns detailed performance statistics.

```typescript
interface MediaPipelineStats {
  encodeTime: number;               // Encoding time in milliseconds
  outputSize: number;               // Output data size in bytes
  compressionRatio: number;         // Compression ratio (0-1)
  fps: number;                      // Actual frames per second
  bitrate: number;                  // Actual bitrate in kbps
}
```

**getAverageStats(): MediaPipelineStats**
Returns average performance statistics across all operations.

**resetStats(): void**
Clears all performance statistics.

## Codec Support

### AV1 (AOMedia Video 1)
- **Best Compression**: Highest compression efficiency
- **Hardware Support**: Modern GPUs and specialized chips
- **Use Cases**: Streaming, archival, bandwidth-constrained scenarios
- **Performance**: Moderate encoding speed, excellent quality

### VP9
- **Good Compression**: High compression efficiency
- **Wide Support**: Broad hardware and software support
- **Use Cases**: Web streaming, YouTube, general video
- **Performance**: Good encoding speed, excellent quality

### H.264 (AVC)
- **Universal Support**: Supported everywhere
- **Fast Encoding**: Fastest encoding speed
- **Use Cases**: Real-time streaming, compatibility
- **Performance**: Fast encoding, good quality

## Quality Profiles

### Speed Profile
- **Priority**: Fastest encoding
- **Quality**: Good quality, larger file sizes
- **Use Cases**: Real-time applications, live streaming
- **Settings**: Lower complexity, faster algorithms

### Balanced Profile
- **Priority**: Balance of speed and quality
- **Quality**: High quality, moderate file sizes
- **Use Cases**: General purpose, most applications
- **Settings**: Medium complexity, balanced algorithms

### Quality Profile
- **Priority**: Best quality
- **Quality**: Highest quality, smallest file sizes
- **Use Cases**: Archival, high-quality streaming
- **Settings**: High complexity, best algorithms

## Effects Processing

### Available Effects

**Blur**
- **Purpose**: Reduce detail, create focus effects
- **Intensity**: 0 (no blur) to 1 (maximum blur)
- **Use Cases**: Privacy protection, artistic effects
- **Performance**: Fast processing

**Brightness**
- **Purpose**: Adjust overall brightness
- **Intensity**: -1 (darkest) to 1 (brightest)
- **Use Cases**: Exposure correction, artistic effects
- **Performance**: Very fast processing

**Contrast**
- **Purpose**: Adjust contrast between light and dark
- **Intensity**: -1 (lowest) to 1 (highest)
- **Use Cases**: Image enhancement, artistic effects
- **Performance**: Very fast processing

**Saturation**
- **Purpose**: Adjust color intensity
- **Intensity**: -1 (grayscale) to 1 (maximum saturation)
- **Use Cases**: Color correction, artistic effects
- **Performance**: Very fast processing

**Noise Reduction**
- **Purpose**: Remove digital noise and artifacts
- **Intensity**: 0 (no reduction) to 1 (maximum reduction)
- **Use Cases**: Video enhancement, low-light footage
- **Performance**: Moderate processing time

**Background Removal**
- **Purpose**: Remove or replace backgrounds
- **Intensity**: 0 (no removal) to 1 (complete removal)
- **Use Cases**: Video conferencing, content creation
- **Performance**: Slower processing, AI-powered

### Regional Effects

Effects can be applied to specific regions of the video:

```typescript
const processed = await pipeline.applyEffect(videoData, {
  type: 'blur',
  intensity: 0.7,
  region: {
    x: 100,      // Left edge
    y: 100,      // Top edge
    width: 200,  // Width of region
    height: 200  // Height of region
  }
});
```

## Performance Optimization

### Hardware Acceleration

The Media Pipeline automatically detects and uses available hardware:

- **GPU Acceleration**: NVIDIA, AMD, Intel GPUs
- **Specialized Chips**: Apple Silicon, Qualcomm Snapdragon
- **CPU Optimization**: SIMD instructions, multi-threading
- **Memory Management**: Efficient buffer management

### Performance Tuning

**Bitrate Optimization**
```typescript
// Start with conservative bitrate
const options = {
  bitrate: 1000,  // kbps
  // ... other options
};

// Monitor performance and adjust
const stats = pipeline.getAverageStats();
if (stats.encodeTime > 33) { // Target 30fps
  options.bitrate *= 0.9; // Reduce bitrate
}
```

**Quality vs Speed Trade-offs**
```typescript
// For real-time applications
const realtimeOptions = {
  qualityProfile: 'speed',
  hardwarePreferred: true
};

// For archival quality
const archivalOptions = {
  qualityProfile: 'quality',
  hardwarePreferred: false // Use best algorithms
};
```

## Benchmarking

### Built-in Benchmarks

The Media Pipeline includes comprehensive benchmarking tools:

```bash
# Run full benchmark suite
pnpm run bench:media

# Run specific benchmarks
pnpm --filter @mycelia/media-pipeline start -- bench
```

### Benchmark Results

The benchmark suite tests:

- **Encoding Performance**: Speed across different codecs and resolutions
- **Transcoding Performance**: Conversion between codecs
- **Effects Performance**: Processing time for different effects
- **Memory Usage**: Memory consumption during processing
- **Quality Metrics**: Compression ratios and quality scores

### Performance Targets

**Encoding Speed**
- **1080p H.264**: > 30fps real-time encoding
- **1080p VP9**: > 15fps encoding
- **1080p AV1**: > 5fps encoding

**Transcoding Speed**
- **H.264 to VP9**: < 2x real-time
- **VP9 to AV1**: < 3x real-time
- **Quality Profile**: < 5x real-time

**Effects Processing**
- **Simple Effects**: < 1ms per frame
- **Complex Effects**: < 10ms per frame
- **Background Removal**: < 100ms per frame

## Integration Examples

### Real-time Streaming

```typescript
import { MediaPipeline } from '@mycelia/media-pipeline';

const pipeline = new MediaPipeline();

// Configure for real-time streaming
const encodeOptions = {
  input: cameraStream,
  codec: 'h264',
  bitrate: 2000,
  fps: 30,
  width: 1280,
  height: 720,
  hardwarePreferred: true
};

// Stream encoded chunks
const stream = await pipeline.encode(encodeOptions);
for await (const chunk of stream) {
  // Send chunk to streaming server
  await sendToStreamingServer(chunk);
}
```

### Video Processing Pipeline

```typescript
// Process video with multiple effects
const pipeline = new MediaPipeline();

// Load video data
const videoData = await loadVideoFile('input.mp4');

// Apply effects in sequence
let processed = videoData;
processed = await pipeline.applyEffect(processed, {
  type: 'brightness',
  intensity: 0.2
});

processed = await pipeline.applyEffect(processed, {
  type: 'contrast',
  intensity: 0.1
});

processed = await pipeline.applyEffect(processed, {
  type: 'noise_reduction',
  intensity: 0.5
});

// Encode final result
const encoded = await pipeline.transcode({
  input: processed,
  targetCodec: 'av1',
  qualityProfile: 'quality'
});

await saveVideoFile('output.mp4', encoded.data);
```

### Adaptive Quality Control

```typescript
// Monitor performance and adjust quality
const pipeline = new MediaPipeline();

let currentBitrate = 2000;
const targetFPS = 30;

setInterval(async () => {
  const stats = pipeline.getAverageStats();
  
  if (stats.fps < targetFPS * 0.9) {
    // Reduce quality if performance is poor
    currentBitrate *= 0.9;
  } else if (stats.fps > targetFPS * 1.1) {
    // Increase quality if performance is good
    currentBitrate *= 1.1;
  }
  
  // Update encoding options
  const options = {
    input: currentStream,
    codec: 'h264',
    bitrate: currentBitrate,
    fps: targetFPS,
    width: 1920,
    height: 1080,
    hardwarePreferred: true
  };
  
  const stream = await pipeline.encode(options);
  // Use new stream...
}, 5000); // Check every 5 seconds
```

## Troubleshooting

### Common Issues

**Hardware Acceleration Not Working**
- Check GPU drivers are up to date
- Verify hardware supports the codec
- Try disabling hardware acceleration as fallback

**Poor Performance**
- Reduce bitrate or resolution
- Use 'speed' quality profile
- Check CPU/GPU utilization
- Monitor memory usage

**Quality Issues**
- Increase bitrate
- Use 'quality' profile
- Check input video quality
- Verify codec settings

### Debug Information

```typescript
// Get detailed performance stats
const stats = pipeline.getAverageStats();
console.log('Performance Stats:', {
  encodeTime: `${stats.encodeTime.toFixed(2)}ms`,
  compressionRatio: `${(stats.compressionRatio * 100).toFixed(1)}%`,
  fps: `${stats.fps.toFixed(1)}`,
  bitrate: `${stats.bitrate.toFixed(0)}kbps`
});

// Monitor individual operations
const startTime = performance.now();
const result = await pipeline.encode(options);
const duration = performance.now() - startTime;
console.log(`Encoding took ${duration.toFixed(2)}ms`);
```

## Future Enhancements

### Planned Features

- **AI-Powered Effects**: Machine learning-based effects
- **Real-time Analytics**: Live performance monitoring
- **Cloud Integration**: Distributed processing capabilities
- **Advanced Codecs**: Support for AV2 and future codecs

### Research Areas

- **Neural Compression**: AI-based video compression
- **Holographic Processing**: Support for 3D/holographic content
- **Quantum Processing**: Quantum-accelerated algorithms
- **Edge Computing**: Distributed processing across devices

The Media Pipeline represents the cutting edge of web-based media processing, delivering native-level performance through innovative hardware acceleration and optimization techniques.