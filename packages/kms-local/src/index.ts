import sodium from 'libsodium-wrappers';
import { BIP32Factory } from 'bip32';
import * as bip39 from 'bip39';
import { derivePath } from 'ed25519-hd-key';

// Initialize BIP32 with secp256k1
const bip32 = BIP32Factory(require('secp256k1'));

export interface Ed25519KeyPair {
  publicKey: Uint8Array;
  privateKey: Uint8Array;
}

export interface BIP32Key {
  publicKey: Uint8Array;
  privateKey: Uint8Array;
  path: string;
}

export interface EncryptedData {
  ciphertext: Uint8Array;
  nonce: Uint8Array;
  salt: Uint8Array;
}

export class LocalKMS {
  private initialized = false;

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    if (!this.initialized) {
      await sodium.ready;
      this.initialized = true;
    }
  }

  /**
   * Generate a new Ed25519 key pair
   */
  async generateEd25519KeyPair(): Promise<Ed25519KeyPair> {
    await this.initialize();
    
    const keyPair = sodium.crypto_sign_keypair();
    
    return {
      publicKey: keyPair.publicKey,
      privateKey: keyPair.privateKey
    };
  }

  /**
   * Derive a BIP32 key from a seed
   */
  async deriveBIP32Key(seed: Uint8Array, path: string): Promise<BIP32Key> {
    await this.initialize();
    
    try {
      // ed25519-hd-key expects a Node Buffer; loosen typing for compatibility
      const derived = derivePath(path, Buffer.from(seed as Uint8Array) as any);
      
      return {
        publicKey: derived.key.slice(32), // Public key is second half
        privateKey: derived.key.slice(0, 32), // Private key is first half
        path
      };
    } catch (error) {
      throw new Error(`Failed to derive BIP32 key: ${error}`);
    }
  }

  /**
   * Encrypt data with libsodium
   */
  async encrypt(data: Uint8Array, password: string): Promise<EncryptedData> {
    await this.initialize();
    
    const salt = sodium.randombytes_buf(sodium.crypto_pwhash_SALTBYTES);
    const key = sodium.crypto_pwhash(
      sodium.crypto_secretbox_KEYBYTES,
      password,
      salt,
      sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE,
      sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE,
      sodium.crypto_pwhash_ALG_DEFAULT
    );
    
    const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
    const ciphertext = sodium.crypto_secretbox_easy(data, nonce, key);
    
    return {
      ciphertext,
      nonce,
      salt
    };
  }

  /**
   * Decrypt data with libsodium
   */
  async decrypt(encrypted: EncryptedData, password: string): Promise<Uint8Array> {
    await this.initialize();
    
    const key = sodium.crypto_pwhash(
      sodium.crypto_secretbox_KEYBYTES,
      password,
      encrypted.salt,
      sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE,
      sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE,
      sodium.crypto_pwhash_ALG_DEFAULT
    );
    
    const decrypted = sodium.crypto_secretbox_open_easy(
      encrypted.ciphertext,
      encrypted.nonce,
      key
    );
    
    if (!decrypted) {
      throw new Error('Decryption failed');
    }
    
    return decrypted;
  }

  /**
   * Sign a message with Ed25519
   */
  async sign(message: Uint8Array, privateKey: Uint8Array): Promise<Uint8Array> {
    await this.initialize();
    
    if (privateKey.length !== 64) {
      throw new Error('Invalid private key length');
    }
    
    return sodium.crypto_sign_detached(message, privateKey);
  }

  /**
   * Verify a signature with Ed25519
   */
  async verify(message: Uint8Array, signature: Uint8Array, publicKey: Uint8Array): Promise<boolean> {
    await this.initialize();
    
    if (publicKey.length !== 32) {
      throw new Error('Invalid public key length');
    }
    
    if (signature.length !== 64) {
      throw new Error('Invalid signature length');
    }
    
    return sodium.crypto_sign_verify_detached(signature, message, publicKey);
  }

  /**
   * Generate a mnemonic phrase
   */
  generateMnemonic(): string {
    return bip39.generateMnemonic();
  }

  /**
   * Validate a mnemonic phrase
   */
  validateMnemonic(mnemonic: string): boolean {
    return bip39.validateMnemonic(mnemonic);
  }

  /**
   * Convert mnemonic to seed
   */
  mnemonicToSeed(mnemonic: string, passphrase?: string): Uint8Array {
    const seed = bip39.mnemonicToSeedSync(mnemonic, passphrase);
    return new Uint8Array(seed);
  }

  /**
   * Get key rotation timestamp
   */
  getKeyRotationTimestamp(): number {
    return Date.now();
  }

  /**
   * Check if key should be rotated
   */
  shouldRotateKey(rotationTimestamp: number, maxAgeMs: number = 86400000 * 30): boolean {
    return Date.now() - rotationTimestamp > maxAgeMs;
  }
}
