# Radio v0

Radio v0 is a WebRTC-based streaming platform that enables real-time audio and video distribution with rights management and provisional payouts. It provides low-latency streaming capabilities while respecting content licensing and implementing a proof-of-distribution system.

## Overview

Radio v0 combines WebRTC SFU (Selective Forwarding Unit) technology with content rights management to create a decentralized streaming platform that:

- **Low Latency**: Sub-200ms end-to-end latency for real-time streaming
- **Rights Management**: Per-track licensing with Original, CC, and Licensed options
- **Moderated Queue**: Content moderation before going live
- **Proof of Distribution**: Tracking of content distribution for payouts
- **Bandwidth Sharing**: Users can contribute bandwidth via libp2p

## Architecture

### Core Components

#### SFU Server
The SFU server manages WebRTC connections and content distribution:
- **Room Management**: Create and manage streaming rooms
- **Track Queue**: Moderated queue for content approval
- **WebRTC Transport**: Handle audio/video streams
- **Distribution Tracking**: Monitor content distribution metrics

#### Rights Tags
Each track carries licensing information:
- **Original**: Creator's original content
- **CC**: Creative Commons licensed content
- **Licensed**: Content with external licensing terms

#### Payouts System
Provisional BLOOM distribution based on:
- **Uploader Contributions**: Content creators earn for their uploads
- **Seeder Contributions**: Users earn for sharing bandwidth
- **Distribution Receipts**: Proof of content distribution

### Data Model

#### RadioRoom
```typescript
interface RadioRoom {
  roomId: string;
  name: string;
  rights: 'Original' | 'CC' | 'Licensed';
  ownerDid: string;
  moderatedQueue: string[]; // CIDs of tracks in queue
  activeTracks: {
    trackId: string;
    cid: string;
    contributorDid: string;
    startTime: number;
  }[];
  listeners: WebSocket[];
  createdAt: number;
}
```

#### DistributionReceipt
```typescript
interface DistributionReceipt {
  roomId: string;
  trackId: string;
  contributors: {
    did: string;
    bytesOut: number;
  }[];
  timestamp: number;
}
```

## WebRTC SFU Implementation

### Selective Forwarding Unit
The SFU architecture provides:
- **Scalability**: Efficient distribution to multiple listeners
- **Low Latency**: Direct peer-to-peer connections
- **Bandwidth Efficiency**: Single upload, multiple downloads
- **Quality Adaptation**: Dynamic bitrate adjustment

### Media Handling
- **AV1 Encoding**: Modern video codec for efficiency
- **SVC Support**: Scalable Video Coding for quality adaptation
- **Audio Processing**: High-quality audio streaming
- **Transport Protocols**: WebRTC with QUIC fallback

### Connection Management
- **ICE Candidates**: NAT traversal and connection establishment
- **DTLS**: Secure media transport
- **SRTP**: Secure Real-time Transport Protocol
- **Congestion Control**: Adaptive bitrate based on network conditions

## Rights Management

### License Types

#### Original
- Creator's original content
- Full rights retained by creator
- Can be listed in public directory
- Eligible for payouts

#### Creative Commons (CC)
- Openly licensed content
- Specific CC license terms apply
- Can be listed in public directory
- Eligible for payouts

#### Licensed
- Content with external licensing
- May have usage restrictions
- Cannot be listed in public directory
- Payouts subject to license terms

### Rights Enforcement
- **Queue Moderation**: Content is reviewed before going live
- **Directory Integration**: Licensed content is excluded from public listings
- **Payout Gating**: Payouts respect licensing terms
- **Audit Trail**: All rights decisions are logged

## Moderated Queue System

### Content Approval Process
1. **Submission**: Users submit tracks to the queue
2. **Moderation**: Content is reviewed by moderators
3. **Approval**: Approved content goes live
4. **Rejection**: Rejected content is removed

### Moderation Criteria
- **Copyright Compliance**: Ensure proper licensing
- **Content Quality**: Technical quality standards
- **Community Guidelines**: Platform-specific rules
- **Rights Verification**: Confirm licensing claims

### Queue Management
- **Priority System**: Important content can be prioritized
- **Batch Processing**: Multiple tracks can be processed together
- **Auto-Approval**: Trusted creators can have auto-approval
- **Appeal Process**: Rejected content can be appealed

## Payouts System

### Proof of Distribution
The system tracks content distribution through:
- **Distribution Receipts**: Cryptographic proof of content sharing
- **Bandwidth Tracking**: Measurement of data transferred
- **Contributor Identification**: Tracking of who contributed what
- **Time-based Metrics**: Distribution over time

### Provisional Payouts
Payouts are calculated based on:
- **Uploader Shares**: Content creators earn for their uploads
- **Seeder Shares**: Users earn for sharing bandwidth
- **Distribution Volume**: Amount of content distributed
- **Time Factors**: Duration of contribution

### BLOOM Distribution
- **Provisional Calculations**: Off-chain calculations for demo
- **Governance Approval**: Mainnet payouts require governance approval
- **Fair Distribution**: Proportional to contribution
- **Transparent Metrics**: All calculations are visible

## API Endpoints

### Room Management

#### POST /room/create
Create a new radio room.

**Request Body:**
```json
{
  "name": "My Radio Room",
  "rights": "Original",
  "ownerDid": "did:mycelia:user123"
}
```

**Response:**
```json
{
  "roomId": "room-abc123",
  "name": "My Radio Room",
  "rights": "Original"
}
```

#### GET /room/:roomId
Get room information.

**Response:**
```json
{
  "roomId": "room-abc123",
  "name": "My Radio Room",
  "rights": "Original",
  "ownerDid": "did:mycelia:user123",
  "moderatedQueue": ["cid1", "cid2"],
  "activeTracks": [
    {
      "trackId": "track-xyz789",
      "cid": "cid3",
      "contributorDid": "did:mycelia:user456",
      "startTime": 1640995200000
    }
  ],
  "createdAt": 1640995200000
}
```

### WebSocket Events

#### Join Room
```json
{
  "type": "joinRoom",
  "roomId": "room-abc123",
  "did": "did:mycelia:user123"
}
```

#### Add Track to Queue
```json
{
  "type": "addTrackToQueue",
  "roomId": "room-abc123",
  "cid": "bafybeih...",
  "did": "did:mycelia:user123"
}
```

#### WebRTC Signaling
```json
{
  "type": "produce",
  "kind": "audio",
  "rtpParameters": { ... }
}
```

## Performance Optimization

### Latency Reduction
- **SFU Architecture**: Eliminates server-side processing delays
- **Direct Connections**: Peer-to-peer streaming
- **Optimized Codecs**: AV1 and modern audio codecs
- **Network Optimization**: QUIC transport protocol

### Bandwidth Efficiency
- **Adaptive Bitrate**: Dynamic quality adjustment
- **SVC Support**: Scalable Video Coding
- **Compression**: Efficient media compression
- **Caching**: Strategic content caching

### Scalability
- **Horizontal Scaling**: Multiple SFU instances
- **Load Balancing**: Distribute connections across servers
- **Resource Management**: Efficient resource utilization
- **Monitoring**: Real-time performance monitoring

## Security Considerations

### Content Security
- **DRM Integration**: Optional DRM for licensed content
- **Watermarking**: Content identification and tracking
- **Access Control**: Room-based access restrictions
- **Audit Logging**: Comprehensive activity logging

### Network Security
- **DTLS Encryption**: Secure media transport
- **Authentication**: DID-based user authentication
- **Rate Limiting**: Prevent abuse and DoS attacks
- **Monitoring**: Real-time security monitoring

## Deployment

### Docker Compose
```yaml
services:
  radio-sfu:
    build:
      context: .
      dockerfile: packages/radio-sfu/Dockerfile
    ports:
      - "3002:3002"   # Express API
      - "3003:3003"   # WebSocket
    environment:
      - NODE_ENV=production
      - EXPRESS_PORT=3002
      - WS_PORT=3003
```

### Environment Variables
- `EXPRESS_PORT`: HTTP API port (default: 3002)
- `WS_PORT`: WebSocket port (default: 3003)
- `NODE_ENV`: Environment (development/production)
- `RADIO_V0_ENABLED`: Feature flag

### Health Checks
- `GET /health`: Basic health status
- `GET /status`: Detailed service status
- WebSocket connectivity tests

## Monitoring and Observability

### Metrics
- **Connection Count**: Active WebRTC connections
- **Bandwidth Usage**: Data transfer rates
- **Latency**: End-to-end latency measurements
- **Error Rates**: Connection and streaming errors

### Logging
- **Room Events**: Room creation, joining, leaving
- **Track Events**: Track submission, approval, playback
- **Distribution Events**: Content distribution tracking
- **Error Events**: Connection failures and errors

### Alerts
- **High Latency**: Latency above thresholds
- **Connection Failures**: WebRTC connection issues
- **Bandwidth Spikes**: Unusual bandwidth usage
- **Service Availability**: SFU service health

## Best Practices

### Content Creation
- Use appropriate rights tags
- Ensure content quality standards
- Follow community guidelines
- Respect copyright and licensing

### Performance
- Monitor latency metrics
- Optimize media encoding
- Use appropriate bitrates
- Test with various network conditions

### Security
- Implement proper authentication
- Monitor for abuse
- Use secure transport protocols
- Regular security audits

## Troubleshooting

### Common Issues

**High Latency**
- Check network connectivity
- Verify SFU configuration
- Monitor bandwidth usage
- Review codec settings

**Connection Failures**
- Check NAT traversal
- Verify ICE candidates
- Monitor firewall settings
- Review WebRTC configuration

**Audio/Video Issues**
- Check codec support
- Verify media formats
- Monitor bandwidth
- Review encoding settings

### Debug Mode
Enable debug logging for troubleshooting:

```bash
DEBUG=radio-sfu:* npm start
```

## Future Enhancements

- **Advanced Codecs**: Support for newer codecs
- **AI Moderation**: Automated content moderation
- **Blockchain Integration**: On-chain rights management
- **Mobile Optimization**: Enhanced mobile support
- **Analytics**: Advanced usage analytics
- **Monetization**: Enhanced payout mechanisms
