# Account Abstraction & Paymaster

This document covers the Account Abstraction (ERC-4337) and Paymaster functionality in Project Mycelia, enabling gasless transactions and advanced wallet features.

## Account Abstraction (ERC-4337)

Account Abstraction allows users to interact with smart contracts using smart accounts instead of traditional EOAs (Externally Owned Accounts). This enables:

- **Gasless transactions** (sponsored by paymaster)
- **Batch operations** (multiple transactions in one)
- **Session keys** (temporary signing keys)
- **Social recovery** (recover accounts through trusted contacts)
- **Custom validation logic** (spending limits, time locks, etc.)

### Smart Account Creation

```typescript
import { getAccountAbstraction } from '@mycelia/aa';

const aa = getAccountAbstraction();

// Create a smart account for a user
const smartAccountAddress = await aa.createSmartAccount(
  '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6', // EOA address
  '0x...' // Optional init code
);

console.log('Smart account created:', smartAccountAddress);
```

### User Operations

User operations are the core abstraction in ERC-4337. They represent transactions that can be executed by smart accounts:

```typescript
// Create a user operation
const userOp = await aa.createUserOperation(
  smartAccountAddress,  // sender
  '0x...',             // to (contract address)
  '0x0',               // value (ETH)
  '0xa9059cbb...'      // data (encoded function call)
);

// Sign the user operation
const signedUserOp = await aa.signUserOperation(userOp, privateKey);

// Send to bundler
const userOpHash = await aa.sendUserOperation(signedUserOp);

// Wait for confirmation
const receipt = await aa.waitForUserOperation(userOpHash);
console.log('Transaction confirmed:', receipt.success);
```

### Gas Estimation

Before sending a user operation, estimate the gas costs:

```typescript
const gasEstimate = await aa.estimateUserOperationGas(userOp);

console.log('Gas estimates:', {
  callGasLimit: gasEstimate.callGasLimit,
  verificationGasLimit: gasEstimate.verificationGasLimit,
  preVerificationGas: gasEstimate.preVerificationGas
});

// Update user operation with gas estimates
const optimizedUserOp = {
  ...userOp,
  callGasLimit: gasEstimate.callGasLimit,
  verificationGasLimit: gasEstimate.verificationGasLimit,
  preVerificationGas: gasEstimate.preVerificationGas
};
```

## Paymaster Integration

The Paymaster enables gas sponsorship, allowing users to pay for transactions using BLOOM tokens instead of ETH.

### Sponsorship Eligibility

Check if a user operation can be sponsored:

```typescript
import { getEVMPaymaster } from '@mycelia/evm-paymaster';

const paymaster = getEVMPaymaster();

const canSponsor = await paymaster.canSponsor({
  userOp: signedUserOp,
  entryPoint: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
  chainId: 1,
  userAddress: smartAccountAddress,
  gasPrice: '0x3b9aca00',
  gasLimit: '0x5208'
});

if (canSponsor) {
  console.log('Transaction can be sponsored');
} else {
  console.log('Transaction cannot be sponsored');
}
```

### Gas Sponsorship

Sponsor a user operation with ETH:

```typescript
const sponsorship = await paymaster.sponsorUserOperation({
  userOp: signedUserOp,
  entryPoint: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
  chainId: 1,
  userAddress: smartAccountAddress,
  gasPrice: '0x3b9aca00',
  gasLimit: '0x5208'
});

// Use sponsorship data in user operation
const sponsoredUserOp = {
  ...signedUserOp,
  paymasterAndData: sponsorship.paymasterAndData,
  preVerificationGas: sponsorship.preVerificationGas,
  verificationGasLimit: sponsorship.verificationGasLimit,
  callGasLimit: sponsorship.callGasLimit,
  maxFeePerGas: sponsorship.maxFeePerGas,
  maxPriorityFeePerGas: sponsorship.maxPriorityFeePerGas
};
```

### BLOOM Token Sponsorship

Pay for gas using BLOOM tokens:

```typescript
const bloomSponsorship = await paymaster.sponsorWithBLOOM(
  {
    userOp: signedUserOp,
    entryPoint: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
    chainId: 1,
    userAddress: smartAccountAddress,
    gasPrice: '0x3b9aca00',
    gasLimit: '0x5208'
  },
  '1000000000000000000' // 1 BLOOM token
);

console.log('BLOOM sponsorship:', bloomSponsorship);
```

## Session Keys

Session keys allow temporary signing capabilities without exposing the main private key:

```typescript
// Create a session key with limited permissions
const sessionKeyAddress = await aa.createSessionKey({
  address: '0x...',                    // Session key address
  permissions: ['transfer', 'approve'], // Allowed operations
  spendingCap: '1000000000000000000',    // Max spending (1 BLOOM)
  expiresAt: Date.now() + 86400000      // Expires in 24 hours
});

// Use session key for transactions
const sessionUserOp = await aa.createUserOperation(
  smartAccountAddress,
  '0x...',
  '0x0',
  '0xa9059cbb...'
);

// Sign with session key instead of main key
const sessionSignedUserOp = await aa.signUserOperation(sessionUserOp, sessionPrivateKey);
```

### Session Key Management

```typescript
// Revoke a session key
await aa.revokeSessionKey(sessionKeyAddress);

// Check session key status
const isActive = await aa.isSessionKeyActive(sessionKeyAddress);
```

## Paymaster Policies

Configure sponsorship policies to control costs and prevent abuse:

```typescript
// Update paymaster policy
await paymaster.updatePolicy({
  maxGasPrice: '0x3b9aca00',           // 1 gwei max
  maxGasLimit: '0x186a0',              // 100k gas max
  allowedContracts: [                  // Whitelist contracts
    '0x...', // BLOOM token
    '0x...'  // DEX contract
  ],
  blockedContracts: [                  // Blacklist contracts
    '0x...'  // Known malicious contract
  ],
  dailyLimit: '0x16345785d8a0000',    // 0.1 ETH daily limit
  perUserLimit: '0x38d7ea4c68000'     // 0.01 ETH per user limit
});
```

### Policy Enforcement

The paymaster automatically enforces policies:

```typescript
// Check current policy status
const status = await paymaster.getSponsorshipStatus();

console.log('Paymaster status:', {
  ethBalance: status.ethBalance,
  bloomBalance: status.bloomBalance,
  dailyUsed: status.dailyUsed,
  dailyLimit: status.dailyLimit,
  isActive: status.isActive
});
```

## Batch Operations

Execute multiple operations in a single transaction:

```typescript
// Create multiple user operations
const userOps = await Promise.all([
  aa.createUserOperation(smartAccount, tokenAddress, '0x0', transferData),
  aa.createUserOperation(smartAccount, dexAddress, '0x0', swapData),
  aa.createUserOperation(smartAccount, stakingAddress, '0x0', stakeData)
]);

// Batch them together
const batchUserOp = await aa.createBatchUserOperation(userOps);

// Sign and send
const signedBatchUserOp = await aa.signUserOperation(batchUserOp, privateKey);
const batchHash = await aa.sendUserOperation(signedBatchUserOp);
```

## Error Handling

Comprehensive error handling for all AA and paymaster operations:

```typescript
try {
  const receipt = await aa.waitForUserOperation(userOpHash);
  
  if (!receipt.success) {
    console.error('User operation failed:', receipt.logs);
  }
  
} catch (error) {
  if (error.message.includes('timeout')) {
    console.log('User operation timed out');
  } else if (error.message.includes('insufficient funds')) {
    console.log('Insufficient balance for gas');
  } else if (error.message.includes('sponsorship denied')) {
    console.log('Paymaster denied sponsorship');
  } else {
    console.error('Unexpected error:', error);
  }
}
```

## Security Best Practices

### Private Key Management

- **Never store private keys** in plain text
- **Use hardware wallets** for main accounts
- **Implement proper key derivation** for session keys
- **Rotate session keys** regularly

### Session Key Security

```typescript
// Create session keys with minimal permissions
const sessionKey = await aa.createSessionKey({
  address: '0x...',
  permissions: ['transfer'], // Only allow transfers
  spendingCap: '100000000000000000', // 0.1 BLOOM max
  expiresAt: Date.now() + 3600000   // 1 hour expiry
});
```

### Paymaster Security

- **Set appropriate limits** to prevent abuse
- **Monitor usage patterns** for anomalies
- **Implement rate limiting** per user
- **Regularly audit** allowed contracts

## Monitoring and Observability

All AA and paymaster operations are automatically logged:

```typescript
// Events logged automatically:
// - aa_smart_account_created
// - aa_user_operation_sent
// - aa_user_operation_confirmed
// - evm_paymaster_sponsorship_granted
// - evm_paymaster_sponsorship_denied
```

### Custom Monitoring

```typescript
import { observability } from '@mycelia/observability';

// Track custom metrics
observability.logEvent('custom_aa_operation', {
  user_address: smartAccountAddress,
  operation_type: 'batch_transfer',
  gas_cost: receipt.actualGasCost,
  success: receipt.success
});
```

## Troubleshooting

### Common Issues

**User operation stuck**
```typescript
// Check user operation status
const receipt = await aa.getUserOperationReceipt(userOpHash);
if (!receipt) {
  console.log('User operation not found or still pending');
}
```

**Sponsorship denied**
```typescript
// Check paymaster status
const status = await paymaster.getSponsorshipStatus();
if (status.dailyUsed >= status.dailyLimit) {
  console.log('Daily sponsorship limit reached');
}
```

**Session key expired**
```typescript
// Check session key validity
const isValid = await aa.isSessionKeyValid(sessionKeyAddress);
if (!isValid) {
  console.log('Session key has expired');
}
```

### Debug Mode

Enable debug logging for troubleshooting:

```typescript
// Set debug mode
process.env.DEBUG = 'mycelia:aa:*,mycelia:paymaster:*';

// Or enable specific modules
process.env.DEBUG = 'mycelia:aa:userop,mycelia:paymaster:sponsorship';
```

## API Reference

### Account Abstraction

- `createSmartAccount(sender, initCode?)`: Create a smart account
- `createUserOperation(sender, to, value, data, nonce?)`: Create user operation
- `signUserOperation(userOp, privateKey)`: Sign user operation
- `sendUserOperation(userOp)`: Send to bundler
- `waitForUserOperation(userOpHash, timeout?)`: Wait for confirmation
- `createSessionKey(config)`: Create session key
- `revokeSessionKey(address)`: Revoke session key
- `estimateUserOperationGas(userOp)`: Estimate gas costs

### Paymaster

- `canSponsor(request)`: Check sponsorship eligibility
- `sponsorUserOperation(request)`: Sponsor with ETH
- `sponsorWithBLOOM(request, bloomAmount)`: Sponsor with BLOOM
- `getSponsorshipStatus()`: Get current status
- `updatePolicy(policy)`: Update sponsorship policy
