const { execSync } = require('child_process');
const { existsSync, mkdirSync, writeFileSync, readFileSync, rmSync } = require('fs');
const { join } = require('path');
const { tmpdir } = require('os');

function getGitSha() {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim();
  } catch (error) {
    console.warn('Could not get git SHA:', error.message);
    return 'unknown';
  }
}

function generateSbomWithCycloneDX(targetPath, type, gitSha) {
  const name = targetPath.split('/').pop();
  const outputDir = join(process.cwd(), 'release', 'sbom');
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  const jsonOutputPath = join(outputDir, `${name}-${gitSha}.bom.json`);

  console.log(`Generating SBOM for ${name} (${type}) using cyclonedx-bom...`);
  
  try {
    // Create a temporary directory for isolated install
    const tempDir = join(tmpdir(), `sbom-${name}-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });
    
    // Copy package.json and pnpm-lock.yaml to temp dir
    const packageJsonPath = join(targetPath, 'package.json');
    const pnpmLockPath = join(process.cwd(), 'pnpm-lock.yaml');
    
    if (existsSync(packageJsonPath)) {
      execSync(`cp "${packageJsonPath}" "${tempDir}/"`);
    }
    
    if (existsSync(pnpmLockPath)) {
      execSync(`cp "${pnpmLockPath}" "${tempDir}/"`);
    }
    
    // Install dependencies in temp dir
    console.log(`Installing dependencies for ${name}...`);
    execSync('pnpm i --prefer-offline --frozen-lockfile', {
      cwd: tempDir,
      stdio: 'inherit'
    });
    
    // Generate SBOM using cyclonedx-bom
    execSync(`npx cyclonedx-bom -o "${jsonOutputPath}" --json`, {
      cwd: tempDir,
      stdio: 'inherit'
    });
    
    console.log(`✅ Generated SBOM: ${jsonOutputPath}`);
    
    // Clean up temp dir
    rmSync(tempDir, { recursive: true, force: true });
    
    return { json: jsonOutputPath };
    
  } catch (error) {
    console.error(`❌ Failed to generate SBOM for ${name}:`, error.message);
    return null;
  }
}

function generateSbomWithSyft(targetPath, type, gitSha) {
  const name = targetPath.split('/').pop();
  const outputDir = join(process.cwd(), 'release', 'sbom');
  
  const jsonOutputPath = join(outputDir, `${name}-syft-${gitSha}.bom.json`);

  console.log(`Generating SBOM for ${name} (${type}) using syft...`);
  
  try {
    // Check if syft is available via docker
    execSync('docker --version', { stdio: 'pipe' });
    
    // Run syft via docker
    const syftCmd = `docker run --rm -v "${process.cwd()}:/work" anchore/syft:latest dir:/work --output cyclonedx-json`;
    const output = execSync(syftCmd, { 
      cwd: targetPath,
      encoding: 'utf8'
    });
    
    writeFileSync(jsonOutputPath, output);
    console.log(`✅ Generated Syft SBOM: ${jsonOutputPath}`);
    
    return { json: jsonOutputPath };
    
  } catch (error) {
    console.warn(`⚠️ Syft not available for ${name}:`, error.message);
    return null;
  }
}

function signSbom(filePath) {
  if (process.env.COSIGN_KEY) {
    console.log(`✍️ Signing SBOM: ${filePath}`);
    try {
      execSync(`cosign sign-blob --key ${process.env.COSIGN_KEY} ${filePath}`, { stdio: 'inherit' });
      console.log(`✅ Signed SBOM: ${filePath}.sig`);
      return true;
    } catch (error) {
      console.warn(`⚠️ Failed to sign SBOM ${filePath}:`, error.message);
      return false;
    }
  } else {
    console.log(`ℹ️ COSIGN_KEY not present, skipping signing for ${filePath}`);
    return false;
  }
}

function main() {
  const targetType = process.argv[2]; // 'apps' or 'packages'
  if (!targetType) {
    console.error('Usage: node scripts/release/sbom.js <apps|packages>');
    process.exit(1);
  }

  const gitSha = getGitSha();
  const baseDir = process.cwd();
  const targetDir = join(baseDir, targetType);

  if (!existsSync(targetDir)) {
    console.error(`Error: Directory not found: ${targetDir}`);
    process.exit(1);
  }

  const items = execSync(`ls ${targetDir}`).toString().trim().split('\n').map(d => d.trim()).filter(Boolean);
  let generatedCount = 0;
  let signedCount = 0;
  const generatedFiles = [];

  for (const item of items) {
    const itemPath = join(targetDir, item);
    const packageJsonPath = join(itemPath, 'package.json');

    if (existsSync(packageJsonPath)) {
      console.log(`\n📦 Processing ${item}...`);
      
      // Try cyclonedx-bom first
      const cycloneResult = generateSbomWithCycloneDX(itemPath, targetType, gitSha);
      if (cycloneResult) {
        generatedFiles.push(cycloneResult.json);
        generatedCount++;
        
        if (signSbom(cycloneResult.json)) {
          signedCount++;
        }
      }
      
      // Try syft as fallback/enhancement
      const syftResult = generateSbomWithSyft(itemPath, targetType, gitSha);
      if (syftResult) {
        generatedFiles.push(syftResult.json);
        generatedCount++;
        
        if (signSbom(syftResult.json)) {
          signedCount++;
        }
      }
    }
  }

  console.log('\n📊 SBOM Generation Summary:');
  console.log(`  Generated: ${generatedCount} files`);
  console.log(`  Signed: ${signedCount} files`);
  console.log(`  Output: ${join(baseDir, 'release', 'sbom')}/`);

  if (generatedCount === 0) {
    console.error('❌ No SBOMs were generated');
    process.exit(1);
  } else {
    console.log('✅ SBOM generation completed successfully');
  }
}

main();