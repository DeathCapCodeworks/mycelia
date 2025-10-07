import sodium from 'libsodium-wrappers-sumo';

export type Did = `did:${string}:${string}`;
export type TxHash = `0x${string}`;

export type CapScope = 'vault:read' | 'vault:write' | 'graph:read' | 'graph:write' | 'oracle:query' | 'rewards:account';

export interface Capability {
  id: string;
  scope: CapScope;
  resource?: string;
}

export type Result<T = unknown, E = Error> = { ok: true; value: T } | { ok: false; error: E };

export interface VaultDoc {
  key: string;
  bytes: Uint8Array;
  meta?: Record<string, unknown>;
}

export function assertCap(required: CapScope, provided?: Capability[]): asserts provided {
  if (!provided || !provided.some((c) => c.scope === required)) {
    throw new Error(`Missing capability for scope ${required}`);
  }
}

export async function initCrypto() {
  if ((sodium as any).ready) return;
  await sodium.ready;
}

export async function keypair(): Promise<{ publicKey: Uint8Array; secretKey: Uint8Array }> {
  await initCrypto();
  const kp = sodium.crypto_sign_keypair();
  return { publicKey: kp.publicKey, secretKey: kp.privateKey };
}

export async function seal(message: Uint8Array, recipientPublicKey: Uint8Array): Promise<Uint8Array> {
  await initCrypto();
  return sodium.crypto_box_seal(message, recipientPublicKey);
}

export async function open(box: Uint8Array, recipientPublicKey: Uint8Array, recipientSecretKey: Uint8Array): Promise<Uint8Array> {
  await initCrypto();
  return sodium.crypto_box_seal_open(box, recipientPublicKey, recipientSecretKey);
}

export async function sign(message: Uint8Array, secretKey: Uint8Array): Promise<Uint8Array> {
  await initCrypto();
  return sodium.crypto_sign_detached(message, secretKey);
}

export async function verify(message: Uint8Array, signature: Uint8Array, publicKey: Uint8Array): Promise<boolean> {
  await initCrypto();
  return sodium.crypto_sign_verify_detached(signature, message, publicKey);
}

export class TelemetryCounter {
  private counts = new Map<string, number>();
  increment(name: string, delta = 1) {
    this.counts.set(name, (this.counts.get(name) ?? 0) + delta);
  }
  snapshot() {
    return Array.from(this.counts.entries()).map(([k, v]) => ({ name: k, value: v }));
  }
}

/**
 * Supply ledger for tracking BLOOM token outstanding supply
 * Single source of truth for BLOOM supply accounting
 */
export class SupplyLedger {
  private outstandingSupply: bigint = 0n;
  private mintHistory: Array<{ amount: bigint; timestamp: number }> = [];
  private burnHistory: Array<{ amount: bigint; timestamp: number }> = [];

  /**
   * Get current outstanding BLOOM supply
   */
  currentSupply(): bigint {
    return this.outstandingSupply;
  }

  /**
   * Record a mint operation (increase supply)
   * @param amount Amount of BLOOM minted
   */
  recordMint(amount: bigint): void {
    if (amount <= 0n) {
      throw new Error('Mint amount must be positive');
    }
    this.outstandingSupply += amount;
    this.mintHistory.push({ amount, timestamp: Date.now() });
  }

  /**
   * Record a burn operation (decrease supply)
   * @param amount Amount of BLOOM burned
   */
  recordBurn(amount: bigint): void {
    if (amount <= 0n) {
      throw new Error('Burn amount must be positive');
    }
    if (amount > this.outstandingSupply) {
      throw new Error('Cannot burn more than outstanding supply');
    }
    this.outstandingSupply -= amount;
    this.burnHistory.push({ amount, timestamp: Date.now() });
  }

  /**
   * Get mint history for auditing
   */
  getMintHistory(): Array<{ amount: bigint; timestamp: number }> {
    return [...this.mintHistory];
  }

  /**
   * Get burn history for auditing
   */
  getBurnHistory(): Array<{ amount: bigint; timestamp: number }> {
    return [...this.burnHistory];
  }

  /**
   * Reset supply ledger (for testing)
   */
  reset(): void {
    this.outstandingSupply = 0n;
    this.mintHistory = [];
    this.burnHistory = [];
  }
}

