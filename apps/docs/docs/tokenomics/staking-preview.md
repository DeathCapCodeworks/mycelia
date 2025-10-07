---
title: Staking Preview
---

# Staking Preview

The Mycelia staking system provides a preview of validator and delegation mechanics for the future mainnet. This system demonstrates how BLOOM token holders can participate in network security and earn rewards.

## Overview

The staking preview includes:
- Validator registration and management
- Delegation mechanics
- Epoch-based reward distribution
- Peg-protected reward minting

**Important:** This is a testnet preview only. Mainnet staking will be available in future releases.

## Staking Mechanics

### Validator Registration

Validators register with the network by:
- Providing a public key for identification
- Staking an initial amount of BLOOM tokens
- Maintaining active status and uptime

### Delegation Process

BLOOM holders can delegate to validators:
- Choose validators based on performance and stake
- Delegate any amount of BLOOM tokens
- Earn proportional rewards based on delegation amount

### Epoch Rewards

Rewards are distributed in epochs:
- **Reward Rate**: 1% of total stake per epoch
- **Distribution**: Proportional to stake and delegation amounts
- **Peg Protection**: Rewards only minted when reserves allow

## Implementation

### Validator Management

```typescript
import { registerValidator, getValidatorStats } from '@mycelia/staking';

// Register a new validator
const validator = registerValidator('validator-pubkey', 1000n);

// Get validator statistics
const stats = getValidatorStats('validator-pubkey');
console.log(`Total stake: ${stats.totalStake}`);
console.log(`Delegations: ${stats.delegationCount}`);
```

### Delegation Operations

```typescript
import { delegate, getDelegatorDelegations } from '@mycelia/staking';

// Create delegation
const delegation = delegate('delegator-address', 'validator-pubkey', 500n);

// Get delegator's delegations
const delegations = getDelegatorDelegations('delegator-address');
```

### Epoch Management

```typescript
import { tickEpoch } from '@mycelia/staking';

// Tick epoch and mint rewards
const rewards = await tickEpoch();
console.log(`Total minted: ${rewards.totalMinted}`);
console.log(`Blocked: ${rewards.blocked}`);
```

## Reward Distribution

### Calculation Method

Rewards are calculated based on:
- **Total Stake**: Sum of all validator stakes and delegations
- **Reward Rate**: 1% of total stake per epoch
- **Proportional Distribution**: Based on individual stake amounts

### Peg Protection

The staking system enforces peg protection:
- **Mint Guard**: Checks reserves before minting rewards
- **Collateralization**: Ensures 100% backing for all BLOOM
- **Blocked Epochs**: Rewards blocked if reserves insufficient

### Example Calculation

```
Total Stake: 100,000 BLOOM
Reward Rate: 1% = 1,000 BLOOM
Validator A: 40,000 BLOOM stake
Validator B: 60,000 BLOOM stake

Validator A Reward: (40,000 / 100,000) × 1,000 = 400 BLOOM
Validator B Reward: (60,000 / 100,000) × 1,000 = 600 BLOOM
```

## API Reference

### `StakingEngine`

```typescript
class StakingEngine {
  registerValidator(pubkey: string, stake: bigint): Validator;
  delegate(delegator: string, validator: string, amount: bigint): Delegation;
  async tickEpoch(): Promise<EpochRewards>;
  getValidatorStats(pubkey: string): ValidatorStats | null;
  getAllValidators(): Validator[];
  getAllDelegations(): Delegation[];
  getDelegatorDelegations(delegator: string): Delegation[];
  getCurrentEpoch(): number;
}
```

### Data Types

```typescript
interface Validator {
  pubkey: string;
  stake: bigint;
  isActive: boolean;
  registeredAt: number;
  totalDelegations: bigint;
}

interface Delegation {
  delegator: string;
  validator: string;
  amount: bigint;
  createdAt: number;
  lastUpdated: number;
}

interface EpochRewards {
  epoch: number;
  totalMinted: bigint;
  validatorRewards: Record<string, bigint>;
  delegatorRewards: Record<string, bigint>;
  blocked: boolean;
  reason?: string;
}
```

## Monitoring and Observability

The staking system emits structured events:

- `validator_registered`: New validator registered
- `delegation_created`: New delegation created
- `epoch_ticked`: Epoch completed with rewards
- `epoch_blocked`: Epoch blocked due to insufficient reserves

## Security Considerations

### Validator Security

- **Public Key Management**: Secure key generation and storage
- **Uptime Requirements**: Validators must maintain high uptime
- **Slashing Conditions**: Penalties for malicious behavior

### Delegation Security

- **Non-custodial**: Delegators retain control of their tokens
- **Unbonding Period**: Time delay before undelegation
- **Reward Claims**: Secure reward distribution mechanism

## Future Enhancements

### Mainnet Features

- **Consensus Participation**: Validators participate in consensus
- **Slashing Mechanism**: Penalties for malicious behavior
- **Governance Rights**: Staking weight for governance votes

### Advanced Features

- **Validator Pools**: Pooled validator resources
- **Cross-chain Staking**: Staking across multiple chains
- **Liquid Staking**: Tradeable staking positions

## Testing and Development

### Testnet Environment

The staking preview runs on testnet:
- **Mock Validators**: Simulated validator behavior
- **Test Delegations**: Safe testing environment
- **Epoch Simulation**: Manual epoch progression

### Development Tools

- **Staking Dashboard**: Web interface for staking operations
- **API Testing**: Comprehensive API test suite
- **Monitoring Tools**: Real-time staking metrics

## Troubleshooting

### Common Issues

**Epoch Blocked**
- Check reserve levels and collateralization
- Verify total stake calculations
- Review mint guard conditions

**Delegation Failed**
- Ensure validator is active
- Check delegation amount limits
- Verify delegator address format

**Reward Calculation**
- Review stake distribution
- Check epoch reward rate
- Verify proportional calculations

### Support

For technical support or questions about staking:
- Check the [API Reference](/api-reference)
- Review the [Testing Guide](/testing-guide)
- Contact the development team

## Roadmap

### Phase 1: Testnet Preview (Current)
- Basic validator and delegation mechanics
- Epoch reward distribution
- Peg-protected minting

### Phase 2: Mainnet Launch
- Full consensus participation
- Slashing mechanisms
- Governance integration

### Phase 3: Advanced Features
- Liquid staking
- Cross-chain support
- Enhanced security features
