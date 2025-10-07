import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  IPFSNodeManager,
  ResourceAllocationEngine,
  MiningApplication,
  createMiningApplication,
  DEFAULT_IPFS_CONFIGS,
  type IPFSConfig,
  type ResourceMetrics,
  type MiningSession
} from './index';
import { SupplyLedger } from '@mycelia/shared-kernel';
import { StaticReserveFeed } from '@mycelia/proof-of-reserve';

// Mock IPFS
vi.mock('ipfs-core', () => ({
  create: vi.fn().mockResolvedValue({
    id: vi.fn().mockResolvedValue({ id: 'test-node-id' }),
    add: vi.fn().mockResolvedValue({ cid: { toString: () => 'QmTest123' } }),
    cat: vi.fn().mockImplementation(function* () {
      yield new Uint8Array([1, 2, 3, 4]);
    }),
    pin: {
      add: vi.fn().mockResolvedValue(undefined)
    },
    repo: {
      stat: vi.fn().mockResolvedValue({
        repoSize: 1024 * 1024 * 1024, // 1GB
        storageMax: 100 * 1024 * 1024 * 1024 // 100GB
      })
    },
    stop: vi.fn().mockResolvedValue(undefined)
  })
}));

vi.mock('ipfs-http-client', () => ({
  create: vi.fn().mockReturnValue({
    id: vi.fn().mockResolvedValue({ id: 'test-http-node-id' }),
    add: vi.fn().mockResolvedValue({ cid: { toString: () => 'QmHttpTest123' } }),
    cat: vi.fn().mockImplementation(function* () {
      yield new Uint8Array([5, 6, 7, 8]);
    }),
    pin: {
      add: vi.fn().mockResolvedValue(undefined)
    }
  })
}));

describe('IPFSNodeManager', () => {
  let manager: IPFSNodeManager;
  const config: IPFSConfig = DEFAULT_IPFS_CONFIGS.LOCAL;

  beforeEach(() => {
    manager = new IPFSNodeManager(config);
  });

  afterEach(async () => {
    await manager.stop();
  });

  describe('Node Management', () => {
    it('should start local IPFS node', async () => {
      await manager.start();
      expect(manager.isNodeRunning()).toBe(true);
    });

    it('should start HTTP IPFS client', async () => {
      const httpManager = new IPFSNodeManager(DEFAULT_IPFS_CONFIGS.HTTP);
      await httpManager.start();
      expect(httpManager.isNodeRunning()).toBe(true);
      await httpManager.stop();
    });

    it('should stop IPFS node', async () => {
      await manager.start();
      await manager.stop();
      expect(manager.isNodeRunning()).toBe(false);
    });

    it('should get node information', async () => {
      await manager.start();
      const info = await manager.getNodeInfo();
      expect(info.id).toBe('test-node-id');
    });
  });

  describe('Content Operations', () => {
    beforeEach(async () => {
      await manager.start();
    });

    it('should add content to IPFS', async () => {
      const cid = await manager.addContent('Hello, Mycelia!');
      expect(cid).toBe('QmTest123');
    });

    it('should get content from IPFS', async () => {
      const content = await manager.getContent('QmTest123');
      expect(content).toEqual(new Uint8Array([1, 2, 3, 4]));
    });

    it('should pin content', async () => {
      await manager.pinContent('QmTest123');
      // Should not throw
    });

    it('should get storage statistics', async () => {
      const stats = await manager.getStorageStats();
      expect(stats.used).toBe(1024 * 1024 * 1024);
      expect(stats.available).toBe(99 * 1024 * 1024 * 1024);
    });
  });
});

describe('ResourceAllocationEngine', () => {
  let manager: IPFSNodeManager;
  let engine: ResourceAllocationEngine;

  beforeEach(async () => {
    manager = new IPFSNodeManager(DEFAULT_IPFS_CONFIGS.LOCAL);
    await manager.start();
    engine = new ResourceAllocationEngine(manager);
  });

  afterEach(async () => {
    await manager.stop();
  });

  describe('Resource Allocation', () => {
    it('should allocate resources for miner', async () => {
      const resources = await engine.allocateResources('miner1', {
        storageUsed: 1024 * 1024 * 1024, // 1GB
        bandwidthUsed: 100 * 1024 * 1024 // 100MB
      });

      expect(resources.storageUsed).toBe(1024 * 1024 * 1024);
      expect(resources.bandwidthUsed).toBe(100 * 1024 * 1024);
      expect(resources.lastSeen).toBeGreaterThan(0);
    });

    it('should update resource usage', async () => {
      await engine.allocateResources('miner1', { storageUsed: 1024 });
      await engine.updateResourceUsage('miner1', { storageUsed: 2048 });
      
      const resources = engine.getResourceAllocation('miner1');
      expect(resources?.storageUsed).toBe(2048);
    });

    it('should get resource allocation', async () => {
      await engine.allocateResources('miner1', { storageUsed: 1024 });
      const resources = engine.getResourceAllocation('miner1');
      expect(resources).toBeDefined();
      expect(resources?.storageUsed).toBe(1024);
    });
  });

  describe('Contribution Score Calculation', () => {
    it('should calculate tier 1 contribution score', () => {
      const resources: ResourceMetrics = {
        storageUsed: 50 * 1024 * 1024 * 1024, // 50GB
        storageAvailable: 100 * 1024 * 1024 * 1024,
        bandwidthUsed: 10 * 1024 * 1024, // 10MB
        bandwidthAvailable: 100 * 1024 * 1024,
        uptime: 12 * 60 * 60, // 12 hours
        lastSeen: Date.now()
      };

      const score = engine.calculateContributionScore(resources);
      expect(score.tier).toBe(1);
      expect(score.multiplier).toBe(1.0);
      expect(score.totalScore).toBeGreaterThan(0);
    });

    it('should calculate tier 2 contribution score', () => {
      const resources: ResourceMetrics = {
        storageUsed: 100 * 1024 * 1024 * 1024, // 100GB
        storageAvailable: 200 * 1024 * 1024 * 1024,
        bandwidthUsed: 50 * 1024 * 1024, // 50MB
        bandwidthAvailable: 100 * 1024 * 1024,
        uptime: 24 * 60 * 60, // 24 hours
        lastSeen: Date.now()
      };

      const score = engine.calculateContributionScore(resources);
      expect(score.tier).toBe(2);
      expect(score.multiplier).toBe(1.1);
    });

    it('should calculate tier 3 contribution score', () => {
      const resources: ResourceMetrics = {
        storageUsed: 200 * 1024 * 1024 * 1024, // 200GB
        storageAvailable: 500 * 1024 * 1024 * 1024,
        bandwidthUsed: 100 * 1024 * 1024, // 100MB
        bandwidthAvailable: 200 * 1024 * 1024,
        uptime: 48 * 60 * 60, // 48 hours
        lastSeen: Date.now()
      };

      const score = engine.calculateContributionScore(resources);
      expect(score.tier).toBe(3);
      expect(score.multiplier).toBe(1.25);
    });
  });
});

describe('MiningApplication', () => {
  let app: MiningApplication;
  let supplyLedger: SupplyLedger;
  let reserveFeed: StaticReserveFeed;

  beforeEach(async () => {
    supplyLedger = new SupplyLedger();
    reserveFeed = new StaticReserveFeed(100_000_000n); // 1 BTC
    
    const mintingFeeds = {
      reserve: reserveFeed,
      supply: {
        async getBloomOutstanding() {
          return supplyLedger.currentSupply();
        }
      }
    };

    app = createMiningApplication(DEFAULT_IPFS_CONFIGS.LOCAL, supplyLedger, mintingFeeds);
    await app.initialize();
  });

  afterEach(async () => {
    await app.shutdown();
  });

  describe('Mining Session Management', () => {
    it('should start mining session', async () => {
      const session = await app.startMiningSession('miner1', {
        storageUsed: 1024 * 1024 * 1024, // 1GB
        bandwidthUsed: 100 * 1024 * 1024 // 100MB
      });

      expect(session.id).toMatch(/^mining_\d+_/);
      expect(session.status).toBe('active');
      expect(session.resourcesAllocated.storageUsed).toBe(1024 * 1024 * 1024);
      expect(session.contributionScore.tier).toBeGreaterThanOrEqual(1);
    });

    it('should stop mining session', async () => {
      const session = await app.startMiningSession('miner1');
      const stoppedSession = await app.stopMiningSession(session.id);

      expect(stoppedSession.status).toBe('completed');
      expect(stoppedSession.endTime).toBeGreaterThan(stoppedSession.startTime);
    });

    it('should get mining session', async () => {
      const session = await app.startMiningSession('miner1');
      const retrieved = app.getMiningSession(session.id);

      expect(retrieved).toEqual(session);
    });

    it('should get all mining sessions', async () => {
      await app.startMiningSession('miner1');
      await app.startMiningSession('miner2');
      
      const sessions = app.getAllMiningSessions();
      expect(sessions).toHaveLength(2);
    });
  });

  describe('Contribution Processing', () => {
    it('should process content contribution', async () => {
      const session = await app.startMiningSession('miner1');
      
      const result = await app.processContribution(session.id, {
        content: 'Hello, Mycelia!',
        storageUsed: 1024 * 1024, // 1MB
        bandwidthUsed: 10 * 1024 * 1024 // 10MB
      });

      expect(result.cid).toBe('QmTest123');
      expect(result.rewards).toBeGreaterThan(0n);
    });

    it('should process bandwidth contribution', async () => {
      const session = await app.startMiningSession('miner1');
      
      const result = await app.processContribution(session.id, {
        bandwidthUsed: 100 * 1024 * 1024 // 100MB
      });

      expect(result.rewards).toBeGreaterThan(0n);
    });

    it('should process storage contribution', async () => {
      const session = await app.startMiningSession('miner1');
      
      const result = await app.processContribution(session.id, {
        storageUsed: 1024 * 1024 * 1024 // 1GB
      });

      expect(result.rewards).toBeGreaterThan(0n);
    });

    it('should update contribution score after processing', async () => {
      const session = await app.startMiningSession('miner1');
      const initialScore = session.contributionScore.totalScore;
      
      await app.processContribution(session.id, {
        storageUsed: 1024 * 1024 * 1024, // 1GB
        bandwidthUsed: 100 * 1024 * 1024 // 100MB
      });

      const updatedSession = app.getMiningSession(session.id);
      expect(updatedSession?.contributionScore.totalScore).toBeGreaterThan(initialScore);
    });
  });

  describe('Mining Status', () => {
    it('should get mining status', async () => {
      const session = await app.startMiningSession('miner1');
      
      await app.processContribution(session.id, {
        content: 'Test content',
        storageUsed: 1024 * 1024,
        bandwidthUsed: 10 * 1024 * 1024
      });

      const status = app.getMiningStatus();
      expect(status.isMining).toBe(true);
      expect(status.activeSessions).toBe(1);
      expect(status.totalRewardsEarned).toBeGreaterThan(0n);
      expect(status.totalStorageUsed).toBeGreaterThan(0);
      expect(status.totalBandwidthUsed).toBeGreaterThan(0);
    });
  });

  describe('Redemption', () => {
    it('should request redemption of mining rewards', async () => {
      const session = await app.startMiningSession('miner1');
      
      await app.processContribution(session.id, {
        content: 'Test content',
        storageUsed: 1024 * 1024
      });

      const intent = await app.requestRedemption(session.id, 'bc1test123');
      expect(intent.bloomAmount).toBeGreaterThan(0n);
      expect(intent.btcAddress).toBe('bc1test123');
    });

    it('should throw error for redemption with no rewards', async () => {
      const session = await app.startMiningSession('miner1');
      
      await expect(app.requestRedemption(session.id, 'bc1test123'))
        .rejects.toThrow('No rewards to redeem');
    });
  });
});

describe('Factory Functions', () => {
  it('should create mining application', () => {
    const supplyLedger = new SupplyLedger();
    const reserveFeed = new StaticReserveFeed(100_000_000n);
    
    const mintingFeeds = {
      reserve: reserveFeed,
      supply: {
        async getBloomOutstanding() {
          return supplyLedger.currentSupply();
        }
      }
    };

    const app = createMiningApplication(DEFAULT_IPFS_CONFIGS.LOCAL, supplyLedger, mintingFeeds);
    expect(app).toBeInstanceOf(MiningApplication);
  });
});

describe('Default Configurations', () => {
  it('should have local IPFS configuration', () => {
    expect(DEFAULT_IPFS_CONFIGS.LOCAL.type).toBe('local');
    expect(DEFAULT_IPFS_CONFIGS.LOCAL.port).toBe(4001);
    expect(DEFAULT_IPFS_CONFIGS.LOCAL.apiPort).toBe(5001);
  });

  it('should have HTTP IPFS configuration', () => {
    expect(DEFAULT_IPFS_CONFIGS.HTTP.type).toBe('http');
    expect(DEFAULT_IPFS_CONFIGS.HTTP.url).toBe('http://localhost:5001');
  });

  it('should have gateway IPFS configuration', () => {
    expect(DEFAULT_IPFS_CONFIGS.GATEWAY.type).toBe('http');
    expect(DEFAULT_IPFS_CONFIGS.GATEWAY.url).toBe('https://ipfs.io/api/v0');
  });
});
