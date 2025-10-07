import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AttestationWriter, AttestationVerifier, AttestationSnapshot } from './index';

describe('AttestationWriter', () => {
  let writer: AttestationWriter;

  beforeEach(() => {
    writer = new AttestationWriter();
  });

  it('should create a new instance', () => {
    expect(writer).toBeDefined();
  });

  it('should write attestation snapshot', async () => {
    const snapshot: AttestationSnapshot = {
      timestamp: Date.now(),
      lockedSats: 1000000000n,
      outstandingBloom: 10000000n,
      collateralizationRatio: 1.0,
      headerHash: 'mock-header-hash',
      merkleRoot: 'mock-merkle-root',
      utxoCount: 5
    };

    const attestation = await writer.writeAttestation(snapshot);
    
    expect(attestation).toBeDefined();
    expect(attestation.snapshot).toEqual(snapshot);
    expect(attestation.signature).toBeDefined();
    expect(attestation.publicKey).toBeDefined();
  });

  it('should sign attestation with operator key', async () => {
    const snapshot: AttestationSnapshot = {
      timestamp: Date.now(),
      lockedSats: 1000000000n,
      outstandingBloom: 10000000n,
      collateralizationRatio: 1.0,
      headerHash: 'mock-header-hash',
      merkleRoot: 'mock-merkle-root',
      utxoCount: 5
    };

    const attestation = await writer.writeAttestation(snapshot);
    
    // Verify signature
    const verifier = new AttestationVerifier();
    const isValid = await verifier.verifyAttestation(attestation);
    
    expect(isValid).toBe(true);
  });
});

describe('AttestationVerifier', () => {
  let verifier: AttestationVerifier;

  beforeEach(() => {
    verifier = new AttestationVerifier();
  });

  it('should create a new instance', () => {
    expect(verifier).toBeDefined();
  });

  it('should verify valid attestation', async () => {
    const writer = new AttestationWriter();
    const snapshot: AttestationSnapshot = {
      timestamp: Date.now(),
      lockedSats: 1000000000n,
      outstandingBloom: 10000000n,
      collateralizationRatio: 1.0,
      headerHash: 'mock-header-hash',
      merkleRoot: 'mock-merkle-root',
      utxoCount: 5
    };

    const attestation = await writer.writeAttestation(snapshot);
    const isValid = await verifier.verifyAttestation(attestation);
    
    expect(isValid).toBe(true);
  });

  it('should reject invalid attestation', async () => {
    const invalidAttestation = {
      snapshot: {
        timestamp: Date.now(),
        lockedSats: 1000000000n,
        outstandingBloom: 10000000n,
        collateralizationRatio: 1.0,
        headerHash: 'mock-header-hash',
        merkleRoot: 'mock-merkle-root',
        utxoCount: 5
      },
      signature: 'invalid-signature',
      publicKey: 'invalid-public-key'
    };

    const isValid = await verifier.verifyAttestation(invalidAttestation as any);
    
    expect(isValid).toBe(false);
  });

  it('should check attestation staleness', async () => {
    const writer = new AttestationWriter();
    const snapshot: AttestationSnapshot = {
      timestamp: Date.now() - 3600000, // 1 hour ago
      lockedSats: 1000000000n,
      outstandingBloom: 10000000n,
      collateralizationRatio: 1.0,
      headerHash: 'mock-header-hash',
      merkleRoot: 'mock-merkle-root',
      utxoCount: 5
    };

    const attestation = await writer.writeAttestation(snapshot);
    const isStale = verifier.isAttestationStale(attestation, 1800000); // 30 minutes max age
    
    expect(isStale).toBe(true);
  });

  it('should get current locked sats from attestation', async () => {
    const writer = new AttestationWriter();
    const snapshot: AttestationSnapshot = {
      timestamp: Date.now(),
      lockedSats: 1000000000n,
      outstandingBloom: 10000000n,
      collateralizationRatio: 1.0,
      headerHash: 'mock-header-hash',
      merkleRoot: 'mock-merkle-root',
      utxoCount: 5
    };

    const attestation = await writer.writeAttestation(snapshot);
    const lockedSats = verifier.currentLockedSats(attestation);
    
    expect(lockedSats).toBe(1000000000n);
  });
});
