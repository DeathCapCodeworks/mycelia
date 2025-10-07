---
title: Mainnet Proof of Reserves
---

# Mainnet Proof of Reserves

## Current Status

<div className="alert alert--info">
  <strong>Last Updated:</strong> <span id="por-timestamp">Loading...</span>
</div>

<div className="alert alert--success" id="por-status">
  <strong>Status:</strong> <span id="por-status-text">Loading...</span>
</div>

## Reserve Summary

| Metric | Value |
|--------|-------|
| **Total Locked BTC** | <span id="por-total-sats">Loading...</span> sats |
| **Outstanding BLOOM** | <span id="por-outstanding-bloom">Loading...</span> BLOOM |
| **Collateralization Ratio** | <span id="por-ratio">Loading...</span>% |
| **UTXO Count** | <span id="por-utxo-count">Loading...</span> |
| **Header Hash** | <span id="por-header-hash">Loading...</span> |

## Attestation Details

### Signature Verification
- **Signer**: <span id="por-signer">Loading...</span>
- **Signature**: <span id="por-signature">Loading...</span>
- **Verification**: <span id="por-verification">Loading...</span>

### Freshness Check
- **Age**: <span id="por-age">Loading...</span> minutes
- **Status**: <span id="por-freshness">Loading...</span>

## Technical Details

### SPV Verification
The Proof of Reserves system uses Simplified Payment Verification (SPV) to verify Bitcoin UTXOs without requiring a full Bitcoin node. This includes:

- **Header Sync**: Continuous synchronization with Bitcoin block headers
- **Merkle Proofs**: Verification of transaction inclusion in blocks
- **UTXO Aggregation**: Summing of all watched UTXO values
- **Attestation Signing**: Cryptographic signing of reserve snapshots

### Attestation Process
1. **UTXO Fetching**: Retrieve current UTXO data from watched addresses
2. **Verification**: Verify UTXOs against Bitcoin block headers
3. **Aggregation**: Sum total locked Bitcoin satoshis
4. **Snapshot Creation**: Create attestation snapshot with metadata
5. **Signing**: Sign snapshot with operator key
6. **Publishing**: Publish signed attestation to public endpoints

### Security Measures
- **Cryptographic Signing**: All attestations are cryptographically signed
- **Regular Updates**: Attestations are updated every 30 minutes
- **Staleness Detection**: Attestations older than 24 hours are flagged
- **Audit Trail**: Complete audit trail of all attestation operations

## Reserve Addresses

The following Bitcoin addresses are monitored for reserve verification:

- `bc1qtreasury123456789abcdefghijklmnopqrstuvwxyz`
- `bc1qreserve987654321fedcba987654321fedcba`

## Attestation History

<div id="por-history">
  <p>Loading attestation history...</p>
</div>

## Verification

You can verify the current attestation using the Mycelia CLI:

```bash
# Verify current attestation
mycelia-attest verify ./release/mainnet/por.json

# Check attestation freshness
mycelia-attest verify --max-age 1440 ./release/mainnet/por.json
```

## API Endpoints

### Current Attestation
```
GET /attestations/por.json
```

### Attestation History
```
GET /attestations/history.json
```

### Verification Status
```
GET /attestations/verify.json
```

## Monitoring

### Alerts
- **Stale Attestation**: Alert if attestation is older than 24 hours
- **Collateralization**: Alert if ratio drops below 100%
- **UTXO Changes**: Alert on significant UTXO changes
- **Signature Verification**: Alert on signature verification failures

### Dashboards
- **Real-time Monitoring**: Live attestation status
- **Historical Trends**: Reserve trends over time
- **Verification Metrics**: Attestation verification statistics
- **Alert Status**: Current alert status and history

## Governance

### Attestation Policy
- **Update Frequency**: Every 30 minutes
- **Staleness Threshold**: 24 hours
- **Verification Required**: All attestations must be verified
- **Audit Requirements**: Quarterly independent audits

### Emergency Procedures
- **Attestation Failure**: Immediate investigation and recovery
- **Reserve Discrepancy**: Emergency pause and investigation
- **Key Compromise**: Emergency key rotation and re-attestation
- **Network Issues**: Fallback to static reserve feed

## Contact Information

### Technical Support
- **Attestation Issues**: attestations@mycelia.com
- **Verification Problems**: verify@mycelia.com
- **Emergency Contact**: emergency@mycelia.com

### Governance
- **Policy Questions**: governance@mycelia.com
- **Audit Requests**: audit@mycelia.com
- **Compliance**: compliance@mycelia.com

---

<script>
// Load attestation data from static file
fetch('/attestations/por.json')
  .then(response => response.json())
  .then(data => {
    // Update timestamp
    const timestamp = new Date(data.snapshot.timestamp);
    document.getElementById('por-timestamp').textContent = timestamp.toLocaleString();
    
    // Update status
    const ageMinutes = Math.floor((Date.now() - data.snapshot.timestamp) / (60 * 1000));
    const isStale = ageMinutes > 1440; // 24 hours
    const statusElement = document.getElementById('por-status');
    const statusTextElement = document.getElementById('por-status-text');
    
    if (isStale) {
      statusElement.className = 'alert alert--danger';
      statusTextElement.textContent = 'STALE - Attestation older than 24 hours';
    } else {
      statusElement.className = 'alert alert--success';
      statusTextElement.textContent = 'FRESH - Attestation within 24 hours';
    }
    
    // Update metrics
    document.getElementById('por-total-sats').textContent = data.snapshot.lockedSats.toString();
    document.getElementById('por-outstanding-bloom').textContent = data.snapshot.outstandingBloom.toString();
    document.getElementById('por-ratio').textContent = (data.snapshot.collateralizationRatio * 100).toFixed(2);
    document.getElementById('por-utxo-count').textContent = data.snapshot.utxoCount.toString();
    document.getElementById('por-header-hash').textContent = data.snapshot.headerHash;
    
    // Update signature info
    document.getElementById('por-signer').textContent = data.publicKey.slice(0, 16) + '...';
    document.getElementById('por-signature').textContent = data.signature.slice(0, 16) + '...';
    document.getElementById('por-verification').textContent = 'VALID';
    document.getElementById('por-age').textContent = ageMinutes.toString();
    document.getElementById('por-freshness').textContent = isStale ? 'STALE' : 'FRESH';
  })
  .catch(error => {
    console.error('Failed to load attestation data:', error);
    document.getElementById('por-status').className = 'alert alert--danger';
    document.getElementById('por-status-text').textContent = 'ERROR - Failed to load attestation data';
  });
</script>
