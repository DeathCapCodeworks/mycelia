const { execSync } = require('child_process');
const { readFileSync, writeFileSync, existsSync } = require('fs');
const { join } = require('path');

function getVersion() {
  try {
    return readFileSync('release/VERSION', 'utf8').trim();
  } catch (error) {
    console.error('Failed to read VERSION file:', error);
    process.exit(1);
  }
}

function getGitSha() {
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  } catch (error) {
    console.error('Failed to get git SHA:', error);
    return 'unknown';
  }
}

function buildImage(serviceName, version) {
  try {
    console.log(`🐳 Building ${serviceName}...`);
    
    const imageName = `mycelia-${serviceName}`;
    const versionTag = `${imageName}:${version}`;
    const latestRcTag = `${imageName}:rc-latest`;
    
    // Determine build context and dockerfile path
    let buildContext, dockerfilePath;
    if (serviceName === 'docs') {
      buildContext = '.';
      dockerfilePath = 'apps/docs/Dockerfile';
    } else {
      buildContext = '.';
      dockerfilePath = `packages/${serviceName}/Dockerfile`;
    }
    
    // Build the image with build args
    const buildCmd = `docker build -f ${dockerfilePath} --build-arg COMMIT_SHA=${getGitSha()} --build-arg VERSION=${version} -t ${versionTag} -t ${latestRcTag} ${buildContext}`;
    execSync(buildCmd, {
      stdio: 'inherit'
    });
    
    // Get the digest
    const digestOutput = execSync(`docker inspect ${versionTag} --format='{{index .RepoDigests 0}}'`, {
      encoding: 'utf8'
    }).trim();
    
    const digest = digestOutput.split('@')[1] || 'unknown';
    
    console.log(`✅ Built ${serviceName}: ${digest.substring(0, 12)}...`);
    
    return {
      name: imageName,
      digest,
      tags: [versionTag, latestRcTag]
    };
    
  } catch (error) {
    console.error(`Failed to build ${serviceName}:`, error);
    return null;
  }
}

function pushImage(imageInfo) {
  const dockerRegistry = process.env.DOCKER_REGISTRY;
  const dockerRepo = process.env.DOCKER_REPO;
  
  if (!dockerRegistry || !dockerRepo) {
    console.log(`⚠️  No DOCKER_REGISTRY or DOCKER_REPO found, skipping push for ${imageInfo.name}`);
    return false;
  }
  
  try {
    console.log(`📤 Pushing ${imageInfo.name}...`);
    
    for (const tag of imageInfo.tags) {
      const remoteTag = `${dockerRegistry}/${dockerRepo}/${tag}`;
      
      // Tag for remote registry
      execSync(`docker tag ${tag} ${remoteTag}`, { stdio: 'inherit' });
      
      // Push to registry
      execSync(`docker push ${remoteTag}`, { stdio: 'inherit' });
      
      console.log(`✅ Pushed ${remoteTag}`);
    }
    
    return true;
    
  } catch (error) {
    console.error(`Failed to push ${imageInfo.name}:`, error);
    return false;
  }
}

function signImage(imageInfo) {
  const cosignKey = process.env.COSIGN_KEY;
  const cosignOidc = process.env.COSIGN_OIDC;
  
  if (!cosignKey && !cosignOidc) {
    console.log(`⚠️  No COSIGN_KEY or COSIGN_OIDC found, skipping signature for ${imageInfo.name}`);
    return false;
  }
  
  try {
    console.log(`🔐 Signing ${imageInfo.name}...`);
    
    for (const tag of imageInfo.tags) {
      if (cosignKey) {
        execSync(`cosign sign --key ${cosignKey} ${tag}`, { stdio: 'inherit' });
      } else if (cosignOidc) {
        execSync(`cosign sign --oidc-issuer ${cosignOidc} ${tag}`, { stdio: 'inherit' });
      }
    }
    
    console.log(`✅ Signed ${imageInfo.name}`);
    return true;
    
  } catch (error) {
    console.error(`Failed to sign ${imageInfo.name}:`, error);
    return false;
  }
}

function validateDockerCompose() {
  try {
    console.log('🔍 Validating docker-compose.yml...');
    execSync('docker compose -f deploy/docker-compose.yml config', { stdio: 'inherit' });
    console.log('✅ Docker Compose configuration is valid');
    return true;
  } catch (error) {
    console.error('❌ Docker Compose configuration is invalid:', error);
    return false;
  }
}

function main() {
  console.log('🐳 Building container images...');
  
  // Validate docker-compose first
  if (!validateDockerCompose()) {
    process.exit(1);
  }
  
  const version = getVersion();
  const gitSha = getGitSha();
  
  console.log(`Version: ${version}`);
  console.log(`Git SHA: ${gitSha.substring(0, 8)}...`);
  
  // Define services to build
  const services = [
    'public-directory',
    'radio-sfu',
    'docs',
    'navigator'
  ];
  
  const images = [];
  let pushedCount = 0;
  let signedCount = 0;
  
  // Build each service
  for (const service of services) {
    const imageInfo = buildImage(service, version);
    
    if (imageInfo) {
      images.push(imageInfo);
      
      // Push if registry configured
      if (pushImage(imageInfo)) {
        pushedCount++;
      }
      
      // Sign if key configured
      if (signImage(imageInfo)) {
        signedCount++;
      }
    }
  }
  
  // Create images.json
  const imagesData = {
    version,
    gitSha,
    timestamp: new Date().toISOString(),
    images: images.map(img => ({
      name: img.name,
      digest: img.digest,
      tags: img.tags
    })),
    summary: {
      total: images.length,
      pushed: pushedCount,
      signed: signedCount
    }
  };
  
  const outputFile = 'release/images.json';
  writeFileSync(outputFile, JSON.stringify(imagesData, null, 2));
  
  console.log(`\n📊 Docker Build Summary:`);
  console.log(`  Built: ${images.length} images`);
  console.log(`  Pushed: ${pushedCount} images`);
  console.log(`  Signed: ${signedCount} images`);
  console.log(`  Output: ${outputFile}`);
  
  // List built images
  for (const image of images) {
    console.log(`  - ${image.name}: ${image.digest.substring(0, 12)}...`);
  }
}

main();
