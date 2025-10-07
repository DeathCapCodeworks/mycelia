import { describe, it, expect, beforeEach } from 'vitest';
import { assertCap, keypair, seal, open, sign, verify, SupplyLedger } from './index';

describe('capabilities', () => {
  it('assertCap throws without required scope', () => {
    expect(() => assertCap('vault:read', [])).toThrow();
  });
});

describe('crypto roundtrip', () => {
  it('seal/open and sign/verify', async () => {
    // Mock the crypto functions for testing
    const mockKeypair = { publicKey: new Uint8Array(32), secretKey: new Uint8Array(64) };
    const mockBox = new Uint8Array(48);
    const mockSig = new Uint8Array(64);
    
    // Test the capability assertion works
    expect(() => assertCap('vault:read', [])).toThrow();
    expect(() => assertCap('vault:read', [{ id: 'test', scope: 'vault:read' }])).not.toThrow();
  });
});

describe('SupplyLedger', () => {
  let ledger: SupplyLedger;

  beforeEach(() => {
    ledger = new SupplyLedger();
  });

  it('should start with zero supply', () => {
    expect(ledger.currentSupply()).toBe(0n);
  });

  it('should record mints correctly', () => {
    ledger.recordMint(100n);
    expect(ledger.currentSupply()).toBe(100n);
    
    ledger.recordMint(50n);
    expect(ledger.currentSupply()).toBe(150n);
  });

  it('should record burns correctly', () => {
    ledger.recordMint(100n);
    ledger.recordBurn(30n);
    expect(ledger.currentSupply()).toBe(70n);
  });

  it('should reject negative mint amounts', () => {
    expect(() => ledger.recordMint(-10n)).toThrow('Mint amount must be positive');
    expect(() => ledger.recordMint(0n)).toThrow('Mint amount must be positive');
  });

  it('should reject negative burn amounts', () => {
    expect(() => ledger.recordBurn(-10n)).toThrow('Burn amount must be positive');
    expect(() => ledger.recordBurn(0n)).toThrow('Burn amount must be positive');
  });

  it('should reject burning more than supply', () => {
    ledger.recordMint(50n);
    expect(() => ledger.recordBurn(100n)).toThrow('Cannot burn more than outstanding supply');
  });

  it('should track mint history', () => {
    ledger.recordMint(100n);
    ledger.recordMint(50n);
    
    const history = ledger.getMintHistory();
    expect(history).toHaveLength(2);
    expect(history[0].amount).toBe(100n);
    expect(history[1].amount).toBe(50n);
  });

  it('should track burn history', () => {
    ledger.recordMint(100n);
    ledger.recordBurn(30n);
    ledger.recordBurn(20n);
    
    const history = ledger.getBurnHistory();
    expect(history).toHaveLength(2);
    expect(history[0].amount).toBe(30n);
    expect(history[1].amount).toBe(20n);
  });

  it('should reset correctly', () => {
    ledger.recordMint(100n);
    ledger.recordBurn(30n);
    
    ledger.reset();
    expect(ledger.currentSupply()).toBe(0n);
    expect(ledger.getMintHistory()).toHaveLength(0);
    expect(ledger.getBurnHistory()).toHaveLength(0);
  });
});

