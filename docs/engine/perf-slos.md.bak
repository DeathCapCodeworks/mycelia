# Performance SLOs and CI Gates

This document outlines the performance Service Level Objectives (SLOs) and CI gates for AV1 encoding, decoding, and playback in the Web4 Engine.

## Performance Targets

### VOD AV1 1080p30 High Quality
- **Target**: ≤ 1.5× realtime encode on mid-tier CPU OR hardware encode active
- **Test Duration**: 30 seconds
- **Sample Frames**: 900 frames
- **Hardware Acceleration**: Should be active when available

### RTC AV1 SVC 720p30 Low Delay
- **Target**: ≤ 0.8× realtime encode for low delay
- **Test Duration**: 10 seconds
- **Sample Frames**: 300 frames
- **Hardware Acceleration**: Preferred for realtime

### MSE AV1 Playback
- **Target**: ≤ 1% dropped frames over 2 minute sample
- **Test Duration**: 2 minutes
- **Sample Frames**: 3600 frames (30fps)
- **Hardware Decode**: Preferred when available

### WebCodecs AV1 Decode
- **Target**: ≤ 25% CPU on mid-tier when hardware decode present, ≤ 75% when software fallback
- **Test Duration**: 30 seconds
- **Hardware Detection**: Automatic fallback based on capabilities

## Hardware Tiers

### Mid-Tier CPU Baseline
- **CPU Cores**: 4
- **CPU Frequency**: 2.5 GHz
- **Memory**: 8 GB RAM
- **Platform**: Cross-platform (Windows, macOS, Linux)

## CI Gates

The performance gates are enforced in `.github/workflows/perf-gates.yml` and run on:
- Ubuntu Latest
- Windows Latest
- macOS Latest

### Gate Conditions
- All benchmarks must pass their targets
- Hardware acceleration must be detected and used when available
- Software fallback must meet CPU usage targets
- Quarantine label can bypass gates for testing

### Benchmark Commands
```bash
# Media Pipeline Benchmarks
cd packages/media-pipeline
pnpm run bench:media

# WebRTC Enhanced Benchmarks
cd packages/webrtc-enhanced
pnpm run bench:webrtc

# AV1 Standards Tests
cd packages/standards-test
pnpm run bench:av1
```

## Reproducing Locally

### Prerequisites
- Node.js 20.16.0
- pnpm 8
- Hardware with AV1 support (optional)

### Running Benchmarks
```bash
# Install dependencies
pnpm install --frozen-lockfile

# Build packages
pnpm run build

# Run media pipeline benchmarks
pnpm --filter @mycelia/media-pipeline run bench:media

# Run WebRTC benchmarks
pnpm --filter @mycelia/webrtc-enhanced run bench:webrtc

# Run AV1 standards tests
pnpm --filter @mycelia/standards-test run bench:av1
```

### Expected Output
Each benchmark outputs JSON results with:
- Pass/fail status
- Actual vs target metrics
- Hardware acceleration status
- Performance statistics

### Troubleshooting

#### Hardware Acceleration Not Detected
1. Check GPU drivers are up to date
2. Verify AV1 support in browser
3. Check WebCodecs support
4. Use software fallback for testing

#### Benchmarks Failing
1. Check system resources (CPU, memory)
2. Verify Node.js version (20.16.0)
3. Check for background processes
4. Use quarantine label for CI testing

#### Performance Issues
1. Monitor CPU usage during benchmarks
2. Check for thermal throttling
3. Verify hardware acceleration is active
4. Compare with baseline metrics

## Configuration

Benchmark targets can be adjusted in `packages/media-pipeline/bench/profiles.json`:

```json
{
  "targets": {
    "vod_1080p30_high": {
      "targets": {
        "encode_time_ratio": {
          "target": 1.5,
          "unit": "ratio"
        }
      }
    }
  }
}
```

## Monitoring

Performance metrics are tracked in:
- CI artifacts (benchmark results)
- Local storage (compatibility matrix)
- Observability events (SLO violations)

## Rollback Procedures

If performance gates fail:
1. Check CI logs for specific failures
2. Identify regression in recent changes
3. Use quarantine label to bypass gates
4. Fix performance issues
5. Re-run benchmarks
6. Remove quarantine label

## Future Improvements

- Dynamic target adjustment based on hardware
- Machine learning for performance prediction
- Real-time performance monitoring
- Automated performance regression detection
