# Privacy and Consent Management

Mycelia implements a comprehensive privacy and consent management system that gives users full control over their data and capabilities.

## Consent Cards

Consent Cards are the foundation of Mycelia's privacy system. They provide a transparent, auditable way to manage capability grants and data access permissions.

### What are Consent Cards?

A Consent Card is a cryptographically signed document that records:
- **What** capabilities were granted
- **When** the grant was issued
- **Who** requested the capabilities
- **Why** the capabilities are needed
- **How long** the grant is valid

### Key Features

- **Cryptographic Signatures**: Each card is signed to prevent tampering
- **Time-Limited**: Grants automatically expire after a specified duration
- **Revocable**: Users can revoke consent at any time
- **Auditable**: Complete history of all consent decisions
- **Exportable**: Users can export their consent data

### Consent Card Structure

```typescript
interface ConsentCard {
  id: string;                    // Unique identifier
  issuedAt: number;             // Timestamp when issued
  requester: string;            // Who requested the capabilities
  scopes: string[];            // What capabilities were granted
  durationMs: number;           // How long the grant is valid
  purpose: string;              // Why the capabilities are needed
  signature: string;            // Cryptographic signature
}
```

## Privacy Controls

### Capability Management

Users can view and manage all active capability grants through the Privacy dashboard:

- **Active Grants**: See all currently active capability grants
- **Grant History**: Review past grants and their outcomes
- **Revocation**: Instantly revoke any active grant
- **Export**: Download complete consent history

### Data Minimization

Mycelia follows the principle of data minimization:

- **Scope Limitation**: Only request the minimum capabilities needed
- **Purpose Limitation**: Capabilities can only be used for stated purposes
- **Retention Limits**: Data is automatically purged after use
- **No Cross-Tracking**: Capabilities are isolated between applications

### Transparency

All privacy-related activities are logged and visible to users:

- **Consent Events**: Every grant and revocation is recorded
- **Data Access**: Track when and how data is accessed
- **Purpose Tracking**: Monitor if capabilities are used as intended
- **Audit Trail**: Complete history of all privacy decisions

## Privacy Dashboard

The Privacy dashboard (`/privacy`) provides a comprehensive interface for managing privacy settings:

### Consent Management
- View all active consent cards
- Search and filter by requester, scope, or date
- Revoke individual or bulk consent grants
- Export consent data in JSON format

### Privacy Settings
- Configure default consent durations
- Set privacy preferences for new requests
- Manage data retention policies
- Control notification settings

### Audit Log
- Review all privacy-related events
- Track data access patterns
- Monitor for unusual activity
- Generate privacy reports

## Integration with Mycelia Services

### Oracle Agent Integration

When the Oracle Agent requests capabilities, it automatically creates a Consent Card:

```typescript
// Oracle Agent requests capabilities
const capabilities = await oracleAgent.grant({
  scopes: ['read:documents', 'search:content'],
  purpose: 'Document analysis and search',
  durationMs: 24 * 60 * 60 * 1000 // 24 hours
});

// Consent Card is automatically created and stored
const consentCard = await createConsentCard(capabilities, kms);
```

### Social Graph Integration

The Social Graph respects privacy settings when managing connections:

```typescript
// Social Graph requests contact access
const contactAccess = await socialGraph.grant({
  scopes: ['read:contacts', 'write:permissions'],
  purpose: 'Contact management and permission updates',
  durationMs: 7 * 24 * 60 * 60 * 1000 // 7 days
});
```

### Workspaces Integration

Workspaces automatically respect privacy settings for session data:

- **Session Snapshots**: Only save non-sensitive data
- **Form State**: Automatically redact sensitive information
- **Wallet Context**: Never persist private keys or sensitive data
- **User Preferences**: Store only user-approved settings

## Privacy Best Practices

### For Users

1. **Review Regularly**: Check your consent cards periodically
2. **Minimize Duration**: Grant capabilities for the shortest time needed
3. **Understand Purpose**: Only grant capabilities when you understand why they're needed
4. **Revoke Promptly**: Revoke capabilities when no longer needed
5. **Export Data**: Regularly export your consent history

### For Developers

1. **Request Minimally**: Only request the capabilities you actually need
2. **Explain Purpose**: Clearly explain why capabilities are needed
3. **Respect Duration**: Don't request longer durations than necessary
4. **Handle Revocation**: Gracefully handle capability revocation
5. **Audit Usage**: Log and monitor how capabilities are used

## Privacy Compliance

Mycelia's privacy system is designed to meet modern privacy regulations:

- **GDPR Compliance**: Right to access, rectification, erasure, and portability
- **CCPA Compliance**: Right to know, delete, and opt-out
- **Transparency**: Clear information about data processing
- **Consent Management**: Granular, informed consent
- **Data Minimization**: Only collect what's necessary
- **Purpose Limitation**: Use data only for stated purposes

## Future Privacy Features

### Planned Enhancements

- **Privacy Scoring**: Rate applications based on privacy practices
- **Consent Templates**: Pre-approved consent patterns for common use cases
- **Privacy Analytics**: Insights into privacy patterns and trends
- **Cross-Platform Sync**: Sync privacy settings across devices
- **Privacy Notifications**: Alerts for unusual data access patterns

### Research Areas

- **Differential Privacy**: Add noise to protect individual privacy
- **Homomorphic Encryption**: Process data without decrypting it
- **Zero-Knowledge Proofs**: Prove capabilities without revealing details
- **Federated Learning**: Train models without sharing raw data

## Getting Started

1. **Visit Privacy Dashboard**: Navigate to `/privacy` in the sandbox
2. **Review Active Grants**: See what capabilities are currently active
3. **Test Revocation**: Try revoking a grant to see the process
4. **Export Data**: Download your consent history
5. **Configure Settings**: Adjust privacy preferences

The privacy system is designed to be intuitive while providing powerful control over your data and capabilities. Start by exploring the Privacy dashboard to understand your current privacy settings.