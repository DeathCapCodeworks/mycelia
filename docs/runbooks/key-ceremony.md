---
title: Key Ceremony
---

# Key Ceremony Runbook

## Overview

This runbook describes the key ceremony process for generating and managing operator keys in the Mycelia system. The ceremony ensures secure key generation, distribution, and rotation.

## Prerequisites

- Node.js 20 LTS
- `@mycelia/kms-local` package installed
- Secure environment (air-gapped recommended for production)
- Multiple trusted participants for key generation

## Key Types

### 1. Operator Keys
- **Purpose**: Sign redemption intents and critical operations
- **Algorithm**: Ed25519
- **Rotation**: Every 30 days
- **Storage**: Encrypted local keystore

### 2. BIP32 Keys
- **Purpose**: Hierarchical key derivation for multiple addresses
- **Algorithm**: Ed25519 with BIP32 derivation
- **Paths**: `m/44'/0'/0'/0/0` (Bitcoin), `m/44'/501'/0'/0/0` (Solana)
- **Storage**: Encrypted with libsodium

## Ceremony Process

### Phase 1: Environment Setup

1. **Prepare Secure Environment**
   ```bash
   # Create isolated directory
   mkdir -p /secure/key-ceremony
   cd /secure/key-ceremony
   
   # Install dependencies
   npm install @mycelia/kms-local
   ```text

2. **Verify Dependencies**
   ```bash
   # Check libsodium installation
   node -e "console.log(require('libsodium-wrappers').crypto_sign_KEYBYTES)"
   ```text

### Phase 2: Key Generation

1. **Generate Operator Key Pair**
   ```typescript
   import { LocalKMS } from '@mycelia/kms-local';
   
   const kms = new LocalKMS();
   const keyPair = await kms.generateEd25519KeyPair();
   
   console.log('Public Key:', Buffer.from(keyPair.publicKey).toString('hex'));
   console.log('Private Key:', Buffer.from(keyPair.privateKey).toString('hex'));
   ```text

2. **Generate BIP32 Keys**
   ```typescript
   // Generate mnemonic
   const mnemonic = kms.generateMnemonic();
   console.log('Mnemonic:', mnemonic);
   
   // Convert to seed
   const seed = kms.mnemonicToSeed(mnemonic);
   
   // Derive Bitcoin key
   const btcKey = await kms.deriveBIP32Key(seed, "m/44'/0'/0'/0/0");
   
   // Derive Solana key
   const solKey = await kms.deriveBIP32Key(seed, "m/44'/501'/0'/0/0");
   ```text

### Phase 3: Key Encryption

1. **Encrypt Private Keys**
   ```typescript
   const password = 'secure-password-from-ceremony';
   
   // Encrypt operator key
   const encryptedOperatorKey = await kms.encrypt(keyPair.privateKey, password);
   
   // Encrypt BIP32 keys
   const encryptedBtcKey = await kms.encrypt(btcKey.privateKey, password);
   const encryptedSolKey = await kms.encrypt(solKey.privateKey, password);
   ```text

2. **Store Encrypted Keys**
   ```typescript
   const keystore = {
     operator: {
       publicKey: Buffer.from(keyPair.publicKey).toString('hex'),
       encryptedPrivateKey: {
         ciphertext: Buffer.from(encryptedOperatorKey.ciphertext).toString('hex'),
         nonce: Buffer.from(encryptedOperatorKey.nonce).toString('hex'),
         salt: Buffer.from(encryptedOperatorKey.salt).toString('hex')
       },
       rotationTimestamp: kms.getKeyRotationTimestamp()
     },
     bip32: {
       btc: {
         publicKey: Buffer.from(btcKey.publicKey).toString('hex'),
         encryptedPrivateKey: {
           ciphertext: Buffer.from(encryptedBtcKey.ciphertext).toString('hex'),
           nonce: Buffer.from(encryptedBtcKey.nonce).toString('hex'),
           salt: Buffer.from(encryptedBtcKey.salt).toString('hex')
         },
         path: btcKey.path
       },
       sol: {
         publicKey: Buffer.from(solKey.publicKey).toString('hex'),
         encryptedPrivateKey: {
           ciphertext: Buffer.from(encryptedSolKey.ciphertext).toString('hex'),
         nonce: Buffer.from(encryptedSolKey.nonce).toString('hex'),
         salt: Buffer.from(encryptedSolKey.salt).toString('hex')
         },
         path: solKey.path
       }
     }
   };
   
   // Write to secure file
   require('fs').writeFileSync('keystore.json', JSON.stringify(keystore, null, 2));
   ```text

### Phase 4: Key Distribution

1. **Split Password**
   - Use Shamir's Secret Sharing (3-of-5)
   - Distribute shares to trusted participants
   - Store shares in separate secure locations

2. **Distribute Keys**
   - Public keys: Can be shared openly
   - Encrypted private keys: Store in secure, separate locations
   - Mnemonic: Use hardware security modules (HSMs) for production

### Phase 5: Verification

1. **Test Key Operations**
   ```typescript
   // Test signing
   const message = new Uint8Array([1, 2, 3, 4, 5]);
   const signature = await kms.sign(message, keyPair.privateKey);
   const isValid = await kms.verify(message, signature, keyPair.publicKey);
   
   console.log('Signature valid:', isValid);
   ```text

2. **Test Decryption**
   ```typescript
   const decryptedKey = await kms.decrypt(encryptedOperatorKey, password);
   console.log('Decryption successful:', decryptedKey.equals(keyPair.privateKey));
   ```text

## Key Rotation

### Automatic Rotation Check

```typescript
const rotationTimestamp = keystore.operator.rotationTimestamp;
const shouldRotate = kms.shouldRotateKey(rotationTimestamp);

if (shouldRotate) {
  console.log('Key rotation required');
  // Initiate rotation ceremony
}
```text

### Rotation Process

1. **Generate New Keys**
   - Follow same ceremony process
   - Generate new key pairs
   - Encrypt with new password

2. **Update System**
   - Deploy new public keys
   - Update key references
   - Test new keys

3. **Retire Old Keys**
   - Mark old keys as retired
   - Archive encrypted private keys
   - Update rotation timestamps

## Security Considerations

### Production Environment

- **Air-gapped Systems**: Use isolated machines for key generation
- **Hardware Security Modules**: Store keys in HSMs when possible
- **Multi-party Computation**: Use threshold signatures for critical operations
- **Audit Logging**: Log all key operations and access

### Key Storage

- **Encryption**: Use libsodium for encryption
- **Backup**: Store encrypted backups in multiple locations
- **Access Control**: Limit access to authorized personnel only
- **Monitoring**: Monitor key usage and access patterns

### Incident Response

1. **Key Compromise**
   - Immediately rotate compromised keys
   - Revoke all signatures from compromised keys
   - Investigate scope of compromise
   - Update security procedures

2. **Key Loss**
   - Verify key is truly lost
   - Initiate key recovery procedures
   - Generate new keys if recovery fails
   - Update system with new keys

## Testing

### Unit Tests

```bash
# Run KMS tests
npm test -- @mycelia/kms-local
```text

### Integration Tests

```bash
# Test key operations
npm run test:integration -- kms
```text

### Security Tests

```bash
# Run security scans
npm run sec:scan
```text

## Monitoring

### Key Usage Metrics

- Key rotation frequency
- Signature generation rate
- Failed verification attempts
- Key access patterns

### Alerts

- Key rotation overdue
- Unusual key usage patterns
- Failed decryption attempts
- Key access violations

## Documentation

### Key Inventory

Maintain a registry of all keys:
- Key ID and purpose
- Public key fingerprint
- Creation date
- Rotation schedule
- Current status

### Access Logs

Log all key operations:
- Key generation
- Key rotation
- Key access
- Failed operations

## Emergency Procedures

### Key Recovery

1. **Assemble Participants**
   - Gather required threshold of participants
   - Verify identities
   - Access secure storage locations

2. **Recover Keys**
   - Decrypt key shares
   - Reconstruct private keys
   - Verify key integrity
   - Test key operations

3. **Update System**
   - Deploy recovered keys
   - Test system functionality
   - Update documentation
   - Notify stakeholders

### Key Destruction

1. **Verify Destruction**
   - Confirm keys are no longer needed
   - Get approval from stakeholders
   - Document destruction process

2. **Secure Destruction**
   - Overwrite key storage
   - Destroy physical media
   - Verify complete destruction
   - Update key registry

## Compliance

### Regulatory Requirements

- **SOX Compliance**: Maintain audit trails
- **GDPR Compliance**: Protect personal data
- **PCI DSS**: Secure payment processing
- **SOC 2**: Security controls and monitoring

### Audit Requirements

- **Key Management**: Document key lifecycle
- **Access Controls**: Verify access restrictions
- **Incident Response**: Test response procedures
- **Compliance Monitoring**: Regular compliance checks

## Contact Information

### Key Ceremony Participants

- **Ceremony Lead**: [Name] - [Email]
- **Security Officer**: [Name] - [Email]
- **Technical Lead**: [Name] - [Email]
- **Auditor**: [Name] - [Email]

### Emergency Contacts

- **24/7 Security Hotline**: [Phone]
- **Incident Response Team**: [Email]
- **Management Escalation**: [Email]

---

**Last Updated**: [Date]
**Version**: 1.0
**Next Review**: [Date]
