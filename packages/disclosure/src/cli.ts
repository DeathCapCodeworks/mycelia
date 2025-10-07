#!/usr/bin/env node
// Mycelia Disclosure CLI - Vulnerability report receipt system

import { DisclosureManager, VulnerabilityReport } from './index.js';

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: mycelia-disclosure <command> [options]');
    console.log('');
    console.log('Commands:');
    console.log('  receipt --severity <high|med|low> --hash <sha256>  Create signed receipt');
    console.log('  verify <receipt-file>                             Verify receipt signature');
    console.log('  list                                              List all receipts');
    console.log('  export --out <file>                               Export receipts as JSON Lines');
    console.log('  pgp-key                                           Generate PGP key for secure communication');
    console.log('');
    console.log('Examples:');
    console.log('  mycelia-disclosure receipt --severity high --hash abc123def456');
    console.log('  mycelia-disclosure verify ./receipts/receipt-001.json');
    console.log('  mycelia-disclosure export --out ./receipts/all-receipts.jsonl');
    process.exit(1);
  }

  const command = args[0];
  const manager = new DisclosureManager();
  
  try {
    if (command === 'receipt') {
      await handleReceipt(args.slice(1), manager);
    } else if (command === 'verify') {
      await handleVerify(args.slice(1), manager);
    } else if (command === 'list') {
      await handleList(manager);
    } else if (command === 'export') {
      await handleExport(args.slice(1), manager);
    } else if (command === 'pgp-key') {
      await handlePGPKey(manager);
    } else {
      console.error(`Unknown command: ${command}`);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

async function handleReceipt(args: string[], manager: DisclosureManager) {
  const severityIndex = args.indexOf('--severity');
  const hashIndex = args.indexOf('--hash');
  
  if (severityIndex === -1 || severityIndex === args.length - 1) {
    console.error('Error: --severity option requires a value (high, med, low)');
    process.exit(1);
  }
  
  if (hashIndex === -1 || hashIndex === args.length - 1) {
    console.error('Error: --hash option requires a SHA256 hash');
    process.exit(1);
  }

  const severityStr = args[severityIndex + 1];
  const hash = args[hashIndex + 1];
  
  // Map med to medium
  const severity = severityStr === 'med' ? 'medium' : severityStr;
  
  if (!['low', 'medium', 'high'].includes(severity)) {
    console.error('Error: severity must be high, med, or low');
    process.exit(1);
  }

  if (!/^[a-f0-9]{64}$/i.test(hash)) {
    console.error('Error: hash must be a valid SHA256 hash (64 hex characters)');
    process.exit(1);
  }

  const report: VulnerabilityReport = {
    severity: severity as 'low' | 'medium' | 'high',
    hash,
    description: 'Vulnerability report submitted via CLI',
    reporter: 'anonymous@mycelia.com',
    timestamp: Date.now()
  };

  const receipt = await manager.createReceipt(report);
  
  console.log('✅ Receipt created successfully');
  console.log(`📋 Receipt ID: ${receipt.receiptId}`);
  console.log(`🔍 Report Hash: ${receipt.reportHash}`);
  console.log(`⚠️  Severity: ${receipt.severity.toUpperCase()}`);
  console.log(`✍️  Signature: ${receipt.signature.slice(0, 16)}...`);
  console.log(`🔑 Public Key: ${receipt.publicKey.slice(0, 16)}...`);
  console.log(`⏰ Timestamp: ${new Date(receipt.timestamp).toISOString()}`);
}

async function handleVerify(args: string[], manager: DisclosureManager) {
  if (args.length === 0) {
    console.error('Error: verify command requires a receipt file path');
    process.exit(1);
  }

  const receiptFile = args[0];
  
  try {
    const fs = await import('fs/promises');
    const content = await fs.readFile(receiptFile, 'utf8');
    const receipt = JSON.parse(content);
    
    const isValid = await manager.verifyReceipt(receipt);
    
    if (isValid) {
      console.log('✅ Receipt signature is valid');
      console.log(`📋 Receipt ID: ${receipt.receiptId}`);
      console.log(`🔍 Report Hash: ${receipt.reportHash}`);
      console.log(`⚠️  Severity: ${receipt.severity.toUpperCase()}`);
      console.log(`⏰ Timestamp: ${new Date(receipt.timestamp).toISOString()}`);
    } else {
      console.error('❌ Receipt signature is invalid');
      process.exit(1);
    }
  } catch (error) {
    console.error(`❌ Failed to verify receipt: ${error}`);
    process.exit(1);
  }
}

async function handleList(manager: DisclosureManager) {
  const receipts = manager.getAllReceipts();
  
  if (receipts.length === 0) {
    console.log('No receipts found');
    return;
  }

  console.log('\n📋 Vulnerability Report Receipts\n================================');
  
  for (const receipt of receipts) {
    console.log(`📋 ${receipt.receiptId}`);
    console.log(`   Hash: ${receipt.reportHash}`);
    console.log(`   Severity: ${receipt.severity.toUpperCase()}`);
    console.log(`   Date: ${new Date(receipt.timestamp).toISOString()}`);
    console.log('');
  }
  
  const highCount = receipts.filter(r => r.severity === 'high').length;
  const mediumCount = receipts.filter(r => r.severity === 'medium').length;
  const lowCount = receipts.filter(r => r.severity === 'low').length;
  
  console.log(`Summary: ${receipts.length} total (${highCount} high, ${mediumCount} medium, ${lowCount} low)`);
}

async function handleExport(args: string[], manager: DisclosureManager) {
  const outIndex = args.indexOf('--out');
  if (outIndex === -1 || outIndex === args.length - 1) {
    console.error('Error: --out option requires a file path');
    process.exit(1);
  }

  const outputFile = args[outIndex + 1];
  
  try {
    await manager.saveReceipts(outputFile);
    console.log(`✅ Receipts exported to ${outputFile}`);
    
    const receipts = manager.getAllReceipts();
    console.log(`📋 Exported ${receipts.length} receipts`);
  } catch (error) {
    console.error(`❌ Failed to export receipts: ${error}`);
    process.exit(1);
  }
}

async function handlePGPKey(manager: DisclosureManager) {
  const pgpKey = manager.generatePGPKey();
  
  console.log('🔐 PGP Public Key for Secure Communication');
  console.log('==========================================');
  console.log('');
  console.log(pgpKey);
  console.log('');
  console.log('Use this key for encrypted communication about vulnerabilities.');
  console.log('Email: security@mycelia.com');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
