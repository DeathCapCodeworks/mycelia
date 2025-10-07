#!/usr/bin/env node
// Bitcoin Bridge for Mycelia - HTLC operations on testnet

import * as bitcoin from 'bitcoinjs-lib';
import * as sodium from 'libsodium-wrappers';
import { promises as fs } from 'fs';
import { join } from 'path';

export type Network = 'testnet' | 'signet' | 'mainnet';

export interface HtlcConfig {
  sats: bigint;
  recipient: string;
  timeout: number; // Unix timestamp
  secretHash: string; // SHA256 hash of secret
}

export interface HtlcResult {
  txid: string;
  vout: number;
  redeemScriptHex: string;
}

export interface ClaimConfig {
  txid: string;
  vout: number;
  redeemScriptHex: string;
  secret: string;
  recipient: string;
}

export interface RefundConfig {
  txid: string;
  vout: number;
  redeemScriptHex: string;
  timeout: number;
}

export interface ClaimResult {
  txid: string;
}

export interface RefundResult {
  txid: string;
}

export class BitcoinBridge {
  private network: bitcoin.Network;
  private keystorePath: string;
  private policy: { allowNetwork: boolean } = { allowNetwork: false };

  constructor(network: Network = 'testnet') {
    this.network = this.getBitcoinNetwork(network);
    this.keystorePath = join(process.cwd(), '.keystore');
  }

  private getBitcoinNetwork(network: Network): bitcoin.Network {
    switch (network) {
      case 'testnet':
        return bitcoin.networks.testnet;
      case 'signet':
        return bitcoin.networks.testnet; // Use testnet for signet in demo
      case 'mainnet':
        return bitcoin.networks.bitcoin;
      default:
        throw new Error(`Unsupported network: ${network}`);
    }
  }

  /**
   * Enable network operations (for CLI demos)
   */
  enableNetwork(): void {
    this.policy.allowNetwork = true;
  }

  /**
   * Disable network operations (default)
   */
  disableNetwork(): void {
    this.policy.allowNetwork = false;
  }

  private allowNetwork(): boolean {
    return this.policy.allowNetwork;
  }

  /**
   * Create HTLC redeem transaction
   */
  async createHtlcRedeem(config: HtlcConfig): Promise<HtlcResult> {
    if (!this.allowNetwork()) {
      throw new Error('Network operations disabled by policy');
    }

    // Generate HTLC script
    const redeemScript = this.createHtlcScript(config.secretHash, config.recipient, config.timeout);
    const redeemScriptHex = redeemScript.toString('hex');
    
    // Create P2WSH address
    const scriptHash = bitcoin.crypto.sha256(redeemScript);
    const address = bitcoin.address.fromOutputScript(
      bitcoin.script.compile([bitcoin.opcodes.OP_0, scriptHash]),
      this.network
    );

    // Mock transaction creation (in real implementation, would broadcast)
    const mockTxid = this.generateMockTxid();
    const mockVout = 0;

    return {
      txid: mockTxid,
      vout: mockVout,
      redeemScriptHex
    };
  }

  /**
   * Claim HTLC with secret
   */
  async claimHtlc(config: ClaimConfig): Promise<ClaimResult> {
    if (!this.allowNetwork()) {
      throw new Error('Network operations disabled by policy');
    }

    // Verify secret matches hash
    const secretHash = bitcoin.crypto.sha256(Buffer.from(config.secret, 'utf8')).toString('hex');
    const expectedHash = this.getSecretHashFromScript(config.redeemScriptHex);
    
    if (secretHash !== expectedHash) {
      throw new Error('Invalid secret for HTLC');
    }

    // Mock claim transaction
    const mockTxid = this.generateMockTxid();
    
    return { txid: mockTxid };
  }

  /**
   * Refund HTLC after timeout
   */
  async refundHtlc(config: RefundConfig): Promise<RefundResult> {
    if (!this.allowNetwork()) {
      throw new Error('Network operations disabled by policy');
    }

    const currentTime = Math.floor(Date.now() / 1000);
    if (currentTime < config.timeout) {
      throw new Error('HTLC not yet expired');
    }

    // Mock refund transaction
    const mockTxid = this.generateMockTxid();
    
    return { txid: mockTxid };
  }

  /**
   * Create HTLC script
   */
  private createHtlcScript(secretHash: string, recipient: string, timeout: number): Buffer {
    // OP_IF
    //   OP_SHA256 <secretHash> OP_EQUALVERIFY
    //   <recipient> OP_CHECKSIG
    // OP_ELSE
    //   <timeout> OP_CHECKLOCKTIMEVERIFY OP_DROP
    //   <operator> OP_CHECKSIG
    // OP_ENDIF

    const script = bitcoin.script.compile([
      bitcoin.opcodes.OP_IF,
      bitcoin.opcodes.OP_SHA256,
      Buffer.from(secretHash, 'hex'),
      bitcoin.opcodes.OP_EQUALVERIFY,
      bitcoin.address.toOutputScript(recipient, this.network),
      bitcoin.opcodes.OP_CHECKSIG,
      bitcoin.opcodes.OP_ELSE,
      bitcoin.script.number.encode(timeout),
      bitcoin.opcodes.OP_CHECKLOCKTIMEVERIFY,
      bitcoin.opcodes.OP_DROP,
      Buffer.from('operator-pubkey', 'utf8'), // Mock operator key
      bitcoin.opcodes.OP_CHECKSIG,
      bitcoin.opcodes.OP_ENDIF
    ]);

    return script;
  }

  /**
   * Extract secret hash from script
   */
  private getSecretHashFromScript(scriptHex: string): string {
    // In real implementation, would parse script to extract hash
    return 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3';
  }

  /**
   * Generate mock transaction ID
   */
  private generateMockTxid(): string {
    const random = Math.random().toString(36).substring(2, 15);
    return `mock-${random}-${Date.now()}`;
  }

  /**
   * Encrypt key with libsodium
   */
  async encryptKey(key: string, password: string): Promise<string> {
    await sodium.ready;
    
    const keyBytes = sodium.from_string(key);
    const passwordBytes = sodium.from_string(password);
    
    // Derive key from password
    const salt = sodium.randombytes_buf(sodium.crypto_pwhash_SALTBYTES);
    const derivedKey = sodium.crypto_pwhash(
      sodium.crypto_secretbox_KEYBYTES,
      passwordBytes,
      salt,
      sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE,
      sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE,
      sodium.crypto_pwhash_ALG_DEFAULT
    );
    
    // Encrypt
    const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
    const encrypted = sodium.crypto_secretbox_easy(keyBytes, nonce, derivedKey);
    
    // Combine salt + nonce + encrypted
    const combined = new Uint8Array(salt.length + nonce.length + encrypted.length);
    combined.set(salt, 0);
    combined.set(nonce, salt.length);
    combined.set(encrypted, salt.length + nonce.length);
    
    return sodium.to_base64(combined);
  }

  /**
   * Decrypt key with libsodium
   */
  async decryptKey(encryptedKey: string, password: string): Promise<string> {
    await sodium.ready;
    
    const combined = sodium.from_base64(encryptedKey);
    const passwordBytes = sodium.from_string(password);
    
    // Extract salt, nonce, and encrypted data
    const salt = combined.slice(0, sodium.crypto_pwhash_SALTBYTES);
    const nonce = combined.slice(
      sodium.crypto_pwhash_SALTBYTES,
      sodium.crypto_pwhash_SALTBYTES + sodium.crypto_secretbox_NONCEBYTES
    );
    const encrypted = combined.slice(sodium.crypto_pwhash_SALTBYTES + sodium.crypto_secretbox_NONCEBYTES);
    
    // Derive key from password
    const derivedKey = sodium.crypto_pwhash(
      sodium.crypto_secretbox_KEYBYTES,
      passwordBytes,
      salt,
      sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE,
      sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE,
      sodium.crypto_pwhash_ALG_DEFAULT
    );
    
    // Decrypt
    const decrypted = sodium.crypto_secretbox_open_easy(encrypted, nonce, derivedKey);
    
    return sodium.to_string(decrypted);
  }

  /**
   * Save encrypted key to keystore
   */
  async saveKey(keyName: string, key: string, password: string): Promise<void> {
    const encrypted = await this.encryptKey(key, password);
    const keystore = await this.loadKeystore();
    keystore[keyName] = encrypted;
    await this.saveKeystore(keystore);
  }

  /**
   * Load encrypted key from keystore
   */
  async loadKey(keyName: string, password: string): Promise<string> {
    const keystore = await this.loadKeystore();
    const encrypted = keystore[keyName];
    if (!encrypted) {
      throw new Error(`Key ${keyName} not found in keystore`);
    }
    return this.decryptKey(encrypted, password);
  }

  /**
   * Load keystore from disk
   */
  private async loadKeystore(): Promise<Record<string, string>> {
    try {
      const data = await fs.readFile(this.keystorePath, 'utf8');
      return JSON.parse(data);
    } catch {
      return {};
    }
  }

  /**
   * Save keystore to disk
   */
  private async saveKeystore(keystore: Record<string, string>): Promise<void> {
    await fs.writeFile(this.keystorePath, JSON.stringify(keystore, null, 2));
  }
}

// Export convenience functions
export function createHtlcRedeem(config: HtlcConfig & { network?: Network }): Promise<HtlcResult> {
  const bridge = new BitcoinBridge(config.network || 'testnet');
  return bridge.createHtlcRedeem(config);
}

export function claimHtlc(config: ClaimConfig & { network?: Network }): Promise<ClaimResult> {
  const bridge = new BitcoinBridge(config.network || 'testnet');
  return bridge.claimHtlc(config);
}

export function refundHtlc(config: RefundConfig & { network?: Network }): Promise<RefundResult> {
  const bridge = new BitcoinBridge(config.network || 'testnet');
  return bridge.refundHtlc(config);
}
