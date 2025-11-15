---
title: Overview
---

# Ethereum Integration Overview

Project Mycelia provides comprehensive Ethereum-compatible blockchain integration through a suite of packages that enable seamless interaction with EVM chains while maintaining the unique BLOOM token economics and privacy features.

## Architecture

The Ethereum integration consists of four main packages:

- **@mycelia/evm-provider**: Core Ethereum provider with EIP-1193 compatibility
- **@mycelia/evm-compat**: Type-safe wrappers for ethers v6 with BLOOM extensions
- **@mycelia/evm-paymaster**: Gas sponsorship and cross-experience fee management
- **@mycelia/aa**: ERC-4337 Account Abstraction implementation

## Quick Start

```typescript
import { getEVMProvider } from '@mycelia/evm-provider';
import { createMyceliaProvider } from '@mycelia/evm-compat';
import { getEVMPaymaster } from '@mycelia/evm-paymaster';
import { getAccountAbstraction } from '@mycelia/aa';

// Initialize EVM provider
const provider = getEVMProvider();
const networkInfo = await provider.getNetworkInfo();

// Create Mycelia-compatible provider
const myceliaProvider = createMyceliaProvider(
  'https://eth.llamarpc.com',
  '0x...', // BLOOM token address
  '0x...'  // Gas oracle address
);

// Initialize paymaster for gas sponsorship
const paymaster = getEVMPaymaster();
const status = await paymaster.getSponsorshipStatus();

// Set up account abstraction
const aa = getAccountAbstraction();
const smartAccount = await aa.createSmartAccount('0x...');
```text

## Features

### EIP-1193 Compatibility

The EVM provider implements the standard EIP-1193 interface, making it compatible with existing Ethereum tooling:

```typescript
// Standard Ethereum methods
const chainId = await window.ethereum.request({ method: 'eth_chainId' });
const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
const balance = await window.ethereum.request({ 
  method: 'eth_getBalance', 
  params: [account, 'latest'] 
});
```text

### BLOOM Token Integration

Native support for BLOOM tokens with automatic BTC peg conversion:

```typescript
import { createMyceliaSigner } from '@mycelia/evm-compat';

const signer = createMyceliaSigner(privateKey, myceliaProvider, bloomTokenAddress);

// Send BLOOM tokens
await signer.sendBloom('0x...', BigInt('1000000000000000000')); // 1 BLOOM

// Get BLOOM balance in BTC equivalent
const btcValue = await myceliaProvider.getBloomBalanceInBtc('0x...');
```text

### Gas Sponsorship

Paymaster enables gasless transactions and cross-experience fees:

```typescript
import { getEVMPaymaster } from '@mycelia/evm-paymaster';

const paymaster = getEVMPaymaster();

// Check if transaction can be sponsored
const canSponsor = await paymaster.canSponsor({
  userOp: userOperation,
  entryPoint: '0x...',
  chainId: 1,
  userAddress: '0x...',
  gasPrice: '0x3b9aca00',
  gasLimit: '0x5208'
});

if (canSponsor) {
  const sponsorship = await paymaster.sponsorUserOperation(request);
  // Use sponsorship.paymasterAndData in user operation
}
```text

### Account Abstraction

ERC-4337 smart accounts with session keys and batch transactions:

```typescript
import { getAccountAbstraction } from '@mycelia/aa';

const aa = getAccountAbstraction();

// Create user operation
const userOp = await aa.createUserOperation(
  smartAccountAddress,
  '0x...', // to
  '0x0',   // value
  '0x...'  // data
);

// Sign and send
const signedUserOp = await aa.signUserOperation(userOp, privateKey);
const userOpHash = await aa.sendUserOperation(signedUserOp);

// Wait for confirmation
const receipt = await aa.waitForUserOperation(userOpHash);
```text

## Configuration

### Feature Flags

Ethereum features are controlled by feature flags:

- `evm_provider`: Enable EVM provider (default: true)
- `evm_aa`: Enable Account Abstraction (default: false)
- `evm_paymaster`: Enable gas sponsorship (default: false)

```typescript
import { flags } from '@mycelia/web4-feature-flags';

// Check if AA is enabled
if (flags.isEnabled('evm_aa')) {
  // Initialize account abstraction
}
```text

### Network Configuration

Default networks are pre-configured, but custom networks can be added:

```typescript
// Add custom network
await provider.addChain({
  chainId: '0x1',
  chainName: 'Ethereum Mainnet',
  rpcUrls: ['https://eth.llamarpc.com'],
  blockExplorerUrls: ['https://etherscan.io'],
  nativeCurrency: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18
  }
});
```text

## Security Considerations

### Private Key Management

- Never store private keys in plain text
- Use hardware wallets when possible
- Implement proper key derivation for session keys

### Gas Price Limits

The paymaster enforces gas price limits to prevent abuse:

```typescript
// Update paymaster policy
await paymaster.updatePolicy({
  maxGasPrice: '0x3b9aca00', // 1 gwei
  maxGasLimit: '0x186a0',    // 100000 gas
  dailyLimit: '0x16345785d8a0000', // 0.1 ETH
  perUserLimit: '0x38d7ea4c68000'  // 0.01 ETH
});
```text

### Session Key Security

Session keys should have limited permissions and expiration:

```typescript
const sessionKey = await aa.createSessionKey({
  address: '0x...',
  permissions: ['transfer', 'approve'],
  spendingCap: '1000000000000000000', // 1 BLOOM
  expiresAt: Date.now() + 86400000    // 24 hours
});
```text

## Error Handling

All Ethereum operations include comprehensive error handling:

```typescript
try {
  const receipt = await aa.waitForUserOperation(userOpHash);
  console.log('Transaction confirmed:', receipt.success);
} catch (error) {
  if (error.message.includes('timeout')) {
    console.log('Transaction timed out');
  } else if (error.message.includes('insufficient funds')) {
    console.log('Insufficient balance');
  } else {
    console.error('Unexpected error:', error);
  }
}
```text

## Monitoring and Observability

All Ethereum operations are automatically logged for monitoring:

```typescript
import { observability } from '@mycelia/observability';

// Events are automatically logged:
// - evm_provider_initialized
// - evm_transaction_sent
// - aa_user_operation_sent
// - evm_paymaster_sponsorship_granted
```text

## Best Practices

1. **Always check feature flags** before using Ethereum features
2. **Use proper error handling** for all blockchain operations
3. **Implement retry logic** for network operations
4. **Monitor gas prices** and adjust limits accordingly
5. **Use session keys** for improved UX while maintaining security
6. **Test thoroughly** on testnets before mainnet deployment

## Troubleshooting

### Common Issues

**Provider not initialized**
```typescript
// Check if provider is ready
if (!provider.isInitialized) {
  await provider.initialize();
}
```text

**Feature flag disabled**
```typescript
// Check feature flag status
if (!flags.isEnabled('evm_provider')) {
  console.log('EVM provider is disabled');
}
```text

**Gas estimation failed**
```typescript
// Retry with higher gas limit
const gasEstimate = await provider.estimateGas({
  ...tx,
  gasLimit: '0x186a0' // 100000 gas
});
```text

### Debug Mode

Enable debug logging for troubleshooting:

```typescript
// Set debug mode
process.env.DEBUG = 'mycelia:evm:*';

// Or enable specific modules
process.env.DEBUG = 'mycelia:evm:provider,mycelia:evm:paymaster';
```text

## API Reference

See the individual package documentation for complete API references:

- [EVM Provider API](./provider.md)
- [EVM Compat API](./compat.md)
- [EVM Paymaster API](./paymaster.md)
- [Account Abstraction API](./aa.md)