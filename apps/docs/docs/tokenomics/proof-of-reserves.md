---
title: Proof of Reserves
---

# Proof of Reserves

The Mycelia Proof of Reserves system provides verifiable evidence that locked Bitcoin reserves are sufficient to back all outstanding BLOOM tokens at the 10 BLOOM = 1 BTC peg.

## Overview

Proof of Reserves ensures that:
- Each BLOOM token is fully backed by locked Bitcoin
- Reserves are verifiable and auditable
- Minting is blocked when collateral would fall below 100%
- Redemption is always possible at the peg rate

## Reserve Feed Architecture

### SPV UTXO Feed (Primary)

The SPV (Simplified Payment Verification) UTXO feed provides the most secure method of reserve verification:

- **UTXO Monitoring**: Tracks specific Bitcoin addresses and descriptors
- **Header Verification**: Verifies Bitcoin block headers and Merkle proofs
- **Real-time Updates**: Provides current locked satoshi amounts
- **Status Reporting**: Returns `complete` or `partial` with warnings

### Static Reserve Feed (Fallback)

For demo and testing purposes:

- **Configuration-based**: Reads locked amounts from environment variables
- **Offline Operation**: No network dependencies
- **Audit Trail**: Maintains historical reserve snapshots

### Composable Reserve Feed

Combines multiple feeds with intelligent fallback:

- **SPV Preferred**: Uses SPV feed when available
- **Graceful Degradation**: Falls back to static feed with warnings
- **Status Monitoring**: Tracks feed availability and warnings

## Implementation

### SPV UTXO Configuration

```typescript
import { SpvUtxoFeed } from '@mycelia/proof-of-reserve';

const spvFeed = new SpvUtxoFeed({
  watchAddresses: [
    'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
    'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx'
  ],
  descriptors: [
    'wpkh([fingerprint/hdpath]xpub.../0/*)',
    'sh(wpkh([fingerprint/hdpath]xpub.../1/*))'
  ],
  network: 'mainnet'
});
```

### Reserve Composition

```typescript
import { composeReserveFeed, StaticReserveFeed } from '@mycelia/proof-of-reserve';

const staticFeed = new StaticReserveFeed(1_000_000_000_000n); // 10 BTC
const composedFeed = composeReserveFeed(spvFeed, staticFeed);

// Get current reserves
const lockedSats = await composedFeed.getLockedBtcSats();
const warning = composedFeed.getLastWarning();
```

## Reserve Verification Process

### 1. UTXO Aggregation

- Scan configured addresses for unspent outputs
- Sum total value of confirmed UTXOs
- Track unconfirmed transactions separately

### 2. Header Verification

- Verify Bitcoin block headers using SPV
- Validate Merkle proofs for transactions
- Ensure UTXOs are in confirmed blocks

### 3. Reserve Calculation

- Calculate total locked satoshis
- Compare against required reserves for current supply
- Generate collateralization ratio

### 4. Status Reporting

- `complete`: All UTXOs verified with full SPV
- `partial`: Some UTXOs unconfirmed or SPV incomplete
- `unavailable`: SPV verification failed, using fallback

## Audit and Compliance

### Reserve Attestations

Regular attestations provide transparency:

- **Daily Snapshots**: Reserve amounts at end of each day
- **Third-party Audits**: Independent verification of reserves
- **Public Reporting**: Published reserve statements

### SPV Roadmap

The roadmap for SPV implementation:

1. **Phase 1**: Basic UTXO monitoring (current)
2. **Phase 2**: Full SPV verification with Merkle proofs
3. **Phase 3**: Multi-signature reserve management
4. **Phase 4**: Decentralized reserve verification

### Compliance Framework

- **Regulatory Alignment**: Meets financial reserve requirements
- **Audit Standards**: Follows industry best practices
- **Transparency**: Public reserve reporting and verification

## API Reference

### `SpvUtxoFeed`

```typescript
class SpvUtxoFeed implements ReserveFeed {
  constructor(config: SpvUtxoConfig);
  
  async getLockedBtcSats(): Promise&lt;bigint&gt;;
  async getUtxoResult(): Promise&lt;SpvUtxoResult&gt;;
  addUtxo(txid: string, vout: number, value: bigint, confirmed: boolean): void;
  removeUtxo(txid: string, vout: number): void;
}
```

### `ComposableReserveFeed`

```typescript
class ComposableReserveFeed implements ReserveFeed {
  constructor(primary: SpvProofFeed, fallback: ReserveFeed);
  
  async getLockedBtcSats(): Promise&lt;bigint&gt;;
  getLastWarning(): string | undefined;
  async isSpvAvailable(): Promise&lt;boolean&gt;;
}
```

## Monitoring and Alerts

### Reserve Monitoring

- **Real-time Tracking**: Continuous monitoring of reserve levels
- **Threshold Alerts**: Notifications when reserves approach limits
- **Feed Status**: Monitoring of SPV feed availability

### Diagnostic Checks

The diagnostics system includes reserve verification:

- **SPV Feed Available**: Checks if SPV verification is working
- **Reserve Sufficiency**: Ensures reserves meet current supply requirements
- **Fallback Status**: Monitors fallback feed usage and warnings

## Security Considerations

### Reserve Protection

- **Multi-signature**: Reserve addresses use multi-sig for security
- **Cold Storage**: Majority of reserves kept in cold storage
- **Access Control**: Strict access controls for reserve management

### Verification Integrity

- **Cryptographic Proofs**: SPV proofs ensure reserve authenticity
- **Decentralized Verification**: Multiple independent verifiers
- **Tamper Resistance**: Immutable audit trail of reserve changes

## Future Enhancements

### Advanced SPV Features

- **Lightning Network**: Integration with Lightning reserves
- **Cross-chain**: Support for other Bitcoin-like chains
- **Privacy**: Confidential transactions for reserve privacy

### Decentralized Verification

- **Validator Network**: Decentralized reserve verification
- **Consensus Mechanism**: Agreement on reserve amounts
- **Incentive Alignment**: Economic incentives for honest verification

## Troubleshooting

### Common Issues

**SPV Feed Unavailable**
- Check Bitcoin node connectivity
- Verify address configurations
- Review network status

**Reserve Mismatch**
- Compare UTXO counts across feeds
- Check for unconfirmed transactions
- Verify address configurations

**Fallback Activation**
- Monitor warning messages
- Check SPV feed status
- Review reserve calculations

### Support

For technical support or questions about Proof of Reserves:
- Check the [API Reference](/api-reference)
- Review the [Testing Guide](/testing-guide)
- Contact the development team
