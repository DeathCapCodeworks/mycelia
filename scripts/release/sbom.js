#!/usr/bin/env node

const { execSync } = require('child_process');
const { readFileSync, writeFileSync, mkdirSync, existsSync } = require('fs');
const { join } = require('path');

function getGitSha() {
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  } catch (error) {
    console.error('Failed to get git SHA:', error);
    return 'unknown';
  }
}

function findTargets(targetDir) {
  const targets = [];
  
  try {
    const items = execSync(`dir ${targetDir} /b`, { encoding: 'utf8' }).trim().split('\n');
    
    for (const item of items) {
      const packagePath = join(targetDir, item, 'package.json');
      if (existsSync(packagePath)) {
        targets.push(join(targetDir, item));
      }
    }
  } catch (error) {
    console.error(`Failed to find targets in ${targetDir}:`, error);
  }
  
  return targets;
}

function generateSbom(targetPath, outputDir, shortSha) {
  try {
    const packageJson = JSON.parse(readFileSync(join(targetPath, 'package.json'), 'utf8'));
    const name = packageJson.name || require('path').basename(targetPath);
    const safeName = name.replace(/[^a-zA-Z0-9-]/g, '-');
    
    const jsonFile = join(outputDir, `${safeName}-${shortSha}.bom.json`);
    const xmlFile = join(outputDir, `${safeName}-${shortSha}.bom.xml`);
    
    console.log(`📦 Generating SBOM for ${name}...`);
    
    // Generate JSON SBOM
    execSync(`npx @cyclonedx/cyclonedx-npm --output-file ${jsonFile} --output-format json`, {
      cwd: targetPath,
      stdio: 'inherit'
    });
    
    // Generate XML SBOM
    execSync(`npx @cyclonedx/cyclonedx-npm --output-file ${xmlFile} --output-format xml`, {
      cwd: targetPath,
      stdio: 'inherit'
    });
    
    return { json: jsonFile, xml: xmlFile };
    
  } catch (error) {
    console.error(`Failed to generate SBOM for ${targetPath}:`, error);
    return null;
  }
}

function signSbom(filePath) {
  const cosignKey = process.env.COSIGN_KEY;
  const cosignOidc = process.env.COSIGN_OIDC;
  
  if (!cosignKey && !cosignOidc) {
    console.log(`⚠️  No COSIGN_KEY or COSIGN_OIDC found, skipping signature for ${filePath}`);
    return false;
  }
  
  try {
    const sigFile = `${filePath}.sig`;
    
    if (cosignKey) {
      execSync(`cosign sign-blob --key ${cosignKey} --output-signature ${sigFile} ${filePath}`, {
        stdio: 'inherit'
      });
    } else if (cosignOidc) {
      execSync(`cosign sign-blob --oidc-issuer ${cosignOidc} --output-signature ${sigFile} ${filePath}`, {
        stdio: 'inherit'
      });
    }
    
    console.log(`✅ Signed ${filePath}`);
    return true;
    
  } catch (error) {
    console.error(`Failed to sign ${filePath}:`, error);
    return false;
  }
}

function main() {
  const targetDir = process.argv[2];
  
  if (!targetDir) {
    console.error('Usage: node scripts/release/sbom.js <apps|packages>');
    process.exit(1);
  }
  
  if (targetDir !== 'apps' && targetDir !== 'packages') {
    console.error('Target directory must be "apps" or "packages"');
    process.exit(1);
  }
  
  console.log(`🔍 Generating SBOMs for ${targetDir}...`);
  
  const shortSha = getGitSha().substring(0, 8);
  const outputDir = 'release/sbom';
  
  // Ensure output directory exists
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }
  
  const targets = findTargets(targetDir);
  console.log(`Found ${targets.length} targets in ${targetDir}`);
  
  const generatedFiles = [];
  let signedCount = 0;
  
  for (const target of targets) {
    const result = generateSbom(target, outputDir, shortSha);
    
    if (result) {
      generatedFiles.push(result.json);
      generatedFiles.push(result.xml);
      
      // Sign the files if possible
      if (signSbom(result.json)) signedCount++;
      if (signSbom(result.xml)) signedCount++;
    }
  }
  
  console.log(`\n📊 SBOM Generation Summary:`);
  console.log(`  Generated: ${generatedFiles.length} files`);
  console.log(`  Signed: ${signedCount} files`);
  console.log(`  Output: ${outputDir}/`);
  
  // List generated files
  for (const file of generatedFiles) {
    console.log(`  - ${file}`);
  }
}

main();