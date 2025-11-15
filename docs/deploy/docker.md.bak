# Docker Deployment

Mycelia supports containerized deployment using Docker Compose for local development and production environments. The deployment includes all core services with health checks, monitoring, and observability.

## Overview

The Docker deployment provides:

- **Multi-Service Architecture**: All Mycelia services in containers
- **Service Discovery**: Automatic service discovery and networking
- **Health Checks**: Built-in health monitoring
- **Volume Management**: Persistent data storage
- **Environment Configuration**: Flexible environment configuration

## Architecture

### Services

#### Navigator
Main UI and API gateway:
- **Port**: 3000
- **Dependencies**: All other services
- **Health Check**: `/status.json` endpoint
- **Restart Policy**: `unless-stopped`

#### Public Directory
NFT envelope indexing service:
- **Port**: 3001
- **Dependencies**: IPFS
- **Health Check**: `/health` endpoint
- **Restart Policy**: `unless-stopped`

#### Radio SFU
WebRTC streaming service:
- **Ports**: 3002 (HTTP), 3003 (WebSocket)
- **Dependencies**: None
- **Health Check**: `/health` endpoint
- **Restart Policy**: `unless-stopped`

#### IPFS Node
Decentralized storage:
- **Ports**: 4001 (Swarm), 5001 (API), 8080 (Gateway)
- **Volumes**: `ipfs_data`, `ipfs_staging`
- **Health Check**: `ipfs version` command
- **Restart Policy**: `unless-stopped`

#### Attestation Indexer
Attestation processing service:
- **Port**: 3004
- **Dependencies**: IPFS
- **Health Check**: `/health` endpoint
- **Restart Policy**: `unless-stopped`

#### Nginx (Optional)
Reverse proxy and load balancer:
- **Ports**: 80 (HTTP), 443 (HTTPS)
- **Dependencies**: All services
- **Configuration**: `deploy/nginx.conf`
- **Restart Policy**: `unless-stopped`

## Docker Compose Configuration

### Main Configuration
```yaml
version: '3.8'

services:
  # IPFS Node (Kubo)
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
    healthcheck:
      test: ["CMD", "ipfs", "version"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Public Directory Indexer
  public-directory:
    build:
      context: .
      dockerfile: packages/public-directory/Dockerfile
    container_name: mycelia-public-directory
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - PORT=3001
      - PUBLIC_DIRECTORY_ENABLED=true
    depends_on:
      - ipfs
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    restart: unless-stopped

  # Radio SFU Server
  radio-sfu:
    build:
      context: .
      dockerfile: packages/radio-sfu/Dockerfile
    container_name: mycelia-radio-sfu
    ports:
      - "3002:3002"   # Express API
      - "3003:3003"   # WebSocket
    environment:
      - NODE_ENV=production
      - EXPRESS_PORT=3002
      - WS_PORT=3003
      - RADIO_V0_ENABLED=true
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3002/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    restart: unless-stopped

  # Navigator (Main UI)
  navigator:
    build:
      context: .
      dockerfile: packages/navigator/Dockerfile
    container_name: mycelia-navigator
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - PUBLIC_DIRECTORY_URL=http://public-directory:3001
      - RADIO_SFU_URL=http://radio-sfu:3002
      - IPFS_URL=http://ipfs:5001
    depends_on:
      - public-directory
      - radio-sfu
      - ipfs
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/status.json"]
      interval: 30s
      timeout: 10s
      retries: 3
    restart: unless-stopped

volumes:
  ipfs_data:
    driver: local
  ipfs_staging:
    driver: local

networks:
  default:
    name: mycelia-network
    driver: bridge
```

## Deployment Commands

### Local Development
```bash
# Start all services
pnpm run deploy:compose

# Or using Docker Compose directly
docker compose -f deploy/docker-compose.yml up --build

# Start in background
docker compose -f deploy/docker-compose.yml up -d --build

# View logs
docker compose -f deploy/docker-compose.yml logs -f

# Stop services
docker compose -f deploy/docker-compose.yml down
```

### Production Deployment
```bash
# Production deployment with environment variables
NODE_ENV=production docker compose -f deploy/docker-compose.yml up -d --build

# Scale services
docker compose -f deploy/docker-compose.yml up -d --scale navigator=3

# Update services
docker compose -f deploy/docker-compose.yml pull
docker compose -f deploy/docker-compose.yml up -d --build
```

## Environment Configuration

### Environment Variables
Each service can be configured using environment variables:

#### Navigator
```bash
NODE_ENV=production
PORT=3000
PUBLIC_DIRECTORY_URL=http://public-directory:3001
RADIO_SFU_URL=http://radio-sfu:3002
IPFS_URL=http://ipfs:5001
```

#### Public Directory
```bash
NODE_ENV=production
PORT=3001
PUBLIC_DIRECTORY_ENABLED=true
DATABASE_URL=postgresql://user:pass@db:5432/public_directory
```

#### Radio SFU
```bash
NODE_ENV=production
EXPRESS_PORT=3002
WS_PORT=3003
RADIO_V0_ENABLED=true
MEDIASOUP_WORKERS=4
```

#### IPFS
```bash
IPFS_PROFILE=server
IPFS_PATH=/data/ipfs
IPFS_SWARM_ADDRS=/ip4/0.0.0.0/tcp/4001
IPFS_API_ADDRS=/ip4/0.0.0.0/tcp/5001
IPFS_GATEWAY_ADDRS=/ip4/0.0.0.0/tcp/8080
```

### Environment Files
Create `.env` files for different environments:

#### `.env.development`
```bash
NODE_ENV=development
LOG_LEVEL=debug
ENABLE_DEBUG=true
```

#### `.env.production`
```bash
NODE_ENV=production
LOG_LEVEL=info
ENABLE_DEBUG=false
```

## Health Checks

### Service Health Monitoring
Each service includes health check endpoints:

#### Navigator
```bash
curl http://localhost:3000/status.json
```

#### Public Directory
```bash
curl http://localhost:3001/health
```

#### Radio SFU
```bash
curl http://localhost:3002/health
```

#### IPFS
```bash
curl http://localhost:5001/api/v0/version
```

### Health Check Configuration
```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:3000/status.json"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

## Volume Management

### Persistent Volumes
```yaml
volumes:
  ipfs_data:
    driver: local
  ipfs_staging:
    driver: local
  navigator_data:
    driver: local
  public_directory_data:
    driver: local
```

### Volume Mounts
```yaml
volumes:
  - ipfs_data:/data
  - ipfs_staging:/export
  - ./config:/app/config
  - ./logs:/app/logs
```

## Networking

### Service Discovery
Services can communicate using service names:

```yaml
environment:
  - PUBLIC_DIRECTORY_URL=http://public-directory:3001
  - RADIO_SFU_URL=http://radio-sfu:3002
  - IPFS_URL=http://ipfs:5001
```

### Custom Networks
```yaml
networks:
  mycelia-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
```

## Monitoring and Logging

### Log Management
```yaml
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
```

### Log Aggregation
```yaml
services:
  fluentd:
    image: fluent/fluentd:latest
    volumes:
      - ./fluentd.conf:/fluentd/etc/fluent.conf
    ports:
      - "24224:24224"
```

### Metrics Collection
```yaml
services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
```

## Security Considerations

### Container Security
- **Non-root Users**: Run containers as non-root users
- **Read-only Filesystems**: Use read-only filesystems where possible
- **Resource Limits**: Set CPU and memory limits
- **Security Scanning**: Regular security scanning

### Network Security
- **Internal Networks**: Use internal networks for service communication
- **TLS Encryption**: Enable TLS for external communication
- **Firewall Rules**: Implement proper firewall rules
- **Access Control**: Implement proper access control

### Secrets Management
```yaml
secrets:
  db_password:
    external: true
  api_key:
    external: true

services:
  navigator:
    secrets:
      - db_password
      - api_key
```

## Scaling

### Horizontal Scaling
```bash
# Scale Navigator service
docker compose -f deploy/docker-compose.yml up -d --scale navigator=3

# Scale Public Directory service
docker compose -f deploy/docker-compose.yml up -d --scale public-directory=2
```

### Load Balancing
```yaml
services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - navigator
```

## Troubleshooting

### Common Issues

**Service Not Starting**
- Check Docker logs: `docker logs <container-name>`
- Verify environment variables
- Check port conflicts
- Verify dependencies

**Health Check Failures**
- Check service endpoints
- Verify network connectivity
- Check service configuration
- Review error logs

**Volume Issues**
- Check volume permissions
- Verify volume mounts
- Check disk space
- Review volume configuration

### Debug Commands
```bash
# Check service status
docker compose -f deploy/docker-compose.yml ps

# View service logs
docker compose -f deploy/docker-compose.yml logs <service-name>

# Execute commands in container
docker compose -f deploy/docker-compose.yml exec <service-name> sh

# Check resource usage
docker stats
```

## Best Practices

### Development
- **Use .env files**: Use environment files for configuration
- **Local volumes**: Use local volumes for development data
- **Hot reloading**: Enable hot reloading for development
- **Debug logging**: Enable debug logging for development

### Production
- **Resource limits**: Set appropriate resource limits
- **Health checks**: Implement comprehensive health checks
- **Monitoring**: Set up monitoring and alerting
- **Backup**: Implement regular backups

### Security
- **Regular updates**: Keep images and dependencies updated
- **Security scanning**: Regular security scanning
- **Access control**: Implement proper access control
- **Audit logging**: Enable audit logging

## Future Enhancements

### Advanced Features
- **Kubernetes Support**: Kubernetes deployment manifests
- **Service Mesh**: Istio or Linkerd integration
- **Advanced Monitoring**: Prometheus and Grafana integration
- **CI/CD Integration**: Automated deployment pipelines

### Scalability
- **Auto-scaling**: Automatic scaling based on load
- **Load Balancing**: Advanced load balancing
- **Caching**: Redis or Memcached integration
- **CDN Integration**: Content delivery network integration
