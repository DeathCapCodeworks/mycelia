import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BitcoinBridge, Network, HtlcConfig, HtlcResult } from '../src/index';

describe('BitcoinBridge', () => {
  let bridge: BitcoinBridge;
  
  beforeEach(() => {
    bridge = new BitcoinBridge('testnet');
    vi.spyOn(bridge as any, 'allowNetwork').mockReturnValue(true);
  });

  describe('createHtlcRedeem', () => {
    it('should create HTLC with valid parameters', async () => {
      const config: HtlcConfig = {
        sats: 100000n,
        recipient: 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx',
        timeout: Math.floor(Date.now() / 1000) + 86400, // 24h
        secretHash: 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3'
      };

      const result = await bridge.createHtlcRedeem(config);
      
      expect(result).toHaveProperty('txid');
      expect(result).toHaveProperty('vout');
      expect(result).toHaveProperty('redeemScriptHex');
      expect(typeof result.txid).toBe('string');
      expect(typeof result.vout).toBe('number');
      expect(typeof result.redeemScriptHex).toBe('string');
    });

    it('should reject invalid network when policy disabled', async () => {
      vi.spyOn(bridge as any, 'allowNetwork').mockReturnValue(false);
      
      const config: HtlcConfig = {
        sats: 100000n,
        recipient: 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx',
        timeout: Math.floor(Date.now() / 1000) + 86400,
        secretHash: 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3'
      };

      await expect(bridge.createHtlcRedeem(config)).rejects.toThrow('Network operations disabled by policy');
    });
  });

  describe('claimHtlc', () => {
    it('should claim HTLC with valid secret', async () => {
      const claimConfig = {
        txid: 'mock-txid',
        vout: 0,
        redeemScriptHex: 'mock-script',
        secret: 'hello',
        recipient: 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx'
      };

      const result = await bridge.claimHtlc(claimConfig);
      
      expect(result).toHaveProperty('txid');
      expect(typeof result.txid).toBe('string');
    });
  });

  describe('refundHtlc', () => {
    it('should refund HTLC after timeout', async () => {
      const refundConfig = {
        txid: 'mock-txid',
        vout: 0,
        redeemScriptHex: 'mock-script',
        timeout: Math.floor(Date.now() / 1000) - 3600 // 1h ago
      };

      const result = await bridge.refundHtlc(refundConfig);
      
      expect(result).toHaveProperty('txid');
      expect(typeof result.txid).toBe('string');
    });
  });

  describe('keystore', () => {
    it('should encrypt and decrypt keys', async () => {
      const testKey = 'test-private-key';
      const password = 'test-password';
      
      const encrypted = await bridge.encryptKey(testKey, password);
      const decrypted = await bridge.decryptKey(encrypted, password);
      
      expect(decrypted).toBe(testKey);
    });
  });
});
