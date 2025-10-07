# WebRTC Enhanced

WebRTC Enhanced extends the standard WebRTC API with advanced features for scalable video coding, SFU integration, and adaptive streaming. It provides enterprise-grade real-time communication capabilities.

## Overview

WebRTC Enhanced builds upon the standard WebRTC specification to provide:

- **Scalable Video Coding (SVC)**: Multiple spatial and temporal layers
- **SFU Integration**: Seamless connection to Selective Forwarding Units
- **Adaptive Bitrate**: Dynamic quality adjustment based on network conditions
- **Simulcast Support**: Multiple quality streams simultaneously
- **Low Latency**: Optimized for real-time communication
- **Advanced Statistics**: Detailed performance and quality metrics

## Architecture

### Core Components

**SFUClient Class**
Manages connections to Selective Forwarding Units:

```typescript
import { SFUClient } from '@mycelia/webrtc-enhanced';

const sfu = new SFUClient('wss://sfu.example.com', 'auth-token');
await sfu.connect();
```

**EnhancedPeer Class**
Advanced peer connections with scalability features:

```typescript
import { EnhancedPeer } from '@mycelia/webrtc-enhanced';

const peer = new EnhancedPeer('peer-id', {
  scalabilityMode: 'L3T3',
  targetBitrateKbps: 2000,
  enableAdaptiveBitrate: true
});
```

## API Reference

### SFUClient Class

#### Constructor
```typescript
const sfu = new SFUClient(url: string, token?: string);
```

#### Properties
- **id**: Unique client identifier
- **url**: SFU server URL
- **token**: Authentication token
- **peers**: Map of connected peers
- **connectionState**: Current connection state

#### Methods

**connect(): Promise<void>**
Establishes connection to the SFU server.

**disconnect(): Promise<void>**
Closes connection and cleans up resources.

**createPeer(options?: PeerOptions): Promise<Peer>**
Creates a new peer connection with specified options.

**removePeer(peerId: string): Promise<void>**
Removes and closes a peer connection.

**getPeers(): Peer[]**
Returns array of all connected peers.

**getStats(): Promise<SFUStats>**
Returns aggregated statistics for all peers.

```typescript
interface SFUStats {
  totalPeers: number;
  totalBitrate: number;
  avgRtt: number;
}
```

### EnhancedPeer Class

#### Constructor
```typescript
const peer = new EnhancedPeer(id: string, options?: PeerOptions);
```

#### Properties
- **id**: Unique peer identifier
- **connectionState**: Current connection state

#### Methods

**setScalabilityMode(mode: ScalabilityMode): void**
Sets the scalability mode for video encoding.

**setTargetBitrate(kbps: number): void**
Sets the target bitrate for the connection.

**setLowDelay(flag: boolean): void**
Enables or disables low delay mode.

**setAdaptiveBitrate(enabled: boolean): void**
Enables or disables adaptive bitrate control.

**setSimulcast(enabled: boolean): void**
Enables or disables simulcast streaming.

**getStats(): Promise<PeerStats>**
Returns detailed peer statistics.

**getConnectionState(): ConnectionState**
Returns current connection state.

**close(): void**
Closes the peer connection.

### Configuration Options

#### PeerOptions Interface
```typescript
interface PeerOptions {
  lowDelay?: boolean;                    // Enable low delay mode
  scalabilityMode?: ScalabilityMode;     // SVC mode
  targetBitrateKbps?: number;           // Target bitrate
  enableAdaptiveBitrate?: boolean;      // Adaptive bitrate
  enableSimulcast?: boolean;            // Simulcast support
  maxSpatialLayers?: number;            // Max spatial layers
  maxTemporalLayers?: number;           // Max temporal layers
}
```

#### ScalabilityMode Type
```typescript
type ScalabilityMode = 
  | 'L1T1' | 'L1T2' | 'L1T3'  // 1 spatial layer, 1-3 temporal
  | 'L2T1' | 'L2T2' | 'L2T3'  // 2 spatial layers, 1-3 temporal
  | 'L3T1' | 'L3T2' | 'L3T3'; // 3 spatial layers, 1-3 temporal
```

#### PeerStats Interface
```typescript
interface PeerStats {
  bitrate: number;                      // Current bitrate
  framerate: number;                    // Current framerate
  resolution: { width: number; height: number }; // Current resolution
  spatialLayer: number;                 // Active spatial layer
  temporalLayer: number;                // Active temporal layer
  packetLoss: number;                   // Packet loss percentage
  rtt: number;                          // Round-trip time
  jitter: number;                       // Jitter in milliseconds
}
```

## Scalable Video Coding (SVC)

### Understanding SVC

Scalable Video Coding allows a single video stream to be decoded at multiple quality levels:

- **Spatial Layers**: Different resolutions (e.g., 480p, 720p, 1080p)
- **Temporal Layers**: Different frame rates (e.g., 7.5fps, 15fps, 30fps)
- **Quality Layers**: Different bitrates for the same resolution

### SVC Modes

**L1T1 (1 Spatial, 1 Temporal)**
- Single resolution, single frame rate
- Lowest complexity, highest compatibility
- Use case: Basic video calls

**L1T3 (1 Spatial, 3 Temporal)**
- Single resolution, multiple frame rates
- Good for bandwidth adaptation
- Use case: Mobile video calls

**L2T2 (2 Spatial, 2 Temporal)**
- Two resolutions, two frame rates
- Balanced complexity and flexibility
- Use case: Desktop video calls

**L3T3 (3 Spatial, 3 Temporal)**
- Three resolutions, three frame rates
- Maximum flexibility, highest complexity
- Use case: Professional broadcasting

### SVC Configuration

```typescript
// Configure for maximum scalability
const peer = await sfu.createPeer({
  scalabilityMode: 'L3T3',
  enableAdaptiveBitrate: true,
  enableSimulcast: true
});

// Monitor and adjust based on network conditions
const stats = await peer.getStats();
if (stats.packetLoss > 5) {
  // Reduce quality due to packet loss
  peer.setScalabilityMode('L2T2');
} else if (stats.packetLoss < 1) {
  // Increase quality for good conditions
  peer.setScalabilityMode('L3T3');
}
```

## SFU Integration

### Selective Forwarding Units

SFUs are media servers that selectively forward media streams to participants:

- **Efficient Scaling**: Handle hundreds of participants
- **Bandwidth Optimization**: Only send needed streams
- **Quality Adaptation**: Adjust quality per participant
- **Network Optimization**: Optimize for different network conditions

### SFU Connection

```typescript
// Connect to SFU server
const sfu = new SFUClient('wss://sfu.example.com', 'auth-token');
await sfu.connect();

// Create peers for different participants
const peer1 = await sfu.createPeer({
  scalabilityMode: 'L2T2',
  targetBitrateKbps: 1500
});

const peer2 = await sfu.createPeer({
  scalabilityMode: 'L1T3',
  targetBitrateKbps: 800
});

// Monitor SFU performance
const sfuStats = await sfu.getStats();
console.log(`SFU: ${sfuStats.totalPeers} peers, ${sfuStats.totalBitrate}kbps total`);
```

### SFU Features

**Selective Forwarding**
- Only forward streams that participants need
- Reduce bandwidth usage significantly
- Improve scalability

**Quality Adaptation**
- Adjust quality based on participant's network
- Automatic bitrate scaling
- Frame rate adaptation

**Network Optimization**
- Optimize for different network types
- Handle packet loss gracefully
- Minimize latency

## Adaptive Bitrate Control

### Automatic Adaptation

The enhanced WebRTC automatically adjusts quality based on:

- **Network Conditions**: Bandwidth, latency, packet loss
- **Device Performance**: CPU, GPU, memory usage
- **User Preferences**: Quality vs. performance trade-offs

### Manual Control

```typescript
// Enable adaptive bitrate
peer.setAdaptiveBitrate(true);

// Monitor adaptation
setInterval(async () => {
  const stats = await peer.getStats();
  
  if (stats.packetLoss > 3) {
    // Reduce bitrate due to packet loss
    peer.setTargetBitrate(stats.bitrate * 0.8);
  } else if (stats.packetLoss < 1 && stats.rtt < 100) {
    // Increase bitrate for good conditions
    peer.setTargetBitrate(stats.bitrate * 1.2);
  }
}, 5000);
```

### Adaptation Strategies

**Conservative Strategy**
- Prioritize stability over quality
- Quick reduction on network issues
- Slow increase on improvement
- Good for unreliable networks

**Aggressive Strategy**
- Prioritize quality over stability
- Slow reduction on network issues
- Quick increase on improvement
- Good for stable networks

**Balanced Strategy**
- Balance quality and stability
- Moderate adaptation speed
- Good for most use cases

## Simulcast Support

### What is Simulcast?

Simulcast allows sending multiple quality versions of the same stream simultaneously:

- **Multiple Resolutions**: 480p, 720p, 1080p versions
- **Multiple Bitrates**: Different bitrates for each resolution
- **Receiver Choice**: Receivers choose appropriate quality
- **Bandwidth Efficiency**: Only send what's needed

### Simulcast Configuration

```typescript
// Enable simulcast
const peer = await sfu.createPeer({
  enableSimulcast: true,
  scalabilityMode: 'L3T3',
  targetBitrateKbps: 2000
});

// Simulcast will automatically create multiple streams:
// - Low quality: 480p @ 500kbps
// - Medium quality: 720p @ 1000kbps  
// - High quality: 1080p @ 2000kbps
```

### Simulcast Benefits

**Bandwidth Optimization**
- Receivers get appropriate quality
- No unnecessary high-quality streams
- Better scalability

**Quality Adaptation**
- Quick quality changes
- No re-encoding needed
- Smooth transitions

**Network Resilience**
- Fallback to lower quality
- Handle network issues gracefully
- Maintain connection stability

## Low Latency Mode

### Enabling Low Latency

```typescript
const peer = await sfu.createPeer({
  lowDelay: true,
  scalabilityMode: 'L1T1', // Simpler encoding
  targetBitrateKbps: 1000   // Lower bitrate
});
```

### Low Latency Optimizations

**Encoding Optimizations**
- Faster encoding algorithms
- Reduced frame buffering
- Lower complexity settings

**Network Optimizations**
- Reduced packet sizes
- Faster retransmission
- Optimized congestion control

**Decoding Optimizations**
- Faster decoding algorithms
- Reduced buffering
- Immediate frame display

### Latency Targets

- **Ultra Low Latency**: < 100ms end-to-end
- **Low Latency**: < 200ms end-to-end
- **Standard Latency**: < 500ms end-to-end

## Performance Monitoring

### Statistics Collection

```typescript
// Get detailed peer statistics
const stats = await peer.getStats();
console.log('Peer Statistics:', {
  bitrate: `${stats.bitrate}kbps`,
  framerate: `${stats.framerate}fps`,
  resolution: `${stats.resolution.width}x${stats.resolution.height}`,
  packetLoss: `${stats.packetLoss.toFixed(2)}%`,
  rtt: `${stats.rtt.toFixed(1)}ms`,
  jitter: `${stats.jitter.toFixed(1)}ms`
});

// Get SFU-level statistics
const sfuStats = await sfu.getStats();
console.log('SFU Statistics:', {
  totalPeers: sfuStats.totalPeers,
  totalBitrate: `${sfuStats.totalBitrate}kbps`,
  avgRtt: `${sfuStats.avgRtt.toFixed(1)}ms`
});
```

### Performance Metrics

**Quality Metrics**
- Bitrate utilization
- Frame rate stability
- Resolution adaptation
- Packet loss rate

**Network Metrics**
- Round-trip time (RTT)
- Jitter
- Bandwidth utilization
- Connection stability

**System Metrics**
- CPU usage
- Memory usage
- GPU utilization
- Battery consumption

## Integration Examples

### Video Conferencing

```typescript
import { SFUClient, EnhancedPeer } from '@mycelia/webrtc-enhanced';

class VideoConference {
  private sfu: SFUClient;
  private peers: Map<string, EnhancedPeer> = new Map();

  async join(roomId: string, userId: string) {
    // Connect to SFU
    this.sfu = new SFUClient(`wss://sfu.example.com/room/${roomId}`);
    await this.sfu.connect();

    // Create peer for this user
    const peer = await this.sfu.createPeer({
      scalabilityMode: 'L2T2',
      targetBitrateKbps: 1500,
      enableAdaptiveBitrate: true,
      enableSimulcast: true
    });

    this.peers.set(userId, peer);

    // Monitor performance
    this.monitorPerformance(peer);
  }

  private async monitorPerformance(peer: EnhancedPeer) {
    setInterval(async () => {
      const stats = await peer.getStats();
      
      // Adapt quality based on performance
      if (stats.packetLoss > 5) {
        peer.setScalabilityMode('L1T2');
      } else if (stats.packetLoss < 1) {
        peer.setScalabilityMode('L2T3');
      }
    }, 10000);
  }
}
```

### Live Streaming

```typescript
class LiveStreamer {
  private sfu: SFUClient;
  private streamPeer: EnhancedPeer;

  async startStream(streamId: string) {
    // Connect to streaming SFU
    this.sfu = new SFUClient(`wss://stream.example.com/${streamId}`);
    await this.sfu.connect();

    // Create high-quality streaming peer
    this.streamPeer = await this.sfu.createPeer({
      scalabilityMode: 'L3T3',
      targetBitrateKbps: 3000,
      enableSimulcast: true,
      lowDelay: false // Prioritize quality over latency
    });

    // Monitor stream quality
    this.monitorStreamQuality();
  }

  private async monitorStreamQuality() {
    setInterval(async () => {
      const stats = await this.streamPeer.getStats();
      
      // Adjust bitrate based on network conditions
      if (stats.packetLoss > 2) {
        this.streamPeer.setTargetBitrate(stats.bitrate * 0.9);
      } else if (stats.packetLoss < 0.5) {
        this.streamPeer.setTargetBitrate(stats.bitrate * 1.1);
      }
    }, 5000);
  }
}
```

### Gaming Communication

```typescript
class GameCommunication {
  private sfu: SFUClient;
  private voicePeer: EnhancedPeer;

  async connectToGame(gameId: string) {
    // Connect to game SFU
    this.sfu = new SFUClient(`wss://game.example.com/${gameId}`);
    await this.sfu.connect();

    // Create low-latency voice peer
    this.voicePeer = await this.sfu.createPeer({
      scalabilityMode: 'L1T1',
      targetBitrateKbps: 64, // Voice only
      lowDelay: true,
      enableAdaptiveBitrate: true
    });

    // Monitor latency
    this.monitorLatency();
  }

  private async monitorLatency() {
    setInterval(async () => {
      const stats = await this.voicePeer.getStats();
      
      // Alert if latency is too high for gaming
      if (stats.rtt > 150) {
        console.warn('High latency detected:', stats.rtt);
        // Implement latency reduction strategies
      }
    }, 1000);
  }
}
```

## Troubleshooting

### Common Issues

**Connection Failures**
- Check SFU server availability
- Verify authentication token
- Check network connectivity
- Review firewall settings

**Poor Quality**
- Increase target bitrate
- Enable adaptive bitrate
- Check network conditions
- Verify hardware capabilities

**High Latency**
- Enable low delay mode
- Reduce scalability complexity
- Check network routing
- Optimize encoding settings

**Packet Loss**
- Reduce bitrate
- Enable packet loss recovery
- Check network stability
- Use more conservative settings

### Debug Information

```typescript
// Enable detailed logging
const peer = await sfu.createPeer({
  scalabilityMode: 'L2T2',
  targetBitrateKbps: 1500
});

// Monitor all statistics
setInterval(async () => {
  const stats = await peer.getStats();
  console.log('Debug Stats:', {
    connectionState: peer.getConnectionState(),
    bitrate: stats.bitrate,
    framerate: stats.framerate,
    packetLoss: stats.packetLoss,
    rtt: stats.rtt,
    jitter: stats.jitter
  });
}, 5000);
```

## Future Enhancements

### Planned Features

- **AI-Powered Adaptation**: Machine learning-based quality adaptation
- **Advanced Codecs**: Support for AV1 and future codecs
- **Edge Computing**: Distributed processing capabilities
- **5G Optimization**: 5G-specific optimizations

### Research Areas

- **Neural Networks**: AI-based quality prediction
- **Quantum Communication**: Quantum-enhanced security
- **Holographic Video**: 3D/holographic communication
- **Brain-Computer Interface**: Direct neural communication

WebRTC Enhanced provides the foundation for next-generation real-time communication applications, combining the reliability of WebRTC with advanced features for enterprise and consumer applications.