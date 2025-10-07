import { LocalKMS } from '@mycelia/kms-local';
import { SpvUtxoFeed } from '@mycelia/proof-of-reserve';

export interface AttestationSnapshot {
  timestamp: number;
  lockedSats: bigint;
  outstandingBloom: bigint;
  collateralizationRatio: number;
  headerHash: string;
  merkleRoot: string;
  utxoCount: number;
}

export interface Attestation {
  snapshot: AttestationSnapshot;
  signature: string;
  publicKey: string;
}

export class AttestationWriter {
  private kms: LocalKMS;
  private operatorKeyPair: { publicKey: Uint8Array; privateKey: Uint8Array } | null = null;

  constructor() {
    this.kms = new LocalKMS();
    this.initializeOperatorKey();
  }

  private async initializeOperatorKey(): Promise<void> {
    try {
      this.operatorKeyPair = await this.kms.generateEd25519KeyPair();
    } catch (error) {
      console.warn('Failed to initialize operator key:', error);
    }
  }

  /**
   * Write a signed attestation snapshot
   */
  async writeAttestation(snapshot: AttestationSnapshot): Promise<Attestation> {
    if (!this.operatorKeyPair) {
      throw new Error('Operator key not initialized');
    }

    // Serialize snapshot for signing
    const snapshotData = this.serializeSnapshot(snapshot);
    const message = new TextEncoder().encode(snapshotData);
    
    // Sign the snapshot
    const signature = await this.kms.sign(message, this.operatorKeyPair.privateKey);
    const signatureHex = Buffer.from(signature).toString('hex');
    const publicKeyHex = Buffer.from(this.operatorKeyPair.publicKey).toString('hex');

    return {
      snapshot,
      signature: signatureHex,
      publicKey: publicKeyHex
    };
  }

  /**
   * Serialize snapshot for signing
   */
  private serializeSnapshot(snapshot: AttestationSnapshot): string {
    return JSON.stringify({
      timestamp: snapshot.timestamp,
      lockedSats: snapshot.lockedSats.toString(),
      outstandingBloom: snapshot.outstandingBloom.toString(),
      collateralizationRatio: snapshot.collateralizationRatio,
      headerHash: snapshot.headerHash,
      merkleRoot: snapshot.merkleRoot,
      utxoCount: snapshot.utxoCount
    });
  }

  /**
   * Get operator public key
   */
  getOperatorPublicKey(): string | null {
    if (!this.operatorKeyPair) {
      return null;
    }
    return Buffer.from(this.operatorKeyPair.publicKey).toString('hex');
  }
}

export class AttestationVerifier {
  private kms: LocalKMS;

  constructor() {
    this.kms = new LocalKMS();
  }

  /**
   * Verify an attestation signature
   */
  async verifyAttestation(attestation: Attestation): Promise<boolean> {
    try {
      // Deserialize snapshot
      const snapshotData = this.serializeSnapshot(attestation.snapshot);
      const message = new TextEncoder().encode(snapshotData);
      
      // Verify signature
      const signatureBytes = Buffer.from(attestation.signature, 'hex');
      const publicKeyBytes = Buffer.from(attestation.publicKey, 'hex');
      
      return this.kms.verify(message, signatureBytes, publicKeyBytes);
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if attestation is stale
   */
  isAttestationStale(attestation: Attestation, maxAgeMs: number = 1800000): boolean {
    const age = Date.now() - attestation.snapshot.timestamp;
    return age > maxAgeMs;
  }

  /**
   * Get current locked sats from attestation
   */
  currentLockedSats(attestation: Attestation): bigint {
    return attestation.snapshot.lockedSats;
  }

  /**
   * Get collateralization ratio from attestation
   */
  getCollateralizationRatio(attestation: Attestation): number {
    return attestation.snapshot.collateralizationRatio;
  }

  /**
   * Get outstanding BLOOM from attestation
   */
  getOutstandingBloom(attestation: Attestation): bigint {
    return attestation.snapshot.outstandingBloom;
  }

  /**
   * Get UTXO count from attestation
   */
  getUtxoCount(attestation: Attestation): number {
    return attestation.snapshot.utxoCount;
  }

  /**
   * Get header hash from attestation
   */
  getHeaderHash(attestation: Attestation): string {
    return attestation.snapshot.headerHash;
  }

  /**
   * Get Merkle root from attestation
   */
  getMerkleRoot(attestation: Attestation): string {
    return attestation.snapshot.merkleRoot;
  }

  /**
   * Serialize snapshot for verification
   */
  private serializeSnapshot(snapshot: AttestationSnapshot): string {
    return JSON.stringify({
      timestamp: snapshot.timestamp,
      lockedSats: snapshot.lockedSats.toString(),
      outstandingBloom: snapshot.outstandingBloom.toString(),
      collateralizationRatio: snapshot.collateralizationRatio,
      headerHash: snapshot.headerHash,
      merkleRoot: snapshot.merkleRoot,
      utxoCount: snapshot.utxoCount
    });
  }
}

/**
 * Create a snapshot from SPV feed data
 */
export async function createSnapshotFromSpvFeed(
  spvFeed: SpvUtxoFeed,
  outstandingBloom: bigint
): Promise<AttestationSnapshot> {
  const utxoResult = await spvFeed.getUtxoResult();
  const lockedSats = utxoResult.sats;
  const collateralizationRatio = outstandingBloom > 0n 
    ? Number(lockedSats) / Number(outstandingBloom * 10_000_000n)
    : 1.0;

  return {
    timestamp: Date.now(),
    lockedSats,
    outstandingBloom,
    collateralizationRatio,
    headerHash: spvFeed.getLastHeaderHash() || 'unknown',
    merkleRoot: 'mock-merkle-root', // In production, would be actual Merkle root
    utxoCount: utxoResult.utxoCount
  };
}

/**
 * Verify multiple attestations
 */
export async function verifyAttestations(attestations: Attestation[]): Promise<boolean[]> {
  const verifier = new AttestationVerifier();
  return Promise.all(attestations.map(attestation => verifier.verifyAttestation(attestation)));
}

/**
 * Get the most recent valid attestation
 */
export async function getMostRecentValidAttestation(
  attestations: Attestation[],
  maxAgeMs: number = 1800000
): Promise<Attestation | null> {
  const verifier = new AttestationVerifier();
  
  // Filter valid and non-stale attestations
  const validAttestations = [];
  for (const attestation of attestations) {
    const isValid = await verifier.verifyAttestation(attestation);
    const isStale = verifier.isAttestationStale(attestation, maxAgeMs);
    
    if (isValid && !isStale) {
      validAttestations.push(attestation);
    }
  }
  
  if (validAttestations.length === 0) {
    return null;
  }
  
  // Sort by timestamp (most recent first)
  validAttestations.sort((a, b) => b.snapshot.timestamp - a.snapshot.timestamp);
  
  return validAttestations[0];
}
