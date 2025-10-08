#!/usr/bin/env node
// PoR Attestation Rotation Script
// Generates new attestation and writes to release/mainnet/por.json

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { AttestationWriter, AttestationSnapshot, verifyFresh, formatPoRStatus } from './index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function createMockSnapshot(): Promise<AttestationSnapshot> {
  // Mock data - in production this would come from SPV feed
  const lockedSats = 1_000_000_000_000n; // 10 BTC
  const outstandingBloom = 0n; // Start with 0 BLOOM
  const collateralizationRatio = outstandingBloom > 0n 
    ? Number(lockedSats) / Number(outstandingBloom * 10_000_000n)
    : 1.0;

  return {
    timestamp: Date.now(),
    lockedSats,
    outstandingBloom,
    collateralizationRatio,
    headerHash: 'mock-header-hash-' + Date.now(),
    merkleRoot: 'mock-merkle-root-' + Date.now(),
    utxoCount: 1
  };
}

async function rotateAttestation(): Promise<void> {
  console.log('🔄 Rotating PoR attestation...');

  try {
    // Create attestation writer
    const writer = new AttestationWriter();
    
    // Wait for key initialization
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Create snapshot
    const snapshot = await createMockSnapshot();
    console.log(`📊 Created snapshot: ${snapshot.lockedSats.toString()} sats, ${snapshot.outstandingBloom.toString()} BLOOM`);

    // Write attestation
    const attestation = await writer.writeAttestation(snapshot);
    console.log(`✍️  Signed attestation with key: ${attestation.publicKey.slice(0, 8)}...`);

    // Ensure release directory exists
    const releaseDir = path.join(__dirname, '../../release/mainnet');
    if (!fs.existsSync(releaseDir)) {
      fs.mkdirSync(releaseDir, { recursive: true });
    }

    // Write to por.json
    const porPath = path.join(releaseDir, 'por.json');
    fs.writeFileSync(porPath, JSON.stringify(attestation, null, 2));
    console.log(`💾 Written attestation to: ${porPath}`);

    // Verify freshness
    const freshness = await verifyFresh(porPath);
    console.log(formatPoRStatus(freshness));

    // Update status.json if it exists
    const statusPath = path.join(__dirname, '../../release/public/status.json');
    if (fs.existsSync(path.dirname(statusPath))) {
      const status = {
        por: {
          lastUpdated: attestation.snapshot.timestamp,
          lockedSats: attestation.snapshot.lockedSats.toString(),
          outstandingBloom: attestation.snapshot.outstandingBloom.toString(),
          collateralizationRatio: attestation.collateralizationRatio,
          freshness: freshness.minutes,
          signedBy: attestation.publicKey
        },
        timestamp: Date.now()
      };
      
      fs.writeFileSync(statusPath, JSON.stringify(status, null, 2));
      console.log(`📈 Updated status.json`);
    }

    console.log('✅ Attestation rotation completed successfully');

  } catch (error) {
    console.error('❌ Failed to rotate attestation:', error);
    process.exit(1);
  }
}

// CLI interface
function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log('PoR Attestation Rotation Script');
    console.log('');
    console.log('Usage:');
    console.log('  attest:rotate [options]');
    console.log('');
    console.log('Options:');
    console.log('  --help, -h      Show this help message');
    console.log('');
    console.log('This script:');
    console.log('  1. Creates a new attestation snapshot');
    console.log('  2. Signs it with the operator key');
    console.log('  3. Writes to release/mainnet/por.json');
    console.log('  4. Updates status.json if available');
    console.log('');
    process.exit(0);
  }

  rotateAttestation();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
