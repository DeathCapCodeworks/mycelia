#!/usr/bin/env node

/**
 * Docker Image Promotion Script for GA Release
 */

const { execSync, spawnSync } = require('child_process');
const { writeFileSync, existsSync, mkdirSync } = require('fs');
const { join } = require('path');

function getBuildSha() {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

function buildDockerImage(serviceName, version, tag, localMode = false) {
  console.log(`🐳 Building ${serviceName}:${tag}...`);
  
  let dockerfile;
  let context;
  
  if (localMode) {
    // For local builds, use repo root context
    if (serviceName === 'docs') {
      dockerfile = 'apps/docs/Dockerfile';
      context = '.'; // repo root
    } else if (serviceName === 'public-directory') {
      dockerfile = 'packages/public-directory/Dockerfile';
      context = '.'; // repo root
    } else {
      console.log(`⚠️ Service ${serviceName} not supported in local mode, skipping`);
      return null;
    }
  } else {
    dockerfile = `packages/${serviceName}/Dockerfile`;
    context = '.'; // repo root
  }
  
  if (!existsSync(dockerfile)) {
    console.log(`⚠️ Dockerfile not found for ${serviceName}, skipping`);
    return null;
  }
  
  try {
    const buildCmd = [
      'docker', 'build',
      '-t', `${serviceName}:${tag}`,
      '-f', dockerfile,
      '--build-arg', `VERSION=${version}`,
      '--build-arg', `COMMIT_SHA=${getBuildSha()}`,
      context
    ];
    
    const result = spawnSync(buildCmd[0], buildCmd.slice(1), { 
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    if (result.status !== 0) {
      console.log(`❌ Failed to build ${serviceName}:${tag}`);
      return null;
    }
    
    console.log(`✅ Built ${serviceName}:${tag}`);
    
    // Get image digest
    try {
      const digestCmd = ['docker', 'images', '--digests', '--format', '{{.Digest}}', `${serviceName}:${tag}`];
      const digest = execSync(digestCmd.join(' '), { encoding: 'utf8' }).trim();
      return {
        service: serviceName,
        tag: tag,
        digest: digest || 'no-digest',
        size: getImageSize(serviceName, tag)
      };
    } catch {
      return {
        service: serviceName,
        tag: tag,
        digest: 'no-digest',
        size: 'unknown'
      };
    }
  } catch (error) {
    console.log(`❌ Error building ${serviceName}:${tag}:`, error.message);
    return null;
  }
}

function getImageSize(serviceName, tag) {
  try {
    const sizeCmd = ['docker', 'images', '--format', '{{.Size}}', `${serviceName}:${tag}`];
    return execSync(sizeCmd.join(' '), { encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

function pushDockerImage(serviceName, tag) {
  const registry = process.env.DOCKER_REGISTRY;
  const repo = process.env.DOCKER_REPO;
  
  if (!registry || !repo) {
    console.log(`⚠️ DOCKER_REGISTRY or DOCKER_REPO not set, skipping push for ${serviceName}:${tag}`);
    return false;
  }
  
  const fullTag = `${registry}/${repo}/${serviceName}:${tag}`;
  
  try {
    console.log(`📤 Pushing ${fullTag}...`);
    
    // Tag for registry
    execSync(`docker tag ${serviceName}:${tag} ${fullTag}`);
    
    // Push to registry
    execSync(`docker push ${fullTag}`);
    
    console.log(`✅ Pushed ${fullTag}`);
    return true;
  } catch (error) {
    console.log(`❌ Failed to push ${fullTag}:`, error.message);
    return false;
  }
}

function signDockerImage(serviceName, tag) {
  const cosignKey = process.env.COSIGN_KEY;
  
  if (!cosignKey) {
    console.log(`⚠️ COSIGN_KEY not set, skipping signing for ${serviceName}:${tag}`);
    return false;
  }
  
  try {
    console.log(`🔐 Signing ${serviceName}:${tag}...`);
    
    // Sign with cosign
    execSync(`cosign sign --key ${cosignKey} ${serviceName}:${tag}`);
    
    console.log(`✅ Signed ${serviceName}:${tag}`);
    return true;
  } catch (error) {
    console.log(`❌ Failed to sign ${serviceName}:${tag}:`, error.message);
    return false;
  }
}

function promoteImages(version, localMode = false) {
  console.log(`🚀 Promoting Docker images to ${version}${localMode ? ' (local mode)' : ''}...`);
  
  const services = localMode ? [
    'docs',
    'public-directory'
  ] : [
    'public-directory',
    'radio-sfu', 
    'navigator',
    'docs'
  ];
  
  const images = [];
  
  for (const service of services) {
    // Build version tag
    const versionImage = buildDockerImage(service, version, version, localMode);
    if (versionImage) {
      images.push(versionImage);
      
      if (!localMode) {
        // Push version tag
        pushDockerImage(service, version);
        
        // Sign version tag
        signDockerImage(service, version);
      }
    }
    
    // Build latest tag
    const latestImage = buildDockerImage(service, version, 'latest', localMode);
    if (latestImage) {
      latestImage.tag = 'latest';
      images.push(latestImage);
      
      if (!localMode) {
        // Push latest tag
        pushDockerImage(service, 'latest');
        
        // Sign latest tag
        signDockerImage(service, 'latest');
      }
    }
  }
  
  // Write images manifest
  const manifest = {
    version: version,
    timestamp: new Date().toISOString(),
    buildSha: getBuildSha(),
    images: images,
    registry: process.env.DOCKER_REGISTRY || 'local',
    repo: process.env.DOCKER_REPO || 'mycelia'
  };
  
  const manifestPath = `release/images-${version}.json`;
  const releaseDir = 'release';
  if (!existsSync(releaseDir)) {
    mkdirSync(releaseDir, { recursive: true });
  }
  
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`📁 Images manifest written to ${manifestPath}`);
  
  console.log(`✅ Promoted ${images.length} Docker images`);
  return images.length;
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const promoteFlag = args.indexOf('--promote');
  const localFlag = args.indexOf('--local');
  
  if (promoteFlag !== -1) {
    const version = args[promoteFlag + 1];
    if (!version) {
      console.log('Usage: node docker-build.js --promote <version>');
      process.exit(1);
    }
    const imageCount = promoteImages(version, false);
    
    console.log(`\n📊 Docker Promotion Summary:`);
    console.log(`   Version: ${version}`);
    console.log(`   Images: ${imageCount}`);
    console.log(`   Registry: ${process.env.DOCKER_REGISTRY || 'local'}`);
    
    process.exit(imageCount > 0 ? 0 : 1);
  } else if (localFlag !== -1) {
    const version = args[localFlag + 1];
    if (!version) {
      console.log('Usage: node docker-build.js --local <version>');
      process.exit(1);
    }
    const imageCount = promoteImages(version, true);
    
    console.log(`\n📊 Docker Local Build Summary:`);
    console.log(`   Version: ${version}`);
    console.log(`   Images: ${imageCount}`);
    console.log(`   Mode: local`);
    
    process.exit(imageCount > 0 ? 0 : 1);
  } else {
    console.log('Usage: node docker-build.js --promote <version> | --local <version>');
    process.exit(1);
  }
}

module.exports = { promoteImages, buildDockerImage, pushDockerImage, signDockerImage };