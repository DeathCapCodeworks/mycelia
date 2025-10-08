import { observability } from '@mycelia/observability';
import { featureFlags } from '@mycelia/web4-feature-flags';

export interface PresenceOptions {
  ghostMode?: boolean;
  maxUsers?: number;
  heartbeatInterval?: number;
  didRotationInterval?: number;
}

export interface PresenceUser {
  did: string;
  joinedAt: number;
  lastSeen: number;
  isActive: boolean;
}

export interface PresenceState {
  origin: string;
  users: PresenceUser[];
  count: number;
  isJoined: boolean;
  ghostMode: boolean;
}

export class Presence {
  private libp2p: any = null;
  private isInitialized = false;
  private currentOrigin: string | null = null;
  private currentDid: string | null = null;
  private presenceState: Map<string, PresenceState> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private didRotationInterval: NodeJS.Timeout | null = null;
  private options: PresenceOptions;

  constructor(options: PresenceOptions = {}) {
    this.options = {
      ghostMode: false,
      maxUsers: 100,
      heartbeatInterval: 30000, // 30 seconds
      didRotationInterval: 300000, // 5 minutes
      ...options
    };
  }

  async initialize(): Promise<void> {
    if (!featureFlags.isFlagEnabled('presence_v0')) {
      throw new Error('Presence v0 feature flag disabled');
    }

    try {
      // Mock libp2p initialization - in real implementation, would use actual libp2p
      this.libp2p = {
        start: async () => {
          console.log('Mock libp2p started');
        },
        stop: async () => {
          console.log('Mock libp2p stopped');
        },
        pubsub: {
          subscribe: (topic: string, handler: (message: any) => void) => {
            console.log(`Mock subscribed to topic: ${topic}`);
          },
          publish: (topic: string, data: Uint8Array) => {
            console.log(`Mock published to topic: ${topic}`);
          }
        }
      };

      await this.libp2p.start();
      this.isInitialized = true;

      observability.logEvent('presence_initialized', {
        ghost_mode: this.options.ghostMode,
        max_users: this.options.maxUsers
      });

    } catch (error) {
      console.error('Failed to initialize Presence:', error);
      observability.logEvent('presence_init_failed', {
        error: (error as Error).message
      });
      throw error;
    }
  }

  async joinPresence(origin: string, options: PresenceOptions = {}): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (this.options.ghostMode || options.ghostMode) {
      console.log('Ghost mode enabled - not joining presence');
      return;
    }

    try {
      // Generate ephemeral DID for this session
      this.currentDid = this.generateEphemeralDid();
      this.currentOrigin = origin;

      // Create topic based on origin
      const topic = this.getTopicFromOrigin(origin);

      // Subscribe to presence updates
      this.libp2p.pubsub.subscribe(topic, (message: any) => {
        this.handlePresenceMessage(message);
      });

      // Send join message
      await this.sendPresenceMessage('join', origin);

      // Start heartbeat
      this.startHeartbeat();

      // Start DID rotation
      this.startDidRotation();

      // Update state
      const state = this.presenceState.get(origin) || {
        origin,
        users: [],
        count: 0,
        isJoined: false,
        ghostMode: false
      };
      state.isJoined = true;
      state.ghostMode = false;
      this.presenceState.set(origin, state);

      observability.logEvent('presence_joined', {
        origin,
        did: this.currentDid
      });

    } catch (error) {
      console.error('Failed to join presence:', error);
      observability.logEvent('presence_join_failed', {
        origin,
        error: (error as Error).message
      });
      throw error;
    }
  }

  async leavePresence(): Promise<void> {
    if (!this.isInitialized || !this.currentOrigin || !this.currentDid) {
      return;
    }

    try {
      // Send leave message
      await this.sendPresenceMessage('leave', this.currentOrigin);

      // Stop intervals
      this.stopHeartbeat();
      this.stopDidRotation();

      // Update state
      const state = this.presenceState.get(this.currentOrigin);
      if (state) {
        state.isJoined = false;
        state.users = state.users.filter(user => user.did !== this.currentDid);
        state.count = state.users.length;
        this.presenceState.set(this.currentOrigin, state);
      }

      observability.logEvent('presence_left', {
        origin: this.currentOrigin,
        did: this.currentDid
      });

      this.currentOrigin = null;
      this.currentDid = null;

    } catch (error) {
      console.error('Failed to leave presence:', error);
      observability.logEvent('presence_leave_failed', {
        error: (error as Error).message
      });
    }
  }

  async listCount(origin: string): Promise<number> {
    if (!this.isInitialized) {
      return 0;
    }

    const state = this.presenceState.get(origin);
    if (!state || !state.isJoined) {
      return 0;
    }

    // Filter out inactive users
    const activeUsers = state.users.filter(user => 
      Date.now() - user.lastSeen < (this.options.heartbeatInterval || 30000) * 2
    );

    return activeUsers.length;
  }

  async getPresenceState(origin: string): Promise<PresenceState | null> {
    if (!this.isInitialized) {
      return null;
    }

    const state = this.presenceState.get(origin);
    if (!state || !state.isJoined) {
      return null;
    }

    // Return sanitized state (no raw user list unless user has joined)
    return {
      ...state,
      users: state.users.map(user => ({
        ...user,
        did: this.sanitizeDid(user.did) // Only show anonymized version
      }))
    };
  }

  async enableGhostMode(): Promise<void> {
    this.options.ghostMode = true;
    
    if (this.currentOrigin) {
      await this.leavePresence();
    }

    observability.logEvent('presence_ghost_mode_enabled');
  }

  async disableGhostMode(): Promise<void> {
    this.options.ghostMode = false;
    observability.logEvent('presence_ghost_mode_disabled');
  }

  private async sendPresenceMessage(type: 'join' | 'leave' | 'heartbeat', origin: string): Promise<void> {
    if (!this.currentDid) return;

    const topic = this.getTopicFromOrigin(origin);
    const message = {
      type,
      did: this.currentDid,
      timestamp: Date.now(),
      origin
    };

    const data = new TextEncoder().encode(JSON.stringify(message));
    this.libp2p.pubsub.publish(topic, data);
  }

  private handlePresenceMessage(message: any): void {
    try {
      const data = JSON.parse(new TextDecoder().decode(message.data));
      const { type, did, timestamp, origin } = data;

      if (!origin || !this.presenceState.has(origin)) {
        return;
      }

      const state = this.presenceState.get(origin)!;

      switch (type) {
        case 'join':
          this.handleUserJoin(state, did, timestamp);
          break;
        case 'leave':
          this.handleUserLeave(state, did);
          break;
        case 'heartbeat':
          this.handleUserHeartbeat(state, did, timestamp);
          break;
      }

    } catch (error) {
      console.error('Failed to handle presence message:', error);
    }
  }

  private handleUserJoin(state: PresenceState, did: string, timestamp: number): void {
    const existingUser = state.users.find(user => user.did === did);
    
    if (existingUser) {
      existingUser.lastSeen = timestamp;
      existingUser.isActive = true;
    } else {
      state.users.push({
        did,
        joinedAt: timestamp,
        lastSeen: timestamp,
        isActive: true
      });
    }

    state.count = state.users.length;
    this.presenceState.set(state.origin, state);
  }

  private handleUserLeave(state: PresenceState, did: string): void {
    state.users = state.users.filter(user => user.did !== did);
    state.count = state.users.length;
    this.presenceState.set(state.origin, state);
  }

  private handleUserHeartbeat(state: PresenceState, did: string, timestamp: number): void {
    const user = state.users.find(user => user.did === did);
    if (user) {
      user.lastSeen = timestamp;
      user.isActive = true;
    }
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(async () => {
      if (this.currentOrigin && this.currentDid) {
        await this.sendPresenceMessage('heartbeat', this.currentOrigin);
      }
    }, this.options.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private startDidRotation(): void {
    this.didRotationInterval = setInterval(async () => {
      if (this.currentOrigin && this.currentDid) {
        const oldDid = this.currentDid;
        this.currentDid = this.generateEphemeralDid();
        
        // Send leave with old DID and join with new DID
        await this.sendPresenceMessage('leave', this.currentOrigin);
        await this.sendPresenceMessage('join', this.currentOrigin);

        observability.logEvent('presence_did_rotated', {
          origin: this.currentOrigin,
          old_did: oldDid,
          new_did: this.currentDid
        });
      }
    }, this.options.didRotationInterval);
  }

  private stopDidRotation(): void {
    if (this.didRotationInterval) {
      clearInterval(this.didRotationInterval);
      this.didRotationInterval = null;
    }
  }

  private getTopicFromOrigin(origin: string): string {
    // Create topic from origin hash for privacy
    const hash = this.simpleHash(origin);
    return `presence:${hash}`;
  }

  private generateEphemeralDid(): string {
    const randomBytes = new Uint8Array(16);
    crypto.getRandomValues(randomBytes);
    const randomHex = Array.from(randomBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    return `did:mycelia:ephemeral:${randomHex}`;
  }

  private sanitizeDid(did: string): string {
    // Return anonymized version for privacy
    const parts = did.split(':');
    if (parts.length >= 3) {
      return `${parts[0]}:${parts[1]}:***${parts[2].slice(-4)}`;
    }
    return 'did:mycelia:***';
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  async destroy(): Promise<void> {
    if (this.currentOrigin) {
      await this.leavePresence();
    }

    this.stopHeartbeat();
    this.stopDidRotation();

    if (this.libp2p) {
      await this.libp2p.stop();
      this.libp2p = null;
    }

    this.isInitialized = false;
  }
}

// Global instance
let globalPresence: Presence | null = null;

export function getPresence(): Presence {
  if (!globalPresence) {
    globalPresence = new Presence();
  }
  return globalPresence;
}

// Convenience exports
export const presence = {
  joinPresence: (origin: string, options?: PresenceOptions) => 
    getPresence().joinPresence(origin, options),
  leavePresence: () => getPresence().leavePresence(),
  listCount: (origin: string) => getPresence().listCount(origin),
  getPresenceState: (origin: string) => getPresence().getPresenceState(origin),
  enableGhostMode: () => getPresence().enableGhostMode(),
  disableGhostMode: () => getPresence().disableGhostMode()
};
