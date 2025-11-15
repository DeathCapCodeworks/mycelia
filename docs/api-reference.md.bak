# Mycelia API Reference

This document provides comprehensive API reference for all Mycelia packages and their interfaces.

## Table of Contents

1. [Core SDK (@mycelia/developer-sdk)](#core-sdk-myceliadeveloper-sdk)
2. [Tokenomics (@mycelia/tokenomics)](#tokenomics-myceliatokenomics)
3. [EVM Compatibility (@mycelia/evm-compat)](#evm-compatibility-myceliaevm-compat)
4. [Solana Compatibility (@mycelia/solana-compat)](#solana-compatibility-myceliasolana-compat)
5. [Bridge Infrastructure (@mycelia/bridge-infrastructure)](#bridge-infrastructure-myceliabridge-infrastructure)
6. [Mining Application (@mycelia/mining-app)](#mining-application-myceliamining-app)
7. [Wallet Integration (@mycelia/wallet-integration)](#wallet-integration-myceliawallet-integration)
8. [Bloom Contracts (@mycelia/bloom-contracts)](#bloom-contracts-myceliabloom-contracts)
9. [Shared Kernel (@mycelia/shared-kernel)](#shared-kernel-myceliashared-kernel)
10. [Proof of Reserve (@mycelia/proof-of-reserve)](#proof-of-reserve-myceliaproof-of-reserve)

## Core SDK (@mycelia/developer-sdk)

### MyceliaSDK

Main SDK class for cross-chain operations.

```typescript
class MyceliaSDK {
  constructor(config: MyceliaSDKConfig);
  createEVMWallet(privateKey: string): IMyceliaWallet;
  createSolanaWallet(privateKey: string): IMyceliaWallet;
  getEVMProvider(): MyceliaEVMProvider;
  getSolanaConnection(): MyceliaSolanaConnection;
}
```

#### Constructor

```typescript
constructor(config: MyceliaSDKConfig)
```

**Parameters:**
- `config` (MyceliaSDKConfig): SDK configuration object

**Example:**
```typescript
const sdk = new MyceliaSDK({
  evm: {
    rpcUrl: 'https://mainnet.infura.io/v3/YOUR_PROJECT_ID',
    bloomTokenAddress: '0xBloomToken1234567890123456789012345678901234',
    gasOracleAddress: '0x0000000000000000000000000000000000000000'
  },
  solana: {
    rpcUrl: 'https://api.mainnet-beta.solana.com',
    bloomTokenMint: 'BloomToken1111111111111111111111111111111111111',
    rentOracleProgram: '11111111111111111111111111111112'
  }
});
```

#### Methods

##### createEVMWallet

```typescript
createEVMWallet(privateKey: string): IMyceliaWallet
```

Creates an EVM wallet instance.

**Parameters:**
- `privateKey` (string): Private key for the wallet

**Returns:**
- `IMyceliaWallet`: EVM wallet instance

**Example:**
```typescript
const wallet = sdk.createEVMWallet('0x1234567890123456789012345678901234567890123456789012345678901234');
```

##### createSolanaWallet

```typescript
createSolanaWallet(privateKey: string): IMyceliaWallet
```

Creates a Solana wallet instance.

**Parameters:**
- `privateKey` (string): Private key for the wallet

**Returns:**
- `IMyceliaWallet`: Solana wallet instance

**Example:**
```typescript
const wallet = sdk.createSolanaWallet('your-solana-private-key');
```

##### getEVMProvider

```typescript
getEVMProvider(): MyceliaEVMProvider
```

Gets the EVM provider instance.

**Returns:**
- `MyceliaEVMProvider`: EVM provider instance

##### getSolanaConnection

```typescript
getSolanaConnection(): MyceliaSolanaConnection
```

Gets the Solana connection instance.

**Returns:**
- `MyceliaSolanaConnection`: Solana connection instance

### IMyceliaWallet

Unified wallet interface for cross-chain operations.

```typescript
interface IMyceliaWallet {
  getBloomBalance(): Promise<bigint>;
  sendBloom(to: string | PublicKey, amount: bigint): Promise<any>;
  getBloomBalanceInBtc(): Promise<number>;
  getAddress(): string | PublicKey;
}
```

#### Methods

##### getBloomBalance

```typescript
getBloomBalance(): Promise<bigint>
```

Gets the BLOOM token balance.

**Returns:**
- `Promise<bigint>`: BLOOM token balance

##### sendBloom

```typescript
sendBloom(to: string | PublicKey, amount: bigint): Promise<any>
```

Sends BLOOM tokens to the specified address.

**Parameters:**
- `to` (string | PublicKey): Recipient address
- `amount` (bigint): Amount to send

**Returns:**
- `Promise<any>`: Transaction result

##### getBloomBalanceInBtc

```typescript
getBloomBalanceInBtc(): Promise<number>
```

Gets the BLOOM balance in BTC equivalent.

**Returns:**
- `Promise<number>`: BTC equivalent

##### getAddress

```typescript
getAddress(): string | PublicKey
```

Gets the wallet address.

**Returns:**
- `string | PublicKey`: Wallet address

## Tokenomics (@mycelia/tokenomics)

### Constants

```typescript
const SATS_PER_BTC = 100_000_000n;
const BTC_PER_BLOOM_RATIO = 10n;
const SATS_PER_BLOOM = SATS_PER_BTC / BTC_PER_BLOOM_RATIO;
```

### Functions

#### bloomToSats

```typescript
function bloomToSats(bloom: bigint): bigint
```

Converts BLOOM amount to satoshis.

**Parameters:**
- `bloom` (bigint): BLOOM amount

**Returns:**
- `bigint`: Satoshis

**Example:**
```typescript
const sats = bloomToSats(1000000000000000000n); // 1 BLOOM = 10,000,000 sats
```

#### satsToBloom

```typescript
function satsToBloom(sats: bigint): bigint
```

Converts satoshis to BLOOM amount (floor division).

**Parameters:**
- `sats` (bigint): Satoshis

**Returns:**
- `bigint`: BLOOM amount

**Example:**
```typescript
const bloom = satsToBloom(10000000n); // 10,000,000 sats = 1 BLOOM
```

#### assertPeg

```typescript
function assertPeg(): string
```

Returns the canonical peg statement.

**Returns:**
- `string`: Peg statement

**Example:**
```typescript
const pegStatement = assertPeg(); // "Peg: 10 BLOOM = 1 BTC"
```

#### requiredSatsForSupply

```typescript
function requiredSatsForSupply(outstandingBloom: bigint): bigint
```

Calculates required satoshis for outstanding BLOOM supply.

**Parameters:**
- `outstandingBloom` (bigint): Outstanding BLOOM supply

**Returns:**
- `bigint`: Required satoshis

#### collateralizationRatio

```typescript
function collateralizationRatio(lockedSats: bigint, outstandingBloom: bigint): number
```

Calculates collateralization ratio.

**Parameters:**
- `lockedSats` (bigint): Locked satoshis
- `outstandingBloom` (bigint): Outstanding BLOOM supply

**Returns:**
- `number`: Collateralization ratio

#### isFullyReserved

```typescript
function isFullyReserved(lockedSats: bigint, outstandingBloom: bigint): boolean
```

Checks if system is fully reserved.

**Parameters:**
- `lockedSats` (bigint): Locked satoshis
- `outstandingBloom` (bigint): Outstanding BLOOM supply

**Returns:**
- `boolean`: True if fully reserved

#### canMint

```typescript
function canMint(mintAmountBloom: bigint, feeds: {reserve: ReserveFeed; supply: SupplyFeed}): Promise<boolean>
```

Checks if minting is allowed.

**Parameters:**
- `mintAmountBloom` (bigint): Amount to mint
- `feeds` (object): Reserve and supply feeds

**Returns:**
- `Promise<boolean>`: True if minting is allowed

#### assertCanMint

```typescript
function assertCanMint(mintAmountBloom: bigint, feeds: {reserve: ReserveFeed; supply: SupplyFeed}): Promise<void>
```

Asserts that minting is allowed, throws error if not.

**Parameters:**
- `mintAmountBloom` (bigint): Amount to mint
- `feeds` (object): Reserve and supply feeds

**Throws:**
- `Error`: If minting would break peg

#### maxRedeemableBloom

```typescript
function maxRedeemableBloom(lockedSats: bigint, outstandingBloom: bigint): bigint
```

Calculates maximum redeemable BLOOM.

**Parameters:**
- `lockedSats` (bigint): Locked satoshis
- `outstandingBloom` (bigint): Outstanding BLOOM supply

**Returns:**
- `bigint`: Maximum redeemable BLOOM

#### quoteRedeemBloomToSats

```typescript
function quoteRedeemBloomToSats(bloom: bigint): bigint
```

Quotes BLOOM redemption in satoshis.

**Parameters:**
- `bloom` (bigint): BLOOM amount to redeem

**Returns:**
- `bigint`: Satoshis to receive

### Interfaces

#### ReserveFeed

```typescript
interface ReserveFeed {
  getLockedBtcSats(): Promise<bigint>;
}
```

#### SupplyFeed

```typescript
interface SupplyFeed {
  getBloomOutstanding(): Promise<bigint>;
}
```

## EVM Compatibility (@mycelia/evm-compat)

### MyceliaEVMProvider

Extended Ethereum provider with BLOOM token functionality.

```typescript
class MyceliaEVMProvider extends ethers.JsonRpcProvider {
  constructor(rpcUrl: string, bloomTokenAddress: string, gasOracleAddress: string);
  getBloomBalance(address: string): Promise<bigint>;
  getBloomBalanceInBtc(address: string): Promise<number>;
  getGasPriceInBloom(): Promise<bigint>;
}
```

#### Constructor

```typescript
constructor(rpcUrl: string, bloomTokenAddress: string, gasOracleAddress: string)
```

**Parameters:**
- `rpcUrl` (string): RPC URL
- `bloomTokenAddress` (string): BLOOM token contract address
- `gasOracleAddress` (string): Gas oracle contract address

#### Methods

##### getBloomBalance

```typescript
getBloomBalance(address: string): Promise<bigint>
```

Gets BLOOM token balance for address.

**Parameters:**
- `address` (string): Ethereum address

**Returns:**
- `Promise<bigint>`: BLOOM token balance

##### getBloomBalanceInBtc

```typescript
getBloomBalanceInBtc(address: string): Promise<number>
```

Gets BLOOM balance in BTC equivalent.

**Parameters:**
- `address` (string): Ethereum address

**Returns:**
- `Promise<number>`: BTC equivalent

##### getGasPriceInBloom

```typescript
getGasPriceInBloom(): Promise<bigint>
```

Gets gas price in BLOOM tokens.

**Returns:**
- `Promise<bigint>`: Gas price in BLOOM

### MyceliaEVMSigner

Extended Ethereum signer with BLOOM token functionality.

```typescript
class MyceliaEVMSigner extends ethers.Wallet {
  constructor(privateKey: string, provider: MyceliaEVMProvider, bloomTokenAddress: string);
  getBloomBalance(): Promise<bigint>;
  sendBloom(to: string, amount: bigint): Promise<ethers.TransactionResponse>;
}
```

#### Constructor

```typescript
constructor(privateKey: string, provider: MyceliaEVMProvider, bloomTokenAddress: string)
```

**Parameters:**
- `privateKey` (string): Private key
- `provider` (MyceliaEVMProvider): EVM provider
- `bloomTokenAddress` (string): BLOOM token contract address

#### Methods

##### getBloomBalance

```typescript
getBloomBalance(): Promise<bigint>
```

Gets BLOOM token balance.

**Returns:**
- `Promise<bigint>`: BLOOM token balance

##### sendBloom

```typescript
sendBloom(to: string, amount: bigint): Promise<ethers.TransactionResponse>
```

Sends BLOOM tokens.

**Parameters:**
- `to` (string): Recipient address
- `amount` (bigint): Amount to send

**Returns:**
- `Promise<ethers.TransactionResponse>`: Transaction response

## Solana Compatibility (@mycelia/solana-compat)

### MyceliaSolanaConnection

Extended Solana connection with BLOOM token functionality.

```typescript
class MyceliaSolanaConnection extends Connection {
  constructor(endpoint: string, bloomTokenMint: PublicKey, rentOracleProgram: PublicKey);
  getBloomBalance(owner: PublicKey): Promise<bigint>;
  getBloomBalanceInBtc(owner: PublicKey): Promise<number>;
  getRentInBloom(dataSize: number): Promise<bigint>;
}
```

#### Constructor

```typescript
constructor(endpoint: string, bloomTokenMint: PublicKey, rentOracleProgram: PublicKey)
```

**Parameters:**
- `endpoint` (string): Solana RPC endpoint
- `bloomTokenMint` (PublicKey): BLOOM token mint
- `rentOracleProgram` (PublicKey): Rent oracle program

#### Methods

##### getBloomBalance

```typescript
getBloomBalance(owner: PublicKey): Promise<bigint>
```

Gets BLOOM token balance for owner.

**Parameters:**
- `owner` (PublicKey): Owner public key

**Returns:**
- `Promise<bigint>`: BLOOM token balance

##### getBloomBalanceInBtc

```typescript
getBloomBalanceInBtc(owner: PublicKey): Promise<number>
```

Gets BLOOM balance in BTC equivalent.

**Parameters:**
- `owner` (PublicKey): Owner public key

**Returns:**
- `Promise<number>`: BTC equivalent

##### getRentInBloom

```typescript
getRentInBloom(dataSize: number): Promise<bigint>
```

Gets rent cost in BLOOM tokens.

**Parameters:**
- `dataSize` (number): Data size in bytes

**Returns:**
- `Promise<bigint>`: Rent cost in BLOOM

### MyceliaSolanaWallet

Solana wallet with BLOOM token functionality.

```typescript
class MyceliaSolanaWallet {
  constructor(privateKey: string, connection: MyceliaSolanaConnection, bloomTokenMint: PublicKey);
  get publicKey(): PublicKey;
  getBloomBalance(): Promise<bigint>;
  sendBloom(recipient: PublicKey, amount: bigint): Promise<string>;
}
```

#### Constructor

```typescript
constructor(privateKey: string, connection: MyceliaSolanaConnection, bloomTokenMint: PublicKey)
```

**Parameters:**
- `privateKey` (string): Private key
- `connection` (MyceliaSolanaConnection): Solana connection
- `bloomTokenMint` (PublicKey): BLOOM token mint

#### Properties

##### publicKey

```typescript
get publicKey(): PublicKey
```

Gets the public key.

**Returns:**
- `PublicKey`: Wallet public key

#### Methods

##### getBloomBalance

```typescript
getBloomBalance(): Promise<bigint>
```

Gets BLOOM token balance.

**Returns:**
- `Promise<bigint>`: BLOOM token balance

##### sendBloom

```typescript
sendBloom(recipient: PublicKey, amount: bigint): Promise<string>
```

Sends BLOOM tokens.

**Parameters:**
- `recipient` (PublicKey): Recipient public key
- `amount` (bigint): Amount to send

**Returns:**
- `Promise<string>`: Transaction signature

## Bridge Infrastructure (@mycelia/bridge-infrastructure)

### CrossChainBridge

Main bridge class for cross-chain operations.

```typescript
class CrossChainBridge {
  constructor(config: BridgeConfig);
  lockAndMint(fromAddress: string, toAddress: string, amount: bigint, privateKey: string): Promise<BridgeTransaction>;
  burnAndUnlock(fromAddress: string, toAddress: string, amount: bigint, privateKey: string): Promise<BridgeTransaction>;
  crossChainTransfer(fromChain: BridgeChain, toChain: BridgeChain, fromAddress: string, toAddress: string, amount: bigint, privateKey: string): Promise<BridgeTransaction>;
  getTransaction(transactionId: string): BridgeTransaction | undefined;
  getAllTransactions(): BridgeTransaction[];
  getTransactionsByStatus(status: BridgeStatus): BridgeTransaction[];
  getTransactionsByChain(chain: BridgeChain): BridgeTransaction[];
  subscribeToTransaction(transactionId: string, callback: (tx: BridgeTransaction) => void): void;
  unsubscribeFromTransaction(transactionId: string): void;
  getBridgeStatistics(): BridgeStatistics;
  estimateBridgeFees(fromChain: BridgeChain, toChain: BridgeChain, amount: bigint): Promise<BridgeFees>;
}
```

#### Constructor

```typescript
constructor(config: BridgeConfig)
```

**Parameters:**
- `config` (BridgeConfig): Bridge configuration

#### Methods

##### lockAndMint

```typescript
lockAndMint(fromAddress: string, toAddress: string, amount: bigint, privateKey: string): Promise<BridgeTransaction>
```

Locks tokens on EVM and mints on Solana.

**Parameters:**
- `fromAddress` (string): Source address
- `toAddress` (string): Destination address
- `amount` (bigint): Amount to transfer
- `privateKey` (string): Private key

**Returns:**
- `Promise<BridgeTransaction>`: Bridge transaction

##### burnAndUnlock

```typescript
burnAndUnlock(fromAddress: string, toAddress: string, amount: bigint, privateKey: string): Promise<BridgeTransaction>
```

Burns tokens on Solana and unlocks on EVM.

**Parameters:**
- `fromAddress` (string): Source address
- `toAddress` (string): Destination address
- `amount` (bigint): Amount to transfer
- `privateKey` (string): Private key

**Returns:**
- `Promise<BridgeTransaction>`: Bridge transaction

##### crossChainTransfer

```typescript
crossChainTransfer(fromChain: BridgeChain, toChain: BridgeChain, fromAddress: string, toAddress: string, amount: bigint, privateKey: string): Promise<BridgeTransaction>
```

Performs cross-chain transfer.

**Parameters:**
- `fromChain` (BridgeChain): Source chain
- `toChain` (BridgeChain): Destination chain
- `fromAddress` (string): Source address
- `toAddress` (string): Destination address
- `amount` (bigint): Amount to transfer
- `privateKey` (string): Private key

**Returns:**
- `Promise<BridgeTransaction>`: Bridge transaction

##### getTransaction

```typescript
getTransaction(transactionId: string): BridgeTransaction | undefined
```

Gets transaction by ID.

**Parameters:**
- `transactionId` (string): Transaction ID

**Returns:**
- `BridgeTransaction | undefined`: Bridge transaction

##### getAllTransactions

```typescript
getAllTransactions(): BridgeTransaction[]
```

Gets all transactions.

**Returns:**
- `BridgeTransaction[]`: All transactions

##### getTransactionsByStatus

```typescript
getTransactionsByStatus(status: BridgeStatus): BridgeTransaction[]
```

Gets transactions by status.

**Parameters:**
- `status` (BridgeStatus): Transaction status

**Returns:**
- `BridgeTransaction[]`: Filtered transactions

##### getTransactionsByChain

```typescript
getTransactionsByChain(chain: BridgeChain): BridgeTransaction[]
```

Gets transactions by chain.

**Parameters:**
- `chain` (BridgeChain): Chain type

**Returns:**
- `BridgeTransaction[]`: Filtered transactions

##### subscribeToTransaction

```typescript
subscribeToTransaction(transactionId: string, callback: (tx: BridgeTransaction) => void): void
```

Subscribes to transaction updates.

**Parameters:**
- `transactionId` (string): Transaction ID
- `callback` (function): Callback function

##### unsubscribeFromTransaction

```typescript
unsubscribeFromTransaction(transactionId: string): void
```

Unsubscribes from transaction updates.

**Parameters:**
- `transactionId` (string): Transaction ID

##### getBridgeStatistics

```typescript
getBridgeStatistics(): BridgeStatistics
```

Gets bridge statistics.

**Returns:**
- `BridgeStatistics`: Bridge statistics

##### estimateBridgeFees

```typescript
estimateBridgeFees(fromChain: BridgeChain, toChain: BridgeChain, amount: bigint): Promise<BridgeFees>
```

Estimates bridge fees.

**Parameters:**
- `fromChain` (BridgeChain): Source chain
- `toChain` (BridgeChain): Destination chain
- `amount` (bigint): Transfer amount

**Returns:**
- `Promise<BridgeFees>`: Bridge fees

### Enums

#### BridgeChain

```typescript
enum BridgeChain {
  EVM = 'evm',
  SOLANA = 'solana',
  BITCOIN = 'bitcoin'
}
```

#### BridgeStatus

```typescript
enum BridgeStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  COMPLETED = 'completed',
  FAILED = 'failed',
  EXPIRED = 'expired'
}
```

#### BridgeType

```typescript
enum BridgeType {
  LOCK_AND_MINT = 'lock_and_mint',
  BURN_AND_UNLOCK = 'burn_and_unlock',
  CROSS_CHAIN_TRANSFER = 'cross_chain_transfer'
}
```

### Interfaces

#### BridgeTransaction

```typescript
interface BridgeTransaction {
  id: string;
  type: BridgeType;
  fromChain: BridgeChain;
  toChain: BridgeChain;
  fromAddress: string;
  toAddress: string;
  amount: bigint;
  status: BridgeStatus;
  createdAt: number;
  confirmedAt?: number;
  completedAt?: number;
  txHash?: string;
  proof?: string;
  metadata?: Record<string, any>;
}
```

#### BridgeConfig

```typescript
interface BridgeConfig {
  evm: {
    rpcUrl: string;
    bridgeContract: string;
    bloomTokenAddress: string;
    mintGuardAddress: string;
    confirmations: number;
  };
  solana: {
    rpcUrl: string;
    bridgeProgram: string;
    bloomTokenMint: string;
    confirmations: number;
  };
  bitcoin: {
    rpcUrl: string;
    confirmations: number;
  };
  relayer: {
    url: string;
    apiKey?: string;
  };
}
```

## Mining Application (@mycelia/mining-app)

### MiningApplication

Main mining application class.

```typescript
class MiningApplication {
  constructor(ipfsConfig: IPFSConfig, supplyLedger: SupplyLedger, mintingFeeds: MintingFeeds);
  initialize(): Promise<void>;
  startMiningSession(minerId: string, requirements?: Partial<ResourceMetrics>): Promise<MiningSession>;
  processContribution(sessionId: string, contribution: ContributionData): Promise<ContributionResult>;
  stopMiningSession(sessionId: string): Promise<MiningSession>;
  getMiningSession(sessionId: string): MiningSession | undefined;
  getAllMiningSessions(): MiningSession[];
  getMiningStatus(): MiningStatus;
  requestRedemption(sessionId: string, btcAddress: string): Promise<RedeemIntent>;
  shutdown(): Promise<void>;
}
```

#### Constructor

```typescript
constructor(ipfsConfig: IPFSConfig, supplyLedger: SupplyLedger, mintingFeeds: MintingFeeds)
```

**Parameters:**
- `ipfsConfig` (IPFSConfig): IPFS configuration
- `supplyLedger` (SupplyLedger): Supply ledger instance
- `mintingFeeds` (MintingFeeds): Minting feeds

#### Methods

##### initialize

```typescript
initialize(): Promise<void>
```

Initializes the mining application.

##### startMiningSession

```typescript
startMiningSession(minerId: string, requirements?: Partial<ResourceMetrics>): Promise<MiningSession>
```

Starts a mining session.

**Parameters:**
- `minerId` (string): Miner ID
- `requirements` (Partial<ResourceMetrics>): Resource requirements

**Returns:**
- `Promise<MiningSession>`: Mining session

##### processContribution

```typescript
processContribution(sessionId: string, contribution: ContributionData): Promise<ContributionResult>
```

Processes a mining contribution.

**Parameters:**
- `sessionId` (string): Session ID
- `contribution` (ContributionData): Contribution data

**Returns:**
- `Promise<ContributionResult>`: Contribution result

##### stopMiningSession

```typescript
stopMiningSession(sessionId: string): Promise<MiningSession>
```

Stops a mining session.

**Parameters:**
- `sessionId` (string): Session ID

**Returns:**
- `Promise<MiningSession>`: Completed session

##### getMiningSession

```typescript
getMiningSession(sessionId: string): MiningSession | undefined
```

Gets a mining session.

**Parameters:**
- `sessionId` (string): Session ID

**Returns:**
- `MiningSession | undefined`: Mining session

##### getAllMiningSessions

```typescript
getAllMiningSessions(): MiningSession[]
```

Gets all mining sessions.

**Returns:**
- `MiningSession[]`: All sessions

##### getMiningStatus

```typescript
getMiningStatus(): MiningStatus
```

Gets mining status.

**Returns:**
- `MiningStatus`: Mining status

##### requestRedemption

```typescript
requestRedemption(sessionId: string, btcAddress: string): Promise<RedeemIntent>
```

Requests redemption of mining rewards.

**Parameters:**
- `sessionId` (string): Session ID
- `btcAddress` (string): Bitcoin address

**Returns:**
- `Promise<RedeemIntent>`: Redemption intent

##### shutdown

```typescript
shutdown(): Promise<void>
```

Shuts down the mining application.

### Interfaces

#### MiningSession

```typescript
interface MiningSession {
  id: string;
  startTime: number;
  endTime?: number;
  resourcesAllocated: ResourceMetrics;
  contributionScore: ContributionScore;
  rewardsEarned: bigint;
  status: 'active' | 'completed' | 'failed';
}
```

#### ResourceMetrics

```typescript
interface ResourceMetrics {
  storageUsed: number;
  storageAvailable: number;
  bandwidthUsed: number;
  bandwidthAvailable: number;
  uptime: number;
  lastSeen: number;
}
```

#### ContributionScore

```typescript
interface ContributionScore {
  storageScore: number;
  bandwidthScore: number;
  uptimeScore: number;
  totalScore: number;
  tier: 1 | 2 | 3;
  multiplier: number;
}
```

## Wallet Integration (@mycelia/wallet-integration)

### EVMWalletManager

EVM wallet management class.

```typescript
class EVMWalletManager {
  connectMetaMask(): Promise<WalletState>;
  connectCoinbase(): Promise<WalletState>;
  disconnect(): Promise<void>;
  getState(): WalletState;
  getBloomBalance(): Promise<bigint>;
  getBloomBalanceInBtc(): Promise<number>;
  sendBloom(to: string, amount: bigint): Promise<string>;
  addEventListener(listener: WalletEventListener): void;
  removeEventListener(listener: WalletEventListener): void;
  static isMetaMaskInstalled(): boolean;
  static isCoinbaseInstalled(): boolean;
}
```

#### Methods

##### connectMetaMask

```typescript
connectMetaMask(): Promise<WalletState>
```

Connects to MetaMask wallet.

**Returns:**
- `Promise<WalletState>`: Wallet state

##### connectCoinbase

```typescript
connectCoinbase(): Promise<WalletState>
```

Connects to Coinbase wallet.

**Returns:**
- `Promise<WalletState>`: Wallet state

##### disconnect

```typescript
disconnect(): Promise<void>
```

Disconnects the wallet.

##### getState

```typescript
getState(): WalletState
```

Gets the current wallet state.

**Returns:**
- `WalletState`: Wallet state

##### getBloomBalance

```typescript
getBloomBalance(): Promise<bigint>
```

Gets BLOOM token balance.

**Returns:**
- `Promise<bigint>`: BLOOM balance

##### getBloomBalanceInBtc

```typescript
getBloomBalanceInBtc(): Promise<number>
```

Gets BLOOM balance in BTC equivalent.

**Returns:**
- `Promise<number>`: BTC equivalent

##### sendBloom

```typescript
sendBloom(to: string, amount: bigint): Promise<string>
```

Sends BLOOM tokens.

**Parameters:**
- `to` (string): Recipient address
- `amount` (bigint): Amount to send

**Returns:**
- `Promise<string>`: Transaction hash

##### addEventListener

```typescript
addEventListener(listener: WalletEventListener): void
```

Adds event listener.

**Parameters:**
- `listener` (WalletEventListener): Event listener

##### removeEventListener

```typescript
removeEventListener(listener: WalletEventListener): void
```

Removes event listener.

**Parameters:**
- `listener` (WalletEventListener): Event listener

##### isMetaMaskInstalled

```typescript
static isMetaMaskInstalled(): boolean
```

Checks if MetaMask is installed.

**Returns:**
- `boolean`: True if installed

##### isCoinbaseInstalled

```typescript
static isCoinbaseInstalled(): boolean
```

Checks if Coinbase wallet is installed.

**Returns:**
- `boolean`: True if installed

### SolanaWalletManager

Solana wallet management class.

```typescript
class SolanaWalletManager {
  connectPhantom(): Promise<WalletState>;
  connectSolflare(): Promise<WalletState>;
  connectBackpack(): Promise<WalletState>;
  disconnect(): Promise<void>;
  getState(): WalletState;
  getBloomBalance(): Promise<bigint>;
  getBloomBalanceInBtc(): Promise<number>;
  sendBloom(to: PublicKey, amount: bigint): Promise<string>;
  addEventListener(listener: WalletEventListener): void;
  removeEventListener(listener: WalletEventListener): void;
  static isPhantomInstalled(): boolean;
  static isSolflareInstalled(): boolean;
  static isBackpackInstalled(): boolean;
}
```

#### Methods

##### connectPhantom

```typescript
connectPhantom(): Promise<WalletState>
```

Connects to Phantom wallet.

**Returns:**
- `Promise<WalletState>`: Wallet state

##### connectSolflare

```typescript
connectSolflare(): Promise<WalletState>
```

Connects to Solflare wallet.

**Returns:**
- `Promise<WalletState>`: Wallet state

##### connectBackpack

```typescript
connectBackpack(): Promise<WalletState>
```

Connects to Backpack wallet.

**Returns:**
- `Promise<WalletState>`: Wallet state

##### disconnect

```typescript
disconnect(): Promise<void>
```

Disconnects the wallet.

##### getState

```typescript
getState(): WalletState
```

Gets the current wallet state.

**Returns:**
- `WalletState`: Wallet state

##### getBloomBalance

```typescript
getBloomBalance(): Promise<bigint>
```

Gets BLOOM token balance.

**Returns:**
- `Promise<bigint>`: BLOOM balance

##### getBloomBalanceInBtc

```typescript
getBloomBalanceInBtc(): Promise<number>
```

Gets BLOOM balance in BTC equivalent.

**Returns:**
- `Promise<number>`: BTC equivalent

##### sendBloom

```typescript
sendBloom(to: PublicKey, amount: bigint): Promise<string>
```

Sends BLOOM tokens.

**Parameters:**
- `to` (PublicKey): Recipient public key
- `amount` (bigint): Amount to send

**Returns:**
- `Promise<string>`: Transaction signature

##### addEventListener

```typescript
addEventListener(listener: WalletEventListener): void
```

Adds event listener.

**Parameters:**
- `listener` (WalletEventListener): Event listener

##### removeEventListener

```typescript
removeEventListener(listener: WalletEventListener): void
```

Removes event listener.

**Parameters:**
- `listener` (WalletEventListener): Event listener

##### isPhantomInstalled

```typescript
static isPhantomInstalled(): boolean
```

Checks if Phantom is installed.

**Returns:**
- `boolean`: True if installed

##### isSolflareInstalled

```typescript
static isSolflareInstalled(): boolean
```

Checks if Solflare is installed.

**Returns:**
- `boolean`: True if installed

##### isBackpackInstalled

```typescript
static isBackpackInstalled(): boolean
```

Checks if Backpack is installed.

**Returns:**
- `boolean`: True if installed

### CrossChainWalletManager

Cross-chain wallet management class.

```typescript
class CrossChainWalletManager {
  constructor(sdkConfig?: MyceliaSDKConfig, bridgeConfig?: BridgeConfig);
  connectEVM(walletType: WalletType): Promise<WalletState>;
  connectSolana(walletType: WalletType): Promise<WalletState>;
  disconnectEVM(): Promise<void>;
  disconnectSolana(): Promise<void>;
  disconnectAll(): Promise<void>;
  getState(): CrossChainWalletState;
  getTotalBloomBalance(): Promise<bigint>;
  getTotalBloomBalanceInBtc(): Promise<number>;
  crossChainTransfer(fromChain: BridgeChain, toChain: BridgeChain, toAddress: string, amount: bigint): Promise<string>;
  getAvailableWallets(): WalletInfo[];
  addEventListener(listener: WalletEventListener): void;
  removeEventListener(listener: WalletEventListener): void;
}
```

#### Constructor

```typescript
constructor(sdkConfig?: MyceliaSDKConfig, bridgeConfig?: BridgeConfig)
```

**Parameters:**
- `sdkConfig` (MyceliaSDKConfig): SDK configuration
- `bridgeConfig` (BridgeConfig): Bridge configuration

#### Methods

##### connectEVM

```typescript
connectEVM(walletType: WalletType): Promise<WalletState>
```

Connects EVM wallet.

**Parameters:**
- `walletType` (WalletType): Wallet type

**Returns:**
- `Promise<WalletState>`: Wallet state

##### connectSolana

```typescript
connectSolana(walletType: WalletType): Promise<WalletState>
```

Connects Solana wallet.

**Parameters:**
- `walletType` (WalletType): Wallet type

**Returns:**
- `Promise<WalletState>`: Wallet state

##### disconnectEVM

```typescript
disconnectEVM(): Promise<void>
```

Disconnects EVM wallet.

##### disconnectSolana

```typescript
disconnectSolana(): Promise<void>
```

Disconnects Solana wallet.

##### disconnectAll

```typescript
disconnectAll(): Promise<void>
```

Disconnects all wallets.

##### getState

```typescript
getState(): CrossChainWalletState
```

Gets cross-chain wallet state.

**Returns:**
- `CrossChainWalletState`: Cross-chain state

##### getTotalBloomBalance

```typescript
getTotalBloomBalance(): Promise<bigint>
```

Gets total BLOOM balance across chains.

**Returns:**
- `Promise<bigint>`: Total balance

##### getTotalBloomBalanceInBtc

```typescript
getTotalBloomBalanceInBtc(): Promise<number>
```

Gets total BLOOM balance in BTC equivalent.

**Returns:**
- `Promise<number>`: Total BTC equivalent

##### crossChainTransfer

```typescript
crossChainTransfer(fromChain: BridgeChain, toChain: BridgeChain, toAddress: string, amount: bigint): Promise<string>
```

Performs cross-chain transfer.

**Parameters:**
- `fromChain` (BridgeChain): Source chain
- `toChain` (BridgeChain): Destination chain
- `toAddress` (string): Destination address
- `amount` (bigint): Amount to transfer

**Returns:**
- `Promise<string>`: Transaction ID

##### getAvailableWallets

```typescript
getAvailableWallets(): WalletInfo[]
```

Gets available wallets.

**Returns:**
- `WalletInfo[]`: Available wallets

##### addEventListener

```typescript
addEventListener(listener: WalletEventListener): void
```

Adds event listener.

**Parameters:**
- `listener` (WalletEventListener): Event listener

##### removeEventListener

```typescript
removeEventListener(listener: WalletEventListener): void
```

Removes event listener.

**Parameters:**
- `listener` (WalletEventListener): Event listener

### Enums

#### WalletType

```typescript
enum WalletType {
  METAMASK = 'metamask',
  PHANTOM = 'phantom',
  SOLFLARE = 'solflare',
  BACKPACK = 'backpack',
  COINBASE = 'coinbase',
  WALLETCONNECT = 'walletconnect'
}
```

#### WalletStatus

```typescript
enum WalletStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  ERROR = 'error'
}
```

### Interfaces

#### WalletState

```typescript
interface WalletState {
  status: WalletStatus;
  address?: string;
  publicKey?: PublicKey;
  balance?: bigint;
  btcEquivalent?: number;
  error?: string;
  connectedAt?: number;
}
```

#### CrossChainWalletState

```typescript
interface CrossChainWalletState {
  evm: WalletState;
  solana: WalletState;
  bridge?: CrossChainBridge;
}
```

#### WalletInfo

```typescript
interface WalletInfo {
  type: WalletType;
  name: string;
  icon: string;
  installed: boolean;
  supported: boolean;
}
```

#### WalletEventListener

```typescript
type WalletEventListener = (event: {
  type: WalletEventType;
  wallet: WalletType;
  data?: any;
}) => void;
```

## Bloom Contracts (@mycelia/bloom-contracts)

### BloomTokenEVM

EVM BLOOM token contract wrapper.

```typescript
class BloomTokenEVM {
  constructor(contractAddress: string, signer: MyceliaEVMSigner);
  name(): Promise<string>;
  symbol(): Promise<string>;
  decimals(): Promise<number>;
  totalSupply(): Promise<bigint>;
  balanceOf(address: string): Promise<bigint>;
  transfer(to: string, amount: bigint): Promise<ethers.ContractTransactionResponse>;
  approve(spender: string, amount: bigint): Promise<ethers.ContractTransactionResponse>;
  allowance(owner: string, spender: string): Promise<bigint>;
  transferFrom(from: string, to: string, amount: bigint): Promise<ethers.ContractTransactionResponse>;
  mint(to: string, amount: bigint, reason: string): Promise<ethers.ContractTransactionResponse>;
  burn(amount: bigint): Promise<ethers.ContractTransactionResponse>;
  burnFrom(from: string, amount: bigint, reason: string): Promise<ethers.ContractTransactionResponse>;
  getSupplyStats(): Promise<SupplyStats>;
  getPegStatement(): Promise<string>;
  bloomToSats(bloomAmount: bigint): Promise<bigint>;
  satsToBloom(sats: bigint): Promise<bigint>;
}
```

#### Constructor

```typescript
constructor(contractAddress: string, signer: MyceliaEVMSigner)
```

**Parameters:**
- `contractAddress` (string): Contract address
- `signer` (MyceliaEVMSigner): EVM signer

#### Methods

##### name

```typescript
name(): Promise<string>
```

Gets token name.

**Returns:**
- `Promise<string>`: Token name

##### symbol

```typescript
symbol(): Promise<string>
```

Gets token symbol.

**Returns:**
- `Promise<string>`: Token symbol

##### decimals

```typescript
decimals(): Promise<number>
```

Gets token decimals.

**Returns:**
- `Promise<number>`: Token decimals

##### totalSupply

```typescript
totalSupply(): Promise<bigint>
```

Gets total supply.

**Returns:**
- `Promise<bigint>`: Total supply

##### balanceOf

```typescript
balanceOf(address: string): Promise<bigint>
```

Gets balance of address.

**Parameters:**
- `address` (string): Ethereum address

**Returns:**
- `Promise<bigint>`: Token balance

##### transfer

```typescript
transfer(to: string, amount: bigint): Promise<ethers.ContractTransactionResponse>
```

Transfers tokens.

**Parameters:**
- `to` (string): Recipient address
- `amount` (bigint): Amount to transfer

**Returns:**
- `Promise<ethers.ContractTransactionResponse>`: Transaction response

##### approve

```typescript
approve(spender: string, amount: bigint): Promise<ethers.ContractTransactionResponse>
```

Approves spender.

**Parameters:**
- `spender` (string): Spender address
- `amount` (bigint): Amount to approve

**Returns:**
- `Promise<ethers.ContractTransactionResponse>`: Transaction response

##### allowance

```typescript
allowance(owner: string, spender: string): Promise<bigint>
```

Gets allowance.

**Parameters:**
- `owner` (string): Owner address
- `spender` (string): Spender address

**Returns:**
- `Promise<bigint>`: Allowance

##### transferFrom

```typescript
transferFrom(from: string, to: string, amount: bigint): Promise<ethers.ContractTransactionResponse>
```

Transfers from address.

**Parameters:**
- `from` (string): Source address
- `to` (string): Recipient address
- `amount` (bigint): Amount to transfer

**Returns:**
- `Promise<ethers.ContractTransactionResponse>`: Transaction response

##### mint

```typescript
mint(to: string, amount: bigint, reason: string): Promise<ethers.ContractTransactionResponse>
```

Mints tokens.

**Parameters:**
- `to` (string): Recipient address
- `amount` (bigint): Amount to mint
- `reason` (string): Mint reason

**Returns:**
- `Promise<ethers.ContractTransactionResponse>`: Transaction response

##### burn

```typescript
burn(amount: bigint): Promise<ethers.ContractTransactionResponse>
```

Burns tokens.

**Parameters:**
- `amount` (bigint): Amount to burn

**Returns:**
- `Promise<ethers.ContractTransactionResponse>`: Transaction response

##### burnFrom

```typescript
burnFrom(from: string, amount: bigint, reason: string): Promise<ethers.ContractTransactionResponse>
```

Burns tokens from address.

**Parameters:**
- `from` (string): Source address
- `amount` (bigint): Amount to burn
- `reason` (string): Burn reason

**Returns:**
- `Promise<ethers.ContractTransactionResponse>`: Transaction response

##### getSupplyStats

```typescript
getSupplyStats(): Promise<SupplyStats>
```

Gets supply statistics.

**Returns:**
- `Promise<SupplyStats>`: Supply statistics

##### getPegStatement

```typescript
getPegStatement(): Promise<string>
```

Gets peg statement.

**Returns:**
- `Promise<string>`: Peg statement

##### bloomToSats

```typescript
bloomToSats(bloomAmount: bigint): Promise<bigint>
```

Converts BLOOM to satoshis.

**Parameters:**
- `bloomAmount` (bigint): BLOOM amount

**Returns:**
- `Promise<bigint>`: Satoshis

##### satsToBloom

```typescript
satsToBloom(sats: bigint): Promise<bigint>
```

Converts satoshis to BLOOM.

**Parameters:**
- `sats` (bigint): Satoshis

**Returns:**
- `Promise<bigint>`: BLOOM amount

### BloomTokenSolana

Solana BLOOM token program wrapper.

```typescript
class BloomTokenSolana {
  constructor(program: Program, mintData: PublicKey, mint: PublicKey);
  initializeBloomMint(name: string, symbol: string, decimals: number): Promise<string>;
  setMintGuard(mintGuard: PublicKey): Promise<string>;
  setReserveFeed(reserveFeed: PublicKey): Promise<string>;
  mintBloom(to: PublicKey, amount: bigint, reason: string): Promise<string>;
  burnBloom(from: PublicKey, amount: bigint, reason: string): Promise<string>;
  getPegInfo(): Promise<PegInfo>;
  getMintData(): Promise<MintData>;
}
```

#### Constructor

```typescript
constructor(program: Program, mintData: PublicKey, mint: PublicKey)
```

**Parameters:**
- `program` (Program): Anchor program
- `mintData` (PublicKey): Mint data account
- `mint` (PublicKey): Mint account

#### Methods

##### initializeBloomMint

```typescript
initializeBloomMint(name: string, symbol: string, decimals: number): Promise<string>
```

Initializes BLOOM token mint.

**Parameters:**
- `name` (string): Token name
- `symbol` (string): Token symbol
- `decimals` (number): Token decimals

**Returns:**
- `Promise<string>`: Transaction signature

##### setMintGuard

```typescript
setMintGuard(mintGuard: PublicKey): Promise<string>
```

Sets mint guard.

**Parameters:**
- `mintGuard` (PublicKey): Mint guard program

**Returns:**
- `Promise<string>`: Transaction signature

##### setReserveFeed

```typescript
setReserveFeed(reserveFeed: PublicKey): Promise<string>
```

Sets reserve feed.

**Parameters:**
- `reserveFeed` (PublicKey): Reserve feed program

**Returns:**
- `Promise<string>`: Transaction signature

##### mintBloom

```typescript
mintBloom(to: PublicKey, amount: bigint, reason: string): Promise<string>
```

Mints BLOOM tokens.

**Parameters:**
- `to` (PublicKey): Recipient public key
- `amount` (bigint): Amount to mint
- `reason` (string): Mint reason

**Returns:**
- `Promise<string>`: Transaction signature

##### burnBloom

```typescript
burnBloom(from: PublicKey, amount: bigint, reason: string): Promise<string>
```

Burns BLOOM tokens.

**Parameters:**
- `from` (PublicKey): Source public key
- `amount` (bigint): Amount to burn
- `reason` (string): Burn reason

**Returns:**
- `Promise<string>`: Transaction signature

##### getPegInfo

```typescript
getPegInfo(): Promise<PegInfo>
```

Gets peg information.

**Returns:**
- `Promise<PegInfo>`: Peg information

##### getMintData

```typescript
getMintData(): Promise<MintData>
```

Gets mint data.

**Returns:**
- `Promise<MintData>`: Mint data

### ContractDeployment

Contract deployment utilities.

```typescript
class ContractDeployment {
  static deployBloomTokenEVM(signer: MyceliaEVMSigner, name: string, symbol: string, maxSupply: bigint): Promise<{contract: BloomTokenEVM; address: string}>;
  static deployMintGuardEVM(signer: MyceliaEVMSigner, bloomTokenAddress: string, reserveFeedAddress: string): Promise<{contract: MintGuardEVM; address: string}>;
  static deployMiningRewardsEVM(signer: MyceliaEVMSigner, bloomTokenAddress: string, mintGuardAddress: string): Promise<{contract: MiningRewardsEVM; address: string}>;
  static deployBloomTokenSolana(provider: AnchorProvider, idl: any): Promise<{program: Program; mintData: PublicKey; mint: PublicKey}>;
}
```

#### Methods

##### deployBloomTokenEVM

```typescript
static deployBloomTokenEVM(signer: MyceliaEVMSigner, name: string, symbol: string, maxSupply: bigint): Promise<{contract: BloomTokenEVM; address: string}>
```

Deploys BLOOM token contract on EVM.

**Parameters:**
- `signer` (MyceliaEVMSigner): EVM signer
- `name` (string): Token name
- `symbol` (string): Token symbol
- `maxSupply` (bigint): Maximum supply

**Returns:**
- `Promise<{contract: BloomTokenEVM; address: string}>`: Contract instance and address

##### deployMintGuardEVM

```typescript
static deployMintGuardEVM(signer: MyceliaEVMSigner, bloomTokenAddress: string, reserveFeedAddress: string): Promise<{contract: MintGuardEVM; address: string}>
```

Deploys mint guard contract on EVM.

**Parameters:**
- `signer` (MyceliaEVMSigner): EVM signer
- `bloomTokenAddress` (string): BLOOM token address
- `reserveFeedAddress` (string): Reserve feed address

**Returns:**
- `Promise<{contract: MintGuardEVM; address: string}>`: Contract instance and address

##### deployMiningRewardsEVM

```typescript
static deployMiningRewardsEVM(signer: MyceliaEVMSigner, bloomTokenAddress: string, mintGuardAddress: string): Promise<{contract: MiningRewardsEVM; address: string}>
```

Deploys mining rewards contract on EVM.

**Parameters:**
- `signer` (MyceliaEVMSigner): EVM signer
- `bloomTokenAddress` (string): BLOOM token address
- `mintGuardAddress` (string): Mint guard address

**Returns:**
- `Promise<{contract: MiningRewardsEVM; address: string}>`: Contract instance and address

##### deployBloomTokenSolana

```typescript
static deployBloomTokenSolana(provider: AnchorProvider, idl: any): Promise<{program: Program; mintData: PublicKey; mint: PublicKey}>
```

Deploys BLOOM token program on Solana.

**Parameters:**
- `provider` (AnchorProvider): Anchor provider
- `idl` (any): Program IDL

**Returns:**
- `Promise<{program: Program; mintData: PublicKey; mint: PublicKey}>`: Program instance and accounts

### Interfaces

#### SupplyStats

```typescript
interface SupplyStats {
  totalSupply: bigint;
  totalMinted: bigint;
  totalBurned: bigint;
  maxSupply: bigint;
}
```

#### PegInfo

```typescript
interface PegInfo {
  bloomPerBtc: bigint;
  satsPerBloom: bigint;
  pegStatement: string;
}
```

#### MintData

```typescript
interface MintData {
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: bigint;
  totalMinted: bigint;
  totalBurned: bigint;
  mintAuthority: PublicKey;
  mintGuard: PublicKey;
  reserveFeed: PublicKey;
}
```

## Shared Kernel (@mycelia/shared-kernel)

### SupplyLedger

Supply ledger for tracking BLOOM token supply.

```typescript
class SupplyLedger {
  currentSupply(): bigint;
  recordMint(amount: bigint): void;
  recordBurn(amount: bigint): void;
  getMintHistory(): Array<{amount: bigint; timestamp: number}>;
  getBurnHistory(): Array<{amount: bigint; timestamp: number}>;
  reset(): void;
}
```

#### Methods

##### currentSupply

```typescript
currentSupply(): bigint
```

Gets current supply.

**Returns:**
- `bigint`: Current supply

##### recordMint

```typescript
recordMint(amount: bigint): void
```

Records mint operation.

**Parameters:**
- `amount` (bigint): Amount minted

##### recordBurn

```typescript
recordBurn(amount: bigint): void
```

Records burn operation.

**Parameters:**
- `amount` (bigint): Amount burned

##### getMintHistory

```typescript
getMintHistory(): Array<{amount: bigint; timestamp: number}>
```

Gets mint history.

**Returns:**
- `Array<{amount: bigint; timestamp: number}>`: Mint history

##### getBurnHistory

```typescript
getBurnHistory(): Array<{amount: bigint; timestamp: number}>
```

Gets burn history.

**Returns:**
- `Array<{amount: bigint; timestamp: number}>`: Burn history

##### reset

```typescript
reset(): void
```

Resets the ledger.

## Proof of Reserve (@mycelia/proof-of-reserve)

### StaticReserveFeed

Static reserve feed for demos.

```typescript
class StaticReserveFeed implements ReserveFeed {
  constructor(initialLockedSats: bigint);
  getLockedBtcSats(): Promise<bigint>;
  setLockedBtcSats(sats: bigint): void;
}
```

#### Constructor

```typescript
constructor(initialLockedSats: bigint)
```

**Parameters:**
- `initialLockedSats` (bigint): Initial locked satoshis

#### Methods

##### getLockedBtcSats

```typescript
getLockedBtcSats(): Promise<bigint>
```

Gets locked BTC satoshis.

**Returns:**
- `Promise<bigint>`: Locked satoshis

##### setLockedBtcSats

```typescript
setLockedBtcSats(sats: bigint): void
```

Sets locked BTC satoshis.

**Parameters:**
- `sats` (bigint): Locked satoshis

### MockSpvProofFeed

Mock SPV proof feed.

```typescript
class MockSpvProofFeed implements ReserveFeed {
  getLockedBtcSats(): Promise<bigint>;
}
```

#### Methods

##### getLockedBtcSats

```typescript
getLockedBtcSats(): Promise<bigint>
```

Gets locked BTC satoshis (mock implementation).

**Returns:**
- `Promise<bigint>`: Locked satoshis

### composeReserveFeed

Composes reserve feeds with fallback.

```typescript
function composeReserveFeed(primary: ReserveFeed, fallback: ReserveFeed): ReserveFeed
```

**Parameters:**
- `primary` (ReserveFeed): Primary feed
- `fallback` (ReserveFeed): Fallback feed

**Returns:**
- `ReserveFeed`: Composed feed

---

This API reference provides comprehensive documentation for all Mycelia packages and their interfaces. For more detailed examples and usage patterns, refer to the developer guide and examples repository.
