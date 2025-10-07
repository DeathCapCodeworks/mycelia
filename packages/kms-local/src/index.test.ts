import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LocalKMS } from './index';

describe('LocalKMS', () => {
  let kms: LocalKMS;

  beforeEach(() => {
    kms = new LocalKMS();
  });

  it('should create a new instance', () => {
    expect(kms).toBeDefined();
  });

  it('should generate Ed25519 key pair', async () => {
    const keyPair = await kms.generateEd25519KeyPair();
    
    expect(keyPair.publicKey).toBeDefined();
    expect(keyPair.privateKey).toBeDefined();
    expect(keyPair.publicKey).toHaveLength(32);
    expect(keyPair.privateKey).toHaveLength(64);
  });

  it('should derive BIP32 key', async () => {
    const seed = new Uint8Array(64).fill(1);
    const derivedKey = await kms.deriveBIP32Key(seed, "m/44'/0'/0'/0/0");
    
    expect(derivedKey.publicKey).toBeDefined();
    expect(derivedKey.privateKey).toBeDefined();
    expect(derivedKey.path).toBe("m/44'/0'/0'/0/0");
  });

  it('should encrypt and decrypt data', async () => {
    const data = new Uint8Array([1, 2, 3, 4, 5]);
    const password = 'test-password';
    
    const encrypted = await kms.encrypt(data, password);
    const decrypted = await kms.decrypt(encrypted, password);
    
    expect(decrypted).toEqual(data);
  });

  it('should sign and verify messages', async () => {
    const keyPair = await kms.generateEd25519KeyPair();
    const message = new Uint8Array([1, 2, 3, 4, 5]);
    
    const signature = await kms.sign(message, keyPair.privateKey);
    const isValid = await kms.verify(message, signature, keyPair.publicKey);
    
    expect(signature).toBeDefined();
    expect(isValid).toBe(true);
  });

  it('should handle key rotation', async () => {
    const keyPair1 = await kms.generateEd25519KeyPair();
    const keyPair2 = await kms.generateEd25519KeyPair();
    
    expect(keyPair1.publicKey).not.toEqual(keyPair2.publicKey);
    expect(keyPair1.privateKey).not.toEqual(keyPair2.privateKey);
  });

  it('should validate key formats', async () => {
    const keyPair = await kms.generateEd25519KeyPair();
    
    // Test invalid key lengths
    const invalidPrivateKey = new Uint8Array(32);
    const invalidPublicKey = new Uint8Array(16);
    
    await expect(kms.sign(new Uint8Array([1]), invalidPrivateKey)).rejects.toThrow();
    await expect(kms.verify(new Uint8Array([1]), new Uint8Array(64), invalidPublicKey)).rejects.toThrow();
  });
});
