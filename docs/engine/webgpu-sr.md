# WebGPU Super-Resolution

This document describes Mycelia's WebGPU super-resolution implementation for enhancing video quality using on-device AI acceleration.

## Overview

WebGPU Super-Resolution (SR) provides AI-powered video upscaling using WebGPU compute shaders, with WASM fallback for broader compatibility. This feature enhances perceived video quality without requiring server-side processing.

## Architecture

### WebGPU Pipeline

1. **Input Processing:** Extract video frames from HTMLVideoElement
2. **GPU Upload:** Transfer frame data to WebGPU textures
3. **Compute Shaders:** Run AI upscaling algorithms on GPU
4. **Output Download:** Retrieve enhanced frames from GPU
5. **Canvas Rendering:** Display enhanced video

### WASM Fallback

When WebGPU is unavailable:
1. **Frame Extraction:** Same as WebGPU pipeline
2. **WASM Processing:** Run optimized C++ upscaling algorithms
3. **Canvas Rendering:** Display enhanced video

## API Reference

### Basic Usage

```typescript
import { sr } from '@mycelia/webgpu-sr';

// Upscale video element
const result = await sr.upscale(videoElement, {
  scale: 2.0,
  quality: 'high',
  fallbackToWasm: true
});

console.log('Processing method:', result.method);
console.log('Processing time:', result.processingTimeMs);
```

### Configuration Options

```typescript
interface SuperResolutionOptions {
  scale: 1.5 | 2.0;           // Upscaling factor
  quality: 'fast' | 'high';   // Quality vs speed tradeoff
  fallbackToWasm?: boolean;   // Enable WASM fallback
}
```

### Result Object

```typescript
interface SuperResolutionResult {
  success: boolean;           // Whether processing succeeded
  method: 'webgpu' | 'wasm' | 'none';  // Processing method used
  processingTimeMs: number;   // Processing time in milliseconds
  outputWidth: number;        // Enhanced video width
  outputHeight: number;        // Enhanced video height
  error?: string;             // Error message if failed
}
```

## Capability Detection

### Check WebGPU Support

```typescript
import { sr } from '@mycelia/webgpu-sr';

// Check WebGPU availability
const webgpuAvailable = sr.isWebGPUAvailable();
console.log('WebGPU available:', webgpuAvailable);

// Check WASM fallback
const wasmAvailable = sr.isWasmAvailable();
console.log('WASM available:', wasmAvailable);

// Get detailed capabilities
const capabilities = sr.getCapabilities();
console.log('Adapter info:', capabilities.adapterInfo);
```

### Capability Object

```typescript
interface WebGPUCapabilities {
  available: boolean;                    // WebGPU support
  computeShaderSupport: boolean;        // Compute shader support
  storageTextureSupport: boolean;       // Storage texture support
  adapterInfo?: GPUAdapterInfo;        // GPU adapter details
}
```

## Implementation Details

### WebGPU Compute Shaders

The super-resolution algorithm uses compute shaders for parallel processing:

```wgsl
// Example compute shader (simplified)
@group(0) @binding(0) var inputTexture: texture_2d<f32>;
@group(0) @binding(1) var outputTexture: texture_storage_2d<rgba8unorm, write>;

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let dims = textureDimensions(inputTexture);
    let coord = vec2<i32>(global_id.xy);
    
    if (coord.x >= i32(dims.x) || coord.y >= i32(dims.y)) {
        return;
    }
    
    // Super-resolution algorithm
    let color = textureLoad(inputTexture, coord, 0);
    let enhanced = enhancePixel(color);
    
    textureStore(outputTexture, coord, enhanced);
}
```

### WASM Implementation

The WASM fallback uses optimized C++ algorithms:

```cpp
// Example WASM function (simplified)
extern "C" {
    uint8_t* processFrame(uint8_t* inputData, int width, int height, float scale) {
        // Allocate output buffer
        int outputWidth = width * scale;
        int outputHeight = height * scale;
        uint8_t* outputData = new uint8_t[outputWidth * outputHeight * 4];
        
        // Process each pixel
        for (int y = 0; y < outputHeight; y++) {
            for (int x = 0; x < outputWidth; x++) {
                // Super-resolution algorithm
                processPixel(inputData, outputData, x, y, width, height, scale);
            }
        }
        
        return outputData;
    }
}
```

## Performance Considerations

### Hardware Requirements

**WebGPU:**
- Modern GPU with compute shader support
- Chrome 113+ or Firefox 110+
- Windows 10+, macOS 10.15+, or Linux

**WASM:**
- Any modern CPU
- All major browsers
- Lower performance than WebGPU

### Performance Metrics

Typical performance on mid-range hardware:

| Method | Resolution | Scale | FPS | CPU Usage |
|--------|------------|-------|-----|-----------|
| WebGPU | 1080p | 2.0x | 30+ | Low |
| WASM | 1080p | 2.0x | 15-20 | High |
| WebGPU | 720p | 1.5x | 60+ | Low |
| WASM | 720p | 1.5x | 25-30 | Medium |

### Optimization Tips

1. **Scale Selection:** Use 1.5x for real-time, 2.0x for quality
2. **Quality Settings:** Use 'fast' for live streams, 'high' for VOD
3. **Frame Rate:** Limit to 30fps for better performance
4. **Resolution:** Lower input resolution improves performance

## Integration Examples

### React Component

```tsx
import React, { useRef, useEffect, useState } from 'react';
import { sr } from '@mycelia/webgpu-sr';

const VideoEnhancer: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [srEnabled, setSrEnabled] = useState(false);
  const [capabilities, setCapabilities] = useState(null);

  useEffect(() => {
    const caps = sr.getCapabilities();
    setCapabilities(caps);
  }, []);

  const handleEnhance = async () => {
    if (!videoRef.current) return;

    const result = await sr.upscale(videoRef.current, {
      scale: 2.0,
      quality: 'high'
    });

    console.log('Enhancement result:', result);
  };

  return (
    <div>
      <video ref={videoRef} src="video.mp4" />
      <button onClick={handleEnhance} disabled={!capabilities?.available}>
        Enhance Video
      </button>
    </div>
  );
};
```

### Media Pipeline Integration

```typescript
import { MediaPipeline } from '@mycelia/media-pipeline';
import { sr } from '@mycelia/webgpu-sr';

class EnhancedMediaPipeline extends MediaPipeline {
  private srEnabled = false;

  async processFrame(frame: VideoFrame): Promise<VideoFrame> {
    if (!this.srEnabled) {
      return super.processFrame(frame);
    }

    // Convert VideoFrame to HTMLVideoElement
    const videoElement = this.frameToVideoElement(frame);
    
    // Apply super-resolution
    const result = await sr.upscale(videoElement, {
      scale: 1.5,
      quality: 'fast'
    });

    if (result.success) {
      return this.videoElementToFrame(videoElement);
    }

    return super.processFrame(frame);
  }

  enableSuperResolution(enabled: boolean) {
    this.srEnabled = enabled && sr.isWebGPUAvailable();
  }
}
```

## Feature Flags

Super-resolution is controlled by feature flags:

```typescript
import { featureFlags } from '@mycelia/web4-feature-flags';

// Check if SR is enabled
const srEnabled = featureFlags.isFlagEnabled('engine_webgpu_sr');

// Enable SR for specific users
featureFlags.setFlag('engine_webgpu_sr', true, { userId: 'user123' });
```

## Error Handling

### Common Errors

**WebGPU Not Available:**
```typescript
const result = await sr.upscale(videoElement, options);
if (!result.success && result.method === 'none') {
  console.error('No processing method available');
  // Fallback to standard video playback
}
```

**WASM Fallback Failed:**
```typescript
const result = await sr.upscale(videoElement, { fallbackToWasm: false });
if (!result.success) {
  console.error('WebGPU processing failed:', result.error);
  // Retry with WASM fallback
}
```

### Error Recovery

```typescript
async function safeUpscale(videoElement: HTMLVideoElement, options: SuperResolutionOptions) {
  try {
    // Try WebGPU first
    const result = await sr.upscale(videoElement, { ...options, fallbackToWasm: false });
    if (result.success) return result;

    // Fallback to WASM
    return await sr.upscale(videoElement, { ...options, fallbackToWasm: true });
  } catch (error) {
    console.error('Super-resolution failed:', error);
    return { success: false, method: 'none', processingTimeMs: 0, outputWidth: 0, outputHeight: 0 };
  }
}
```

## Testing

### Unit Tests

```typescript
import { sr } from '@mycelia/webgpu-sr';

describe('Super-Resolution', () => {
  test('should detect WebGPU capabilities', () => {
    const capabilities = sr.getCapabilities();
    expect(capabilities).toBeDefined();
    expect(typeof capabilities.available).toBe('boolean');
  });

  test('should process test video', async () => {
    const videoElement = createTestVideoElement();
    const result = await sr.upscale(videoElement, { scale: 1.5, quality: 'fast' });
    
    expect(result.success).toBe(true);
    expect(result.processingTimeMs).toBeGreaterThan(0);
  });
});
```

### Performance Tests

```typescript
test('should meet performance targets', async () => {
  const videoElement = createTestVideoElement();
  const startTime = performance.now();
  
  const result = await sr.upscale(videoElement, { scale: 2.0, quality: 'high' });
  
  const processingTime = performance.now() - startTime;
  expect(processingTime).toBeLessThan(1000); // < 1 second
  expect(result.success).toBe(true);
});
```

## Browser Compatibility

### WebGPU Support

| Browser | Version | Status |
|---------|---------|--------|
| Chrome | 113+ | ✅ Supported |
| Firefox | 110+ | ✅ Supported |
| Safari | 16.4+ | ✅ Supported |
| Edge | 113+ | ✅ Supported |

### WASM Support

| Browser | Version | Status |
|---------|---------|--------|
| Chrome | 57+ | ✅ Supported |
| Firefox | 52+ | ✅ Supported |
| Safari | 11+ | ✅ Supported |
| Edge | 16+ | ✅ Supported |

## Troubleshooting

### WebGPU Issues

**"WebGPU not supported"**
- Update browser to latest version
- Enable WebGPU in browser flags
- Check GPU driver updates

**"Compute shader compilation failed"**
- Check GPU compatibility
- Verify WebGPU adapter limits
- Review shader code

### WASM Issues

**"WASM module failed to load"**
- Check network connectivity
- Verify WASM file integrity
- Review browser console for errors

**"WASM processing too slow"**
- Reduce input resolution
- Use lower quality settings
- Consider WebGPU fallback

## Future Enhancements

### Planned Features

1. **Multiple AI Models:** Support for different upscaling algorithms
2. **Real-time Processing:** Optimized for live video streams
3. **Custom Shaders:** User-defined enhancement algorithms
4. **Batch Processing:** Process multiple frames simultaneously

### Performance Improvements

1. **Shader Optimization:** More efficient compute shaders
2. **Memory Management:** Better GPU memory utilization
3. **Pipeline Optimization:** Reduced CPU-GPU transfers
4. **Adaptive Quality:** Dynamic quality based on performance

## Support

For WebGPU super-resolution issues:
- Check browser compatibility
- Review error messages in console
- Test with different video sources
- Contact the media team
- Submit issues to the Mycelia repository
