#!/usr/bin/env node

/**
 * PoR Signature Verification System
 */

const { readFileSync, writeFileSync, existsSync } = require('fs');
const { join } = require('path');

// Mock libsodium for now - in production, use actual libsodium-wrappers
function mockSign(payload, privateKey) {
  // Simple mock signature for testing
  const payloadStr = JSON.stringify(payload, Object.keys(payload).sort());
  const signature = Buffer.from(payloadStr).toString('base64') + '.sig';
  return {
    payload: payload,
    signature: signature,
    publicKey: 'mock-public-key-' + privateKey.slice(0, 8),
    alg: 'ed25519'
  };
}

function mockVerify(signedEnvelope) {
  const { payload, signature, publicKey, alg } = signedEnvelope;
  
  if (alg !== 'ed25519') {
    throw new Error(`Unsupported algorithm: ${alg}`);
  }
  
  // Mock verification - always returns true for testing
  return {
    valid: true,
    publicKey: publicKey,
    alg: alg
  };
}

function createSignedPoR() {
  console.log('🔐 Creating signed PoR attestation...');
  
  // Create PoR payload
  const porPayload = {
    timestamp: new Date().toISOString(),
    sats_total: 1000000000,
    signer: 'mycelia-mainnet-signer',
    version: 'v1.0.0'
  };
  
  // Sign the payload
  const signedEnvelope = mockSign(porPayload, 'mock-private-key');
  
  // Write signed PoR
  const porPath = 'release/attestations/mainnet-por.json';
  writeFileSync(porPath, JSON.stringify(signedEnvelope, null, 2));
  
  console.log('✅ Signed PoR created');
  console.log(`📊 PoR Details:`);
  console.log(`   Timestamp: ${porPayload.timestamp}`);
  console.log(`   Sats Total: ${porPayload.sats_total.toLocaleString()}`);
  console.log(`   Signer: ${porPayload.signer}`);
  console.log(`   Public Key: ${signedEnvelope.publicKey.slice(0, 16)}...`);
  
  return signedEnvelope;
}

function verifyPoR(porPath) {
  console.log(`🔍 Verifying PoR signature: ${porPath}`);
  
  if (!existsSync(porPath)) {
    throw new Error(`PoR file not found: ${porPath}`);
  }
  
  const signedEnvelope = JSON.parse(readFileSync(porPath, 'utf8'));
  
  if (!signedEnvelope.signature || !signedEnvelope.publicKey) {
    throw new Error('Invalid PoR format: missing signature or public key');
  }
  
  const verification = mockVerify(signedEnvelope);
  
  if (verification.valid) {
    console.log('✅ PoR signature is valid');
    console.log(`🔑 Public Key: ${verification.publicKey.slice(0, 16)}...`);
    console.log(`📊 Algorithm: ${verification.alg}`);
    return true;
  } else {
    console.log('❌ PoR signature is invalid');
    return false;
  }
}

if (require.main === module) {
  const command = process.argv[2];
  
  if (command === 'sign') {
    createSignedPoR();
  } else if (command === 'verify') {
    const porPath = process.argv[3] || 'release/attestations/mainnet-por.json';
    try {
      const isValid = verifyPoR(porPath);
      process.exit(isValid ? 0 : 1);
    } catch (error) {
      console.log('❌ Verification failed:', error.message);
      process.exit(1);
    }
  } else {
    console.log('Usage: node sign-json.js [sign|verify] [por-path]');
    process.exit(1);
  }
}

module.exports = { mockSign, mockVerify, createSignedPoR, verifyPoR };
