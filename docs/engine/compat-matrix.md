# Compatibility Matrix and Auto-Fallback

This document describes the compatibility matrix system that detects hardware capabilities and automatically falls back to software encoding/decoding when needed.

## Overview

The compatibility matrix system provides:
- Hardware capability detection
- Automatic fallback decisions
- Performance estimation
- Override controls for testing
- Anonymous capability aggregation

## Hardware Detection

### Operating System Detection
- **Windows**: Detected via user agent
- **macOS**: Detected via user agent
- **Linux**: Detected via user agent
- **Android**: Detected via user agent
- **iOS**: Detected via user agent

### GPU Driver Detection
Uses WebGL context to detect GPU drivers:
- **NVIDIA**: Detected via renderer string
- **AMD**: Detected via renderer string
- **Intel**: Detected via renderer string
- **Apple**: Detected via renderer string
- **Qualcomm**: Detected via renderer string
- **ARM**: Detected via renderer string

### Hardware Acceleration Detection

#### Encode Detection
1. **MediaCapabilities API**: Checks for hardware-accelerated decoding
2. **WebCodecs API**: Tests VideoEncoder configuration support
3. **Fallback**: Assumes software if not detected

#### Decode Detection
1. **MediaCapabilities API**: Checks for hardware-accelerated decoding
2. **WebCodecs API**: Tests VideoDecoder configuration support
3. **Fallback**: Assumes software if not detected

## Fallback Decisions

### Encode Path Selection
- **Hardware Available**: Use hardware acceleration
- **Hardware Unavailable**: Use software fallback
- **Override**: Manual override for testing

### Decode Path Selection
- **Hardware Available**: Use hardware acceleration
- **Hardware Unavailable**: Use software fallback
- **Override**: Manual override for testing

## Performance Estimation

### Encode Performance
- **Excellent**: Hardware acceleration available
- **Good**: Software fallback with good CPU
- **Fair**: Software fallback with average CPU
- **Poor**: Software fallback with poor CPU

### Decode Performance
- **Excellent**: Hardware acceleration available
- **Good**: Software fallback with good CPU
- **Fair**: Software fallback with average CPU
- **Poor**: Software fallback with poor CPU

### Confidence Scoring
Based on:
- Hardware detection success
- OS and GPU driver compatibility
- Known performance characteristics

## Supported Paths

### Windows
- **Media Foundation**: Hardware acceleration
- **DXVA2**: Hardware acceleration
- **Software**: SVT AV1 WASM fallback

### macOS
- **VideoToolbox**: Hardware acceleration
- **Software**: SVT AV1 WASM fallback

### Linux
- **VA-API**: Hardware acceleration
- **Software**: SVT AV1 WASM fallback

## Known Driver Quirks

### NVIDIA
- **Pros**: Excellent AV1 hardware support
- **Cons**: Driver updates required for latest features
- **Workaround**: Automatic driver detection

### AMD
- **Pros**: Good AV1 hardware support
- **Cons**: Inconsistent across generations
- **Workaround**: Fallback to software for older cards

### Intel
- **Pros**: Integrated graphics support
- **Cons**: Limited AV1 hardware support
- **Workaround**: Software fallback for older generations

### Apple
- **Pros**: Excellent hardware integration
- **Cons**: Limited to Apple hardware
- **Workaround**: VideoToolbox detection

## Override Controls

### Force Software
```javascript
import { engine } from '@mycelia/engine-bridge';

// Force software encoding/decoding
engine.overridePath('sw');
```

### Clear Override
```javascript
// Clear override and use automatic detection
engine.clearOverridePath();
```

### Check Override Status
```javascript
const overridePath = engine.getOverridePath();
console.log('Current override:', overridePath); // 'hw', 'sw', or null
```

## Demo Mode

### Enable Demo Mode
```javascript
import { compatMatrix } from '@mycelia/compat-matrix';

// Enable demo mode for capability aggregation
compatMatrix.enableDemoMode();
```

### Export Aggregated Data
```javascript
// Export aggregated compatibility data
const aggregatedData = compatMatrix.exportAggregatedData();
console.log(aggregatedData);
```

## Usage Examples

### Basic Detection
```javascript
import { compatMatrix } from '@mycelia/compat-matrix';

// Detect current capabilities
const capabilities = await compatMatrix.detect();

// Get compatibility result
const result = compatMatrix.getResult();

console.log('OS:', result.capabilities.os);
console.log('GPU Driver:', result.capabilities.gpu_driver);
console.log('Encode Path:', result.fallback_decisions.encode_path);
console.log('Decode Path:', result.fallback_decisions.decode_path);
```

### Performance Estimation
```javascript
const result = compatMatrix.getResult();

console.log('Encode Performance:', result.performance_estimate.encode_performance);
console.log('Decode Performance:', result.performance_estimate.decode_performance);
console.log('Confidence:', result.performance_estimate.confidence);
```

### Override Testing
```javascript
import { engine } from '@mycelia/engine-bridge';

// Test software fallback
engine.overridePath('sw');

// Run performance test
const result = await engine.mediaEncode(input, 'vod_1080p30_high');

// Clear override
engine.clearOverridePath();
```

## Troubleshooting

### Hardware Not Detected
1. Check WebGL context availability
2. Verify GPU drivers are installed
3. Check browser WebCodecs support
4. Use software fallback

### Performance Issues
1. Check hardware acceleration status
2. Monitor CPU usage
3. Verify fallback decisions
4. Test with override controls

### Detection Failures
1. Check browser compatibility
2. Verify WebGL support
3. Check for privacy restrictions
4. Use fallback detection methods

## Privacy Considerations

- No personal information is collected
- Only hardware capabilities are detected
- Anonymous aggregation only in demo mode
- Local storage only for user preferences

## Future Improvements

- Machine learning for performance prediction
- Real-time capability monitoring
- Dynamic fallback optimization
- Cross-platform compatibility database
