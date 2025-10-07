import { ethers } from 'ethers';
import { Program, AnchorProvider, Wallet } from '@coral-xyz/anchor';
import { PublicKey, Connection, Keypair } from '@solana/web3.js';
import { 
  MyceliaEVMProvider, 
  MyceliaEVMSigner,
  MYCELIA_CONTRACTS 
} from '@mycelia/evm-compat';
import {
  MyceliaSolanaConnection,
  MyceliaSolanaWallet,
  MYCELIA_SOLANA_ADDRESSES
} from '@mycelia/solana-compat';
import { bloomToSats, satsToBloom } from '@mycelia/tokenomics';

// Re-export contract ABIs and addresses
export { MYCELIA_CONTRACTS } from '@mycelia/evm-compat';
export { MYCELIA_SOLANA_ADDRESSES } from '@mycelia/solana-compat';

/**
 * BLOOM token contract wrapper for EVM
 */
export class BloomTokenEVM {
  private contract: ethers.Contract;
  private signer: MyceliaEVMSigner;

  constructor(contractAddress: string, signer: MyceliaEVMSigner) {
    this.signer = signer;
    this.contract = new ethers.Contract(
      contractAddress,
      MYCELIA_CONTRACTS.BLOOM_TOKEN,
      signer
    );
  }

  /**
   * Get token name
   */
  async name(): Promise<string> {
    return this.contract.name();
  }

  /**
   * Get token symbol
   */
  async symbol(): Promise<string> {
    return this.contract.symbol();
  }

  /**
   * Get token decimals
   */
  async decimals(): Promise<number> {
    return this.contract.decimals();
  }

  /**
   * Get total supply
   */
  async totalSupply(): Promise<bigint> {
    const supply = await this.contract.totalSupply();
    return BigInt(supply.toString());
  }

  /**
   * Get balance of address
   */
  async balanceOf(address: string): Promise<bigint> {
    const balance = await this.contract.balanceOf(address);
    return BigInt(balance.toString());
  }

  /**
   * Transfer tokens
   */
  async transfer(to: string, amount: bigint): Promise<ethers.ContractTransactionResponse> {
    return this.contract.transfer(to, amount);
  }

  /**
   * Approve spender
   */
  async approve(spender: string, amount: bigint): Promise<ethers.ContractTransactionResponse> {
    return this.contract.approve(spender, amount);
  }

  /**
   * Get allowance
   */
  async allowance(owner: string, spender: string): Promise<bigint> {
    const allowance = await this.contract.allowance(owner, spender);
    return BigInt(allowance.toString());
  }

  /**
   * Transfer from (requires approval)
   */
  async transferFrom(from: string, to: string, amount: bigint): Promise<ethers.ContractTransactionResponse> {
    return this.contract.transferFrom(from, to, amount);
  }

  /**
   * Mint tokens (only minter)
   */
  async mint(to: string, amount: bigint, reason: string): Promise<ethers.ContractTransactionResponse> {
    return this.contract.mint(to, amount, reason);
  }

  /**
   * Burn tokens
   */
  async burn(amount: bigint): Promise<ethers.ContractTransactionResponse> {
    return this.contract.burn(amount);
  }

  /**
   * Burn from address (only redemption engine)
   */
  async burnFrom(from: string, amount: bigint, reason: string): Promise<ethers.ContractTransactionResponse> {
    return this.contract.burnFrom(from, amount, reason);
  }

  /**
   * Get supply statistics
   */
  async getSupplyStats(): Promise<{
    totalSupply: bigint;
    totalMinted: bigint;
    totalBurned: bigint;
    maxSupply: bigint;
  }> {
    const stats = await this.contract.getSupplyStats();
    return {
      totalSupply: BigInt(stats[0].toString()),
      totalMinted: BigInt(stats[1].toString()),
      totalBurned: BigInt(stats[2].toString()),
      maxSupply: BigInt(stats[3].toString())
    };
  }

  /**
   * Get peg statement
   */
  async getPegStatement(): Promise<string> {
    return this.contract.getPegStatement();
  }

  /**
   * Convert BLOOM to sats
   */
  async bloomToSats(bloomAmount: bigint): Promise<bigint> {
    const sats = await this.contract.bloomToSats(bloomAmount);
    return BigInt(sats.toString());
  }

  /**
   * Convert sats to BLOOM
   */
  async satsToBloom(sats: bigint): Promise<bigint> {
    const bloom = await this.contract.satsToBloom(sats);
    return BigInt(bloom.toString());
  }
}

/**
 * Mint guard contract wrapper for EVM
 */
export class MintGuardEVM {
  private contract: ethers.Contract;
  private signer: MyceliaEVMSigner;

  constructor(contractAddress: string, signer: MyceliaEVMSigner) {
    this.signer = signer;
    this.contract = new ethers.Contract(
      contractAddress,
      [
        'function canMint(uint256 amount) view returns (bool)',
        'function getCollateralizationRatio() view returns (uint256)',
        'function isFullyReserved() view returns (bool)',
        'function getMaxMintable() view returns (uint256)',
        'function getPegInfo() view returns (uint256 bloomPerBtc, uint256 satsPerBloom)',
        'function setBloomToken(address _bloomToken)',
        'function setReserveFeed(address _reserveFeed)'
      ],
      signer
    );
  }

  /**
   * Check if minting is allowed
   */
  async canMint(amount: bigint): Promise<boolean> {
    return this.contract.canMint(amount);
  }

  /**
   * Get collateralization ratio
   */
  async getCollateralizationRatio(): Promise<number> {
    const ratio = await this.contract.getCollateralizationRatio();
    return Number(ratio) / 1e18; // Convert from scaled format
  }

  /**
   * Check if system is fully reserved
   */
  async isFullyReserved(): Promise<boolean> {
    return this.contract.isFullyReserved();
  }

  /**
   * Get maximum mintable amount
   */
  async getMaxMintable(): Promise<bigint> {
    const maxMintable = await this.contract.getMaxMintable();
    return BigInt(maxMintable.toString());
  }

  /**
   * Get peg information
   */
  async getPegInfo(): Promise<{ bloomPerBtc: bigint; satsPerBloom: bigint }> {
    const info = await this.contract.getPegInfo();
    return {
      bloomPerBtc: BigInt(info[0].toString()),
      satsPerBloom: BigInt(info[1].toString())
    };
  }

  /**
   * Set BLOOM token address
   */
  async setBloomToken(bloomTokenAddress: string): Promise<ethers.ContractTransactionResponse> {
    return this.contract.setBloomToken(bloomTokenAddress);
  }

  /**
   * Set reserve feed address
   */
  async setReserveFeed(reserveFeedAddress: string): Promise<ethers.ContractTransactionResponse> {
    return this.contract.setReserveFeed(reserveFeedAddress);
  }
}

/**
 * Mining rewards contract wrapper for EVM
 */
export class MiningRewardsEVM {
  private contract: ethers.Contract;
  private signer: MyceliaEVMSigner;

  constructor(contractAddress: string, signer: MyceliaEVMSigner) {
    this.signer = signer;
    this.contract = new ethers.Contract(
      contractAddress,
      [
        'function registerMiner()',
        'function recordContribution(uint256 storageUsed, uint256 bandwidthUsed, uint256 contentCount)',
        'function claimRewards()',
        'function getMinerData(address miner) view returns (tuple(uint256 totalContributed, uint256 totalRewards, uint256 lastContribution, uint256 contributionScore, bool isActive))',
        'function getActiveMiners() view returns (address[])',
        'function getContributionTier(uint256 tierIndex) view returns (uint256 minScore, uint256 multiplier)',
        'function deactivateMiner(address miner)',
        'function updateContributionTier(uint256 tierIndex, uint256 minScore, uint256 multiplier)'
      ],
      signer
    );
  }

  /**
   * Register as miner
   */
  async registerMiner(): Promise<ethers.ContractTransactionResponse> {
    return this.contract.registerMiner();
  }

  /**
   * Record mining contribution
   */
  async recordContribution(
    storageUsed: bigint,
    bandwidthUsed: bigint,
    contentCount: bigint
  ): Promise<ethers.ContractTransactionResponse> {
    return this.contract.recordContribution(storageUsed, bandwidthUsed, contentCount);
  }

  /**
   * Claim rewards
   */
  async claimRewards(): Promise<ethers.ContractTransactionResponse> {
    return this.contract.claimRewards();
  }

  /**
   * Get miner data
   */
  async getMinerData(minerAddress: string): Promise<{
    totalContributed: bigint;
    totalRewards: bigint;
    lastContribution: bigint;
    contributionScore: bigint;
    isActive: boolean;
  }> {
    const data = await this.contract.getMinerData(minerAddress);
    return {
      totalContributed: BigInt(data[0].toString()),
      totalRewards: BigInt(data[1].toString()),
      lastContribution: BigInt(data[2].toString()),
      contributionScore: BigInt(data[3].toString()),
      isActive: data[4]
    };
  }

  /**
   * Get active miners
   */
  async getActiveMiners(): Promise<string[]> {
    return this.contract.getActiveMiners();
  }

  /**
   * Get contribution tier
   */
  async getContributionTier(tierIndex: bigint): Promise<{ minScore: bigint; multiplier: bigint }> {
    const tier = await this.contract.getContributionTier(tierIndex);
    return {
      minScore: BigInt(tier[0].toString()),
      multiplier: BigInt(tier[1].toString())
    };
  }
}

/**
 * BLOOM token program wrapper for Solana
 */
export class BloomTokenSolana {
  private program: Program;
  private mintData: PublicKey;
  private mint: PublicKey;

  constructor(program: Program, mintData: PublicKey, mint: PublicKey) {
    this.program = program;
    this.mintData = mintData;
    this.mint = mint;
  }

  /**
   * Initialize BLOOM token mint
   */
  async initializeBloomMint(
    name: string,
    symbol: string,
    decimals: number
  ): Promise<string> {
    const tx = await this.program.methods
      .initializeBloomMint(name, symbol, decimals)
      .accounts({
        mintData: this.mintData,
        mint: this.mint,
        mintAuthority: this.program.provider.wallet.publicKey,
        rent: new PublicKey('SysvarRent111111111111111111111111111111111'),
        tokenProgram: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
        systemProgram: new PublicKey('11111111111111111111111111111112'),
      })
      .rpc();

    return tx;
  }

  /**
   * Set mint guard
   */
  async setMintGuard(mintGuard: PublicKey): Promise<string> {
    const tx = await this.program.methods
      .setMintGuard(mintGuard)
      .accounts({
        mintData: this.mintData,
        mintAuthority: this.program.provider.wallet.publicKey,
      })
      .rpc();

    return tx;
  }

  /**
   * Set reserve feed
   */
  async setReserveFeed(reserveFeed: PublicKey): Promise<string> {
    const tx = await this.program.methods
      .setReserveFeed(reserveFeed)
      .accounts({
        mintData: this.mintData,
        mintAuthority: this.program.provider.wallet.publicKey,
      })
      .rpc();

    return tx;
  }

  /**
   * Mint BLOOM tokens
   */
  async mintBloom(
    to: PublicKey,
    amount: bigint,
    reason: string
  ): Promise<string> {
    const tx = await this.program.methods
      .mintBloom(amount, reason)
      .accounts({
        mintData: this.mintData,
        mint: this.mint,
        to,
        mintAuthority: this.program.provider.wallet.publicKey,
        mintGuard: new PublicKey('MintGuard111111111111111111111111111111111111'),
        tokenProgram: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
      })
      .rpc();

    return tx;
  }

  /**
   * Burn BLOOM tokens
   */
  async burnBloom(
    from: PublicKey,
    amount: bigint,
    reason: string
  ): Promise<string> {
    const tx = await this.program.methods
      .burnBloom(amount, reason)
      .accounts({
        mintData: this.mintData,
        mint: this.mint,
        from,
        authority: this.program.provider.wallet.publicKey,
        tokenProgram: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
      })
      .rpc();

    return tx;
  }

  /**
   * Get peg information
   */
  async getPegInfo(): Promise<{
    bloomPerBtc: bigint;
    satsPerBloom: bigint;
    pegStatement: string;
  }> {
    const info = await this.program.methods
      .getPegInfo()
      .accounts({
        mintData: this.mintData,
      })
      .view();

    return {
      bloomPerBtc: BigInt(info.bloomPerBtc.toString()),
      satsPerBloom: BigInt(info.satsPerBloom.toString()),
      pegStatement: info.pegStatement
    };
  }

  /**
   * Get mint data
   */
  async getMintData(): Promise<{
    name: string;
    symbol: string;
    decimals: number;
    totalSupply: bigint;
    totalMinted: bigint;
    totalBurned: bigint;
    mintAuthority: PublicKey;
    mintGuard: PublicKey;
    reserveFeed: PublicKey;
  }> {
    const data = await this.program.account.mintData.fetch(this.mintData);
    return {
      name: data.name,
      symbol: data.symbol,
      decimals: data.decimals,
      totalSupply: BigInt(data.totalSupply.toString()),
      totalMinted: BigInt(data.totalMinted.toString()),
      totalBurned: BigInt(data.totalBurned.toString()),
      mintAuthority: data.mintAuthority,
      mintGuard: data.mintGuard,
      reserveFeed: data.reserveFeed
    };
  }
}

/**
 * Factory functions for contract deployment
 */
export class ContractDeployment {
  /**
   * Deploy BLOOM token contract (EVM)
   */
  static async deployBloomTokenEVM(
    signer: MyceliaEVMSigner,
    name: string = 'BLOOM Token',
    symbol: string = 'BLOOM',
    maxSupply: bigint = 0n
  ): Promise<{ contract: BloomTokenEVM; address: string }> {
    const factory = new ethers.ContractFactory(
      MYCELIA_CONTRACTS.BLOOM_TOKEN,
      `
        constructor(string memory name, string memory symbol, uint256 maxSupply) {
          // BLOOM token implementation would be here
        }
      `,
      signer
    );

    const contract = await factory.deploy(name, symbol, maxSupply);
    await contract.waitForDeployment();
    const address = await contract.getAddress();

    return {
      contract: new BloomTokenEVM(address, signer),
      address
    };
  }

  /**
   * Deploy mint guard contract (EVM)
   */
  static async deployMintGuardEVM(
    signer: MyceliaEVMSigner,
    bloomTokenAddress: string,
    reserveFeedAddress: string
  ): Promise<{ contract: MintGuardEVM; address: string }> {
    const factory = new ethers.ContractFactory(
      [
        'constructor(address _bloomToken, address _reserveFeed)',
        'function canMint(uint256 amount) view returns (bool)',
        'function getCollateralizationRatio() view returns (uint256)',
        'function isFullyReserved() view returns (bool)',
        'function getMaxMintable() view returns (uint256)'
      ],
      `
        constructor(address _bloomToken, address _reserveFeed) {
          // Mint guard implementation would be here
        }
      `,
      signer
    );

    const contract = await factory.deploy(bloomTokenAddress, reserveFeedAddress);
    await contract.waitForDeployment();
    const address = await contract.getAddress();

    return {
      contract: new MintGuardEVM(address, signer),
      address
    };
  }

  /**
   * Deploy mining rewards contract (EVM)
   */
  static async deployMiningRewardsEVM(
    signer: MyceliaEVMSigner,
    bloomTokenAddress: string,
    mintGuardAddress: string
  ): Promise<{ contract: MiningRewardsEVM; address: string }> {
    const factory = new ethers.ContractFactory(
      [
        'constructor(address _bloomToken, address _mintGuard)',
        'function registerMiner()',
        'function recordContribution(uint256 storageUsed, uint256 bandwidthUsed, uint256 contentCount)',
        'function claimRewards()'
      ],
      `
        constructor(address _bloomToken, address _mintGuard) {
          // Mining rewards implementation would be here
        }
      `,
      signer
    );

    const contract = await factory.deploy(bloomTokenAddress, mintGuardAddress);
    await contract.waitForDeployment();
    const address = await contract.getAddress();

    return {
      contract: new MiningRewardsEVM(address, signer),
      address
    };
  }

  /**
   * Deploy BLOOM token program (Solana)
   */
  static async deployBloomTokenSolana(
    provider: AnchorProvider,
    idl: any
  ): Promise<{ program: Program; mintData: PublicKey; mint: PublicKey }> {
    const program = new Program(idl, MYCELIA_SOLANA_ADDRESSES.BLOOM_TOKEN_MINT, provider);
    
    // Generate PDAs
    const [mintData] = PublicKey.findProgramAddressSync(
      [Buffer.from('mint_data')],
      program.programId
    );

    const mint = Keypair.generate();

    return {
      program,
      mintData,
      mint: mint.publicKey
    };
  }
}

/**
 * Utility functions for contract interactions
 */
export class ContractUtils {
  /**
   * Format BLOOM amount for display
   */
  static formatBloomAmount(amount: bigint, decimals: number = 9): string {
    const divisor = BigInt(10 ** decimals);
    const whole = amount / divisor;
    const fraction = amount % divisor;
    
    if (fraction === 0n) {
      return whole.toString();
    }
    
    const fractionStr = fraction.toString().padStart(decimals, '0');
    const trimmedFraction = fractionStr.replace(/0+$/, '');
    
    return trimmedFraction ? `${whole}.${trimmedFraction}` : whole.toString();
  }

  /**
   * Parse BLOOM amount from string
   */
  static parseBloomAmount(amount: string, decimals: number = 9): bigint {
    const [whole, fraction = ''] = amount.split('.');
    const paddedFraction = fraction.padEnd(decimals, '0').slice(0, decimals);
    return BigInt(whole) * BigInt(10 ** decimals) + BigInt(paddedFraction);
  }

  /**
   * Get contract explorer URL
   */
  static getContractExplorerUrl(contractAddress: string, network: 'evm' | 'solana'): string {
    switch (network) {
      case 'evm':
        return `https://etherscan.io/address/${contractAddress}`;
      case 'solana':
        return `https://explorer.solana.com/address/${contractAddress}`;
      default:
        return `https://explorer.mycelia.com/address/${contractAddress}`;
    }
  }
}
