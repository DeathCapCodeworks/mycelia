// Transport Profiles - Network configuration presets for optimized connectivity

import { observability } from '@mycelia/observability';

export interface TransportProfile {
  id: string;
  name: string;
  description: string;
  category: 'realtime' | 'bulk' | 'balanced' | 'privacy' | 'performance' | 'custom';
  protocol: 'http2' | 'http3' | 'quic' | 'websocket' | 'webrtc' | 'tcp' | 'udp';
  encryption: 'tls1.3' | 'tls1.2' | 'quic' | 'dtls' | 'none';
  compression: 'gzip' | 'brotli' | 'zstd' | 'none';
  multiplexing: boolean;
  connectionPooling: boolean;
  keepAlive: boolean;
  tcpNoDelay: boolean;
  congestionControl: 'bbr' | 'cubic' | 'reno' | 'default';
  mtu: number;
  windowSize: number;
  retryPolicy: {
    maxRetries: number;
    backoffMultiplier: number;
    maxBackoff: number;
  };
  timeoutPolicy: {
    connectTimeout: number;
    readTimeout: number;
    writeTimeout: number;
  };
  dnsPolicy: {
    type: 'doh' | 'doq' | 'dot' | 'udp';
    servers: string[];
    cache: boolean;
    fallback: boolean;
  };
  proxyPolicy: {
    enabled: boolean;
    type: 'http' | 'socks5' | 'none';
    host?: string;
    port?: number;
    auth?: {
      username: string;
      password: string;
    };
  };
  isDefault: boolean;
  isBuiltIn: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface ConnectionMetrics {
  profileId: string;
  connectionId: string;
  startTime: number;
  endTime?: number;
  bytesSent: number;
  bytesReceived: number;
  packetsSent: number;
  packetsReceived: number;
  packetsLost: number;
  rtt: number;
  jitter: number;
  bandwidth: number;
  errors: number;
  retries: number;
  timeouts: number;
}

export interface ProfilePerformance {
  profileId: string;
  averageRtt: number;
  averageBandwidth: number;
  averagePacketLoss: number;
  averageErrors: number;
  totalConnections: number;
  successfulConnections: number;
  averageConnectionDuration: number;
  lastUsed: number;
  usageCount: number;
}

export class TransportProfilesManager {
  private profiles: Map<string, TransportProfile> = new Map();
  private activeProfile: string | null = null;
  private connections: Map<string, ConnectionMetrics> = new Map();
  private performance: Map<string, ProfilePerformance> = new Map();
  private updateCallbacks: Set<(profile: TransportProfile) => void> = new Set();

  constructor() {
    this.initializeBuiltInProfiles();
    this.loadFromStorage();
    this.setupEventListeners();
  }

  private initializeBuiltInProfiles(): void {
    const builtInProfiles: TransportProfile[] = [
      {
        id: 'realtime-low-latency',
        name: 'Realtime Low Latency',
        description: 'Optimized for real-time communication with minimal latency',
        category: 'realtime',
        protocol: 'quic',
        encryption: 'quic',
        compression: 'none',
        multiplexing: true,
        connectionPooling: false,
        keepAlive: true,
        tcpNoDelay: true,
        congestionControl: 'bbr',
        mtu: 1200,
        windowSize: 64,
        retryPolicy: {
          maxRetries: 3,
          backoffMultiplier: 1.5,
          maxBackoff: 1000
        },
        timeoutPolicy: {
          connectTimeout: 2000,
          readTimeout: 5000,
          writeTimeout: 3000
        },
        dnsPolicy: {
          type: 'doq',
          servers: ['1.1.1.1', '1.0.0.1'],
          cache: true,
          fallback: true
        },
        proxyPolicy: {
          enabled: false,
          type: 'none'
        },
        isDefault: false,
        isBuiltIn: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      {
        id: 'bulk-high-throughput',
        name: 'Bulk High Throughput',
        description: 'Optimized for bulk data transfer with maximum throughput',
        category: 'bulk',
        protocol: 'http3',
        encryption: 'tls1.3',
        compression: 'brotli',
        multiplexing: true,
        connectionPooling: true,
        keepAlive: true,
        tcpNoDelay: false,
        congestionControl: 'cubic',
        mtu: 1500,
        windowSize: 256,
        retryPolicy: {
          maxRetries: 5,
          backoffMultiplier: 2.0,
          maxBackoff: 5000
        },
        timeoutPolicy: {
          connectTimeout: 10000,
          readTimeout: 30000,
          writeTimeout: 15000
        },
        dnsPolicy: {
          type: 'doh',
          servers: ['8.8.8.8', '8.8.4.4'],
          cache: true,
          fallback: true
        },
        proxyPolicy: {
          enabled: false,
          type: 'none'
        },
        isDefault: false,
        isBuiltIn: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      {
        id: 'balanced-general',
        name: 'Balanced General Purpose',
        description: 'Balanced profile for general web browsing and applications',
        category: 'balanced',
        protocol: 'http2',
        encryption: 'tls1.3',
        compression: 'gzip',
        multiplexing: true,
        connectionPooling: true,
        keepAlive: true,
        tcpNoDelay: false,
        congestionControl: 'default',
        mtu: 1500,
        windowSize: 128,
        retryPolicy: {
          maxRetries: 3,
          backoffMultiplier: 1.5,
          maxBackoff: 2000
        },
        timeoutPolicy: {
          connectTimeout: 5000,
          readTimeout: 15000,
          writeTimeout: 10000
        },
        dnsPolicy: {
          type: 'doh',
          servers: ['1.1.1.1', '8.8.8.8'],
          cache: true,
          fallback: true
        },
        proxyPolicy: {
          enabled: false,
          type: 'none'
        },
        isDefault: true,
        isBuiltIn: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      {
        id: 'privacy-focused',
        name: 'Privacy Focused',
        description: 'Enhanced privacy with encrypted DNS and minimal metadata',
        category: 'privacy',
        protocol: 'quic',
        encryption: 'quic',
        compression: 'none',
        multiplexing: true,
        connectionPooling: false,
        keepAlive: false,
        tcpNoDelay: true,
        congestionControl: 'bbr',
        mtu: 1200,
        windowSize: 32,
        retryPolicy: {
          maxRetries: 2,
          backoffMultiplier: 2.0,
          maxBackoff: 3000
        },
        timeoutPolicy: {
          connectTimeout: 3000,
          readTimeout: 10000,
          writeTimeout: 5000
        },
        dnsPolicy: {
          type: 'doq',
          servers: ['1.1.1.1'],
          cache: false,
          fallback: false
        },
        proxyPolicy: {
          enabled: false,
          type: 'none'
        },
        isDefault: false,
        isBuiltIn: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      {
        id: 'performance-optimized',
        name: 'Performance Optimized',
        description: 'Maximum performance with aggressive optimizations',
        category: 'performance',
        protocol: 'http3',
        encryption: 'tls1.3',
        compression: 'zstd',
        multiplexing: true,
        connectionPooling: true,
        keepAlive: true,
        tcpNoDelay: true,
        congestionControl: 'bbr',
        mtu: 1500,
        windowSize: 512,
        retryPolicy: {
          maxRetries: 5,
          backoffMultiplier: 1.2,
          maxBackoff: 2000
        },
        timeoutPolicy: {
          connectTimeout: 2000,
          readTimeout: 10000,
          writeTimeout: 5000
        },
        dnsPolicy: {
          type: 'doq',
          servers: ['1.1.1.1', '8.8.8.8', '1.0.0.1'],
          cache: true,
          fallback: true
        },
        proxyPolicy: {
          enabled: false,
          type: 'none'
        },
        isDefault: false,
        isBuiltIn: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
    ];

    builtInProfiles.forEach(profile => {
      this.profiles.set(profile.id, profile);
    });

    // Set default profile
    this.activeProfile = 'balanced-general';
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem('mycelia-transport-profiles');
      if (stored) {
        const data = JSON.parse(stored);
        this.activeProfile = data.activeProfile || 'balanced-general';
        this.performance = new Map(data.performance || []);
      }
    } catch (error) {
      console.warn('Failed to load transport profiles from storage:', error);
    }
  }

  private saveToStorage(): void {
    try {
      const data = {
        activeProfile: this.activeProfile,
        performance: Array.from(this.performance.entries()),
        timestamp: Date.now()
      };
      localStorage.setItem('mycelia-transport-profiles', JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save transport profiles to storage:', error);
    }
  }

  private setupEventListeners(): void {
    // Listen for profile change requests
    document.addEventListener('transport-profile-change', (event: any) => {
      this.setActiveProfile(event.detail.profileId);
    });

    // Listen for custom profile creation
    document.addEventListener('transport-profile-create', (event: any) => {
      this.createCustomProfile(event.detail.profile);
    });
  }

  getProfiles(): TransportProfile[] {
    return Array.from(this.profiles.values());
  }

  getProfile(profileId: string): TransportProfile | undefined {
    return this.profiles.get(profileId);
  }

  getActiveProfile(): TransportProfile | undefined {
    return this.activeProfile ? this.profiles.get(this.activeProfile) : undefined;
  }

  getActiveProfileId(): string | null {
    return this.activeProfile;
  }

  setActiveProfile(profileId: string): boolean {
    const profile = this.profiles.get(profileId);
    if (!profile) {
      return false;
    }

    this.activeProfile = profileId;
    this.saveToStorage();
    this.notifyUpdate(profile);

    observability.logEvent('transport_profile_changed', {
      profileId,
      profileName: profile.name,
      category: profile.category
    });

    return true;
  }

  createCustomProfile(profile: Omit<TransportProfile, 'id' | 'isBuiltIn' | 'createdAt' | 'updatedAt'>): TransportProfile {
    const customProfile: TransportProfile = {
      ...profile,
      id: this.generateProfileId(profile.name),
      isBuiltIn: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    this.profiles.set(customProfile.id, customProfile);
    this.saveToStorage();

    observability.logEvent('transport_profile_created', {
      profileId: customProfile.id,
      profileName: customProfile.name,
      category: customProfile.category
    });

    return customProfile;
  }

  updateProfile(profileId: string, updates: Partial<TransportProfile>): boolean {
    const profile = this.profiles.get(profileId);
    if (!profile || profile.isBuiltIn) {
      return false;
    }

    const updatedProfile: TransportProfile = {
      ...profile,
      ...updates,
      id: profileId,
      updatedAt: Date.now()
    };

    this.profiles.set(profileId, updatedProfile);
    this.saveToStorage();
    this.notifyUpdate(updatedProfile);

    observability.logEvent('transport_profile_updated', {
      profileId,
      profileName: updatedProfile.name
    });

    return true;
  }

  deleteProfile(profileId: string): boolean {
    const profile = this.profiles.get(profileId);
    if (!profile || profile.isBuiltIn || profile.isDefault) {
      return false;
    }

    this.profiles.delete(profileId);
    this.saveToStorage();

    // Switch to default if this was the active profile
    if (this.activeProfile === profileId) {
      this.setActiveProfile('balanced-general');
    }

    observability.logEvent('transport_profile_deleted', {
      profileId,
      profileName: profile.name
    });

    return true;
  }

  getProfilesByCategory(category: TransportProfile['category']): TransportProfile[] {
    return Array.from(this.profiles.values()).filter(profile => profile.category === category);
  }

  getBuiltInProfiles(): TransportProfile[] {
    return Array.from(this.profiles.values()).filter(profile => profile.isBuiltIn);
  }

  getCustomProfiles(): TransportProfile[] {
    return Array.from(this.profiles.values()).filter(profile => !profile.isBuiltIn);
  }

  // Connection management
  createConnection(url: string): string {
    const connectionId = this.generateConnectionId();
    const profile = this.getActiveProfile();
    
    if (!profile) {
      throw new Error('No active transport profile');
    }

    const metrics: ConnectionMetrics = {
      profileId: profile.id,
      connectionId,
      startTime: Date.now(),
      bytesSent: 0,
      bytesReceived: 0,
      packetsSent: 0,
      packetsReceived: 0,
      packetsLost: 0,
      rtt: 0,
      jitter: 0,
      bandwidth: 0,
      errors: 0,
      retries: 0,
      timeouts: 0
    };

    this.connections.set(connectionId, metrics);

    observability.logEvent('connection_created', {
      connectionId,
      profileId: profile.id,
      url
    });

    return connectionId;
  }

  closeConnection(connectionId: string): void {
    const metrics = this.connections.get(connectionId);
    if (metrics) {
      metrics.endTime = Date.now();
      this.updatePerformanceMetrics(metrics);
      this.connections.delete(connectionId);

      observability.logEvent('connection_closed', {
        connectionId,
        profileId: metrics.profileId,
        duration: metrics.endTime - metrics.startTime,
        bytesSent: metrics.bytesSent,
        bytesReceived: metrics.bytesReceived
      });
    }
  }

  updateConnectionMetrics(connectionId: string, updates: Partial<ConnectionMetrics>): void {
    const metrics = this.connections.get(connectionId);
    if (metrics) {
      Object.assign(metrics, updates);
      this.connections.set(connectionId, metrics);
    }
  }

  getConnectionMetrics(connectionId: string): ConnectionMetrics | undefined {
    return this.connections.get(connectionId);
  }

  getAllConnectionMetrics(): ConnectionMetrics[] {
    return Array.from(this.connections.values());
  }

  private updatePerformanceMetrics(metrics: ConnectionMetrics): void {
    const existing = this.performance.get(metrics.profileId);
    
    if (existing) {
      // Update existing performance metrics
      const totalConnections = existing.totalConnections + 1;
      const successfulConnections = existing.successfulConnections + (metrics.errors === 0 ? 1 : 0);
      
      existing.averageRtt = (existing.averageRtt * existing.totalConnections + metrics.rtt) / totalConnections;
      existing.averageBandwidth = (existing.averageBandwidth * existing.totalConnections + metrics.bandwidth) / totalConnections;
      existing.averagePacketLoss = (existing.averagePacketLoss * existing.totalConnections + metrics.packetsLost) / totalConnections;
      existing.averageErrors = (existing.averageErrors * existing.totalConnections + metrics.errors) / totalConnections;
      existing.totalConnections = totalConnections;
      existing.successfulConnections = successfulConnections;
      existing.averageConnectionDuration = (existing.averageConnectionDuration * existing.totalConnections + (metrics.endTime! - metrics.startTime)) / totalConnections;
      existing.lastUsed = Date.now();
      existing.usageCount++;
    } else {
      // Create new performance metrics
      const performance: ProfilePerformance = {
        profileId: metrics.profileId,
        averageRtt: metrics.rtt,
        averageBandwidth: metrics.bandwidth,
        averagePacketLoss: metrics.packetsLost,
        averageErrors: metrics.errors,
        totalConnections: 1,
        successfulConnections: metrics.errors === 0 ? 1 : 0,
        averageConnectionDuration: metrics.endTime! - metrics.startTime,
        lastUsed: Date.now(),
        usageCount: 1
      };
      
      this.performance.set(metrics.profileId, performance);
    }

    this.saveToStorage();
  }

  getPerformanceMetrics(profileId: string): ProfilePerformance | undefined {
    return this.performance.get(profileId);
  }

  getAllPerformanceMetrics(): ProfilePerformance[] {
    return Array.from(this.performance.values());
  }

  // Utility methods
  private generateProfileId(name: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2);
    return `profile_${name.toLowerCase().replace(/\s+/g, '_')}_${timestamp}_${random}`;
  }

  private generateConnectionId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2);
    return `conn_${timestamp}_${random}`;
  }

  // Subscription management
  subscribe(callback: (profile: TransportProfile) => void): () => void {
    this.updateCallbacks.add(callback);
    return () => this.updateCallbacks.delete(callback);
  }

  private notifyUpdate(profile: TransportProfile): void {
    this.updateCallbacks.forEach(callback => {
      try {
        callback(profile);
      } catch (error) {
        console.error('Error in transport profile update callback:', error);
      }
    });
  }

  // Statistics
  getStats(): {
    totalProfiles: number;
    builtInProfiles: number;
    customProfiles: number;
    activeConnections: number;
    totalConnections: number;
    averagePerformance: {
      rtt: number;
      bandwidth: number;
      packetLoss: number;
      errors: number;
    };
  } {
    const profiles = Array.from(this.profiles.values());
    const totalProfiles = profiles.length;
    const builtInProfiles = profiles.filter(p => p.isBuiltIn).length;
    const customProfiles = profiles.filter(p => !p.isBuiltIn).length;
    const activeConnections = this.connections.size;
    const totalConnections = Array.from(this.performance.values()).reduce((sum, p) => sum + p.totalConnections, 0);
    
    const performanceMetrics = Array.from(this.performance.values());
    const averagePerformance = {
      rtt: performanceMetrics.length > 0 ? performanceMetrics.reduce((sum, p) => sum + p.averageRtt, 0) / performanceMetrics.length : 0,
      bandwidth: performanceMetrics.length > 0 ? performanceMetrics.reduce((sum, p) => sum + p.averageBandwidth, 0) / performanceMetrics.length : 0,
      packetLoss: performanceMetrics.length > 0 ? performanceMetrics.reduce((sum, p) => sum + p.averagePacketLoss, 0) / performanceMetrics.length : 0,
      errors: performanceMetrics.length > 0 ? performanceMetrics.reduce((sum, p) => sum + p.averageErrors, 0) / performanceMetrics.length : 0
    };

    return {
      totalProfiles,
      builtInProfiles,
      customProfiles,
      activeConnections,
      totalConnections,
      averagePerformance
    };
  }

  // Export/Import
  exportProfiles(): string {
    const customProfiles = this.getCustomProfiles();
    const performance = this.getAllPerformanceMetrics();
    
    return JSON.stringify({
      profiles: customProfiles,
      performance,
      exportedAt: Date.now()
    }, null, 2);
  }

  importProfiles(data: string): boolean {
    try {
      const imported = JSON.parse(data);
      
      if (imported.profiles) {
        imported.profiles.forEach((profile: TransportProfile) => {
          this.profiles.set(profile.id, profile);
        });
      }
      
      if (imported.performance) {
        imported.performance.forEach((perf: ProfilePerformance) => {
          this.performance.set(perf.profileId, perf);
        });
      }
      
      this.saveToStorage();
      return true;
    } catch (error) {
      console.error('Failed to import transport profiles:', error);
      return false;
    }
  }

  resetToDefaults(): void {
    // Remove custom profiles
    const customProfiles = this.getCustomProfiles();
    customProfiles.forEach(profile => {
      this.profiles.delete(profile.id);
    });

    // Reset to default profile
    this.setActiveProfile('balanced-general');

    // Clear performance metrics
    this.performance.clear();
    this.saveToStorage();
  }
}

// Global transport profiles manager instance
let globalTransportProfiles: TransportProfilesManager | null = null;

export function getTransportProfilesManager(): TransportProfilesManager {
  if (!globalTransportProfiles) {
    globalTransportProfiles = new TransportProfilesManager();
  }
  return globalTransportProfiles;
}

// Convenience exports
export const transportProfiles = {
  getProfiles: () => getTransportProfilesManager().getProfiles(),
  getProfile: (profileId: string) => getTransportProfilesManager().getProfile(profileId),
  getActiveProfile: () => getTransportProfilesManager().getActiveProfile(),
  getActiveProfileId: () => getTransportProfilesManager().getActiveProfileId(),
  setActiveProfile: (profileId: string) => getTransportProfilesManager().setActiveProfile(profileId),
  createCustomProfile: (profile: any) => getTransportProfilesManager().createCustomProfile(profile),
  updateProfile: (profileId: string, updates: any) => getTransportProfilesManager().updateProfile(profileId, updates),
  deleteProfile: (profileId: string) => getTransportProfilesManager().deleteProfile(profileId),
  getProfilesByCategory: (category: TransportProfile['category']) => getTransportProfilesManager().getProfilesByCategory(category),
  getBuiltInProfiles: () => getTransportProfilesManager().getBuiltInProfiles(),
  getCustomProfiles: () => getTransportProfilesManager().getCustomProfiles(),
  createConnection: (url: string) => getTransportProfilesManager().createConnection(url),
  closeConnection: (connectionId: string) => getTransportProfilesManager().closeConnection(connectionId),
  updateConnectionMetrics: (connectionId: string, updates: any) => getTransportProfilesManager().updateConnectionMetrics(connectionId, updates),
  getConnectionMetrics: (connectionId: string) => getTransportProfilesManager().getConnectionMetrics(connectionId),
  getAllConnectionMetrics: () => getTransportProfilesManager().getAllConnectionMetrics(),
  getPerformanceMetrics: (profileId: string) => getTransportProfilesManager().getPerformanceMetrics(profileId),
  getAllPerformanceMetrics: () => getTransportProfilesManager().getAllPerformanceMetrics(),
  subscribe: (callback: (profile: TransportProfile) => void) => getTransportProfilesManager().subscribe(callback),
  getStats: () => getTransportProfilesManager().getStats(),
  exportProfiles: () => getTransportProfilesManager().exportProfiles(),
  importProfiles: (data: string) => getTransportProfilesManager().importProfiles(data),
  resetToDefaults: () => getTransportProfilesManager().resetToDefaults()
};
