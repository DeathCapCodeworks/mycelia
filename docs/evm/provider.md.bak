# EVM Provider

The EVM Provider package provides a comprehensive Ethereum-compatible blockchain provider that implements the EIP-1193 standard while adding Mycelia-specific features.

## Overview

The EVM Provider serves as the foundation for all Ethereum interactions in Project Mycelia, providing:

- **EIP-1193 compatibility** for standard Ethereum tooling
- **Automatic network switching** and chain management
- **BLOOM token integration** with BTC peg conversion
- **Gas price optimization** and fee management
- **Comprehensive error handling** and observability

## Quick Start

```typescript
import { getEVMProvider } from '@mycelia/evm-provider';

// Get the global provider instance
const provider = getEVMProvider();

// Check network information
const networkInfo = await provider.getNetworkInfo();
console.log('Connected to:', networkInfo.name);

// Get current block number
const blockNumber = await provider.getBlockNumber();
console.log('Current block:', blockNumber);

// Get account balance
const balance = await provider.getBalance('0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6');
console.log('Balance:', balance);
```

## EIP-1193 Compatibility

The provider implements the standard EIP-1193 interface, making it compatible with existing Ethereum libraries:

```typescript
// Standard Ethereum methods
const chainId = await window.ethereum.request({ method: 'eth_chainId' });
const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
const balance = await window.ethereum.request({ 
  method: 'eth_getBalance', 
  params: ['0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6', 'latest'] 
});

// Send transaction
const txHash = await window.ethereum.request({
  method: 'eth_sendTransaction',
  params: [{
    from: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
    to: '0x...',
    value: '0x0',
    data: '0x...'
  }]
});
```

## Network Management

### Default Networks

The provider comes pre-configured with popular networks:

```typescript
// Get current network
const networkInfo = await provider.getNetworkInfo();

console.log('Network details:', {
  chainId: networkInfo.chainId,
  name: networkInfo.name,
  rpcUrl: networkInfo.rpcUrl,
  blockExplorerUrl: networkInfo.blockExplorerUrl,
  isTestnet: networkInfo.isTestnet
});
```

### Adding Custom Networks

Add new networks dynamically:

```typescript
// Add a custom network
await provider.addChain({
  chainId: '0x89', // Polygon
  chainName: 'Polygon Mainnet',
  rpcUrls: ['https://polygon-rpc.com'],
  blockExplorerUrls: ['https://polygonscan.com'],
  nativeCurrency: {
    name: 'MATIC',
    symbol: 'MATIC',
    decimals: 18
  }
});

// Switch to the new network
await provider.switchChain('0x89');
```

### Network Switching

```typescript
// Switch to Ethereum mainnet
await provider.switchChain('0x1');

// Switch to Sepolia testnet
await provider.switchChain('0xaa36a7');

// Switch to Polygon
await provider.switchChain('0x89');
```

## Account Management

### Getting Accounts

```typescript
// Get connected accounts
const accounts = await provider.getAccounts();
console.log('Connected accounts:', accounts);

// Request account access
const newAccounts = await provider.requestAccounts();
console.log('New accounts:', newAccounts);
```

### Account Information

```typescript
// Get account balance
const balance = await provider.getBalance('0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6');
console.log('ETH balance:', balance);

// Get balance at specific block
const historicalBalance = await provider.getBalance(
  '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
  '0x123456' // Block number
);
```

## Transaction Management

### Sending Transactions

```typescript
// Send a simple transaction
const txHash = await provider.sendTransaction({
  to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
  value: '1000000000000000000', // 1 ETH
  gasLimit: '21000',
  gasPrice: '20000000000' // 20 gwei
});

console.log('Transaction hash:', txHash);
```

### Transaction Receipts

```typescript
// Get transaction receipt
const receipt = await provider.getTransactionReceipt(txHash);

if (receipt) {
  console.log('Transaction details:', {
    blockNumber: receipt.blockNumber,
    gasUsed: receipt.gasUsed,
    status: receipt.status,
    logs: receipt.logs
  });
}
```

### Gas Estimation

```typescript
// Estimate gas for a transaction
const gasEstimate = await provider.estimateGas({
  to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
  value: '1000000000000000000',
  data: '0x...'
});

console.log('Estimated gas:', gasEstimate);
```

## Smart Contract Interactions

### Contract Calls

```typescript
// Call a contract method (read-only)
const result = await provider.call({
  to: '0x...', // Contract address
  data: '0x...' // Encoded function call
});

console.log('Call result:', result);
```

### Contract Events

```typescript
// Listen for contract events
provider.on('Transfer', (event) => {
  console.log('Transfer event:', {
    from: event.args.from,
    to: event.args.to,
    value: event.args.value
  });
});
```

## BLOOM Token Integration

### BLOOM Balance

```typescript
import { createMyceliaProvider } from '@mycelia/evm-compat';

// Create Mycelia-compatible provider
const myceliaProvider = createMyceliaProvider(
  'https://eth.llamarpc.com',
  '0x...', // BLOOM token address
  '0x...'  // Gas oracle address
);

// Get BLOOM balance
const bloomBalance = await myceliaProvider.getBloomBalance('0x...');
console.log('BLOOM balance:', bloomBalance.toString());

// Get BLOOM balance in BTC equivalent
const btcValue = await myceliaProvider.getBloomBalanceInBtc('0x...');
console.log('BTC equivalent:', btcValue);
```

### Gas Price in BLOOM

```typescript
// Get current gas price in BLOOM tokens
const gasPriceInBloom = await myceliaProvider.getGasPriceInBloom();
console.log('Gas price in BLOOM:', gasPriceInBloom.toString());
```

## Error Handling

### Common Errors

```typescript
try {
  const balance = await provider.getBalance('0x...');
} catch (error) {
  if (error.message.includes('invalid address')) {
    console.log('Invalid Ethereum address');
  } else if (error.message.includes('network error')) {
    console.log('Network connection failed');
  } else if (error.message.includes('rate limit')) {
    console.log('Rate limit exceeded');
  } else {
    console.error('Unexpected error:', error);
  }
}
```

### Retry Logic

```typescript
async function getBalanceWithRetry(address: string, maxRetries = 3): Promise<string> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await provider.getBalance(address);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
  throw new Error('Max retries exceeded');
}
```

## Configuration

### Provider Configuration

```typescript
import { EVMProvider } from '@mycelia/evm-provider';

// Create custom provider with specific configuration
const customProvider = new EVMProvider({
  chainId: 1,
  rpcUrl: 'https://eth.llamarpc.com',
  name: 'Ethereum Mainnet',
  nativeCurrency: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18
  },
  blockExplorerUrl: 'https://etherscan.io'
});
```

### Feature Flags

The provider respects feature flags:

```typescript
import { flags } from '@mycelia/web4-feature-flags';

// Check if EVM provider is enabled
if (flags.isEnabled('evm_provider')) {
  const provider = getEVMProvider();
  // Use provider
} else {
  console.log('EVM provider is disabled');
}
```

## Monitoring and Observability

### Automatic Logging

All provider operations are automatically logged:

```typescript
// Events logged automatically:
// - evm_provider_initialized
// - evm_chain_switched
// - evm_transaction_sent
// - evm_transaction_confirmed
// - evm_call_executed
```

### Custom Monitoring

```typescript
import { observability } from '@mycelia/observability';

// Track custom metrics
observability.logEvent('custom_provider_operation', {
  operation_type: 'balance_check',
  address: '0x...',
  balance: balance.toString(),
  network: networkInfo.name
});
```

## Performance Optimization

### Connection Pooling

The provider automatically manages connection pooling for optimal performance:

```typescript
// Provider automatically handles:
// - Connection reuse
// - Request batching
// - Rate limiting
// - Error recovery
```

### Caching

```typescript
// Enable caching for frequently accessed data
const cachedBalance = await provider.getBalance('0x...', 'latest', {
  cache: true,
  ttl: 30000 // 30 seconds
});
```

## Security Considerations

### Private Key Security

- **Never expose private keys** in client-side code
- **Use hardware wallets** when possible
- **Implement proper key derivation** for multiple accounts

### Network Security

```typescript
// Validate network before switching
const isValidNetwork = await provider.validateNetwork(chainId);
if (!isValidNetwork) {
  throw new Error('Invalid or unsupported network');
}
```

### Transaction Security

```typescript
// Always validate transaction parameters
const isValidTx = await provider.validateTransaction({
  to: '0x...',
  value: '0x0',
  data: '0x...'
});

if (!isValidTx) {
  throw new Error('Invalid transaction parameters');
}
```

## Troubleshooting

### Common Issues

**Provider not initialized**
```typescript
// Check initialization status
if (!provider.isInitialized) {
  await provider.initialize();
}
```

**Network connection failed**
```typescript
// Check network connectivity
const isConnected = await provider.isConnected();
if (!isConnected) {
  console.log('Network connection lost');
}
```

**Transaction stuck**
```typescript
// Check transaction status
const tx = await provider.getTransaction(txHash);
if (tx && tx.blockNumber) {
  console.log('Transaction confirmed in block:', tx.blockNumber);
} else {
  console.log('Transaction still pending');
}
```

### Debug Mode

Enable debug logging for troubleshooting:

```typescript
// Set debug mode
process.env.DEBUG = 'mycelia:evm:provider';

// Or enable specific modules
process.env.DEBUG = 'mycelia:evm:provider:network,mycelia:evm:provider:transaction';
```

## API Reference

### Core Methods

- `getNetworkInfo()`: Get current network information
- `getBlockNumber()`: Get latest block number
- `getBalance(address, blockTag?)`: Get account balance
- `sendTransaction(tx)`: Send transaction
- `call(tx, blockTag?)`: Call contract method
- `estimateGas(tx)`: Estimate gas for transaction
- `getTransactionReceipt(hash)`: Get transaction receipt
- `switchChain(chainId)`: Switch to different network
- `addChain(chainParams)`: Add custom network
- `getAccounts()`: Get connected accounts
- `requestAccounts()`: Request account access

### Event Handlers

- `on(event, callback)`: Listen for events
- `removeListener(event, callback)`: Remove event listener
- `removeAllListeners(event?)`: Remove all listeners

### Utility Methods

- `isConnected()`: Check connection status
- `isInitialized()`: Check initialization status
- `validateNetwork(chainId)`: Validate network
- `validateTransaction(tx)`: Validate transaction
- `destroy()`: Clean up resources
