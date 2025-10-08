#!/usr/bin/env node

import { create as createIpfsClient } from 'ipfs-http-client';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const IPFS_URL = process.env.IPFS_URL || 'http://localhost:5001';
const OUTPUT_DIR = 'release/public';

async function publishToIPFS() {
  console.log('🚀 Publishing Mycelia to IPFS...');
  
  try {
    // Create IPFS client
    const ipfs = createIpfsClient(IPFS_URL);
    
    // Ensure output directory exists
    if (!existsSync(OUTPUT_DIR)) {
      mkdirSync(OUTPUT_DIR, { recursive: true });
    }
    
    // Build documentation if it doesn't exist
    console.log('📚 Building documentation...');
    try {
      execSync('pnpm --filter @mycelia/docs build', { stdio: 'inherit' });
    } catch (error) {
      console.warn('⚠️  Documentation build failed, continuing with existing files...');
    }
    
    // Collect files to publish
    const filesToPublish = [
      { path: 'apps/docs/build', name: 'documentation' },
      { path: 'apps/navigator-sandbox/dist', name: 'navigator' },
      { path: 'packages/nft-envelope/dist', name: 'nft-envelope' },
      { path: 'packages/public-directory/dist', name: 'public-directory' },
      { path: 'packages/radio-sfu/dist', name: 'radio-sfu' },
      { path: 'packages/radio-ux/dist', name: 'radio-ux' },
      { path: 'packages/presence/dist', name: 'presence' },
      { path: 'packages/databox/dist', name: 'databox' },
      { path: 'packages/evm-provider/dist', name: 'evm-provider' }
    ];
    
    const publishedCids = {};
    
    // Publish each component
    for (const file of filesToPublish) {
      try {
        console.log(`📦 Publishing ${file.name}...`);
        
        // Read directory contents
        const files = readDirectoryRecursive(file.path);
        
        if (files.length === 0) {
          console.warn(`⚠️  No files found in ${file.path}, skipping...`);
          continue;
        }
        
        // Add files to IPFS
        const result = await ipfs.add(files, {
          wrapWithDirectory: true,
          pin: true
        });
        
        // Get the root CID
        const rootCid = result.cid.toString();
        publishedCids[file.name] = rootCid;
        
        console.log(`✅ ${file.name} published: ${rootCid}`);
        
        // Pin the content
        await ipfs.pin.add(rootCid);
        console.log(`📌 ${file.name} pinned: ${rootCid}`);
        
      } catch (error) {
        console.error(`❌ Failed to publish ${file.name}:`, error);
      }
    }
    
    // Create manifest
    const manifest = {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      cids: publishedCids,
      metadata: {
        description: 'Mycelia Web4 Platform Distribution',
        components: Object.keys(publishedCids),
        ipfsGateway: `${IPFS_URL.replace('5001', '8080')}`,
        totalComponents: Object.keys(publishedCids).length
      }
    };
    
    // Sign manifest (mock signature for demo)
    const manifestString = JSON.stringify(manifest, null, 2);
    const signature = `mock-signature-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    
    const signedManifest = {
      ...manifest,
      signature,
      signer: 'did:mycelia:deployment-bot'
    };
    
    // Publish manifest to IPFS
    console.log('📋 Publishing manifest...');
    const manifestResult = await ipfs.add(JSON.stringify(signedManifest, null, 2), {
      pin: true
    });
    
    const manifestCid = manifestResult.cid.toString();
    publishedCids['manifest'] = manifestCid;
    
    console.log(`✅ Manifest published: ${manifestCid}`);
    
    // Save manifest locally
    const manifestPath = join(OUTPUT_DIR, 'manifest.json');
    writeFileSync(manifestPath, JSON.stringify(signedManifest, null, 2));
    
    // Create summary
    const summary = {
      manifestCid,
      gatewayUrl: `${IPFS_URL.replace('5001', '8080')}/ipfs/${manifestCid}`,
      components: publishedCids,
      publishedAt: new Date().toISOString()
    };
    
    const summaryPath = join(OUTPUT_DIR, 'summary.json');
    writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
    
    console.log('\n🎉 IPFS Publication Complete!');
    console.log(`📋 Manifest CID: ${manifestCid}`);
    console.log(`🌐 Gateway URL: ${summary.gatewayUrl}`);
    console.log(`📊 Components: ${Object.keys(publishedCids).length}`);
    console.log(`📁 Summary saved: ${summaryPath}`);
    
    return summary;
    
  } catch (error) {
    console.error('❌ IPFS publication failed:', error);
    process.exit(1);
  }
}

function readDirectoryRecursive(dirPath) {
  const files = [];
  
  try {
    const fs = require('fs');
    const path = require('path');
    
      function readDir(currentPath, relativePath = '') {
      const items = fs.readdirSync(currentPath);
      
      for (const item of items) {
        const itemPath = path.join(currentPath, item);
        const relativeItemPath = path.join(relativePath, item);
        const stat = fs.statSync(itemPath);
        
        if (stat.isDirectory()) {
          readDir(itemPath, relativeItemPath);
        } else {
          const content = fs.readFileSync(itemPath);
          files.push({
            path: relativeItemPath,
            content: content
          });
        }
      }
    }
    
    readDir(dirPath);
  } catch (error) {
    console.warn(`⚠️  Could not read directory ${dirPath}:`, error);
  }
  
  return files;
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  publishToIPFS().catch(console.error);
}