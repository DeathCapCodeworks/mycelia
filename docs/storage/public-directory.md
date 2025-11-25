---
title: Public Directory
---

# Public Directory

The Public Directory is a searchable index of NFT envelopes that have been explicitly marked as indexable by their creators. It provides a way to discover and browse public content while respecting privacy controls and implementing moderation policies.

## Overview

The Public Directory serves as a discovery layer for public NFT envelopes, offering:

- **Searchable Index**: Full-text search across envelope metadata
- **Filtering**: By license type, region, media type, and other criteria
- **Moderation**: DMCA intake, report flags, and signed moderation actions
- **Privacy Respect**: Only indexable content is listed, private envelopes remain hidden

## Architecture

### Core Components

#### Indexer Service
The indexer service runs as a Node.js Express application that:
- Validates indexing permits and signatures
- Stores searchable envelope metadata
- Provides REST API endpoints for browsing
- Implements moderation policies

#### CLI Tool
A command-line interface for:
- Adding/removing envelopes from the index
- Listing envelopes with filters
- Performing moderation actions
- Managing the directory

#### Docker Container
Containerized deployment with:
- Health checks and monitoring
- Environment configuration
- Integration with IPFS and other services

### Data Model

#### IndexedEnvelope
```typescript
interface IndexedEnvelope {
  envelopeCid: string;
  meta: EnvelopeMeta;
  ownerDid: string;
  indexedAt: number;
  moderationFlags: string[]; // e.g., 'DMCA', 'NSFW', 'Reported'
  isModerated: boolean;
}
```text

## API Endpoints

### Indexing

#### POST /index
Add an envelope to the public directory index.

**Request Body:**
```json
{
  "permit": {
    "envelopeCid": "bafybeih...",
    "indexable": true,
    "signature": "mock-signature-for-..."
  },
  "envelopeMeta": {
    "title": "My Content",
    "description": "Description here",
    "mediaTypes": ["image/jpeg"],
    "license": "Original",
    "regions": ["US"],
    "indexable": true
  },
  "ownerDid": "did:mycelia:user123"
}
```text

**Response:** `200 OK` or error with details

#### POST /deindex
Remove an envelope from the index.

**Request Body:**
```json
{
  "envelopeCid": "bafybeih...",
  "ownerDid": "did:mycelia:user123",
  "signature": "mock-deindex-signature-for-..."
}
```text

### Browsing

#### GET /list
List envelopes with optional filters.

**Query Parameters:**
- `category`: Filter by category
- `region`: Filter by region (e.g., "US", "EU")
- `query`: Search query for title/description
- `limit`: Number of results (default: 10)
- `offset`: Pagination offset (default: 0)

**Response:**
```json
{
  "total": 150,
  "limit": 10,
  "offset": 0,
  "envelopes": [
    {
      "envelopeCid": "bafybeih...",
      "meta": { ... },
      "ownerDid": "did:mycelia:user123",
      "indexedAt": 1640995200000
    }
  ]
}
```text

### Moderation

#### POST /dmca
Submit a DMCA takedown request.

**Request Body:**
```json
{
  "envelopeCid": "bafybeih...",
  "claimantInfo": {
    "name": "John Doe",
    "email": "john@example.com",
    "address": "123 Main St"
  },
  "copyrightedWorkDetails": {
    "title": "Original Work",
    "description": "Description of copyrighted work"
  }
}
```text

#### POST /moderate
Perform moderation actions (admin-only).

**Request Body:**
```json
{
  "envelopeCid": "bafybeih...",
  "action": "flag|unflag|hide|show",
  "moderatorDid": "did:mycelia:moderator123",
  "signature": "mock-moderator-signature-for-..."
}
```text

## Moderation Policies

### DMCA Compliance

The Public Directory implements a DMCA-compliant takedown process:

1. **Intake**: DMCA requests are received through the `/dmca` endpoint
2. **Flagging**: Envelopes are immediately flagged and hidden from public view
3. **Processing**: Requests are reviewed by moderators
4. **Action**: Appropriate action is taken based on the validity of the claim

### Report System

Users can report content for various reasons:
- **NSFW**: Inappropriate or adult content
- **Spam**: Low-quality or promotional content
- **Copyright**: Suspected copyright infringement
- **Other**: Other policy violations

### Moderation Actions

Moderators can take the following actions:
- **Flag**: Mark content for review
- **Unflag**: Remove flags from content
- **Hide**: Hide content from public view
- **Show**: Restore hidden content

All moderation actions are cryptographically signed and logged for audit purposes.

## Regional Filtering

The Public Directory respects regional restrictions:

### Region Codes
- **US**: United States
- **EU**: European Union
- **APAC**: Asia-Pacific
- **Global**: No regional restrictions

### Filtering Logic
- Content with regional restrictions is only shown to users in those regions
- Global content is shown to all users
- Users can filter by region to see only relevant content

## Privacy and Security

### Indexing Truthfulness
- Only envelopes with valid indexing permits are indexed
- The `indexable` flag is cryptographically verified
- Private envelopes are never indexed, even if their CIDs are known

### Data Minimization
- Only necessary metadata is stored in the index
- Content files remain on IPFS, not in the directory
- User DIDs are stored but not exposed in public listings

### Access Controls
- Moderation endpoints require valid moderator signatures
- DMCA intake is open but logged
- Admin actions are cryptographically signed

## CLI Usage

### Installation
```bash
pnpm install @mycelia/public-directory
```text

### Basic Commands

#### Add an Envelope
```bash
public-directory add \
  --envelopeCid bafybeih123456789 \
  --ownerDid did:mycelia:user123 \
  --title "My Content" \
  --description "Description here" \
  --mediaTypes "image/jpeg,video/mp4" \
  --license "Original" \
  --regions "US,EU"
```text

#### Remove an Envelope
```bash
public-directory remove \
  --envelopeCid bafybeih123456789 \
  --ownerDid did:mycelia:user123
```text

#### List Envelopes
```bash
public-directory list \
  --query "digital art" \
  --region "US" \
  --limit 20
```text

#### Moderate Content
```bash
public-directory moderate \
  --envelopeCid bafybeih123456789 \
  --action "hide" \
  --moderatorDid did:mycelia:moderator123
```text

## Deployment

### Docker Compose
The Public Directory is included in the main Docker Compose configuration:

```yaml
services:
  public-directory:
    build:
      context: .
      dockerfile: packages/public-directory/Dockerfile
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - PORT=3001
    depends_on:
      - ipfs
```text

### Environment Variables
- `PORT`: Server port (default: 3001)
- `NODE_ENV`: Environment (development/production)
- `PUBLIC_DIRECTORY_ENABLED`: Feature flag

### Health Checks
The service includes health check endpoints:
- `GET /health`: Basic health status
- `GET /status`: Detailed service status

## Monitoring and Observability

### Metrics
- Indexing requests per minute
- Search queries and results
- Moderation actions
- DMCA requests
- Error rates and response times

### Logging
All operations are logged with structured data:
- Indexing events
- Search queries
- Moderation actions
- Error conditions

### Alerts
- High error rates
- DMCA request spikes
- Moderation action anomalies
- Service availability issues

## Best Practices

### Content Management
- Regularly review indexed content
- Monitor DMCA requests and reports
- Maintain moderation policies
- Update regional restrictions as needed

### Performance
- Use appropriate database indexes
- Implement caching for frequent queries
- Monitor query performance
- Scale horizontally as needed

### Security
- Regularly rotate moderator keys
- Monitor for suspicious activity
- Implement rate limiting
- Audit moderation actions

## Troubleshooting

### Common Issues

**Indexing Failures**
- Verify signature validity
- Check envelope metadata format
- Ensure IPFS connectivity

**Search Problems**
- Check database connectivity
- Verify query syntax
- Monitor performance metrics

**Moderation Issues**
- Verify moderator signatures
- Check action permissions
- Review audit logs

### Debug Mode
Enable debug logging for troubleshooting:

```bash
DEBUG=public-directory:* npm start
```text

## Future Enhancements

- **Advanced Search**: Full-text search with ranking
- **Recommendations**: Content recommendation engine
- **Analytics**: Usage analytics and insights
- **API Rate Limiting**: Advanced rate limiting and quotas
- **Multi-language Support**: Internationalization
- **Blockchain Integration**: On-chain moderation and governance
