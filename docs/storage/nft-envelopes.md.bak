# NFT Envelopes

NFT Envelopes are a privacy-first system for packaging digital assets with metadata, encryption, and indexing controls. They provide a foundation for creating, managing, and sharing digital content while maintaining user privacy and control.

## Overview

An NFT Envelope is a structured container that holds:
- **Metadata**: Title, description, media types, license information, and regional restrictions
- **Content**: Actual digital files (images, videos, audio, documents)
- **Encryption**: Optional client-side encryption for private content
- **Indexing Controls**: Flags that determine whether content can be listed in public directories

## Key Features

### Privacy-First Design
- **Client-side encryption**: Private envelopes are encrypted using AES-GCM before being stored on IPFS
- **Key management**: Encryption keys are stored in the user's vault and wrapped for specific recipients
- **Indexing control**: Users can choose whether their content is indexable by public directories

### Honest UX
- **Clear licensing**: Explicit license types (Original, Creative Commons, Licensed)
- **Regional restrictions**: Content can be restricted to specific geographic regions
- **Transparent metadata**: All envelope metadata is visible and verifiable

### IPFS Integration
- **Decentralized storage**: Content is stored on IPFS for censorship resistance
- **Pinning support**: Automatic pinning ensures content availability
- **Retry logic**: Robust error handling and retry mechanisms for network issues

## Architecture

### Core Components

#### EnvelopeMeta
```typescript
interface EnvelopeMeta {
  title: string;
  description: string;
  mediaTypes: string[]; // e.g., ['image/jpeg', 'video/mp4']
  license: 'Original' | 'CC' | 'Licensed';
  regions?: string[]; // e.g., ['US', 'EU']
  versionCid?: string | null; // CID of previous version, if any
  indexable: boolean; // Can be listed in public directory
}
```

#### Envelope
```typescript
interface Envelope {
  meta: EnvelopeMeta;
  cids: string[]; // CIDs of the actual content files
  encrypted: boolean;
  keyWraps?: KeyWrap[]; // Only present if encrypted
  envelopeCid?: string; // CID of the envelope itself
}
```

#### IndexingPermit
```typescript
interface IndexingPermit {
  envelopeCid: string;
  indexable: boolean;
  signature: string; // Signed by the owner's DID
}
```

### Encryption Model

Private envelopes use a two-layer encryption approach:

1. **Content Encryption**: Files are encrypted using AES-GCM with a randomly generated key
2. **Key Wrapping**: The content encryption key is wrapped for specific recipients using their DIDs

This ensures that:
- Content is encrypted before being stored on IPFS
- Only authorized recipients can decrypt the content
- The encryption key is never stored in plaintext

### Key Management

Encryption keys are managed through the user's vault system:

- **Key Generation**: Random AES keys are generated for each envelope
- **Key Wrapping**: Keys are encrypted for specific recipient DIDs
- **Key Storage**: Wrapped keys are stored in the user's vault
- **Key Rotation**: Keys can be rotated for enhanced security

## Usage

### Creating a Private Envelope

```typescript
import { NftEnvelope } from '@mycelia/nft-envelope';

const envelope = new NftEnvelope(ownerDid);

const files = [file1, file2, file3]; // Array of files
const meta = {
  title: 'My Digital Art',
  description: 'A collection of generative art pieces',
  mediaTypes: ['image/png', 'image/jpeg'],
  license: 'Original' as const,
  regions: ['US', 'EU']
};

const privateEnvelope = await envelope.createPrivateEnvelope(files, meta);
```

### Creating a Public Envelope

```typescript
const publicEnvelope = await envelope.createPublicEnvelope(files, meta);
```

### Publishing an Envelope

```typescript
const result = await envelope.publish(privateEnvelope);
// Returns: { contentCids: string[], indexingPermit?: IndexingPermit }
```

### Making an Envelope Private

```typescript
const disclaimer = await envelope.makePrivate(envelopeCid);
// Returns a disclaimer about persistence of copies
```

## Public Directory Integration

When an envelope is marked as `indexable: true`, it can be listed in the public directory:

1. **Indexing Permit**: A signed permit is generated allowing the directory to index the content
2. **Metadata Storage**: The directory stores searchable metadata about the envelope
3. **Content Discovery**: Users can browse and discover public content
4. **Privacy Respect**: Private envelopes are never indexed, even if their CIDs are known

## Security Considerations

### Encryption Truthfulness
- All encryption is performed client-side before content reaches IPFS
- Encryption keys are never transmitted in plaintext
- The system cannot decrypt content without the user's keys

### Indexing Truthfulness
- The `indexable` flag is cryptographically signed
- Public directories cannot index content without a valid permit
- Users can revoke indexing permissions at any time

### Content Persistence
- IPFS content may persist even after deletion requests
- Users are warned about the persistence of copies
- Third-party mirrors may continue to serve content

## Best Practices

### Content Creation
- Use descriptive titles and descriptions
- Choose appropriate license types
- Consider regional restrictions for compliance
- Test encryption/decryption before publishing

### Privacy Management
- Use private envelopes for sensitive content
- Regularly rotate encryption keys
- Monitor indexing permissions
- Understand the implications of making content public

### Performance Optimization
- Compress files before creating envelopes
- Use appropriate media types for content
- Consider file size limits for IPFS storage
- Monitor pinning status for important content

## Troubleshooting

### Common Issues

**Encryption Failures**
- Ensure the user has a valid DID
- Check that the vault is accessible
- Verify file formats are supported

**Publishing Errors**
- Check IPFS connectivity
- Verify pinning service availability
- Ensure sufficient storage space

**Indexing Problems**
- Verify the envelope is marked as indexable
- Check signature validity
- Ensure the public directory service is running

### Debug Mode

Enable debug logging to troubleshoot issues:

```typescript
import { observability } from '@mycelia/observability';

// Enable debug logging
observability.setLogLevel('debug');
```

## Future Enhancements

- **Versioning**: Support for envelope versioning and updates
- **Collaborative Editing**: Multi-user envelope creation and management
- **Advanced Encryption**: Support for additional encryption algorithms
- **Content Verification**: Cryptographic verification of content integrity
- **Cross-Chain Integration**: Integration with blockchain networks for provenance
