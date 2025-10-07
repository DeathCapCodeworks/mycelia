#!/usr/bin/env node
// Mycelia Attestations CLI - Sign and verify PoR attestations

import { AttestationWriter, AttestationVerifier, createSnapshotFromSpvFeed } from './index.js';
import { SpvUtxoFeed } from '@mycelia/proof-of-reserve';
import { SupplyLedger } from '@mycelia/shared-kernel';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  console.log('[attest] starting CLI');
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: mycelia-attest <command> [options]');
    console.log('');
    console.log('Commands:');
    console.log('  sign --out <file>     Sign PoR attestation');
    console.log('  verify <file>         Verify PoR attestation');
    console.log('');
    console.log('Options:');
    console.log('  --out <file>          Output file for signed attestation');
    console.log('');
    console.log('Examples:');
    console.log('  mycelia-attest sign --out ./release/mainnet/por.json');
    console.log('  mycelia-attest verify ./release/mainnet/por.json');
    process.exit(1);
  }

  const command = args[0];
  
  try {
    if (command === 'sign') {
      await handleSign(args.slice(1));
    } else if (command === 'verify') {
      await handleVerify(args.slice(1));
    } else {
      console.error(`Unknown command: ${command}`);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

async function handleSign(args: string[]) {
  const outIndex = args.indexOf('--out');
  if (outIndex === -1 || outIndex === args.length - 1) {
    console.error('Error: --out option requires a file path');
    process.exit(1);
  }

  const outputFile = args[outIndex + 1];
  console.log(`[attest] sign → ${outputFile}`);
  
  console.log('🔍 Fetching UTXO data...');
  
  // Create SPV feed with mock data for demo
  const spvFeed = new SpvUtxoFeed({
    watchAddresses: [
      'bc1qtreasury123456789abcdefghijklmnopqrstuvwxyz',
      'bc1qreserve987654321fedcba987654321fedcba'
    ],
    network: 'mainnet'
  });
  
  // Add some mock UTXOs
  spvFeed.addUtxo('mock-txid-1', 0, 50_000_000n, true); // 0.5 BTC
  spvFeed.addUtxo('mock-txid-2', 0, 25_000_000n, true); // 0.25 BTC
  spvFeed.addUtxo('mock-txid-3', 0, 10_000_000n, true); // 0.1 BTC
  
  // Get current supply (mock)
  const supplyLedger = new SupplyLedger();
  const outstandingBloom = supplyLedger.currentSupply();
  
  console.log('📊 Creating attestation snapshot...');
  const snapshot = await createSnapshotFromSpvFeed(spvFeed, outstandingBloom);
  
  console.log('✍️  Signing attestation...');
  const writer = new AttestationWriter();
  const attestation = await writer.writeAttestation(snapshot);
  
  // Save attestation
  const fs = await import('fs/promises');
  const content = JSON.stringify(attestation, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value,
    2
  );
  
  await fs.writeFile(outputFile, content, 'utf8');
  
  console.log('[attest] ✅ Attestation signed successfully');
  console.log(`📁 Output file: ${outputFile}`);
  console.log(`💰 Total locked sats: ${snapshot.lockedSats.toString()}`);
  console.log(`🪙 Outstanding BLOOM: ${snapshot.outstandingBloom.toString()}`);
  console.log(`📈 Collateralization ratio: ${(snapshot.collateralizationRatio * 100).toFixed(2)}%`);
  console.log(`🔗 Header hash: ${snapshot.headerHash}`);
  console.log(`📝 UTXO count: ${snapshot.utxoCount}`);
  console.log(`✍️  Signer: ${attestation.publicKey.slice(0, 16)}...`);
  console.log('[attest] sign done.');
}

async function handleVerify(args: string[]) {
  if (args.length === 0) {
    console.error('Error: verify command requires a file path');
    process.exit(1);
  }

  const inputFile = args[0];
  
  console.log(`[attest] verify → ${inputFile}`);
  
  // Load attestation
  const fs = await import('fs/promises');
  const content = await fs.readFile(inputFile, 'utf8');
  const attestation = JSON.parse(content);
  
  // Verify signature
  const verifier = new AttestationVerifier();
  const isValid = await verifier.verifyAttestation(attestation);
  
  if (!isValid) {
    console.error('[attest] ❌ Attestation signature is invalid');
    process.exit(1);
  }
  
  // Check staleness (24 hours)
  const isStale = verifier.isAttestationStale(attestation, 24 * 60 * 60 * 1000);
  
  if (isStale) {
    console.error('❌ Attestation is stale (older than 24 hours)');
    process.exit(1);
  }
  
  const ageMinutes = Math.floor((Date.now() - attestation.snapshot.timestamp) / (60 * 1000));
  
  console.log('[attest] ✅ Attestation is valid and fresh');
  console.log(`💰 Total locked sats: ${attestation.snapshot.lockedSats.toString()}`);
  console.log(`🪙 Outstanding BLOOM: ${attestation.snapshot.outstandingBloom.toString()}`);
  console.log(`📈 Collateralization ratio: ${(attestation.snapshot.collateralizationRatio * 100).toFixed(2)}%`);
  console.log(`⏰ Age: ${ageMinutes} minutes`);
  console.log(`🔗 Header hash: ${attestation.snapshot.headerHash}`);
  console.log(`📝 UTXO count: ${attestation.snapshot.utxoCount}`);
  console.log(`✍️  Signer: ${attestation.publicKey.slice(0, 16)}...`);
  console.log('[attest] verify done.');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
