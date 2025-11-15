---
title: Ipfs
---

# IPFS Deployment

Mycelia uses IPFS (InterPlanetary File System) for decentralized storage and content distribution. This document covers IPFS deployment, configuration, and integration with the Mycelia platform.

## Overview

IPFS integration provides:

- **Decentralized Storage**: Content stored across multiple nodes
- **Content Addressing**: Cryptographic content addressing
- **Censorship Resistance**: Distributed content distribution
- **Pinning Services**: Content availability guarantees
- **Gateway Access**: HTTP gateway for web access

## Architecture

### IPFS Node Types

#### Kubo Node
The reference IPFS implementation:
- **Full Node**: Complete IPFS functionality
- **API Server**: REST API for interactions
- **Gateway**: HTTP gateway for web access
- **Swarm**: P2P networking and content discovery

#### Light Node
Reduced functionality node:
- **Limited Storage**: Minimal local storage
- **Gateway Only**: HTTP gateway functionality
- **API Access**: Limited API access
- **Reduced Resources**: Lower resource requirements

### Content Distribution

#### Pinning
Content pinning ensures availability:
- **Local Pinning**: Pin content locally
- **Remote Pinning**: Use remote pinning services
- **Distributed Pinning**: Multiple pinning locations
- **Pinning Policies**: Automated pinning policies

#### Replication
Content replication for redundancy:
- **Automatic Replication**: Automatic content replication
- **Manual Replication**: Manual replication control
- **Replication Factors**: Configurable replication factors
- **Geographic Distribution**: Geographic content distribution

## Deployment Options

### Docker Deployment
```yaml
services:
  ipfs:
    image: ipfs/kubo:latest
    container_name: mycelia-ipfs
    ports:
      - "4001:4001"   # IPFS swarm
      - "4001:4001/udp"
      - "5001:5001"   # IPFS API
      - "8080:8080"   # IPFS Gateway
    volumes:
      - ipfs_data:/data
      - ipfs_staging:/export
    environment:
      - IPFS_PROFILE=server
    command: daemon --migrate=true --agent-version-suffix=docker
```text

### Kubernetes Deployment
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ipfs
spec:
  replicas: 1
  selector:
    matchLabels:
      app: ipfs
  template:
    metadata:
      labels:
        app: ipfs
    spec:
      containers:
      - name: ipfs
        image: ipfs/kubo:latest
        ports:
        - containerPort: 4001
        - containerPort: 5001
        - containerPort: 8080
        volumeMounts:
        - name: ipfs-data
          mountPath: /data/ipfs
        env:
        - name: IPFS_PROFILE
          value: "server"
```text

### Bare Metal Deployment
```bash
# Download and install IPFS
wget https://dist.ipfs.io/kubo/v0.20.0/kubo_v0.20.0_linux-amd64.tar.gz
tar -xzf kubo_v0.20.0_linux-amd64.tar.gz
sudo mv kubo/ipfs /usr/local/bin/

# Initialize IPFS
ipfs init

# Configure IPFS
ipfs config Addresses.API /ip4/0.0.0.0/tcp/5001
ipfs config Addresses.Gateway /ip4/0.0.0.0/tcp/8080
ipfs config Addresses.Swarm /ip4/0.0.0.0/tcp/4001

# Start IPFS daemon
ipfs daemon
```text

## Configuration

### IPFS Configuration
```json
{
  "Addresses": {
    "API": "/ip4/0.0.0.0/tcp/5001",
    "Gateway": "/ip4/0.0.0.0/tcp/8080",
    "Swarm": [
      "/ip4/0.0.0.0/tcp/4001",
      "/ip6/::/tcp/4001"
    ]
  },
  "Bootstrap": [
    "/dnsaddr/bootstrap.libp2p.io/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN",
    "/dnsaddr/bootstrap.libp2p.io/p2p/QmQCU2EcMqAqQPR2i9bChDtGNJchTbq5TbXJJ16u19uLTa",
    "/dnsaddr/bootstrap.libp2p.io/p2p/QmbLHAnMoJPWSCR5Zhtx6BHJX9KiKNN6tpvbUcqanj75Nb"
  ],
  "Datastore": {
    "StorageMax": "10GB",
    "StorageGCWatermark": 90,
    "GCPeriod": "1h"
  },
  "Discovery": {
    "MDNS": {
      "Enabled": true,
      "Interval": 10
    }
  },
  "Swarm": {
    "ConnMgr": {
      "LowWater": 200,
      "HighWater": 500,
      "GracePeriod": "20s"
    }
  }
}
```text

### Environment Variables
```bash
# IPFS Configuration
IPFS_PATH=/data/ipfs
IPFS_PROFILE=server
IPFS_SWARM_ADDRS=/ip4/0.0.0.0/tcp/4001
IPFS_API_ADDRS=/ip4/0.0.0.0/tcp/5001
IPFS_GATEWAY_ADDRS=/ip4/0.0.0.0/tcp/8080

# Storage Configuration
IPFS_STORAGE_MAX=10GB
IPFS_STORAGE_GC_WATERMARK=90
IPFS_GC_PERIOD=1h

# Network Configuration
IPFS_BOOTSTRAP_NODES=/dnsaddr/bootstrap.libp2p.io/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN
IPFS_MDNS_ENABLED=true
IPFS_MDNS_INTERVAL=10
```text

## Content Management

### Adding Content
```bash
# Add a file
ipfs add file.txt

# Add a directory
ipfs add -r directory/

# Add with specific options
ipfs add --pin=false --progress file.txt
```text

### Pinning Content
```bash
# Pin content locally
ipfs pin add <cid>

# Pin with specific options
ipfs pin add --recursive <cid>

# List pinned content
ipfs pin ls

# Remove pin
ipfs pin rm <cid>
```text

### Remote Pinning
```bash
# Add remote pinning service
ipfs pin remote service add myservice https://pin.example.com/api/v0/pins

# Pin to remote service
ipfs pin remote add --service=myservice <cid>

# List remote pins
ipfs pin remote ls --service=myservice
```text

## API Integration

### REST API
The IPFS API provides REST endpoints:

#### Add Content
```bash
curl -X POST -F file=@file.txt http://localhost:5001/api/v0/add
```text

#### Get Content
```bash
curl http://localhost:5001/api/v0/cat?arg=<cid>
```text

#### Pin Content
```bash
curl -X POST http://localhost:5001/api/v0/pin/add?arg=<cid>
```text

#### List Pins
```bash
curl http://localhost:5001/api/v0/pin/ls
```text

### JavaScript API
```javascript
import { create as createIpfsClient } from 'ipfs-http-client';

const ipfs = createIpfsClient('http://localhost:5001');

// Add content
const result = await ipfs.add('Hello World');
console.log('CID:', result.cid.toString());

// Get content
const chunks = [];
for await (const chunk of ipfs.cat(result.cid)) {
  chunks.push(chunk);
}
const content = Buffer.concat(chunks).toString();
console.log('Content:', content);

// Pin content
await ipfs.pin.add(result.cid);
```text

## Gateway Configuration

### HTTP Gateway
The IPFS gateway provides HTTP access to content:

```bash
# Access content via gateway
curl http://localhost:8080/ipfs/<cid>

# Access with custom headers
curl -H "Accept: application/json" http://localhost:8080/ipfs/<cid>
```text

### Gateway Configuration
```json
{
  "Gateway": {
    "HTTPHeaders": {
      "Access-Control-Allow-Origin": ["*"],
      "Access-Control-Allow-Methods": ["GET", "POST", "PUT", "DELETE"],
      "Access-Control-Allow-Headers": ["X-Requested-With", "Content-Type"]
    },
    "RootRedirect": "",
    "Writable": false,
    "PathPrefixes": ["/ipfs", "/ipns"]
  }
}
```text

## Monitoring and Maintenance

### Health Checks
```bash
# Check IPFS version
ipfs version

# Check node info
ipfs id

# Check connected peers
ipfs swarm peers

# Check repository stats
ipfs repo stat
```text

### Garbage Collection
```bash
# Run garbage collection
ipfs repo gc

# Garbage collection with verbose output
ipfs repo gc --verbose

# Check garbage collection status
ipfs repo stat
```text

### Performance Monitoring
```bash
# Monitor bandwidth usage
ipfs stats bw

# Monitor repository size
ipfs repo stat

# Monitor connected peers
ipfs swarm peers
```text

## Security Considerations

### Access Control
- **API Access**: Restrict API access to trusted sources
- **Gateway Access**: Configure gateway access controls
- **Swarm Access**: Control swarm connectivity
- **Content Filtering**: Implement content filtering

### Network Security
- **Firewall Rules**: Implement proper firewall rules
- **TLS Encryption**: Enable TLS for API and gateway
- **Authentication**: Implement authentication for sensitive operations
- **Rate Limiting**: Implement rate limiting

### Content Security
- **Content Validation**: Validate content before adding
- **Malware Scanning**: Scan content for malware
- **Content Policies**: Implement content policies
- **Audit Logging**: Log all content operations

## Integration with Mycelia

### NFT Envelopes
IPFS integration with NFT envelopes:

```typescript
import { NftEnvelope } from '@mycelia/nft-envelope';

const envelope = new NftEnvelope(ownerDid);

// Create envelope with IPFS storage
const privateEnvelope = await envelope.createPrivateEnvelope(files, meta);

// Publish envelope to IPFS
const result = await envelope.publish(privateEnvelope);
```text

### Public Directory
IPFS integration with public directory:

```typescript
import { PublicDirectory } from '@mycelia/public-directory';

const directory = new PublicDirectory();

// Index envelope from IPFS
await directory.indexEnvelope(envelopeCid, envelopeMeta, ownerDid);
```text

### Content Publishing
IPFS content publishing script:

```javascript
// scripts/ipfs-publish.js
import { create as createIpfsClient } from 'ipfs-http-client';

const ipfs = createIpfsClient('http://localhost:5001');

async function publishToIPFS() {
  // Collect files to publish
  const filesToPublish = [
    { path: 'docs/build', name: 'documentation' },
    { path: 'packages/navigator/public', name: 'static-assets' }
  ];
  
  const publishedCids = {};
  
  // Publish each component
  for (const file of filesToPublish) {
    const files = readDirectoryRecursive(file.path);
    const result = await ipfs.add(files, {
      wrapWithDirectory: true,
      pin: true
    });
    
    publishedCids[file.name] = result.cid.toString();
  }
  
  // Create and publish manifest
  const manifest = {
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    cids: publishedCids
  };
  
  const manifestResult = await ipfs.add(JSON.stringify(manifest), {
    pin: true
  });
  
  console.log('Manifest CID:', manifestResult.cid.toString());
}
```text

## Troubleshooting

### Common Issues

**IPFS Not Starting**
- Check IPFS configuration
- Verify port availability
- Check disk space
- Review error logs

**Content Not Accessible**
- Check content pinning status
- Verify gateway configuration
- Check network connectivity
- Review content availability

**Performance Issues**
- Check disk I/O performance
- Monitor memory usage
- Review network bandwidth
- Check garbage collection status

### Debug Commands
```bash
# Check IPFS logs
ipfs log tail

# Check configuration
ipfs config show

# Check repository status
ipfs repo stat

# Check swarm status
ipfs swarm peers
```text

## Best Practices

### Content Management
- **Regular Pinning**: Pin important content regularly
- **Content Validation**: Validate content before adding
- **Storage Management**: Monitor storage usage
- **Garbage Collection**: Regular garbage collection

### Performance
- **Resource Monitoring**: Monitor resource usage
- **Network Optimization**: Optimize network configuration
- **Storage Optimization**: Optimize storage configuration
- **Caching**: Implement appropriate caching

### Security
- **Access Control**: Implement proper access control
- **Content Filtering**: Filter inappropriate content
- **Audit Logging**: Log all operations
- **Regular Updates**: Keep IPFS updated

## Future Enhancements

### Advanced Features
- **IPFS Cluster**: Distributed IPFS clustering
- **Advanced Pinning**: Advanced pinning strategies
- **Content Routing**: Enhanced content routing
- **Performance Optimization**: Performance optimizations

### Integration
- **Blockchain Integration**: Blockchain-based content verification
- **CDN Integration**: Content delivery network integration
- **Advanced Monitoring**: Enhanced monitoring and analytics
- **Automated Management**: Automated content management
