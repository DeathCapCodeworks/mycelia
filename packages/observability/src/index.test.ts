import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObservabilityManager, Counter, Gauge, redactPii } from '../src/index';

describe('ObservabilityManager', () => {
  let manager: ObservabilityManager;
  
  beforeEach(() => {
    manager = new ObservabilityManager();
  });

  describe('logEvent', () => {
    it('should log structured events', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      manager.logEvent('test-event', { key: 'value', number: 42 });
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('test-event')
      );
      
      consoleSpy.mockRestore();
    });

    it('should redact PII from events', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      manager.logEvent('user-action', { 
        email: 'user@example.com',
        address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
        amount: 1000
      });
      
      const logCall = consoleSpy.mock.calls[0][0];
      expect(logCall).not.toContain('user@example.com');
      expect(logCall).not.toContain('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa');
      expect(logCall).toContain('1000');
      
      consoleSpy.mockRestore();
    });
  });

  describe('Counter', () => {
    it('should increment counter', () => {
      const counter = manager.counter('test-counter');
      counter.inc(5);
      counter.inc(3);
      
      expect(counter.getValue()).toBe(8);
    });

    it('should export to JSON Lines', () => {
      const counter = manager.counter('test-counter');
      counter.inc(10);
      
      const exportData = manager.exportMetrics();
      expect(exportData).toContain('test-counter');
      expect(exportData).toContain('10');
    });
  });

  describe('Gauge', () => {
    it('should set gauge value', () => {
      const gauge = manager.gauge('test-gauge');
      gauge.set(42.5);
      
      expect(gauge.getValue()).toBe(42.5);
    });

    it('should export gauge to JSON Lines', () => {
      const gauge = manager.gauge('test-gauge');
      gauge.set(99.9);
      
      const exportData = manager.exportMetrics();
      expect(exportData).toContain('test-gauge');
      expect(exportData).toContain('99.9');
    });
  });
});

describe('redactPii', () => {
  it('should redact email addresses', () => {
    const data = { email: 'test@example.com', name: 'John' };
    const redacted = redactPii(data);
    
    expect(redacted.email).toBe('[REDACTED]');
    expect(redacted.name).toBe('John');
  });

  it('should redact Bitcoin addresses', () => {
    const data = { 
      address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
      amount: 1000 
    };
    const redacted = redactPii(data);
    
    expect(redacted.address).toBe('[REDACTED]');
    expect(redacted.amount).toBe(1000);
  });

  it('should redact private keys', () => {
    const data = { 
      privateKey: 'L5EZftvrYaSu...',
      publicKey: '02abc123...' 
    };
    const redacted = redactPii(data);
    
    expect(redacted.privateKey).toBe('[REDACTED]');
    expect(redacted.publicKey).toBe('[REDACTED]');
  });

  it('should handle nested objects', () => {
    const data = { 
      user: { 
        email: 'test@example.com',
        id: 123 
      },
      amount: 500 
    };
    const redacted = redactPii(data);
    
    expect(redacted.user.email).toBe('[REDACTED]');
    expect(redacted.user.id).toBe(123);
    expect(redacted.amount).toBe(500);
  });
});
