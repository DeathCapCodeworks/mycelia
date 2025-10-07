#!/usr/bin/env node
// Mycelia Genesis CLI - Build deterministic genesis configuration

import { GenesisBuilder, GenesisConfig } from './index.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  console.log('[genesis] starting CLI');
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] !== 'build') {
    console.log('Usage: mycelia-genesis build --out <output-dir>');
    console.log('');
    console.log('Options:');
    console.log('  --out <dir>    Output directory for genesis files');
    console.log('');
    console.log('Example:');
    console.log('  mycelia-genesis build --out ./release/mainnet');
    process.exit(1);
  }

  const outIndex = args.indexOf('--out');
  if (outIndex === -1 || outIndex === args.length - 1) {
    console.error('Error: --out option requires a directory path');
    process.exit(1);
  }

  const outputDir = args[outIndex + 1];
  
  try {
    const builder = new GenesisBuilder();
    
    // Load validators from default path
    const validatorsPath = join(outputDir, '../cfg/validators.json');
    const validators = await builder.loadValidators(validatorsPath);
    
    // Load supply if available
    const supplyPath = join(outputDir, '../cfg/supply.json');
    const initialSupply = await builder.loadSupply(supplyPath);
    
    // Build genesis configuration
    const config: GenesisConfig = {
      chainId: 'mycelia-mainnet-1',
      blockTimeMs: 1000,
      minGasPrice: 0,
      initialValidators: validators,
      treasury: {
        descriptor: 'cash-backed-custodian-policy',
        address: 'bc1qtreasury123456789abcdefghijklmnopqrstuvwxyz'
      },
      initialSupply
    };
    
    const genesis = builder.build(config);
    const manifest = builder.createManifest(genesis);
    
    // Ensure output directory exists
    const fs = await import('fs/promises');
    await fs.mkdir(outputDir, { recursive: true });
    
    // Save genesis files
    const genesisPath = join(outputDir, 'genesis.json');
    const hashPath = join(outputDir, 'genesis.hash');
    const manifestPath = join(outputDir, 'manifest.json');
    
    await builder.saveGenesis(genesis, genesisPath);
    await builder.saveHash(genesis.hash, hashPath);
    await builder.saveManifest(manifest, manifestPath);
    
    console.log('[genesis] ✅ Genesis built successfully');
    console.log(`📁 Output directory: ${outputDir}`);
    console.log(`🔗 Chain ID: ${genesis.chainId}`);
    console.log(`⛓️  Genesis hash: ${genesis.hash}`);
    console.log(`👥 Validators: ${genesis.initialValidators.length}`);
    console.log(`💰 Total stake: ${manifest.totalStake.toString()} BLOOM`);
    console.log(`🏛️  Treasury: ${genesis.treasury.address}`);
    console.log(`🚩 Enabled flags: ${manifest.enabledFlags.join(', ')}`);
    console.log('[genesis] done.');
    
  } catch (error) {
    console.error('❌ Failed to build genesis:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
