import { describe, it, expect, beforeEach } from 'vitest';
import {
  StaticReserveFeed,
  MockSpvProofFeed,
  ComposableReserveFeed,
  composeReserveFeed,
  createStaticReserveFeedFromEnv
} from './index';

describe('StaticReserveFeed', () => {
  let feed: StaticReserveFeed;

  beforeEach(() => {
    feed = new StaticReserveFeed(100_000_000n);
  });

  it('should return configured locked sats', async () => {
    expect(await feed.getLockedBtcSats()).toBe(100_000_000n);
  });

  it('should allow updating locked sats', async () => {
    feed.setLockedSats(200_000_000n);
    expect(await feed.getLockedBtcSats()).toBe(200_000_000n);
  });
});

describe('MockSpvProofFeed', () => {
  let feed: MockSpvProofFeed;

  beforeEach(() => {
    feed = new MockSpvProofFeed();
  });

  it('should throw when getting locked sats', async () => {
    await expect(feed.getLockedBtcSats()).rejects.toThrow(
      'SPV proof verification not available in demo mode'
    );
  });

  it('should return null for SPV verification', async () => {
    expect(await feed.verifySpvProof()).toBe(null);
  });
});

describe('ComposableReserveFeed', () => {
  let spvFeed: MockSpvProofFeed;
  let staticFeed: StaticReserveFeed;
  let composableFeed: ComposableReserveFeed;

  beforeEach(() => {
    spvFeed = new MockSpvProofFeed();
    staticFeed = new StaticReserveFeed(50_000_000n);
    composableFeed = new ComposableReserveFeed(spvFeed, staticFeed);
  });

  it('should fallback to static feed when SPV unavailable', async () => {
    expect(await composableFeed.getLockedBtcSats()).toBe(50_000_000n);
  });
});

describe('composeReserveFeed', () => {
  it('should create composable feed', async () => {
    const spvFeed = new MockSpvProofFeed();
    const staticFeed = new StaticReserveFeed(75_000_000n);
    const composed = composeReserveFeed(spvFeed, staticFeed);
    
    expect(await composed.getLockedBtcSats()).toBe(75_000_000n);
  });
});

describe('createStaticReserveFeedFromEnv', () => {
  const originalEnv = process.env.RESERVE_SATS;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.RESERVE_SATS;
    } else {
      process.env.RESERVE_SATS = originalEnv;
    }
  });

  it('should use default value when env var not set', () => {
    delete process.env.RESERVE_SATS;
    const feed = createStaticReserveFeedFromEnv();
    expect(feed).toBeInstanceOf(StaticReserveFeed);
  });

  it('should parse valid env var', () => {
    process.env.RESERVE_SATS = '150000000';
    const feed = createStaticReserveFeedFromEnv();
    expect(feed).toBeInstanceOf(StaticReserveFeed);
  });

  it('should throw on invalid env var', () => {
    process.env.RESERVE_SATS = 'invalid';
    expect(() => createStaticReserveFeedFromEnv()).toThrow(
      'Invalid RESERVE_SATS environment variable: invalid'
    );
  });
});
