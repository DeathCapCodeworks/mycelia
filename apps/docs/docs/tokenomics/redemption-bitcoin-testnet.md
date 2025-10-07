---
title: Redemption on Bitcoin Testnet
---

# Redemption on Bitcoin Testnet

The Mycelia redemption system allows users to exchange BLOOM tokens for Bitcoin using Hash Time Locked Contracts (HTLC) on Bitcoin testnet.

## Overview

The redemption process ensures that each BLOOM token is fully redeemable for BTC at the fixed peg rate of 10 BLOOM = 1 BTC, backed by locked Bitcoin reserves.

## How It Works

### 1. Redemption Request

Users initiate redemption by:
- Specifying the amount of BLOOM to redeem
- Providing a Bitcoin testnet address to receive BTC
- The system quotes the exact BTC amount at the peg rate

### 2. HTLC Creation

The system creates an HTLC on Bitcoin testnet:
- Locks BTC at the quoted amount
- Sets a 24-hour timeout for completion
- Generates a secret hash for claim verification

### 3. Claim Process

Users can claim the BTC by:
- Providing the correct secret to unlock the HTLC
- The system verifies the secret matches the hash
- BTC is released to the user's address

### 4. Supply Burn

Upon successful claim:
- BLOOM tokens are burned from the supply ledger
- Outstanding supply decreases by the redeemed amount
- Peg collateralization is maintained

## Security Features

### Rate Limiting

- Maximum 10 redemption requests per hour per address
- Prevents spam and abuse
- Configurable limits for different user tiers

### Signed Intents

- All redemption intents are signed by operator keys
- Provides audit trail and non-repudiation
- Enables verification of redemption authenticity

### Peg Protection

- Mint guard prevents over-minting beyond reserves
- Redemption burns supply to free collateral
- Maintains 100% collateralization ratio

## Testnet Limitations

**Important:** This implementation is for Bitcoin testnet only. Mainnet redemption will be available in future releases.

### Current Features

- HTLC creation and management
- Secret generation and verification
- Rate limiting and signed intents
- Supply burn on completion

### Future Enhancements

- Mainnet Bitcoin integration
- SPV proof verification
- Multi-signature operator keys
- Advanced HTLC features

## API Reference

### `redeemOnBitcoinTestnet(bloomAmount, btcAddress)`

Creates a redemption intent with HTLC on Bitcoin testnet.

**Parameters:**
- `bloomAmount`: Amount of BLOOM to redeem (bigint)
- `btcAddress`: Bitcoin testnet address to receive BTC (string)

**Returns:** `RedeemIntent` with HTLC details

### `claimHtlc(config)`

Claims an HTLC using the secret.

**Parameters:**
- `config.txid`: HTLC transaction ID
- `config.vout`: Output index
- `config.redeemScriptHex`: Redeem script
- `config.secret`: Secret to unlock HTLC
- `config.recipient`: Recipient address

**Returns:** `{ txid: string }` - Claim transaction ID

### `refundHtlc(config)`

Refunds an HTLC after timeout.

**Parameters:**
- `config.txid`: HTLC transaction ID
- `config.vout`: Output index
- `config.redeemScriptHex`: Redeem script
- `config.timeout`: Timeout timestamp

**Returns:** `{ txid: string }` - Refund transaction ID

## Example Usage

```typescript
import { redeemOnBitcoinTestnet, claimHtlc } from '@mycelia/redemption';

// Create redemption
const intent = await redeemOnBitcoinTestnet(
  10n, // 10 BLOOM
  'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx' // Testnet address
);

// Claim HTLC
const claimResult = await claimHtlc({
  txid: intent.htlc.txid,
  vout: intent.htlc.vout,
  redeemScriptHex: intent.htlc.redeemScriptHex,
  secret: 'user-secret',
  recipient: intent.btcAddress
});
```

## Monitoring and Observability

The redemption system emits structured events for monitoring:

- `redemption_requested`: New redemption intent created
- `testnet_redemption_requested`: Testnet redemption with HTLC details
- `htlc_claimed`: HTLC successfully claimed
- `htlc_refunded`: HTLC refunded after timeout
- `redemption_completed`: BLOOM tokens burned

## Troubleshooting

### Common Issues

**Rate Limit Exceeded**
- Wait for the hourly limit to reset
- Contact support for higher limits if needed

**HTLC Timeout**
- HTLCs expire after 24 hours
- Use `refundHtlc` to recover funds
- Create new redemption intent

**Invalid Secret**
- Ensure secret matches the hash in redemption intent
- Check for typos or encoding issues

### Support

For technical support or questions about redemption:
- Check the [API Reference](/api-reference)
- Review the [Testing Guide](/testing-guide)
- Contact the development team
