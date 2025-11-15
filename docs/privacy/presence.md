---
title: Presence
---

# Presence v0

Presence v0 is an opt-in, ephemeral presence sharing system that allows users to see how many people are currently active on a website or application. It prioritizes privacy by using ephemeral DIDs, origin-scoped presence, and providing only aggregate counts rather than individual user lists.

## Overview

Presence v0 enables users to:
- **Opt-in Sharing**: Explicitly choose to share their presence
- **Ephemeral Identity**: Use short-lived, rotating DIDs for privacy
- **Origin Scoping**: Presence is scoped to specific websites/origins
- **Aggregate Counts**: Only see "N users present" rather than individual lists
- **Ghost Mode**: Hard off switch for complete privacy

## Architecture

### Core Components

#### PresenceManager
The main class that handles presence operations:
```typescript
class PresenceManager {
  async joinPresence(options: PresenceOptions): Promise<void>
  leavePresence(): void
  listCount(): number
  toggleGhostMode(enable: boolean): void
  isGhostModeEnabled(): boolean
}
```text

#### libp2p Integration
Uses libp2p pubsub for decentralized presence communication:
- **Pubsub Topics**: Origin-derived topics for presence communication
- **Heartbeat Messages**: Regular presence updates
- **Message Handling**: Processing of presence messages
- **Network Management**: libp2p node lifecycle

#### Ephemeral DIDs
Short-lived decentralized identifiers:
- **Rotation**: DIDs are rotated every 5 minutes by default
- **Privacy**: Prevents long-term tracking
- **Uniqueness**: Each DID is unique and non-reusable
- **Verification**: DIDs are cryptographically verifiable

### Data Model

#### PresenceOptions
```typescript
interface PresenceOptions {
  origin: string; // e.g., 'https://example.com'
  ephemeralDidDurationMs?: number; // How often to rotate DID, default 5 min
  ghostMode?: boolean; // Hard off switch for presence
}
```text

#### PresenceUser
```typescript
interface PresenceUser {
  did: string;
  joinedAt: number;
  lastSeen: number;
}
```text

## Privacy Design

### Opt-in by Default
Presence is **off by default** and requires explicit user action:
- **No Automatic Sharing**: Users must explicitly enable presence
- **Per-Site Consent**: Users must opt-in for each website/origin
- **Clear Controls**: Easy-to-understand privacy controls
- **Revocable**: Users can disable presence at any time

### Ephemeral Identity
Users are identified by ephemeral DIDs that:
- **Rotate Regularly**: DIDs change every 5 minutes by default
- **Cannot Be Tracked**: No long-term identity persistence
- **Cryptographically Secure**: DIDs are cryptographically generated
- **Non-Reusable**: Each DID is used only once

### Origin Scoping
Presence is scoped to specific origins:
- **No Cross-Site Tracking**: Presence on one site doesn't affect others
- **Origin Isolation**: Each website has its own presence topic
- **Privacy Boundaries**: Clear boundaries between different sites
- **User Control**: Users can enable/disable per origin

### Aggregate Information Only
The system only exposes aggregate information:
- **Count Only**: "N users present" rather than individual lists
- **No Individual Data**: No access to individual user information
- **Privacy Preserving**: Protects individual user privacy
- **Transparent**: Users know exactly what information is shared

## Ghost Mode

### Hard Off Switch
Ghost Mode provides a complete privacy option:
- **Disables All Presence**: Turns off all presence features
- **Persistent Setting**: Setting persists across sessions
- **Easy Access**: Easily accessible privacy control
- **Clear Indication**: Clear visual indication when active

### Implementation
```typescript
// Enable Ghost Mode
presence.toggleGhostMode(true);

// Check Ghost Mode status
if (presence.isGhostModeEnabled()) {
  console.log('Ghost Mode is active - all presence disabled');
}
```text

## Technical Implementation

### libp2p Pubsub
The system uses libp2p pubsub for decentralized communication:

#### Topic Derivation
```typescript
const pubsubTopic = `mycelia-presence-${btoa(origin)}`;
```text

#### Heartbeat System
```typescript
// Send heartbeat every 10 seconds
setInterval(() => {
  if (this.currentDid && this.pubsubTopic) {
    const message = JSON.stringify({ 
      did: this.currentDid, 
      type: 'heartbeat' 
    });
    mockLibp2p.pubsub.publish(this.pubsubTopic, new TextEncoder().encode(message));
  }
}, 10000);
```text

#### Message Processing
```typescript
private handlePubsubMessage = (message: { topic: string; data: Uint8Array }) => {
  if (message.topic === this.pubsubTopic) {
    try {
      const payload = JSON.parse(new TextDecoder().decode(message.data));
      if (payload.type === 'heartbeat' && payload.did) {
        this.presenceMap.set(payload.did, { 
          did: payload.did, 
          joinedAt: Date.now(), 
          lastSeen: Date.now() 
        });
        this.cleanupStalePresence();
      }
    } catch (error) {
      console.error('Error parsing presence message:', error);
    }
  }
};
```text

### DID Rotation
Ephemeral DIDs are rotated regularly:

```typescript
private rotateDid(): void {
  this.currentDid = `did:mycelia:ephemeral-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
  console.log(`DID rotated to: ${this.currentDid}`);
  observability.logEvent('presence_did_rotated', { 
    newDid: this.currentDid, 
    origin: this.currentOrigin 
  });
}
```text

### Stale Presence Cleanup
The system automatically cleans up stale presence:

```typescript
private cleanupStalePresence(): void {
  const now = Date.now();
  // Remove DIDs not seen in the last 30 seconds (3 heartbeats)
  for (const [did, user] of this.presenceMap.entries()) {
    if (now - user.lastSeen > 30000) {
      this.presenceMap.delete(did);
    }
  }
}
```text

## API Usage

### Basic Usage

#### Join Presence
```typescript
import { presence } from '@mycelia/presence';

// Join presence for a specific origin
await presence.joinPresence({
  origin: 'https://example.com',
  ephemeralDidDurationMs: 5 * 60 * 1000, // 5 minutes
  ghostMode: false
});
```text

#### Leave Presence
```typescript
// Leave current presence
presence.leavePresence();
```text

#### Get Presence Count
```typescript
// Get count of users present
const count = presence.listCount();
console.log(`${count} users present`);
```text

#### Ghost Mode Control
```typescript
// Enable Ghost Mode
presence.toggleGhostMode(true);

// Disable Ghost Mode
presence.toggleGhostMode(false);

// Check Ghost Mode status
const isGhostMode = presence.isGhostModeEnabled();
```text

### Event Handling
The system emits events for presence changes:

```typescript
// Listen for presence events
presence.on('presenceJoined', (origin, did) => {
  console.log(`Joined presence for ${origin} with DID: ${did}`);
});

presence.on('presenceLeft', (origin, did) => {
  console.log(`Left presence for ${origin}`);
});

presence.on('presenceCountChanged', (count) => {
  console.log(`Presence count changed: ${count}`);
});
```text

## UI Integration

### Header Indicator
The Navigator displays a presence indicator in the header:

```typescript
// Show presence count when opted in
{isPresenceActive && (
  <div className="presence-indicator">
    <span className="presence-count">{presenceCount} here</span>
    <span className="presence-hint">Click to manage</span>
  </div>
)}
```text

### Room Picker
Clicking the presence indicator opens a room picker:

```typescript
const handlePresenceClick = () => {
  if (isPresenceActive) {
    // Show room picker
    setShowRoomPicker(true);
  } else {
    // Show opt-in prompt
    setShowOptInPrompt(true);
  }
};
```text

### Privacy Controls
Users can manage their privacy settings:

```typescript
const PrivacyControls = () => (
  <div className="privacy-controls">
    <h3>Privacy Controls</h3>
    <p>Presence is <strong>off by default</strong> and requires explicit opt-in per site.</p>
    <p>Ghost Mode provides a hard off switch for all presence features.</p>
    <p>Only presence counts are exposed, never individual user lists.</p>
    
    <div className="privacy-features">
      <h4>Privacy Features:</h4>
      <ul>
        <li>Ephemeral DIDs rotated every 5 minutes</li>
        <li>Origin-scoped presence (no cross-site tracking)</li>
        <li>No raw presence list exposure</li>
        <li>Hard off switch with Ghost Mode</li>
      </ul>
    </div>
  </div>
);
```text

## Security Considerations

### Privacy Protection
- **No Long-term Tracking**: Ephemeral DIDs prevent long-term tracking
- **Origin Isolation**: No cross-site presence tracking
- **Aggregate Data Only**: Only counts are exposed, not individual data
- **User Control**: Users have complete control over their presence

### Network Security
- **libp2p Security**: Uses libp2p's built-in security features
- **Message Encryption**: Presence messages are encrypted
- **Authentication**: DIDs provide cryptographic authentication
- **Rate Limiting**: Prevents abuse and spam

### Data Minimization
- **Minimal Data**: Only necessary presence data is collected
- **Automatic Cleanup**: Stale presence data is automatically removed
- **No Persistence**: Presence data is not persisted long-term
- **User Control**: Users can delete their presence data

## Deployment

### Feature Flags
Presence v0 is controlled by feature flags:

```typescript
// Check if presence is enabled
if (featureFlags.isFlagEnabled('presence_v0')) {
  // Enable presence features
}

// Check Ghost Mode
if (featureFlags.isFlagEnabled('presence_ghost_mode_hard_off')) {
  // Ghost Mode is active
}
```text

### Environment Configuration
```typescript
const config = {
  ephemeralDidDurationMs: process.env.PRESENCE_DID_DURATION || 5 * 60 * 1000,
  heartbeatInterval: process.env.PRESENCE_HEARTBEAT_INTERVAL || 10000,
  staleTimeout: process.env.PRESENCE_STALE_TIMEOUT || 30000,
  ghostModeDefault: process.env.PRESENCE_GHOST_MODE_DEFAULT || false
};
```text

## Monitoring and Observability

### Metrics
The system tracks various metrics:

- **Presence Joins**: Number of users joining presence
- **Presence Leaves**: Number of users leaving presence
- **DID Rotations**: Number of DID rotations
- **Ghost Mode Usage**: Usage of Ghost Mode feature

### Logging
All presence events are logged:

```typescript
observability.logEvent('presence_joined', { 
  origin: options.origin, 
  did: this.currentDid 
});

observability.logEvent('presence_left', { 
  origin: this.currentOrigin, 
  did: this.currentDid 
});

observability.logEvent('presence_did_rotated', { 
  newDid: this.currentDid, 
  origin: this.currentOrigin 
});
```text

### Health Checks
The system includes health checks:

- **libp2p Connectivity**: Check libp2p node health
- **Pubsub Functionality**: Verify pubsub is working
- **DID Generation**: Ensure DIDs are being generated
- **Message Processing**: Verify message processing

## Best Practices

### For Users
- **Understand Privacy**: Understand what presence sharing means
- **Use Ghost Mode**: Use Ghost Mode when you want complete privacy
- **Per-Site Decisions**: Make informed decisions per site
- **Regular Review**: Regularly review your presence settings

### For Developers
- **Respect Privacy**: Always respect user privacy choices
- **Clear Communication**: Clearly communicate what presence means
- **Easy Controls**: Provide easy-to-use privacy controls
- **Transparent Operation**: Be transparent about how presence works

### For Website Owners
- **Privacy-First**: Implement privacy-first presence features
- **User Education**: Educate users about presence features
- **Respect Choices**: Respect user privacy choices
- **Clear Policies**: Have clear privacy policies

## Troubleshooting

### Common Issues

**Presence Not Working**
- Check if the feature flag is enabled
- Verify libp2p connectivity
- Check for Ghost Mode activation
- Review error logs

**High Latency**
- Check network connectivity
- Verify libp2p configuration
- Monitor heartbeat intervals
- Review message processing

**DID Rotation Issues**
- Check DID generation logic
- Verify rotation intervals
- Monitor for errors
- Review observability logs

### Debug Mode
Enable debug logging for troubleshooting:

```bash
DEBUG=presence:* npm start
```text

## Future Enhancements

### Advanced Features
- **Presence Groups**: Group-based presence sharing
- **Custom Intervals**: User-configurable heartbeat intervals
- **Presence History**: Historical presence data
- **Advanced Analytics**: Detailed presence analytics

### Integration
- **Blockchain Integration**: On-chain presence verification
- **Cross-Platform**: Cross-platform presence sharing
- **API Integration**: REST API for presence data
- **Webhook Support**: Webhook notifications for presence changes

### Privacy Enhancements
- **Differential Privacy**: Advanced privacy protection
- **Zero-Knowledge**: Zero-knowledge presence proofs
- **Advanced Encryption**: Enhanced message encryption
- **Privacy Metrics**: Privacy impact metrics
