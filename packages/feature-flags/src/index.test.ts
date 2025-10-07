import { describe, it, expect, beforeEach } from 'vitest';
import { FeatureFlags, FeatureFlag, FeatureFlagVersion } from './index';

describe('FeatureFlags', () => {
  let featureFlags: FeatureFlags;

  beforeEach(() => {
    featureFlags = new FeatureFlags();
  });

  it('should create a new instance', () => {
    expect(featureFlags).toBeDefined();
  });

  it('should register feature flags', () => {
    const flag: FeatureFlag = {
      name: 'test-feature',
      version: '1.0.0',
      enabled: true,
      description: 'Test feature flag',
      riskLevel: 'low'
    };

    featureFlags.register(flag);
    
    expect(featureFlags.isEnabled('test-feature')).toBe(true);
    expect(featureFlags.getFlag('test-feature')).toEqual(flag);
  });

  it('should check feature flag status', () => {
    const flag: FeatureFlag = {
      name: 'test-feature',
      version: '1.0.0',
      enabled: false,
      description: 'Test feature flag',
      riskLevel: 'low'
    };

    featureFlags.register(flag);
    
    expect(featureFlags.isEnabled('test-feature')).toBe(false);
  });

  it('should get feature flag version', () => {
    const flag: FeatureFlag = {
      name: 'test-feature',
      version: '1.0.0',
      enabled: true,
      description: 'Test feature flag',
      riskLevel: 'low'
    };

    featureFlags.register(flag);
    
    expect(featureFlags.getVersion('test-feature')).toBe('1.0.0');
  });

  it('should list all feature flags', () => {
    const flags: FeatureFlag[] = [
      {
        name: 'feature-1',
        version: '1.0.0',
        enabled: true,
        description: 'Feature 1',
        riskLevel: 'low'
      },
      {
        name: 'feature-2',
        version: '2.0.0',
        enabled: false,
        description: 'Feature 2',
        riskLevel: 'high'
      }
    ];

    flags.forEach(flag => featureFlags.register(flag));
    
    const allFlags = featureFlags.getAllFlags();
    expect(allFlags).toHaveLength(2);
    expect(allFlags).toContain(flags[0]);
    expect(allFlags).toContain(flags[1]);
  });

  it('should check if feature flag exists', () => {
    const flag: FeatureFlag = {
      name: 'test-feature',
      version: '1.0.0',
      enabled: true,
      description: 'Test feature flag',
      riskLevel: 'low'
    };

    featureFlags.register(flag);
    
    expect(featureFlags.exists('test-feature')).toBe(true);
    expect(featureFlags.exists('non-existent')).toBe(false);
  });

  it('should handle versioned features', () => {
    const flag: FeatureFlag = {
      name: 'versioned-feature',
      version: '2.0.0',
      enabled: true,
      description: 'Versioned feature',
      riskLevel: 'medium',
      versioned: true
    };

    featureFlags.register(flag);
    
    expect(featureFlags.isVersioned('versioned-feature')).toBe(true);
    expect(featureFlags.getVersion('versioned-feature')).toBe('2.0.0');
  });

  it('should check risk level', () => {
    const lowRiskFlag: FeatureFlag = {
      name: 'low-risk',
      version: '1.0.0',
      enabled: true,
      description: 'Low risk feature',
      riskLevel: 'low'
    };

    const highRiskFlag: FeatureFlag = {
      name: 'high-risk',
      version: '1.0.0',
      enabled: true,
      description: 'High risk feature',
      riskLevel: 'high'
    };

    featureFlags.register(lowRiskFlag);
    featureFlags.register(highRiskFlag);
    
    expect(featureFlags.getRiskLevel('low-risk')).toBe('low');
    expect(featureFlags.getRiskLevel('high-risk')).toBe('high');
  });

  it('should enable/disable feature flags', () => {
    const flag: FeatureFlag = {
      name: 'toggle-feature',
      version: '1.0.0',
      enabled: false,
      description: 'Toggleable feature',
      riskLevel: 'low'
    };

    featureFlags.register(flag);
    
    expect(featureFlags.isEnabled('toggle-feature')).toBe(false);
    
    featureFlags.enable('toggle-feature');
    expect(featureFlags.isEnabled('toggle-feature')).toBe(true);
    
    featureFlags.disable('toggle-feature');
    expect(featureFlags.isEnabled('toggle-feature')).toBe(false);
  });

  it('should throw error for non-existent flag operations', () => {
    expect(() => featureFlags.isEnabled('non-existent')).toThrow('Feature flag not found: non-existent');
    expect(() => featureFlags.enable('non-existent')).toThrow('Feature flag not found: non-existent');
    expect(() => featureFlags.disable('non-existent')).toThrow('Feature flag not found: non-existent');
  });
});
