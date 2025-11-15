# Databox v0

Databox v0 is an encrypted personal ledger that stores user interactions, consent logs, content keys, and preferences. It provides data portability, key-shred deletion, and truthful deletion capabilities while maintaining user privacy and control over their data.

## Overview

Databox v0 serves as a personal data vault that:

- **Encrypted Storage**: All sensitive data is encrypted using AES-256-GCM
- **Data Portability**: Users can export and import their data
- **Key-Shred Deletion**: Cryptographically destroy encryption keys
- **Truthful Deletion**: Honest model of what deletion means
- **Multiple Backends**: Local, remote pin, and trusted host storage options

## Architecture

### Core Components

#### Databox Class
The main class that manages the encrypted ledger:
```typescript
class Databox {
  addEntry(entry: DataboxEntry): Promise<void>
  export(): Promise<DataboxExport>
  import(data: DataboxExport): Promise<void>
  shredKeys(): Promise<void>
  tombstone(consentId: string): Promise<void>
}
```

#### Storage Backends
Multiple storage options for different use cases:
- **Local (Default)**: Browser-based storage
- **Remote Pin**: User-provided remote storage
- **Trusted Host**: Trusted third-party storage

#### Encryption System
AES-256-GCM encryption for all sensitive data:
- **Content Keys**: Separate keys for different content types
- **Key Wrapping**: Keys are wrapped for specific recipients
- **Key Rotation**: Regular key rotation for enhanced security
- **Key Shredding**: Cryptographic key destruction

### Data Model

#### DataboxEntry
```typescript
interface DataboxEntry {
  id: string;
  type: 'interaction' | 'consent' | 'content_key' | 'preference';
  timestamp: number;
  origin?: string; // For origin-scoped data
  data: string; // Encrypted or plain JSON string
  encrypted: boolean;
  contentKeyId?: string; // Link to a content key
}
```

#### DataboxContentKey
```typescript
interface DataboxContentKey {
  id: string;
  encryptedKey: string; // Encrypted AES key
  createdAt: number;
  rotatedAt?: number;
  isActive: boolean;
}
```

#### DataboxExport
```typescript
interface DataboxExport {
  version: string;
  exportedAt: string;
  entries: DataboxEntry[];
  contentKeys: DataboxContentKey[];
  metadata: {
    totalEntries: number;
    encryptedEntries: number;
    contentKeys: number;
  };
}
```

## Data Types

### Interaction Logs
Records of user interactions:
- **Page Visits**: Which pages users visit
- **Actions Taken**: What actions users perform
- **Time Spent**: How long users spend on activities
- **Context**: Additional context about interactions

### Consent Logs
Records of user consent decisions:
- **Consent Given**: When users give consent
- **Consent Withdrawn**: When users withdraw consent
- **Consent Scope**: What the consent covers
- **Consent Expiry**: When consent expires

### Content Keys
Encryption keys for content:
- **NFT Envelope Keys**: Keys for encrypted NFT envelopes
- **Private Content**: Keys for private content
- **Shared Content**: Keys for shared content
- **Key Metadata**: Information about keys

### Preferences
User preference settings:
- **Theme Settings**: UI theme preferences
- **Privacy Settings**: Privacy-related preferences
- **Feature Settings**: Feature-specific preferences
- **Accessibility**: Accessibility preferences

## Encryption and Security

### Encryption Model
The system uses a two-layer encryption approach:

1. **Content Encryption**: Sensitive data is encrypted using AES-256-GCM
2. **Key Management**: Encryption keys are managed separately and can be shredded

### Key Management
```typescript
// Generate a new content key
const contentKey = CryptoJS.lib.WordArray.random(256 / 8).toString();

// Encrypt data with the content key
const encryptedData = CryptoJS.AES.encrypt(data, contentKey).toString();

// Store the encrypted content key
const encryptedContentKey = CryptoJS.AES.encrypt(contentKey, masterKey).toString();
```

### Key Shredding
The key shredding process:

1. **Identify Keys**: Find all encryption keys for content
2. **Destroy Keys**: Cryptographically destroy the keys
3. **Update Records**: Mark keys as destroyed
4. **Notify Services**: Notify relevant services about key destruction
5. **Audit Log**: Log the key shredding action

## Storage Backends

### Local Storage (Default)
Browser-based storage using:
- **IndexedDB**: For large data storage
- **LocalStorage**: For small configuration data
- **SessionStorage**: For temporary data
- **Web Crypto API**: For cryptographic operations

### Remote Pin Storage
User-provided remote storage:
- **IPFS Pinning**: Pin data to IPFS nodes
- **Cloud Storage**: Store in cloud storage services
- **Personal Servers**: Store on personal servers
- **Encrypted Sync**: Encrypted synchronization

### Trusted Host Storage
Trusted third-party storage:
- **Encrypted Hosting**: Encrypted data on trusted hosts
- **Zero-Knowledge**: Hosts cannot read the data
- **Backup Services**: Professional backup services
- **Compliance**: Compliance with privacy regulations

## API Usage

### Basic Operations

#### Add Entry
```typescript
import { databox } from '@mycelia/databox';

const entry: DataboxEntry = {
  id: 'entry-123',
  type: 'interaction',
  timestamp: Date.now(),
  origin: 'https://example.com',
  data: JSON.stringify({ action: 'page_visit', page: '/home' }),
  encrypted: false
};

await databox.addEntry(entry);
```

#### Export Data
```typescript
// Export all data
const exportData = await databox.export();

// Save to file
const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
  type: 'application/json' 
});
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'mycelia-databox-export.json';
a.click();
```

#### Import Data
```typescript
// Import data from file
const fileInput = document.getElementById('importFile');
const file = fileInput.files[0];
const text = await file.text();
const importData = JSON.parse(text);

await databox.import(importData);
```

#### Shred Keys
```typescript
// Shred all encryption keys
await databox.shredKeys();

// This will make all encrypted content permanently unreadable
```

#### Tombstone Consent
```typescript
// Mark a consent as revoked
await databox.tombstone('consent-123');
```

### Advanced Operations

#### Change Storage Backend
```typescript
// Switch to remote pin storage
await databox.setStorageBackend('remote-pin', {
  pinService: 'https://pin.example.com',
  apiKey: 'your-api-key'
});

// Switch to trusted host storage
await databox.setStorageBackend('trusted-host', {
  hostUrl: 'https://trusted-host.example.com',
  credentials: 'your-credentials'
});
```

#### Key Rotation
```typescript
// Rotate content keys
await databox.rotateContentKeys();

// Rotate master key
await databox.rotateMasterKey();
```

## Truthful Deletion Model

### What Deletion Means
The system provides an honest model of what deletion means:

#### What Gets Deleted
- **Encryption Keys**: All encryption keys are destroyed
- **Local Data**: All local data is removed
- **Index References**: References in public directories are removed
- **Consent Records**: Consent records are tombstoned

#### What Persists
- **IPFS Content**: Content on IPFS may persist
- **Third-party Mirrors**: Third-party mirrors may continue to serve content
- **Backup Copies**: Backup copies may exist
- **Audit Logs**: Some audit logs may be retained for compliance

### Deletion Process
The "Delete My Data" flow:

1. **Key Shredding**: Destroy all encryption keys
2. **Directory De-indexing**: Request removal from public directories
3. **Local Cleanup**: Remove all local data
4. **Backend Cleanup**: Clean up remote storage
5. **Warning Display**: Show warnings about persistent copies

### User Warnings
Users are clearly warned about:

```typescript
const deletionWarning = `
⚠️ Key Shredding Warning

Shredding keys will permanently destroy encryption keys, making all encrypted content unreadable. This action cannot be undone.

What happens when you shred keys:
• All content encryption keys are destroyed
• Private content becomes permanently unreadable
• Public directory de-indexing is requested
• Local pins are removed
• Third-party mirrors may still exist
`;
```

## UI Integration

### Settings Panel
The Navigator includes a Databox settings panel:

```typescript
const DataboxPanel = () => (
  <div className="databox-panel">
    <h3>Databox Settings</h3>
    
    <div className="status-section">
      <div className="status healthy">Databox Active</div>
      <div className="status healthy">Storage: Local (Default)</div>
      <div className="status healthy">Encryption: AES-256-GCM</div>
    </div>
    
    <div className="actions-section">
      <button onClick={exportDatabox}>Export Databox</button>
      <button onClick={showImportDialog}>Import Databox</button>
      <button onClick={shredKeys} className="danger">
        Shred Keys (Delete Data)
      </button>
    </div>
    
    <div className="management-section">
      <button onClick={tombstoneConsent}>Tombstone Consent</button>
      <button onClick={changeStorageBackend}>Change Storage Backend</button>
    </div>
  </div>
);
```

### Data Entries Display
Users can view their data entries:

```typescript
const DataEntries = ({ entries }) => (
  <div className="data-entries">
    <h3>Data Entries</h3>
    {entries.map(entry => (
      <div key={entry.id} className="entry">
        <h4>{entry.type}: {entry.id}</h4>
        <p>{entry.data}</p>
        <div className="meta">
          Type: {entry.type} | 
          Origin: {entry.origin || 'N/A'} | 
          Timestamp: {new Date(entry.timestamp).toLocaleString()}
        </div>
      </div>
    ))}
  </div>
);
```

## Privacy and Compliance

### Data Minimization
The system implements data minimization:
- **Only Necessary Data**: Only stores necessary data
- **Purpose Limitation**: Data is used only for stated purposes
- **Retention Limits**: Data is retained only as long as necessary
- **User Control**: Users have complete control over their data

### Consent Management
Comprehensive consent management:
- **Granular Consent**: Fine-grained consent controls
- **Consent Withdrawal**: Easy consent withdrawal
- **Consent Audit**: Complete audit trail of consent decisions
- **Consent Tombstoning**: Marking consent as revoked

### Right to be Forgotten
Implementation of the right to be forgotten:
- **Key Shredding**: Cryptographic key destruction
- **Data Deletion**: Removal of personal data
- **Service De-indexing**: Removal from public services
- **Audit Trail**: Complete audit trail of deletion actions

## Monitoring and Observability

### Metrics
The system tracks various metrics:

- **Data Volume**: Amount of data stored
- **Encryption Status**: Status of encryption operations
- **Key Operations**: Key creation, rotation, and shredding
- **Storage Backend**: Storage backend usage and performance

### Logging
All operations are logged:

```typescript
observability.logEvent('databox_entry_added', {
  entryId: entry.id,
  entryType: entry.type,
  encrypted: entry.encrypted
});

observability.logEvent('databox_keys_shredded', {
  keysShredded: keysShredded.length,
  contentAffected: contentAffected.length
});

observability.logEvent('databox_exported', {
  entryCount: exportData.entries.length,
  keyCount: exportData.contentKeys.length
});
```

### Health Checks
The system includes health checks:

- **Storage Connectivity**: Check storage backend connectivity
- **Encryption Status**: Verify encryption is working
- **Key Management**: Check key management operations
- **Data Integrity**: Verify data integrity

## Best Practices

### For Users
- **Regular Exports**: Regularly export your data
- **Understand Deletion**: Understand what deletion means
- **Monitor Usage**: Monitor your data usage
- **Review Settings**: Regularly review your settings

### For Developers
- **Encrypt Sensitive Data**: Always encrypt sensitive data
- **Implement Key Management**: Proper key management is essential
- **Provide Clear Warnings**: Clearly warn users about deletion
- **Audit Operations**: Log all operations for audit purposes

### For Compliance
- **Data Minimization**: Implement data minimization
- **Consent Management**: Proper consent management
- **Right to be Forgotten**: Implement deletion rights
- **Audit Trails**: Maintain complete audit trails

## Troubleshooting

### Common Issues

**Encryption Failures**
- Check encryption key availability
- Verify encryption algorithm support
- Review error logs
- Check storage backend connectivity

**Import/Export Issues**
- Verify data format
- Check file permissions
- Review error messages
- Validate data integrity

**Key Shredding Issues**
- Verify key identification
- Check shredding process
- Review audit logs
- Confirm deletion completion

### Debug Mode
Enable debug logging for troubleshooting:

```bash
DEBUG=databox:* npm start
```

## Future Enhancements

### Advanced Features
- **Differential Privacy**: Advanced privacy protection
- **Zero-Knowledge Proofs**: Zero-knowledge data verification
- **Advanced Encryption**: Enhanced encryption algorithms
- **Blockchain Integration**: On-chain data verification

### Integration
- **Cross-Platform Sync**: Cross-platform data synchronization
- **API Integration**: REST API for data access
- **Webhook Support**: Webhook notifications for data changes
- **Third-party Integration**: Integration with third-party services

### Compliance
- **GDPR Compliance**: Enhanced GDPR compliance features
- **CCPA Compliance**: California Consumer Privacy Act compliance
- **Audit Tools**: Advanced audit and compliance tools
- **Reporting**: Comprehensive compliance reporting
