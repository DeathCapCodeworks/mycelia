#!/usr/bin/env node

/**
 * Mycelia Attestations - Main Entry Point
 */

import { createRequire } from 'module';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const require = createRequire(import.meta.url);

// Re-export from existing CJS implementations
export { mockSign, mockVerify, createSignedPoR, verifyPoR } from './sign-json.cjs';

// TypeScript wrapper for verifyFresh
export async function verifyFresh(porPath: string, maxMinutes: number = 30): Promise<boolean> {
  try {
    if (!existsSync(porPath)) {
      console.log(`❌ PoR file not found: ${porPath}`);
      return false;
    }

    const porContent = readFileSync(porPath, 'utf8');
    const attestation = JSON.parse(porContent);

    // Check if it's a signed envelope format
    if (attestation.payload && attestation.signature && attestation.publicKey && attestation.alg) {
      // Verify signature
      const { verifyPoR } = await import('./sign-json.cjs');
      const isValid = verifyPoR(porPath);
      
      if (!isValid) {
        console.log('❌ PoR signature is invalid');
        return false;
      }

      // Check staleness
      const timestamp = new Date(attestation.payload.timestamp);
      const age = Date.now() - timestamp.getTime();
      const maxAge = maxMinutes * 60 * 1000;
      const isStale = age > maxAge;
      
      if (isStale) {
        console.log(`❌ PoR is stale (${Math.round(age / 60000)}m > ${maxMinutes}m)`);
        return false;
      }

      console.log(`✅ PoR is fresh (${Math.round(age / 60000)}m ≤ ${maxMinutes}m)`);
      return true;
    } else {
      console.log('❌ PoR not in signed envelope format');
      return false;
    }
  } catch (error) {
    console.log(`❌ PoR verification failed: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

// TypeScript wrapper for signJson
export async function signJson(payload: any, privateKey: string): Promise<any> {
  const { mockSign } = await import('./sign-json.cjs');
  return mockSign(payload, privateKey);
}

// TypeScript wrapper for verifyJson
export async function verifyJson(signedEnvelope: any): Promise<any> {
  const { mockVerify } = await import('./sign-json.cjs');
  return mockVerify(signedEnvelope);
}

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2];
  
  if (command === 'sign') {
    const { createSignedPoR } = await import('./sign-json.cjs');
    createSignedPoR();
  } else if (command === 'verify') {
    const porPath = process.argv[3] || 'release/attestations/mainnet-por.json';
    const isValid = await verifyFresh(porPath);
    process.exit(isValid ? 0 : 1);
  } else {
    console.log('Usage: node index.js [sign|verify] [por-path]');
    process.exit(1);
  }
}