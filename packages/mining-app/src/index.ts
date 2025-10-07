import { create } from 'ipfs-core';
import { create as createHttpClient } from 'ipfs-http-client';
import { SupplyLedger } from '@mycelia/shared-kernel';
import { 
  RewardsEngine, 
  type MintingFeeds,
  type PageSignals,
  type Decision 
} from '@mycelia/bloom-rewards';
import { 
  RedemptionEngine, 
  MockHtlcSimulator,
  type RedeemIntent 
} from '@mycelia/redemption';
import { 
  bloomToSats, 
  satsToBloom, 
  assertCanMint,
  type ReserveFeed,
  type SupplyFeed 
} from '@mycelia/tokenomics';

/**
 * IPFS node configuration
 */
export interface IPFSConfig {
  type: 'local' | 'http';
  url?: string;
  port?: number;
  apiPort?: number;
  gatewayPort?: number;
}

/**
 * Resource allocation metrics
 */
export interface ResourceMetrics {
  storageUsed: number; // bytes
  storageAvailable: number; // bytes
  bandwidthUsed: number; // bytes
  bandwidthAvailable: number; // bytes
  uptime: number; // seconds
  lastSeen: number; // timestamp
}

/**
 * Mining contribution score
 */
export interface ContributionScore {
  storageScore: number;
  bandwidthScore: number;
  uptimeScore: number;
  totalScore: number;
  tier: 1 | 2 | 3;
  multiplier: number;
}

/**
 * Mining session data
 */
export interface MiningSession {
  id: string;
  startTime: number;
  endTime?: number;
  resourcesAllocated: ResourceMetrics;
  contributionScore: ContributionScore;
  rewardsEarned: bigint;
  status: 'active' | 'completed' | 'failed';
}

/**
 * IPFS node manager for mining operations
 */
export class IPFSNodeManager {
  private node: any;
  private config: IPFSConfig;
  private isRunning = false;

  constructor(config: IPFSConfig) {
    this.config = config;
  }

  /**
   * Initialize and start IPFS node
   */
  async start(): Promise<void> {
    if (this.isRunning) return;

    try {
      if (this.config.type === 'local') {
        this.node = await create({
          repo: './ipfs-repo',
          config: {
            Addresses: {
              Swarm: [`/ip4/0.0.0.0/tcp/${this.config.port || 4001}`],
              API: `/ip4/127.0.0.1/tcp/${this.config.apiPort || 5001}`,
              Gateway: `/ip4/127.0.0.1/tcp/${this.config.gatewayPort || 8080}`
            }
          }
        });
      } else {
        this.node = createHttpClient({
          url: this.config.url || 'http://localhost:5001'
        });
      }

      this.isRunning = true;
      console.log('IPFS node started successfully');
    } catch (error) {
      throw new Error(`Failed to start IPFS node: ${error}`);
    }
  }

  /**
   * Stop IPFS node
   */
  async stop(): Promise<void> {
    if (!this.isRunning) return;

    try {
      if (this.node && typeof this.node.stop === 'function') {
        await this.node.stop();
      }
      this.isRunning = false;
      console.log('IPFS node stopped');
    } catch (error) {
      console.error('Error stopping IPFS node:', error);
    }
  }

  /**
   * Get node information
   */
  async getNodeInfo(): Promise<any> {
    if (!this.node) throw new Error('IPFS node not started');
    return this.node.id();
  }

  /**
   * Add content to IPFS
   */
  async addContent(content: string | Uint8Array): Promise<string> {
    if (!this.node) throw new Error('IPFS node not started');
    const result = await this.node.add(content);
    return result.cid.toString();
  }

  /**
   * Get content from IPFS
   */
  async getContent(cid: string): Promise<Uint8Array> {
    if (!this.node) throw new Error('IPFS node not started');
    const chunks = [];
    for await (const chunk of this.node.cat(cid)) {
      chunks.push(chunk);
    }
    return new Uint8Array(Buffer.concat(chunks));
  }

  /**
   * Pin content to ensure availability
   */
  async pinContent(cid: string): Promise<void> {
    if (!this.node) throw new Error('IPFS node not started');
    await this.node.pin.add(cid);
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<{ used: number; available: number }> {
    if (!this.node) throw new Error('IPFS node not started');
    
    try {
      const stats = await this.node.repo.stat();
      return {
        used: stats.repoSize,
        available: stats.storageMax - stats.repoSize
      };
    } catch (error) {
      // Fallback for HTTP client
      return {
        used: 0,
        available: 100 * 1024 * 1024 * 1024 // 100GB default
      };
    }
  }

  /**
   * Check if node is running
   */
  isNodeRunning(): boolean {
    return this.isRunning;
  }
}

/**
 * Resource allocation engine for mining
 */
export class ResourceAllocationEngine {
  private ipfsManager: IPFSNodeManager;
  private allocatedResources = new Map<string, ResourceMetrics>();

  constructor(ipfsManager: IPFSNodeManager) {
    this.ipfsManager = ipfsManager;
  }

  /**
   * Allocate resources for mining
   */
  async allocateResources(minerId: string, requirements: Partial<ResourceMetrics>): Promise<ResourceMetrics> {
    const currentStats = await this.ipfsManager.getStorageStats();
    
    const allocation: ResourceMetrics = {
      storageUsed: requirements.storageUsed || 0,
      storageAvailable: Math.min(requirements.storageAvailable || currentStats.available, currentStats.available),
      bandwidthUsed: requirements.bandwidthUsed || 0,
      bandwidthAvailable: requirements.bandwidthAvailable || 100 * 1024 * 1024, // 100MB/s default
      uptime: requirements.uptime || 0,
      lastSeen: Date.now()
    };

    this.allocatedResources.set(minerId, allocation);
    return allocation;
  }

  /**
   * Update resource usage
   */
  async updateResourceUsage(minerId: string, usage: Partial<ResourceMetrics>): Promise<void> {
    const current = this.allocatedResources.get(minerId);
    if (!current) return;

    const updated: ResourceMetrics = {
      ...current,
      ...usage,
      lastSeen: Date.now()
    };

    this.allocatedResources.set(minerId, updated);
  }

  /**
   * Get current resource allocation
   */
  getResourceAllocation(minerId: string): ResourceMetrics | undefined {
    return this.allocatedResources.get(minerId);
  }

  /**
   * Calculate contribution score based on resources
   */
  calculateContributionScore(resources: ResourceMetrics): ContributionScore {
    // Storage score (0-100)
    const storageScore = Math.min(100, (resources.storageUsed / (1024 * 1024 * 1024)) * 10); // 1GB = 10 points
    
    // Bandwidth score (0-100)
    const bandwidthScore = Math.min(100, (resources.bandwidthUsed / (1024 * 1024)) * 0.1); // 1MB = 0.1 points
    
    // Uptime score (0-100)
    const uptimeScore = Math.min(100, (resources.uptime / (24 * 60 * 60)) * 10); // 1 day = 10 points
    
    const totalScore = storageScore + bandwidthScore + uptimeScore;
    
    // Determine tier and multiplier
    let tier: 1 | 2 | 3;
    let multiplier: number;
    
    if (totalScore >= 200) {
      tier = 3;
      multiplier = 1.25;
    } else if (totalScore >= 100) {
      tier = 2;
      multiplier = 1.1;
    } else {
      tier = 1;
      multiplier = 1.0;
    }

    return {
      storageScore,
      bandwidthScore,
      uptimeScore,
      totalScore,
      tier,
      multiplier
    };
  }
}

/**
 * Mining application orchestrator
 */
export class MiningApplication {
  private ipfsManager: IPFSNodeManager;
  private resourceEngine: ResourceAllocationEngine;
  private rewardsEngine: RewardsEngine;
  private redemptionEngine: RedemptionEngine;
  private supplyLedger: SupplyLedger;
  private sessions = new Map<string, MiningSession>();
  private isMining = false;

  constructor(
    ipfsConfig: IPFSConfig,
    supplyLedger: SupplyLedger,
    mintingFeeds: MintingFeeds
  ) {
    this.supplyLedger = supplyLedger;
    this.ipfsManager = new IPFSNodeManager(ipfsConfig);
    this.resourceEngine = new ResourceAllocationEngine(this.ipfsManager);
    this.rewardsEngine = new RewardsEngine(supplyLedger);
    this.rewardsEngine.setMintingFeeds(mintingFeeds);
    this.redemptionEngine = new RedemptionEngine(supplyLedger, new MockHtlcSimulator());
  }

  /**
   * Initialize mining application
   */
  async initialize(): Promise<void> {
    await this.ipfsManager.start();
    this.rewardsEngine.enable();
    this.rewardsEngine.grant({ id: 'mining-app', scope: 'rewards:account' });
    
    console.log('Mining application initialized');
  }

  /**
   * Start mining session
   */
  async startMiningSession(minerId: string, requirements?: Partial<ResourceMetrics>): Promise<MiningSession> {
    if (this.isMining) {
      throw new Error('Mining already in progress');
    }

    // Allocate resources
    const resources = await this.resourceEngine.allocateResources(minerId, requirements || {});
    
    // Calculate initial contribution score
    const contributionScore = this.resourceEngine.calculateContributionScore(resources);
    
    // Create mining session
    const session: MiningSession = {
      id: `mining_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      startTime: Date.now(),
      resourcesAllocated: resources,
      contributionScore,
      rewardsEarned: 0n,
      status: 'active'
    };

    this.sessions.set(session.id, session);
    this.isMining = true;

    console.log(`Mining session started: ${session.id}`);
    return session;
  }

  /**
   * Process mining contribution
   */
  async processContribution(sessionId: string, contribution: {
    content?: string | Uint8Array;
    bandwidthUsed?: number;
    storageUsed?: number;
  }): Promise<{ cid?: string; rewards: bigint }> {
    const session = this.sessions.get(sessionId);
    if (!session || session.status !== 'active') {
      throw new Error('Invalid or inactive mining session');
    }

    let cid: string | undefined;
    let rewards = 0n;

    try {
      // Add content to IPFS if provided
      if (contribution.content) {
        cid = await this.ipfsManager.addContent(contribution.content);
        await this.ipfsManager.pinContent(cid);
      }

      // Update resource usage
      await this.resourceEngine.updateResourceUsage(sessionId, {
        storageUsed: contribution.storageUsed || 0,
        bandwidthUsed: contribution.bandwidthUsed || 0,
        uptime: (Date.now() - session.startTime) / 1000
      });

      // Recalculate contribution score
      const updatedResources = this.resourceEngine.getResourceAllocation(sessionId);
      if (updatedResources) {
        session.contributionScore = this.resourceEngine.calculateContributionScore(updatedResources);
        session.resourcesAllocated = updatedResources;
      }

      // Calculate rewards based on contribution
      const baseReward = this.calculateBaseReward(contribution);
      const adjustedReward = BigInt(Math.floor(Number(baseReward) * session.contributionScore.multiplier));
      
      // Mint BLOOM tokens for rewards
      try {
        await this.rewardsEngine.mintBloom(adjustedReward);
        session.rewardsEarned += adjustedReward;
        rewards = adjustedReward;
      } catch (error) {
        console.error('Failed to mint rewards:', error);
        // Continue mining even if minting fails
      }

      console.log(`Contribution processed: ${cid || 'no content'}, rewards: ${rewards}`);
      return { cid, rewards };

    } catch (error) {
      console.error('Error processing contribution:', error);
      throw error;
    }
  }

  /**
   * Stop mining session
   */
  async stopMiningSession(sessionId: string): Promise<MiningSession> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Mining session not found');
    }

    session.endTime = Date.now();
    session.status = 'completed';
    this.isMining = false;

    console.log(`Mining session completed: ${sessionId}, total rewards: ${session.rewardsEarned}`);
    return session;
  }

  /**
   * Get mining session status
   */
  getMiningSession(sessionId: string): MiningSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get all mining sessions
   */
  getAllMiningSessions(): MiningSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Get current mining status
   */
  getMiningStatus(): {
    isMining: boolean;
    activeSessions: number;
    totalRewardsEarned: bigint;
    totalStorageUsed: number;
    totalBandwidthUsed: number;
  } {
    const activeSessions = Array.from(this.sessions.values()).filter(s => s.status === 'active');
    const totalRewardsEarned = Array.from(this.sessions.values())
      .reduce((sum, session) => sum + session.rewardsEarned, 0n);
    
    const totalStorageUsed = activeSessions
      .reduce((sum, session) => sum + session.resourcesAllocated.storageUsed, 0);
    
    const totalBandwidthUsed = activeSessions
      .reduce((sum, session) => sum + session.resourcesAllocated.bandwidthUsed, 0);

    return {
      isMining: this.isMining,
      activeSessions: activeSessions.length,
      totalRewardsEarned,
      totalStorageUsed,
      totalBandwidthUsed
    };
  }

  /**
   * Request redemption of mining rewards
   */
  async requestRedemption(sessionId: string, btcAddress: string): Promise<RedeemIntent> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Mining session not found');
    }

    if (session.rewardsEarned === 0n) {
      throw new Error('No rewards to redeem');
    }

    return this.redemptionEngine.requestRedeemBloom(session.rewardsEarned, btcAddress);
  }

  /**
   * Shutdown mining application
   */
  async shutdown(): Promise<void> {
    this.isMining = false;
    await this.ipfsManager.stop();
    console.log('Mining application shutdown complete');
  }

  /**
   * Calculate base reward for contribution
   */
  private calculateBaseReward(contribution: {
    content?: string | Uint8Array;
    bandwidthUsed?: number;
    storageUsed?: number;
  }): bigint {
    let reward = 0n;

    // Storage reward: 1 BLOOM per GB stored
    if (contribution.storageUsed) {
      const storageGB = contribution.storageUsed / (1024 * 1024 * 1024);
      reward += BigInt(Math.floor(storageGB * 1000000000)); // 1 BLOOM = 1e9 smallest units
    }

    // Bandwidth reward: 0.1 BLOOM per GB served
    if (contribution.bandwidthUsed) {
      const bandwidthGB = contribution.bandwidthUsed / (1024 * 1024 * 1024);
      reward += BigInt(Math.floor(bandwidthGB * 100000000)); // 0.1 BLOOM = 1e8 smallest units
    }

    // Content reward: 0.01 BLOOM per piece of content
    if (contribution.content) {
      reward += 10000000n; // 0.01 BLOOM = 1e7 smallest units
    }

    return reward;
  }
}

/**
 * Factory function to create mining application
 */
export function createMiningApplication(
  ipfsConfig: IPFSConfig,
  supplyLedger: SupplyLedger,
  mintingFeeds: MintingFeeds
): MiningApplication {
  return new MiningApplication(ipfsConfig, supplyLedger, mintingFeeds);
}

/**
 * Default IPFS configurations
 */
export const DEFAULT_IPFS_CONFIGS = {
  LOCAL: {
    type: 'local' as const,
    port: 4001,
    apiPort: 5001,
    gatewayPort: 8080
  },
  HTTP: {
    type: 'http' as const,
    url: 'http://localhost:5001'
  },
  GATEWAY: {
    type: 'http' as const,
    url: 'https://ipfs.io/api/v0'
  }
} as const;
