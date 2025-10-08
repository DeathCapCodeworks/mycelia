# Project Mycelia Deployment Guide

This guide covers deploying Project Mycelia using Docker Compose, including all services and dependencies.

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- Node.js 20.x (for local development)
- pnpm (package manager)

## Quick Start

### 1. Bootstrap Environment

```bash
# Enable corepack and pnpm
pnpm run setup:pm

# Verify environment
pnpm run setup:env
```

### 2. Build and Deploy

```bash
# Build all services
docker compose -f deploy/docker-compose.yml build

# Start all services
docker compose -f deploy/docker-compose.yml up -d

# Check service health
docker compose -f deploy/docker-compose.yml ps
```

### 3. Verify Deployment

```bash
# Check service logs
docker compose -f deploy/docker-compose.yml logs -f

# Test endpoints
curl http://localhost:3000/status.json  # Navigator
curl http://localhost:3001/health       # Directory
curl http://localhost:3002/health       # Radio SFU
curl http://localhost:8080/ipfs/Qm...   # IPFS Gateway
curl http://localhost:3005/             # Docs
```

## Service Architecture

### Core Services

| Service | Port | Description | Health Check |
|---------|------|-------------|--------------|
| **navigator** | 3000 | Main UI application | `/status.json` |
| **directory** | 3001 | Public directory indexer | `/health` |
| **radio-sfu** | 3002/3003 | WebRTC SFU server | `/health` |
| **ipfs** | 4001/5001/8080 | IPFS node (Kubo) | `ipfs version` |
| **docs** | 3005 | Documentation site | `/` |
| **nginx** | 80/443 | Reverse proxy | `/` |

### Service Dependencies

```
nginx
├── navigator
│   ├── directory
│   │   └── ipfs
│   └── radio-sfu
└── docs
```

## Configuration

### Environment Variables

Each service can be configured via environment variables:

#### Navigator
```bash
NODE_ENV=production
PORT=3000
PUBLIC_DIRECTORY_URL=http://directory:3001
RADIO_SFU_URL=http://radio-sfu:3002
IPFS_URL=http://ipfs:5001
```

#### Directory
```bash
NODE_ENV=production
PORT=3001
PUBLIC_DIRECTORY_ENABLED=true
IPFS_URL=http://ipfs:5001
```

#### Radio SFU
```bash
NODE_ENV=production
EXPRESS_PORT=3002
WS_PORT=3003
RADIO_V0_ENABLED=true
```

### Feature Flags

Services respect feature flags for gradual rollouts:

```bash
# Enable specific features
PUBLIC_DIRECTORY_ENABLED=true
RADIO_V0_ENABLED=true
```

## IPFS Integration

### Gateway Access

The IPFS gateway is available at `http://localhost:8080`:

```bash
# Access published content
curl http://localhost:8080/ipfs/QmYourContentHash

# Upload content
curl -X POST -F file=@yourfile.txt http://localhost:5001/api/v0/add
```

### Publishing Content

Use the IPFS publish script:

```bash
# Publish demo content
pnpm run demo:publish:ipfs

# Check published content
curl http://localhost:8080/ipfs/QmYourPublishedHash
```

## Monitoring and Health Checks

### Service Health

All services include health checks with appropriate timeouts:

```bash
# Check individual service health
docker compose -f deploy/docker-compose.yml ps

# View health check logs
docker compose -f deploy/docker-compose.yml logs navigator | grep health
```

### Status Endpoints

- **Navigator**: `http://localhost:3000/status.json`
- **Directory**: `http://localhost:3001/health`
- **Radio SFU**: `http://localhost:3002/health`
- **IPFS**: `http://localhost:5001/api/v0/version`

### Logs

```bash
# View all logs
docker compose -f deploy/docker-compose.yml logs -f

# View specific service logs
docker compose -f deploy/docker-compose.yml logs -f navigator

# View logs with timestamps
docker compose -f deploy/docker-compose.yml logs -f -t
```

## SSL/TLS Configuration

### SSL Certificates

Place SSL certificates in `deploy/ssl/`:

```bash
deploy/ssl/
├── cert.pem
├── key.pem
└── chain.pem
```

### Nginx Configuration

The nginx configuration is in `deploy/nginx.conf`:

```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;
    
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    
    location / {
        proxy_pass http://navigator:3000;
    }
}
```

## Scaling and Performance

### Resource Limits

Add resource limits to services:

```yaml
services:
  navigator:
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
        reservations:
          memory: 256M
          cpus: '0.25'
```

### Horizontal Scaling

Scale services as needed:

```bash
# Scale navigator instances
docker compose -f deploy/docker-compose.yml up -d --scale navigator=3

# Scale radio SFU instances
docker compose -f deploy/docker-compose.yml up -d --scale radio-sfu=2
```

## Backup and Recovery

### IPFS Data

```bash
# Backup IPFS data
docker run --rm -v mycelia_ipfs_data:/data -v $(pwd):/backup alpine tar czf /backup/ipfs-backup.tar.gz -C /data .

# Restore IPFS data
docker run --rm -v mycelia_ipfs_data:/data -v $(pwd):/backup alpine tar xzf /backup/ipfs-backup.tar.gz -C /data
```

### Configuration Backup

```bash
# Backup configuration
tar czf mycelia-config-backup.tar.gz deploy/ docker-compose.yml

# Restore configuration
tar xzf mycelia-config-backup.tar.gz
```

## Troubleshooting

### Common Issues

**Service won't start**
```bash
# Check service logs
docker compose -f deploy/docker-compose.yml logs service-name

# Check service status
docker compose -f deploy/docker-compose.yml ps
```

**Health check failures**
```bash
# Check health check logs
docker compose -f deploy/docker-compose.yml logs service-name | grep health

# Test health endpoint manually
curl -f http://localhost:port/health
```

**IPFS connection issues**
```bash
# Check IPFS status
docker compose -f deploy/docker-compose.yml exec ipfs ipfs version

# Check IPFS API
curl http://localhost:5001/api/v0/version
```

### Debug Mode

Enable debug logging:

```bash
# Set debug environment
export DEBUG=mycelia:*

# Restart services
docker compose -f deploy/docker-compose.yml restart
```

### Service Recovery

```bash
# Restart failed service
docker compose -f deploy/docker-compose.yml restart service-name

# Recreate service
docker compose -f deploy/docker-compose.yml up -d --force-recreate service-name

# Rebuild and restart
docker compose -f deploy/docker-compose.yml up -d --build service-name
```

## Development

### Local Development

For local development, use the development scripts:

```bash
# Start development environment
pnpm run dev

# Start specific services
pnpm run dev:docs
pnpm run dev:sandbox
```

### Hot Reloading

Services support hot reloading in development:

```bash
# Watch for changes
pnpm run dev:watch

# Rebuild on changes
pnpm run dev:build
```

## Production Deployment

### Production Checklist

- [ ] SSL certificates configured
- [ ] Environment variables set
- [ ] Resource limits configured
- [ ] Health checks passing
- [ ] Monitoring configured
- [ ] Backup strategy implemented
- [ ] Security hardening applied

### Security Considerations

- Use non-root users in containers
- Limit container capabilities
- Implement network segmentation
- Regular security updates
- Monitor for vulnerabilities

### Performance Optimization

- Enable container resource limits
- Use multi-stage builds
- Optimize image sizes
- Implement caching strategies
- Monitor resource usage

## Support

For deployment issues:

1. Check service logs: `docker compose logs -f`
2. Verify health checks: `docker compose ps`
3. Test endpoints manually
4. Check resource usage: `docker stats`
5. Review configuration files

For additional help, see the troubleshooting section or contact the development team.
