#!/usr/bin/env node
const { execSync } = require('node:child_process');

function run(cmd) {
  console.log(`[native] ${cmd}`);
  execSync(cmd, { stdio: 'inherit' });
}

function main() {
  const sub = process.argv[2];
  if (sub !== 'build') {
    console.log('Usage: node scripts/native build');
    process.exit(0);
  }
  // Probe for cargo / napi-rs (no-op if missing)
  try { run('cargo --version'); } catch { console.log('[native] cargo not found, skipping'); }
  // Placeholder for future napi-rs builds
  console.log('[native] build complete (placeholder)');
}

main();

