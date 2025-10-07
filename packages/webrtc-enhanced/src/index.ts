export type ScalabilityMode = 'L1T1' | 'L1T2' | 'L1T3' | 'L2T1' | 'L2T2' | 'L2T3' | 'L3T1' | 'L3T2' | 'L3T3';

export type CodecPreference = 'av1' | 'vp9' | 'h264';

export interface PeerOptions {
  lowDelay?: boolean;
  scalabilityMode?: ScalabilityMode;
  targetBitrateKbps?: number;
  enableAdaptiveBitrate?: boolean;
  enableSimulcast?: boolean;
  maxSpatialLayers?: number;
  maxTemporalLayers?: number;
  preferCodec?: CodecPreference;
  enableFEC?: boolean;
  enableBWE?: boolean;
}

export interface PeerStats {
  bitrate: number;
  framerate: number;
  resolution: { width: number; height: number };
  spatialLayer: number;
  temporalLayer: number;
  packetLoss: number;
  rtt: number;
  jitter: number;
  codec: string;
  fecEnabled: boolean;
  bweEnabled: boolean;
}

export interface Peer {
  id: string;
  setScalabilityMode(mode: ScalabilityMode): void;
  setTargetBitrate(kbps: number): void;
  setLowDelay(flag: boolean): void;
  setAdaptiveBitrate(enabled: boolean): void;
  setSimulcast(enabled: boolean): void;
  preferCodec(codec: CodecPreference): void;
  setFEC(enabled: boolean): void;
  setBWE(enabled: boolean): void;
  getStats(): Promise<PeerStats>;
  getConnectionState(): 'new' | 'connecting' | 'connected' | 'disconnected' | 'failed' | 'closed';
  close(): void;
}

export interface SFUConnection {
  id: string;
  url: string;
  token?: string;
  peers: Map<string, Peer>;
  connectionState: 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'failed';
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  createPeer(options?: PeerOptions): Promise<Peer>;
  removePeer(peerId: string): Promise<void>;
  getPeers(): Peer[];
  getStats(): Promise<{ totalPeers: number; totalBitrate: number; avgRtt: number; av1Peers: number }>;
}

export class EnhancedPeer implements Peer {
  public id: string;
  private mode: ScalabilityMode;
  private lowDelay: boolean;
  private kbps: number;
  private adaptiveBitrate: boolean;
  private simulcast: boolean;
  private preferCodec: CodecPreference;
  private fecEnabled: boolean;
  private bweEnabled: boolean;
  private connectionState: Peer['connectionState'] = 'new';
  private stats: PeerStats;

  constructor(id: string, options: PeerOptions = {}) {
    this.id = id;
    this.mode = options.scalabilityMode ?? 'L1T3';
    this.lowDelay = options.lowDelay ?? false;
    this.kbps = options.targetBitrateKbps ?? 1200;
    this.adaptiveBitrate = options.enableAdaptiveBitrate ?? true;
    this.simulcast = options.enableSimulcast ?? false;
    this.preferCodec = options.preferCodec ?? 'h264';
    this.fecEnabled = options.enableFEC ?? false;
    this.bweEnabled = options.enableBWE ?? true;
    
    this.stats = {
      bitrate: this.kbps,
      framerate: 30,
      resolution: { width: 1280, height: 720 },
      spatialLayer: 1,
      temporalLayer: 3,
      packetLoss: 0,
      rtt: 50,
      jitter: 5,
      codec: this.preferCodec,
      fecEnabled: this.fecEnabled,
      bweEnabled: this.bweEnabled
    };
  }

  setScalabilityMode(mode: ScalabilityMode): void {
    this.mode = mode;
    const [spatial, temporal] = mode.slice(1).split('T').map(Number);
    this.stats.spatialLayer = spatial;
    this.stats.temporalLayer = temporal;
    console.log(`Peer ${this.id}: Set scalability mode to ${mode}`);
  }

  setTargetBitrate(kbps: number): void {
    this.kbps = kbps;
    this.stats.bitrate = kbps;
    console.log(`Peer ${this.id}: Set target bitrate to ${kbps} kbps`);
  }

  setLowDelay(flag: boolean): void {
    this.lowDelay = flag;
    if (flag) {
      // Optimize for low delay
      this.setScalabilityMode('L1T1');
      this.setFEC(false);
      this.setBWE(true);
    }
    console.log(`Peer ${this.id}: Set low delay to ${flag}`);
  }

  setAdaptiveBitrate(enabled: boolean): void {
    this.adaptiveBitrate = enabled;
    console.log(`Peer ${this.id}: Set adaptive bitrate to ${enabled}`);
  }

  setSimulcast(enabled: boolean): void {
    this.simulcast = enabled;
    console.log(`Peer ${this.id}: Set simulcast to ${enabled}`);
  }

  preferCodec(codec: CodecPreference): void {
    this.preferCodec = codec;
    this.stats.codec = codec;
    
    // Adjust settings based on codec preference
    if (codec === 'av1') {
      // AV1 optimizations
      if (this.lowDelay) {
        this.setScalabilityMode('L1T3'); // AV1 low delay SVC
      } else {
        this.setScalabilityMode('L3T3'); // Full AV1 SVC
      }
      this.setFEC(true); // AV1 benefits from FEC
    } else if (codec === 'vp9') {
      this.setScalabilityMode('L2T2'); // VP9 SVC
      this.setFEC(false);
    } else {
      this.setScalabilityMode('L1T1'); // H.264 no SVC
      this.setFEC(false);
    }
    
    console.log(`Peer ${this.id}: Preferred codec set to ${codec}`);
  }

  setFEC(enabled: boolean): void {
    this.fecEnabled = enabled;
    this.stats.fecEnabled = enabled;
    console.log(`Peer ${this.id}: Set FEC to ${enabled}`);
  }

  setBWE(enabled: boolean): void {
    this.bweEnabled = enabled;
    this.stats.bweEnabled = enabled;
    console.log(`Peer ${this.id}: Set BWE to ${enabled}`);
  }

  async getStats(): Promise<PeerStats> {
    // Simulate stats updates
    this.stats.packetLoss = Math.random() * 2;
    this.stats.rtt = 30 + Math.random() * 40;
    this.stats.jitter = Math.random() * 10;
    
    if (this.adaptiveBitrate) {
      // Simulate adaptive bitrate adjustments
      const adjustment = (Math.random() - 0.5) * 200;
      this.stats.bitrate = Math.max(100, this.kbps + adjustment);
    }

    // Simulate codec-specific performance
    if (this.preferCodec === 'av1') {
      // AV1 typically has better compression but higher CPU usage
      this.stats.bitrate *= 0.8; // Better compression
      if (this.stats.packetLoss > 1) {
        this.stats.packetLoss *= 0.5; // AV1 is more resilient
      }
    } else if (this.preferCodec === 'vp9') {
      this.stats.bitrate *= 0.9; // Good compression
    }
    
    return { ...this.stats };
  }

  getConnectionState(): Peer['connectionState'] {
    return this.connectionState;
  }

  close(): void {
    this.connectionState = 'closed';
    console.log(`Peer ${this.id}: Closed`);
  }
}

export class SFUClient implements SFUConnection {
  public id: string;
  public url: string;
  public token?: string;
  public peers: Map<string, Peer> = new Map();
  public connectionState: SFUConnection['connectionState'] = 'disconnected';

  constructor(url: string, token?: string) {
    this.id = `sfu-${Date.now()}`;
    this.url = url;
    this.token = token;
  }

  async connect(): Promise<void> {
    this.connectionState = 'connecting';
    console.log(`SFU ${this.id}: Connecting to ${this.url}...`);
    
    // Simulate connection delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    this.connectionState = 'connected';
    console.log(`SFU ${this.id}: Connected successfully`);
  }

  async disconnect(): Promise<void> {
    this.connectionState = 'disconnected';
    
    // Close all peers
    for (const peer of this.peers.values()) {
      peer.close();
    }
    this.peers.clear();
    
    console.log(`SFU ${this.id}: Disconnected`);
  }

  async createPeer(options: PeerOptions = {}): Promise<Peer> {
    const peerId = `peer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const peer = new EnhancedPeer(peerId, options);
    
    this.peers.set(peerId, peer);
    console.log(`SFU ${this.id}: Created peer ${peerId}`);
    
    return peer;
  }

  async removePeer(peerId: string): Promise<void> {
    const peer = this.peers.get(peerId);
    if (peer) {
      peer.close();
      this.peers.delete(peerId);
      console.log(`SFU ${this.id}: Removed peer ${peerId}`);
    }
  }

  getPeers(): Peer[] {
    return Array.from(this.peers.values());
  }

  async getStats(): Promise<{ totalPeers: number; totalBitrate: number; avgRtt: number; av1Peers: number }> {
    const peers = this.getPeers();
    let totalBitrate = 0;
    let totalRtt = 0;
    let av1Peers = 0;
    
    for (const peer of peers) {
      const stats = await peer.getStats();
      totalBitrate += stats.bitrate;
      totalRtt += stats.rtt;
      if (stats.codec === 'av1') av1Peers++;
    }
    
    return {
      totalPeers: peers.length,
      totalBitrate,
      avgRtt: peers.length > 0 ? totalRtt / peers.length : 0,
      av1Peers
    };
  }
}

// Legacy function exports for backward compatibility
export function createPeerEnhanced(opts: PeerOptions = {}): Peer {
  const peerId = `legacy-peer-${Date.now()}`;
  return new EnhancedPeer(peerId, opts);
}

export const sfu = {
  async connect(url: string, token?: string): Promise<SFUConnection> {
    const client = new SFUClient(url, token);
    await client.connect();
    return client;
  }
};

