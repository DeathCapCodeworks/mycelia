import {
  Connection,
  PublicKey,
  Keypair,
  Transaction,
  TransactionInstruction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
  GetProgramAccountsFilter
} from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  createApproveInstruction,
  getAccount,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID
} from '@solana/spl-token';
import { Program, AnchorProvider, Wallet, BN } from '@coral-xyz/anchor';
import { bloomToSats, satsToBloom } from '@mycelia/tokenomics';

// Re-export common Solana types for compatibility
export type {
  Connection,
  PublicKey,
  Keypair,
  Transaction,
  TransactionInstruction,
  TransactionSignature,
  Commitment,
  GetProgramAccountsConfig
} from '@solana/web3.js';

// Mycelia-specific Solana extensions
export interface MyceliaSolanaConnection extends Connection {
  /**
   * Get current BLOOM token balance for a wallet
   */
  getBloomBalance(wallet: PublicKey): Promise<bigint>;
  
  /**
   * Get current BTC equivalent of BLOOM balance
   */
  getBloomBalanceInBtc(wallet: PublicKey): Promise<number>;
  
  /**
   * Get current rent cost in BLOOM tokens
   */
  getRentInBloom(): Promise<bigint>;
  
  /**
   * Get network information including peg status
   */
  getNetworkInfo(): Promise<{
    cluster: string;
    pegStatus: 'active' | 'maintenance';
    bloomPerBtc: number;
    solPerBloom: number;
  }>;
}

export interface MyceliaSolanaWallet {
  publicKey: PublicKey;
  signTransaction(tx: Transaction): Promise<Transaction>;
  signAllTransactions(txs: Transaction[]): Promise<Transaction[]>;
  
  /**
   * Send BLOOM tokens to another wallet
   */
  sendBloom(to: PublicKey, amount: bigint): Promise<string>;
  
  /**
   * Approve BLOOM spending for a program
   */
  approveBloom(spender: PublicKey, amount: bigint): Promise<string>;
  
  /**
   * Get BLOOM balance for this wallet
   */
  getBloomBalance(): Promise<bigint>;
  
  /**
   * Get associated BLOOM token account
   */
  getBloomTokenAccount(): Promise<PublicKey>;
}

/**
 * Mycelia Solana Connection that extends standard Solana connections
 * with BLOOM token and peg functionality
 */
export class MyceliaSolanaConnectionImpl implements MyceliaSolanaConnection {
  private connection: Connection;
  private bloomTokenMint: PublicKey;
  private rentOracleProgram: PublicKey;

  constructor(
    connection: Connection,
    bloomTokenMint: PublicKey,
    rentOracleProgram: PublicKey
  ) {
    this.connection = connection;
    this.bloomTokenMint = bloomTokenMint;
    this.rentOracleProgram = rentOracleProgram;
  }

  // Standard Connection interface delegation
  getLatestBlockhash(commitment?: import('@solana/web3.js').Commitment): Promise<import('@solana/web3.js').BlockhashWithExpiryBlockHeight> {
    return this.connection.getLatestBlockhash(commitment);
  }

  getBalance(publicKey: PublicKey, commitment?: import('@solana/web3.js').Commitment): Promise<number> {
    return this.connection.getBalance(publicKey, commitment);
  }

  getAccountInfo(publicKey: PublicKey, commitment?: import('@solana/web3.js').Commitment): Promise<import('@solana/web3.js').AccountInfo<Buffer> | null> {
    return this.connection.getAccountInfo(publicKey, commitment);
  }

  getProgramAccounts(programId: PublicKey, configOrCommitment?: import('@solana/web3.js').GetProgramAccountsConfig | import('@solana/web3.js').Commitment): Promise<Array<{ pubkey: PublicKey; account: import('@solana/web3.js').AccountInfo<Buffer> }>> {
    return this.connection.getProgramAccounts(programId, configOrCommitment);
  }

  sendTransaction(transaction: Transaction, signers?: Keypair[], options?: import('@solana/web3.js').SendOptions): Promise<string> {
    return this.connection.sendTransaction(transaction, signers, options);
  }

  confirmTransaction(signature: string, commitment?: import('@solana/web3.js').Commitment): Promise<import('@solana/web3.js').RpcResponseAndContext<import('@solana/web3.js').SignatureResult>> {
    return this.connection.confirmTransaction(signature, commitment);
  }

  // Mycelia-specific methods
  async getBloomBalance(wallet: PublicKey): Promise<bigint> {
    try {
      const tokenAccount = await getAssociatedTokenAddress(this.bloomTokenMint, wallet);
      const accountInfo = await getAccount(this.connection, tokenAccount);
      return BigInt(accountInfo.amount.toString());
    } catch (error) {
      // Account doesn't exist, return 0
      return 0n;
    }
  }

  async getBloomBalanceInBtc(wallet: PublicKey): Promise<number> {
    const bloomBalance = await this.getBloomBalance(wallet);
    const sats = bloomToSats(bloomBalance);
    return Number(sats) / 100_000_000; // Convert sats to BTC
  }

  async getRentInBloom(): Promise<bigint> {
    // Get rent for a typical account (2KB)
    const rentExempt = await this.connection.getMinimumBalanceForRentExemption(2048);
    const rentInSol = rentExempt / LAMPORTS_PER_SOL;
    
    // Convert SOL to BLOOM (this would be dynamic in production)
    const solPerBloom = 0.1; // Example rate
    const rentInBloom = rentInSol / solPerBloom;
    
    return BigInt(Math.floor(rentInBloom * 1e9)); // Convert to smallest BLOOM unit
  }

  async getNetworkInfo(): Promise<{
    cluster: string;
    pegStatus: 'active' | 'maintenance';
    bloomPerBtc: number;
    solPerBloom: number;
  }> {
    const cluster = this.connection.rpcEndpoint.includes('devnet') ? 'devnet' : 
                   this.connection.rpcEndpoint.includes('testnet') ? 'testnet' : 'mainnet';
    
    return {
      cluster,
      pegStatus: 'active', // TODO: Implement actual peg status checking
      bloomPerBtc: 10, // Hard-coded peg ratio
      solPerBloom: 0.1 // Example rate
    };
  }
}

/**
 * Mycelia Solana Wallet that extends standard wallets with BLOOM functionality
 */
export class MyceliaSolanaWalletImpl implements MyceliaSolanaWallet {
  public publicKey: PublicKey;
  private keypair: Keypair;
  private connection: MyceliaSolanaConnection;
  private bloomTokenMint: PublicKey;

  constructor(
    keypair: Keypair,
    connection: MyceliaSolanaConnection,
    bloomTokenMint: PublicKey
  ) {
    this.keypair = keypair;
    this.publicKey = keypair.publicKey;
    this.connection = connection;
    this.bloomTokenMint = bloomTokenMint;
  }

  signTransaction(tx: Transaction): Promise<Transaction> {
    tx.partialSign(this.keypair);
    return Promise.resolve(tx);
  }

  signAllTransactions(txs: Transaction[]): Promise<Transaction[]> {
    txs.forEach(tx => tx.partialSign(this.keypair));
    return Promise.resolve(txs);
  }

  async sendBloom(to: PublicKey, amount: bigint): Promise<string> {
    const fromTokenAccount = await getAssociatedTokenAddress(this.bloomTokenMint, this.publicKey);
    const toTokenAccount = await getAssociatedTokenAddress(this.bloomTokenMint, to);

    const transaction = new Transaction();

    // Create associated token account if it doesn't exist
    try {
      await getAccount(this.connection as any, toTokenAccount);
    } catch {
      transaction.add(
        createAssociatedTokenAccountInstruction(
          this.publicKey,
          toTokenAccount,
          to,
          this.bloomTokenMint
        )
      );
    }

    // Add transfer instruction
    transaction.add(
      createTransferInstruction(
        fromTokenAccount,
        toTokenAccount,
        this.publicKey,
        amount
      )
    );

    return sendAndConfirmTransaction(this.connection as any, transaction, [this.keypair]);
  }

  async approveBloom(spender: PublicKey, amount: bigint): Promise<string> {
    const tokenAccount = await getAssociatedTokenAddress(this.bloomTokenMint, this.publicKey);

    const transaction = new Transaction();
    transaction.add(
      createApproveInstruction(
        tokenAccount,
        spender,
        this.publicKey,
        amount
      )
    );

    return sendAndConfirmTransaction(this.connection as any, transaction, [this.keypair]);
  }

  async getBloomBalance(): Promise<bigint> {
    return this.connection.getBloomBalance(this.publicKey);
  }

  async getBloomTokenAccount(): Promise<PublicKey> {
    return getAssociatedTokenAddress(this.bloomTokenMint, this.publicKey);
  }
}

/**
 * Anchor Program compatibility for Mycelia programs
 */
export class MyceliaAnchorProgram<T = any> extends Program<T> {
  private bloomTokenMint: PublicKey;

  constructor(
    program: Program<T>,
    bloomTokenMint: PublicKey
  ) {
    super(program.idl, program.programId, program.provider);
    this.bloomTokenMint = bloomTokenMint;
  }

  /**
   * Get BLOOM token mint address
   */
  getBloomTokenMint(): PublicKey {
    return this.bloomTokenMint;
  }

  /**
   * Create instruction to pay with BLOOM tokens
   */
  async createBloomPaymentInstruction(
    payer: PublicKey,
    recipient: PublicKey,
    amount: bigint
  ): Promise<TransactionInstruction> {
    const payerTokenAccount = await getAssociatedTokenAddress(this.bloomTokenMint, payer);
    const recipientTokenAccount = await getAssociatedTokenAddress(this.bloomTokenMint, recipient);

    return createTransferInstruction(
      payerTokenAccount,
      recipientTokenAccount,
      payer,
      amount
    );
  }
}

/**
 * Factory functions to create Mycelia-compatible Solana components
 */
export function createMyceliaSolanaConnection(
  rpcUrl: string,
  bloomTokenMint: string,
  rentOracleProgram: string
): MyceliaSolanaConnection {
  const connection = new Connection(rpcUrl);
  const bloomMint = new PublicKey(bloomTokenMint);
  const rentOracle = new PublicKey(rentOracleProgram);
  
  return new MyceliaSolanaConnectionImpl(connection, bloomMint, rentOracle);
}

export function createMyceliaSolanaWallet(
  privateKey: Uint8Array,
  connection: MyceliaSolanaConnection,
  bloomTokenMint: string
): MyceliaSolanaWallet {
  const keypair = Keypair.fromSecretKey(privateKey);
  const bloomMint = new PublicKey(bloomTokenMint);
  
  return new MyceliaSolanaWalletImpl(keypair, connection, bloomMint);
}

/**
 * Anchor compatibility utilities
 */
export function createMyceliaAnchorProvider(
  connection: MyceliaSolanaConnection,
  wallet: MyceliaSolanaWallet
): AnchorProvider {
  return new AnchorProvider(
    connection as any,
    wallet as any,
    { commitment: 'confirmed' }
  );
}

export function createMyceliaAnchorProgram<T = any>(
  idl: any,
  programId: string,
  provider: AnchorProvider,
  bloomTokenMint: string
): MyceliaAnchorProgram<T> {
  const program = new Program(idl, programId, provider);
  const bloomMint = new PublicKey(bloomTokenMint);
  
  return new MyceliaAnchorProgram(program, bloomMint);
}

/**
 * Common program IDs and addresses for Mycelia ecosystem
 */
export const MYCELIA_SOLANA_ADDRESSES = {
  BLOOM_TOKEN_MINT: 'BloomToken1111111111111111111111111111111111111',
  MINING_PROGRAM: 'MiningProgram111111111111111111111111111111111111',
  REWARDS_PROGRAM: 'RewardsProgram1111111111111111111111111111111111',
  BRIDGE_PROGRAM: 'BridgeProgram111111111111111111111111111111111111'
} as const;

/**
 * SPL Token compatibility utilities
 */
export class SPLTokenCompatibility {
  private connection: MyceliaSolanaConnection;
  private bloomTokenMint: PublicKey;

  constructor(connection: MyceliaSolanaConnection, bloomTokenMint: PublicKey) {
    this.connection = connection;
    this.bloomTokenMint = bloomTokenMint;
  }

  /**
   * Create BLOOM token account for a wallet
   */
  async createBloomTokenAccount(wallet: PublicKey): Promise<TransactionInstruction> {
    const tokenAccount = await getAssociatedTokenAddress(this.bloomTokenMint, wallet);
    
    return createAssociatedTokenAccountInstruction(
      wallet,
      tokenAccount,
      wallet,
      this.bloomTokenMint
    );
  }

  /**
   * Get all BLOOM token accounts for a wallet
   */
  async getBloomTokenAccounts(wallet: PublicKey): Promise<PublicKey[]> {
    const filters: GetProgramAccountsFilter[] = [
      {
        dataSize: 165, // Token account size
      },
      {
        memcmp: {
          offset: 32, // Owner offset
          bytes: wallet.toBase58(),
        },
      },
    ];

    const accounts = await this.connection.getProgramAccounts(TOKEN_PROGRAM_ID, { filters });
    return accounts.map(account => account.pubkey);
  }

  /**
   * Convert BLOOM amount to SPL token format
   */
  bloomToSPLAmount(bloomAmount: bigint): BN {
    return new BN(bloomAmount.toString());
  }

  /**
   * Convert SPL token amount to BLOOM
   */
  splAmountToBloom(splAmount: BN): bigint {
    return BigInt(splAmount.toString());
  }
}
