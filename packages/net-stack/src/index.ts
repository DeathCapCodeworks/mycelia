export type TransportProfile = 'low_latency' | 'bulk' | 'balanced' | 'default';
export type Protocol = 'http1' | 'http2' | 'http3' | 'quic';
export type DNSType = 'system' | 'doh' | 'doq';

export interface NetworkConfig {
  transportProfile: TransportProfile;
  preferredProtocol: Protocol;
  dnsType: DNSType;
  enableMultipath: boolean;
  enable0RTT: boolean;
  maxConcurrentStreams: number;
  initialWindowSize: number;
  maxWindowSize: number;
  connectionTimeout: number;
  idleTimeout: number;
}

export interface ConnectionStats {
  protocol: Protocol;
  rtt: number;
  bandwidth: number;
  packetLoss: number;
  congestionWindow: number;
  streams: number;
  bytesSent: number;
  bytesReceived: number;
  connectionTime: number;
}

export interface DNSConfig {
  type: DNSType;
  servers: string[];
  timeout: number;
  retries: number;
  enableCache: boolean;
  cacheSize: number;
  ttl: number;
}

export class NetworkStack {
  private config: NetworkConfig;
  private dnsConfig: DNSConfig;
  private connections: Map<string, ConnectionStats> = new Map();
  private stats: ConnectionStats[] = [];

  constructor(config?: Partial<NetworkConfig>, dnsConfig?: Partial<DNSConfig>) {
    this.config = {
      transportProfile: 'default',
      preferredProtocol: 'http3',
      dnsType: 'system',
      enableMultipath: false,
      enable0RTT: true,
      maxConcurrentStreams: 100,
      initialWindowSize: 65536,
      maxWindowSize: 16777216,
      connectionTimeout: 30000,
      idleTimeout: 300000,
      ...config
    };

    this.dnsConfig = {
      type: 'system',
      servers: ['8.8.8.8', '1.1.1.1'],
      timeout: 5000,
      retries: 3,
      enableCache: true,
      cacheSize: 1000,
      ttl: 300,
      ...dnsConfig
    };
  }

  setTransportProfile(profile: TransportProfile): void {
    this.config.transportProfile = profile;
    console.log(`NetworkStack: Set transport profile to ${profile}`);
  }

  setPreferredProtocol(protocol: Protocol): void {
    this.config.preferredProtocol = protocol;
    console.log(`NetworkStack: Set preferred protocol to ${protocol}`);
  }

  setDNSType(type: DNSType): void {
    this.dnsConfig.type = type;
    console.log(`NetworkStack: Set DNS type to ${type}`);
  }

  enableDoH(flag: boolean): void {
    if (flag) {
      this.dnsConfig.type = 'doh';
      this.dnsConfig.servers = ['https://cloudflare-dns.com/dns-query', 'https://dns.google/dns-query'];
    }
    console.log(`NetworkStack: DoH ${flag ? 'enabled' : 'disabled'}`);
  }

  enableDoQ(flag: boolean): void {
    if (flag) {
      this.dnsConfig.type = 'doq';
      this.dnsConfig.servers = ['quic://dns.adguard.com:853', 'quic://dns.cloudflare.com:853'];
    }
    console.log(`NetworkStack: DoQ ${flag ? 'enabled' : 'disabled'}`);
  }

  enableMultipath(flag: boolean): void {
    this.config.enableMultipath = flag;
    console.log(`NetworkStack: Multipath ${flag ? 'enabled' : 'disabled'}`);
  }

  enable0RTT(flag: boolean): void {
    this.config.enable0RTT = flag;
    console.log(`NetworkStack: 0-RTT ${flag ? 'enabled' : 'disabled'}`);
  }

  async createConnection(url: string): Promise<string> {
    const connectionId = `conn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const stats: ConnectionStats = {
      protocol: this.config.preferredProtocol,
      rtt: 50 + Math.random() * 100,
      bandwidth: 100 + Math.random() * 900, // Mbps
      packetLoss: Math.random() * 2,
      congestionWindow: this.config.initialWindowSize,
      streams: 1,
      bytesSent: 0,
      bytesReceived: 0,
      connectionTime: Date.now()
    };

    this.connections.set(connectionId, stats);
    console.log(`NetworkStack: Created connection ${connectionId} to ${url} using ${stats.protocol}`);
    
    return connectionId;
  }

  async closeConnection(connectionId: string): Promise<void> {
    const stats = this.connections.get(connectionId);
    if (stats) {
      this.stats.push(stats);
      this.connections.delete(connectionId);
      console.log(`NetworkStack: Closed connection ${connectionId}`);
    }
  }

  async sendData(connectionId: string, data: ArrayBuffer): Promise<number> {
    const stats = this.connections.get(connectionId);
    if (!stats) throw new Error(`Connection ${connectionId} not found`);

    // Simulate network delay based on transport profile
    const delay = this.config.transportProfile === 'low_latency' ? 10 : 
                  this.config.transportProfile === 'bulk' ? 100 : 50;
    
    await new Promise(resolve => setTimeout(resolve, delay));
    
    stats.bytesSent += data.byteLength;
    stats.rtt = 30 + Math.random() * 40; // Simulate RTT variation
    
    return data.byteLength;
  }

  async receiveData(connectionId: string, size: number): Promise<ArrayBuffer> {
    const stats = this.connections.get(connectionId);
    if (!stats) throw new Error(`Connection ${connectionId} not found`);

    // Simulate network delay
    const delay = this.config.transportProfile === 'low_latency' ? 5 : 
                  this.config.transportProfile === 'bulk' ? 80 : 40;
    
    await new Promise(resolve => setTimeout(resolve, delay));
    
    stats.bytesReceived += size;
    const data = new ArrayBuffer(size);
    
    return data;
  }

  getConnectionStats(connectionId: string): ConnectionStats | undefined {
    return this.connections.get(connectionId);
  }

  getAllConnectionStats(): ConnectionStats[] {
    return Array.from(this.connections.values());
  }

  getHistoricalStats(): ConnectionStats[] {
    return [...this.stats];
  }

  getNetworkConfig(): NetworkConfig {
    return { ...this.config };
  }

  getDNSConfig(): DNSConfig {
    return { ...this.dnsConfig };
  }

  async resolveDNS(hostname: string): Promise<string[]> {
    console.log(`NetworkStack: Resolving ${hostname} using ${this.dnsConfig.type}`);
    
    // Simulate DNS resolution delay
    const delay = this.dnsConfig.type === 'doq' ? 20 : 
                  this.dnsConfig.type === 'doh' ? 50 : 30;
    
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // Mock DNS response
    return [`192.168.1.${Math.floor(Math.random() * 255)}`, `10.0.0.${Math.floor(Math.random() * 255)}`];
  }

  getAverageStats(): {
    avgRTT: number;
    avgBandwidth: number;
    avgPacketLoss: number;
    totalBytesSent: number;
    totalBytesReceived: number;
  } {
    const allStats = [...this.connections.values(), ...this.stats];
    
    if (allStats.length === 0) {
      return {
        avgRTT: 0,
        avgBandwidth: 0,
        avgPacketLoss: 0,
        totalBytesSent: 0,
        totalBytesReceived: 0
      };
    }

    const totals = allStats.reduce((acc, stat) => ({
      rtt: acc.rtt + stat.rtt,
      bandwidth: acc.bandwidth + stat.bandwidth,
      packetLoss: acc.packetLoss + stat.packetLoss,
      bytesSent: acc.bytesSent + stat.bytesSent,
      bytesReceived: acc.bytesReceived + stat.bytesReceived
    }), { rtt: 0, bandwidth: 0, packetLoss: 0, bytesSent: 0, bytesReceived: 0 });

    const count = allStats.length;
    return {
      avgRTT: totals.rtt / count,
      avgBandwidth: totals.bandwidth / count,
      avgPacketLoss: totals.packetLoss / count,
      totalBytesSent: totals.bytesSent,
      totalBytesReceived: totals.bytesReceived
    };
  }
}

// Global network stack instance
let globalNetworkStack: NetworkStack | null = null;

export function getGlobalNetworkStack(): NetworkStack {
  if (!globalNetworkStack) {
    globalNetworkStack = new NetworkStack();
  }
  return globalNetworkStack;
}

// Legacy function exports for backward compatibility
let profile: TransportProfile = 'default';
let doh = false;
let doq = false;

export function setTransportProfile(p: TransportProfile): void { 
  profile = p;
  getGlobalNetworkStack().setTransportProfile(p);
}

export function enableDoH(flag: boolean): void { 
  doh = flag;
  getGlobalNetworkStack().enableDoH(flag);
}

export function enableDoQ(flag: boolean): void { 
  doq = flag;
  getGlobalNetworkStack().enableDoQ(flag);
}

export function getNetConfig() {
  return { profile, doh, doq };
}

