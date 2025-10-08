#!/usr/bin/env node

/**
 * PoR Freshness Validator for GA Release
 */

const { readFileSync, writeFileSync, existsSync, mkdirSync } = require('fs');
const { join } = require('path');

function validatePoRFreshness(maxMinutes = 30) {
  console.log(`🔍 Validating PoR freshness (≤${maxMinutes} minutes)...`);
  
  // Check for existing attestation
  const attestationPath = 'release/attestations/mainnet-por.json';
  if (!existsSync(attestationPath)) {
    console.log('❌ No PoR attestation found');
    console.log('NEXT ACTION: Run pnpm run por:rotate to generate fresh PoR');
    return false;
  }
  
  try {
    const attestation = JSON.parse(readFileSync(attestationPath, 'utf8'));
    const timestamp = new Date(attestation.timestamp);
    const now = new Date();
    const ageMinutes = (now.getTime() - timestamp.getTime()) / (1000 * 60);
    
    console.log(`📊 PoR Details:`);
    console.log(`   Timestamp: ${attestation.timestamp}`);
    console.log(`   Age: ${ageMinutes.toFixed(1)} minutes`);
    console.log(`   Sats Total: ${attestation.sats_total.toLocaleString()}`);
    console.log(`   Signer: ${attestation.signer}`);
    
    if (ageMinutes > maxMinutes) {
      console.log(`❌ PoR is stale (${ageMinutes.toFixed(1)}m > ${maxMinutes}m)`);
      console.log('NEXT ACTION: Run pnpm run por:rotate to generate fresh PoR');
      return false;
    }
    
    console.log(`✅ PoR is fresh (${ageMinutes.toFixed(1)}m ≤ ${maxMinutes}m)`);
    
    // Copy to governance pack
    const govDir = 'release/governance/v1.0.0';
    if (!existsSync(govDir)) {
      mkdirSync(govDir, { recursive: true });
    }
    
    writeFileSync(join(govDir, 'por.json'), JSON.stringify(attestation, null, 2));
    console.log(`📁 Copied PoR to ${join(govDir, 'por.json')}`);
    
    return true;
  } catch (error) {
    console.log('❌ Failed to parse PoR attestation:', error);
    console.log('NEXT ACTION: Fix PoR attestation format');
    return false;
  }
}

function updateStatusPage() {
  console.log('📝 Updating status page...');
  
  const statusPath = 'apps/docs/static/status.json';
  if (!existsSync(statusPath)) {
    console.log('⚠️ Status page not found, skipping update');
    return;
  }
  
  try {
    const status = JSON.parse(readFileSync(statusPath, 'utf8'));
    status.por = {
      fresh: true,
      timestamp: new Date().toISOString(),
      status: 'green'
    };
    
    writeFileSync(statusPath, JSON.stringify(status, null, 2));
    console.log('✅ Status page updated with fresh PoR');
  } catch (error) {
    console.log('⚠️ Failed to update status page:', error);
  }
}

if (require.main === module) {
  const maxMinutes = parseInt(process.argv[2]) || 30;
  
  if (validatePoRFreshness(maxMinutes)) {
    updateStatusPage();
    console.log('✅ PoR validation passed');
    process.exit(0);
  } else {
    process.exit(1);
  }
}
