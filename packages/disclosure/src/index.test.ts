import { describe, it, expect, beforeEach } from 'vitest';
import { DisclosureManager, VulnerabilityReport, Receipt } from './index';

describe('DisclosureManager', () => {
  let manager: DisclosureManager;

  beforeEach(() => {
    manager = new DisclosureManager();
  });

  it('should create a new instance', () => {
    expect(manager).toBeDefined();
  });

  it('should create vulnerability report', async () => {
    const report: VulnerabilityReport = {
      severity: 'high',
      hash: 'abc123def456',
      description: 'Test vulnerability',
      reporter: 'test@example.com',
      timestamp: Date.now()
    };

    const receipt = await manager.createReceipt(report);
    
    expect(receipt).toBeDefined();
    expect(receipt.reportHash).toBe(report.hash);
    expect(receipt.severity).toBe(report.severity);
    expect(receipt.signature).toBeDefined();
    expect(receipt.publicKey).toBeDefined();
  });

  it('should verify receipt signature', async () => {
    const report: VulnerabilityReport = {
      severity: 'medium',
      hash: 'def456ghi789',
      description: 'Test vulnerability',
      reporter: 'test@example.com',
      timestamp: Date.now()
    };

    const receipt = await manager.createReceipt(report);
    const isValid = await manager.verifyReceipt(receipt);
    
    expect(isValid).toBe(true);
  });

  it('should store receipt in JSON Lines format', async () => {
    const report: VulnerabilityReport = {
      severity: 'low',
      hash: 'ghi789jkl012',
      description: 'Test vulnerability',
      reporter: 'test@example.com',
      timestamp: Date.now()
    };

    const receipt = await manager.createReceipt(report);
    const jsonLines = manager.exportReceipts();
    
    expect(jsonLines).toContain(receipt.reportHash);
    expect(jsonLines).toContain(receipt.severity);
  });

  it('should handle different severity levels', async () => {
    const severities = ['low', 'medium', 'high'] as const;
    
    for (const severity of severities) {
      const report: VulnerabilityReport = {
        severity,
        hash: `hash-${severity}`,
        description: 'Test vulnerability',
        reporter: 'test@example.com',
        timestamp: Date.now()
      };

      const receipt = await manager.createReceipt(report);
      expect(receipt.severity).toBe(severity);
    }
  });
});
