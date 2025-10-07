// Web4 Engine Bridge - Unified API for Navigator integration

import { MediaPipeline, AV1Preset, EncodeOptions, HardwareCapabilities } from '@mycelia/media-pipeline';
import { SFUClient, PeerOptions, CodecPreference, ScalabilityMode } from '@mycelia/webrtc-enhanced';
import { NetworkStack, TransportProfile, Protocol } from '@mycelia/net-stack';
import { getCompatMatrixManager, HardwareCapabilities as CompatHardwareCapabilities } from '@mycelia/compat-matrix';
import { observability } from '@mycelia/observability';

export interface EngineCapabilities {
  media: {
    av1Encode: boolean;
    av1Decode: boolean;
    hardwareAcceleration: boolean;
    platform: string;
  };
  rtc: {
    av1SVC: boolean;
    simulcast: boolean;
    fec: boolean;
    bwe: boolean;
  };
  network: {
    quic: boolean;
    http3: boolean;
    multipath: boolean;
    doh: boolean;
    doq: boolean;
  };
}

export interface MediaEncodeOptions {
  input: ArrayBuffer | Uint8Array;
  preset?: AV1Preset;
  codec?: 'av1' | 'vp9' | 'h264';
  bitrate?: number;
  fps?: number;
  width?: number;
  height?: number;
  hardwarePreferred?: boolean;
}

export interface MediaTranscodeOptions {
  input: ArrayBuffer | Uint8Array;
  targetPreset: AV1Preset;
  qualityProfile?: 'speed' | 'balanced' | 'quality';
}

export interface RTCOptions {
  scalabilityMode?: ScalabilityMode;
  preferCodec?: CodecPreference;
  targetBitrateKbps?: number;
  lowDelay?: boolean;
  enableFEC?: boolean;
  enableBWE?: boolean;
}

export class EngineBridge {
  private mediaPipeline: MediaPipeline;
  private networkStack: NetworkStack;
  private sfuClients: Map<string, SFUClient> = new Map();
  private capabilities: EngineCapabilities | null = null;
  private compatMatrix = getCompatMatrixManager();
  private overridePath: 'hw' | 'sw' | null = null;

  constructor() {
    this.mediaPipeline = new MediaPipeline();
    this.networkStack = new NetworkStack();
    this.initializeCompatibility();
    this.detectCapabilities();
  }

  private async initializeCompatibility(): Promise<void> {
    // Detect hardware capabilities and log detection event
    const compatResult = await this.compatMatrix.detectCurrentCapabilities();
    
    observability.logEvent('engine_bridge_compatibility_detected', {
      os: compatResult.os,
      gpu_driver: compatResult.gpu_driver,
      hw_encode: compatResult.hw_encode,
      hw_decode: compatResult.hw_decode,
      success_codes: compatResult.success_codes
    });
  }

  private async detectCapabilities(): Promise<void> {
    const hardwareCaps = this.mediaPipeline.getHardwareCapabilities();
    
    this.capabilities = {
      media: {
        av1Encode: hardwareCaps?.av1Encode ?? false,
        av1Decode: hardwareCaps?.av1Decode ?? false,
        hardwareAcceleration: hardwareCaps?.av1Encode ?? false,
        platform: hardwareCaps?.platform ?? 'unknown'
      },
      rtc: {
        av1SVC: true, // AV1 SVC is supported in our implementation
        simulcast: true,
        fec: true,
        bwe: true
      },
      network: {
        quic: true,
        http3: true,
        multipath: true,
        doh: true,
        doq: true
      }
    };

    console.log('Engine capabilities detected:', this.capabilities);
  }

  // Media Pipeline API
  async mediaEncode(input: ArrayBuffer | Uint8Array, preset: AV1Preset, options?: Partial<MediaEncodeOptions>): Promise<AsyncIterable<Uint8Array>> {
    const opts: MediaEncodeOptions = {
      input,
      preset,
      codec: 'av1',
      hardwarePreferred: true,
      ...options
    };

    if (preset) {
      return this.mediaPipeline.encodeAV1(input, preset, opts);
    } else {
      return this.mediaPipeline.encode({
        input: opts.input,
        codec: opts.codec ?? 'av1',
        bitrate: opts.bitrate ?? 2000,
        fps: opts.fps ?? 30,
        width: opts.width ?? 1920,
        height: opts.height ?? 1080,
        hardwarePreferred: opts.hardwarePreferred
      });
    }
  }

  async mediaTranscode(input: ArrayBuffer | Uint8Array, targetPreset: AV1Preset, options?: Partial<MediaTranscodeOptions>): Promise<{ mime: string; data: Uint8Array }> {
    const opts: MediaTranscodeOptions = {
      input,
      targetPreset,
      qualityProfile: 'balanced',
      ...options
    };

    return this.mediaPipeline.transcode({
      input: opts.input,
      targetCodec: 'av1',
      qualityProfile: opts.qualityProfile ?? 'balanced'
    });
  }

  async mediaSupports(options: { codec: string; encode?: boolean; decode?: boolean }): Promise<boolean> {
    return this.mediaPipeline.supports(options);
  }

  getMediaCapabilities(): HardwareCapabilities | null {
    return this.mediaPipeline.getHardwareCapabilities();
  }

  // WebRTC Enhanced API
  async rtcConnect(url: string, token?: string): Promise<string> {
    const client = new SFUClient(url, token);
    await client.connect();
    
    const clientId = `sfu-${Date.now()}`;
    this.sfuClients.set(clientId, client);
    
    return clientId;
  }

  async rtcDisconnect(clientId: string): Promise<void> {
    const client = this.sfuClients.get(clientId);
    if (client) {
      await client.disconnect();
      this.sfuClients.delete(clientId);
    }
  }

  async rtcCreatePeer(clientId: string, options?: RTCOptions): Promise<string> {
    const client = this.sfuClients.get(clientId);
    if (!client) throw new Error(`SFU client ${clientId} not found`);

    const peerOptions: PeerOptions = {
      scalabilityMode: options?.scalabilityMode ?? 'L1T3',
      preferCodec: options?.preferCodec ?? 'h264',
      targetBitrateKbps: options?.targetBitrateKbps ?? 1200,
      lowDelay: options?.lowDelay ?? false,
      enableFEC: options?.enableFEC ?? false,
      enableBWE: options?.enableBWE ?? true,
      enableAdaptiveBitrate: true,
      enableSimulcast: true
    };

    const peer = await client.createPeer(peerOptions);
    return peer.id;
  }

  async rtcRemovePeer(clientId: string, peerId: string): Promise<void> {
    const client = this.sfuClients.get(clientId);
    if (!client) throw new Error(`SFU client ${clientId} not found`);

    await client.removePeer(peerId);
  }

  async rtcSetScalabilityMode(clientId: string, peerId: string, mode: ScalabilityMode): Promise<void> {
    const client = this.sfuClients.get(clientId);
    if (!client) throw new Error(`SFU client ${clientId} not found`);

    const peer = client.getPeers().find(p => p.id === peerId);
    if (!peer) throw new Error(`Peer ${peerId} not found`);

    peer.setScalabilityMode(mode);
  }

  async rtcSetTargetBitrate(clientId: string, peerId: string, kbps: number): Promise<void> {
    const client = this.sfuClients.get(clientId);
    if (!client) throw new Error(`SFU client ${clientId} not found`);

    const peer = client.getPeers().find(p => p.id === peerId);
    if (!peer) throw new Error(`Peer ${peerId} not found`);

    peer.setTargetBitrate(kbps);
  }

  async rtcSetLowDelay(clientId: string, peerId: string, enabled: boolean): Promise<void> {
    const client = this.sfuClients.get(clientId);
    if (!client) throw new Error(`SFU client ${clientId} not found`);

    const peer = client.getPeers().find(p => p.id === peerId);
    if (!peer) throw new Error(`Peer ${peerId} not found`);

    peer.setLowDelay(enabled);
  }

  async rtcPreferCodec(clientId: string, peerId: string, codec: CodecPreference): Promise<void> {
    const client = this.sfuClients.get(clientId);
    if (!client) throw new Error(`SFU client ${clientId} not found`);

    const peer = client.getPeers().find(p => p.id === peerId);
    if (!peer) throw new Error(`Peer ${peerId} not found`);

    peer.preferCodec(codec);
  }

  async rtcGetStats(clientId: string): Promise<{ totalPeers: number; totalBitrate: number; avgRtt: number; av1Peers: number }> {
    const client = this.sfuClients.get(clientId);
    if (!client) throw new Error(`SFU client ${clientId} not found`);

    return client.getStats();
  }

  // Network Stack API
  setTransportProfile(profile: TransportProfile): void {
    this.networkStack.setTransportProfile(profile);
  }

  setPreferredProtocol(protocol: Protocol): void {
    this.networkStack.setPreferredProtocol(protocol);
  }

  enableDoH(enabled: boolean): void {
    this.networkStack.enableDoH(enabled);
  }

  enableDoQ(enabled: boolean): void {
    this.networkStack.enableDoQ(enabled);
  }

  enableMultipath(enabled: boolean): void {
    this.networkStack.enableMultipath(enabled);
  }

  enable0RTT(enabled: boolean): void {
    this.networkStack.enable0RTT(enabled);
  }

  async createConnection(url: string): Promise<string> {
    return this.networkStack.createConnection(url);
  }

  async closeConnection(connectionId: string): Promise<void> {
    return this.networkStack.closeConnection(connectionId);
  }

  async sendData(connectionId: string, data: ArrayBuffer): Promise<number> {
    return this.networkStack.sendData(connectionId, data);
  }

  async receiveData(connectionId: string, size: number): Promise<ArrayBuffer> {
    return this.networkStack.receiveData(connectionId, size);
  }

  async resolveDNS(hostname: string): Promise<string[]> {
    return this.networkStack.resolveDNS(hostname);
  }

  getNetworkStats(): any {
    return this.networkStack.getAverageStats();
  }

  // Unified capabilities API
  async getCapabilities(): Promise<EngineCapabilities> {
    if (!this.capabilities) {
      await this.detectCapabilities();
    }
    return this.capabilities!;
  }

  // Override path for testing/debugging
  overridePath(path: 'hw' | 'sw'): void {
    this.overridePath = path;
    
    observability.logEvent('engine_bridge_path_override', {
      path,
      reason: 'manual_override'
    });
  }

  getOverridePath(): 'hw' | 'sw' | null {
    return this.overridePath;
  }

  clearOverridePath(): void {
    this.overridePath = null;
    
    observability.logEvent('engine_bridge_path_override_cleared', {
      reason: 'manual_clear'
    });
  }

  // Convenience methods for common operations
  async optimizeForRealtime(): Promise<void> {
    // Optimize all components for real-time performance
    this.setTransportProfile('low_latency');
    this.setPreferredProtocol('quic');
    this.enable0RTT(true);
    this.enableMultipath(false);
    
    console.log('Engine optimized for real-time performance');
  }

  async optimizeForQuality(): Promise<void> {
    // Optimize all components for maximum quality
    this.setTransportProfile('balanced');
    this.setPreferredProtocol('http3');
    this.enableMultipath(true);
    this.enable0RTT(false);
    
    console.log('Engine optimized for maximum quality');
  }

  async optimizeForBandwidth(): Promise<void> {
    // Optimize all components for bandwidth efficiency
    this.setTransportProfile('bulk');
    this.setPreferredProtocol('http3');
    this.enableMultipath(true);
    this.enable0RTT(false);
    
    console.log('Engine optimized for bandwidth efficiency');
  }

  // Performance monitoring
  getPerformanceStats(): {
    media: any;
    network: any;
    rtc: { totalClients: number; totalPeers: number };
  } {
    const mediaStats = this.mediaPipeline.getAverageStats();
    const networkStats = this.networkStack.getAverageStats();
    
    let totalClients = 0;
    let totalPeers = 0;
    
    for (const client of this.sfuClients.values()) {
      totalClients++;
      totalPeers += client.getPeers().length;
    }

    return {
      media: mediaStats,
      network: networkStats,
      rtc: { totalClients, totalPeers }
    };
  }
}

// Global engine instance
let globalEngine: EngineBridge | null = null;

export function getEngine(): EngineBridge {
  if (!globalEngine) {
    globalEngine = new EngineBridge();
  }
  return globalEngine;
}

// Convenience exports
export const engine = {
  media: {
    encode: (input: ArrayBuffer | Uint8Array, preset: AV1Preset, options?: Partial<MediaEncodeOptions>) => 
      getEngine().mediaEncode(input, preset, options),
    transcode: (input: ArrayBuffer | Uint8Array, targetPreset: AV1Preset, options?: Partial<MediaTranscodeOptions>) => 
      getEngine().mediaTranscode(input, targetPreset, options),
    supports: (options: { codec: string; encode?: boolean; decode?: boolean }) => 
      getEngine().mediaSupports(options)
  },
  rtc: {
    connect: (url: string, token?: string) => getEngine().rtcConnect(url, token),
    disconnect: (clientId: string) => getEngine().rtcDisconnect(clientId),
    createPeer: (clientId: string, options?: RTCOptions) => getEngine().rtcCreatePeer(clientId, options),
    removePeer: (clientId: string, peerId: string) => getEngine().rtcRemovePeer(clientId, peerId),
    setScalabilityMode: (clientId: string, peerId: string, mode: ScalabilityMode) => 
      getEngine().rtcSetScalabilityMode(clientId, peerId, mode),
    setTargetBitrate: (clientId: string, peerId: string, kbps: number) => 
      getEngine().rtcSetTargetBitrate(clientId, peerId, kbps),
    setLowDelay: (clientId: string, peerId: string, enabled: boolean) => 
      getEngine().rtcSetLowDelay(clientId, peerId, enabled),
    preferCodec: (clientId: string, peerId: string, codec: CodecPreference) => 
      getEngine().rtcPreferCodec(clientId, peerId, codec),
    getStats: (clientId: string) => getEngine().rtcGetStats(clientId)
  },
  network: {
    setTransportProfile: (profile: TransportProfile) => getEngine().setTransportProfile(profile),
    setPreferredProtocol: (protocol: Protocol) => getEngine().setPreferredProtocol(protocol),
    enableDoH: (enabled: boolean) => getEngine().enableDoH(enabled),
    enableDoQ: (enabled: boolean) => getEngine().enableDoQ(enabled),
    enableMultipath: (enabled: boolean) => getEngine().enableMultipath(enabled),
    enable0RTT: (enabled: boolean) => getEngine().enable0RTT(enabled),
    createConnection: (url: string) => getEngine().createConnection(url),
    closeConnection: (connectionId: string) => getEngine().closeConnection(connectionId),
    sendData: (connectionId: string, data: ArrayBuffer) => getEngine().sendData(connectionId, data),
    receiveData: (connectionId: string, size: number) => getEngine().receiveData(connectionId, size),
    resolveDNS: (hostname: string) => getEngine().resolveDNS(hostname),
    getStats: () => getEngine().getNetworkStats()
  },
  capabilities: () => getEngine().getCapabilities(),
  optimizeForRealtime: () => getEngine().optimizeForRealtime(),
  optimizeForQuality: () => getEngine().optimizeForQuality(),
  optimizeForBandwidth: () => getEngine().optimizeForBandwidth(),
  getPerformanceStats: () => getEngine().getPerformanceStats()
};

export default engine;

