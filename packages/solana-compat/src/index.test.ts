import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  Connection,
  PublicKey,
  Keypair,
  Transaction,
  LAMPORTS_PER_SOL
} from '@solana/web3.js';
import {
  MyceliaSolanaConnectionImpl,
  MyceliaSolanaWalletImpl,
  MyceliaAnchorProgram,
  createMyceliaSolanaConnection,
  createMyceliaSolanaWallet,
  createMyceliaAnchorProvider,
  createMyceliaAnchorProgram,
  MYCELIA_SOLANA_ADDRESSES,
  SPLTokenCompatibility
} from './index';

// Mock Solana web3.js
vi.mock('@solana/web3.js', async () => {
  const actual = await vi.importActual('@solana/web3.js');
  return {
    ...actual,
    Connection: vi.fn().mockImplementation(() => ({
      getLatestBlockhash: vi.fn().mockResolvedValue({
        blockhash: 'test-blockhash',
        lastValidBlockHeight: 100
      }),
      getBalance: vi.fn().mockResolvedValue(LAMPORTS_PER_SOL),
      getAccountInfo: vi.fn().mockResolvedValue(null),
      getProgramAccounts: vi.fn().mockResolvedValue([]),
      sendTransaction: vi.fn().mockResolvedValue('test-signature'),
      confirmTransaction: vi.fn().mockResolvedValue({ value: { err: null } }),
      getMinimumBalanceForRentExemption: vi.fn().mockResolvedValue(1000000),
      rpcEndpoint: 'https://api.devnet.solana.com'
    })),
    PublicKey: vi.fn().mockImplementation((key) => ({
      toBase58: () => key || 'test-public-key',
      toString: () => key || 'test-public-key'
    })),
    Keypair: {
      fromSecretKey: vi.fn().mockReturnValue({
        publicKey: { toBase58: () => 'test-public-key' },
        secretKey: new Uint8Array(64)
      }),
      generate: vi.fn().mockReturnValue({
        publicKey: { toBase58: () => 'test-public-key' },
        secretKey: new Uint8Array(64)
      })
    },
    Transaction: vi.fn().mockImplementation(() => ({
      add: vi.fn(),
      partialSign: vi.fn()
    })),
    sendAndConfirmTransaction: vi.fn().mockResolvedValue('test-signature')
  };
});

// Mock SPL Token
vi.mock('@solana/spl-token', async () => {
  const actual = await vi.importActual('@solana/spl-token');
  return {
    ...actual,
    getAssociatedTokenAddress: vi.fn().mockResolvedValue({
      toBase58: () => 'test-token-account'
    }),
    createAssociatedTokenAccountInstruction: vi.fn().mockReturnValue({}),
    createTransferInstruction: vi.fn().mockReturnValue({}),
    createApproveInstruction: vi.fn().mockReturnValue({}),
    getAccount: vi.fn().mockResolvedValue({
      amount: BigInt(1000000000) // 1 BLOOM in smallest unit
    })
  };
});

// Mock Anchor
vi.mock('@coral-xyz/anchor', async () => {
  const actual = await vi.importActual('@coral-xyz/anchor');
  return {
    ...actual,
    Program: vi.fn().mockImplementation(() => ({
      idl: {},
      programId: { toBase58: () => 'test-program-id' },
      provider: {}
    })),
    AnchorProvider: vi.fn().mockImplementation(() => ({})),
    BN: vi.fn().mockImplementation((value) => ({ toString: () => value.toString() }))
  };
});

describe('MyceliaSolanaConnectionImpl', () => {
  let connection: MyceliaSolanaConnectionImpl;
  const bloomTokenMint = new PublicKey(MYCELIA_SOLANA_ADDRESSES.BLOOM_TOKEN_MINT);
  const rentOracleProgram = new PublicKey('RentOracle111111111111111111111111111111111111');

  beforeEach(() => {
    const solanaConnection = new Connection('https://api.devnet.solana.com');
    connection = new MyceliaSolanaConnectionImpl(solanaConnection, bloomTokenMint, rentOracleProgram);
    vi.clearAllMocks();
  });

  describe('Standard Connection Interface', () => {
    it('should delegate getBalance calls', async () => {
      const publicKey = new PublicKey('test-public-key');
      const balance = await connection.getBalance(publicKey);
      expect(balance).toBe(LAMPORTS_PER_SOL);
    });

    it('should delegate getLatestBlockhash calls', async () => {
      const blockhash = await connection.getLatestBlockhash();
      expect(blockhash.blockhash).toBe('test-blockhash');
    });
  });

  describe('Mycelia-specific Methods', () => {
    it('should get BLOOM balance', async () => {
      const wallet = new PublicKey('test-wallet');
      const balance = await connection.getBloomBalance(wallet);
      expect(balance).toBe(1000000000n); // 1 BLOOM
    });

    it('should get BLOOM balance in BTC', async () => {
      const wallet = new PublicKey('test-wallet');
      const btcBalance = await connection.getBloomBalanceInBtc(wallet);
      expect(btcBalance).toBe(0.1); // 1 BLOOM = 0.1 BTC
    });

    it('should get rent in BLOOM', async () => {
      const rentInBloom = await connection.getRentInBloom();
      expect(rentInBloom).toBeGreaterThan(0n);
    });

    it('should get network info', async () => {
      const networkInfo = await connection.getNetworkInfo();
      expect(networkInfo).toEqual({
        cluster: 'devnet',
        pegStatus: 'active',
        bloomPerBtc: 10,
        solPerBloom: 0.1
      });
    });
  });
});

describe('MyceliaSolanaWalletImpl', () => {
  let wallet: MyceliaSolanaWalletImpl;
  let connection: MyceliaSolanaConnectionImpl;
  const bloomTokenMint = new PublicKey(MYCELIA_SOLANA_ADDRESSES.BLOOM_TOKEN_MINT);

  beforeEach(() => {
    const solanaConnection = new Connection('https://api.devnet.solana.com');
    connection = new MyceliaSolanaConnectionImpl(solanaConnection, bloomTokenMint, new PublicKey('test-oracle'));
    
    const keypair = Keypair.fromSecretKey(new Uint8Array(64));
    wallet = new MyceliaSolanaWalletImpl(keypair, connection, bloomTokenMint);
    vi.clearAllMocks();
  });

  describe('Standard Wallet Interface', () => {
    it('should have public key', () => {
      expect(wallet.publicKey).toBeDefined();
    });

    it('should sign transactions', async () => {
      const transaction = new Transaction();
      const signedTx = await wallet.signTransaction(transaction);
      expect(signedTx).toBe(transaction);
    });
  });

  describe('Mycelia-specific Methods', () => {
    it('should send BLOOM tokens', async () => {
      const recipient = new PublicKey('test-recipient');
      const amount = 1000000000n; // 1 BLOOM
      
      const signature = await wallet.sendBloom(recipient, amount);
      expect(signature).toBe('test-signature');
    });

    it('should approve BLOOM spending', async () => {
      const spender = new PublicKey('test-spender');
      const amount = 1000000000n; // 1 BLOOM
      
      const signature = await wallet.approveBloom(spender, amount);
      expect(signature).toBe('test-signature');
    });

    it('should get BLOOM balance', async () => {
      const balance = await wallet.getBloomBalance();
      expect(balance).toBe(1000000000n); // 1 BLOOM
    });

    it('should get BLOOM token account', async () => {
      const tokenAccount = await wallet.getBloomTokenAccount();
      expect(tokenAccount).toBeDefined();
    });
  });
});

describe('MyceliaAnchorProgram', () => {
  let program: MyceliaAnchorProgram;
  const bloomTokenMint = new PublicKey(MYCELIA_SOLANA_ADDRESSES.BLOOM_TOKEN_MINT);

  beforeEach(() => {
    const mockProgram = {
      idl: {},
      programId: new PublicKey('test-program'),
      provider: {}
    };
    program = new MyceliaAnchorProgram(mockProgram as any, bloomTokenMint);
    vi.clearAllMocks();
  });

  it('should get BLOOM token mint', () => {
    const mint = program.getBloomTokenMint();
    expect(mint).toBe(bloomTokenMint);
  });

  it('should create BLOOM payment instruction', async () => {
    const payer = new PublicKey('test-payer');
    const recipient = new PublicKey('test-recipient');
    const amount = 1000000000n; // 1 BLOOM
    
    const instruction = await program.createBloomPaymentInstruction(payer, recipient, amount);
    expect(instruction).toBeDefined();
  });
});

describe('Factory Functions', () => {
  it('should create Mycelia Solana connection', () => {
    const connection = createMyceliaSolanaConnection(
      'https://api.devnet.solana.com',
      MYCELIA_SOLANA_ADDRESSES.BLOOM_TOKEN_MINT,
      'RentOracle111111111111111111111111111111111111'
    );
    
    expect(connection).toBeInstanceOf(MyceliaSolanaConnectionImpl);
  });

  it('should create Mycelia Solana wallet', () => {
    const connection = createMyceliaSolanaConnection(
      'https://api.devnet.solana.com',
      MYCELIA_SOLANA_ADDRESSES.BLOOM_TOKEN_MINT,
      'RentOracle111111111111111111111111111111111111'
    );
    
    const wallet = createMyceliaSolanaWallet(
      new Uint8Array(64),
      connection,
      MYCELIA_SOLANA_ADDRESSES.BLOOM_TOKEN_MINT
    );
    
    expect(wallet).toBeInstanceOf(MyceliaSolanaWalletImpl);
  });

  it('should create Mycelia Anchor provider', () => {
    const connection = createMyceliaSolanaConnection(
      'https://api.devnet.solana.com',
      MYCELIA_SOLANA_ADDRESSES.BLOOM_TOKEN_MINT,
      'RentOracle111111111111111111111111111111111111'
    );
    
    const wallet = createMyceliaSolanaWallet(
      new Uint8Array(64),
      connection,
      MYCELIA_SOLANA_ADDRESSES.BLOOM_TOKEN_MINT
    );
    
    const provider = createMyceliaAnchorProvider(connection, wallet);
    expect(provider).toBeDefined();
  });

  it('should create Mycelia Anchor program', () => {
    const connection = createMyceliaSolanaConnection(
      'https://api.devnet.solana.com',
      MYCELIA_SOLANA_ADDRESSES.BLOOM_TOKEN_MINT,
      'RentOracle111111111111111111111111111111111111'
    );
    
    const wallet = createMyceliaSolanaWallet(
      new Uint8Array(64),
      connection,
      MYCELIA_SOLANA_ADDRESSES.BLOOM_TOKEN_MINT
    );
    
    const provider = createMyceliaAnchorProvider(connection, wallet);
    const program = createMyceliaAnchorProgram(
      {},
      'test-program',
      provider,
      MYCELIA_SOLANA_ADDRESSES.BLOOM_TOKEN_MINT
    );
    
    expect(program).toBeInstanceOf(MyceliaAnchorProgram);
  });
});

describe('SPLTokenCompatibility', () => {
  let splCompat: SPLTokenCompatibility;
  let connection: MyceliaSolanaConnectionImpl;
  const bloomTokenMint = new PublicKey(MYCELIA_SOLANA_ADDRESSES.BLOOM_TOKEN_MINT);

  beforeEach(() => {
    const solanaConnection = new Connection('https://api.devnet.solana.com');
    connection = new MyceliaSolanaConnectionImpl(solanaConnection, bloomTokenMint, new PublicKey('test-oracle'));
    splCompat = new SPLTokenCompatibility(connection, bloomTokenMint);
    vi.clearAllMocks();
  });

  it('should create BLOOM token account instruction', async () => {
    const wallet = new PublicKey('test-wallet');
    const instruction = await splCompat.createBloomTokenAccount(wallet);
    expect(instruction).toBeDefined();
  });

  it('should get BLOOM token accounts', async () => {
    const wallet = new PublicKey('test-wallet');
    const accounts = await splCompat.getBloomTokenAccounts(wallet);
    expect(Array.isArray(accounts)).toBe(true);
  });

  it('should convert BLOOM to SPL amount', () => {
    const bloomAmount = 1000000000n; // 1 BLOOM
    const splAmount = splCompat.bloomToSPLAmount(bloomAmount);
    expect(splAmount.toString()).toBe('1000000000');
  });

  it('should convert SPL amount to BLOOM', () => {
    const splAmount = { toString: () => '1000000000' };
    const bloomAmount = splCompat.splAmountToBloom(splAmount as any);
    expect(bloomAmount).toBe(1000000000n);
  });
});

describe('Mycelia Solana Addresses', () => {
  it('should export BLOOM token mint address', () => {
    expect(MYCELIA_SOLANA_ADDRESSES.BLOOM_TOKEN_MINT).toBeDefined();
  });

  it('should export mining program address', () => {
    expect(MYCELIA_SOLANA_ADDRESSES.MINING_PROGRAM).toBeDefined();
  });

  it('should export rewards program address', () => {
    expect(MYCELIA_SOLANA_ADDRESSES.REWARDS_PROGRAM).toBeDefined();
  });

  it('should export bridge program address', () => {
    expect(MYCELIA_SOLANA_ADDRESSES.BRIDGE_PROGRAM).toBeDefined();
  });
});
