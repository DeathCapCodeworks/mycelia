import { LocalKMS } from '@mycelia/kms-local';
import crypto from 'crypto';

export type Severity = 'low' | 'medium' | 'high';

export interface VulnerabilityReport {
  severity: Severity;
  hash: string;
  description: string;
  reporter: string;
  timestamp: number;
}

export interface Receipt {
  reportHash: string;
  severity: Severity;
  signature: string;
  publicKey: string;
  timestamp: number;
  receiptId: string;
}

export class DisclosureManager {
  private kms: LocalKMS;
  private receipts: Receipt[] = [];
  private operatorKeyPair: { publicKey: Uint8Array; privateKey: Uint8Array } | null = null;

  constructor() {
    this.kms = new LocalKMS();
    this.initializeOperatorKey();
  }

  private async initializeOperatorKey(): Promise<void> {
    try {
      this.operatorKeyPair = await this.kms.generateEd25519KeyPair();
    } catch (error) {
      console.warn('Failed to initialize operator key:', error);
    }
  }

  /**
   * Create a signed receipt for a vulnerability report
   */
  async createReceipt(report: VulnerabilityReport): Promise<Receipt> {
    if (!this.operatorKeyPair) {
      throw new Error('Operator key not initialized');
    }

    const receiptId = crypto.randomBytes(16).toString('hex');
    const timestamp = Date.now();

    // Create receipt data for signing
    const receiptData = {
      reportHash: report.hash,
      severity: report.severity,
      timestamp,
      receiptId
    };

    const message = new TextEncoder().encode(JSON.stringify(receiptData));
    const signature = await this.kms.sign(message, this.operatorKeyPair.privateKey);
    const signatureHex = Buffer.from(signature).toString('hex');
    const publicKeyHex = Buffer.from(this.operatorKeyPair.publicKey).toString('hex');

    const receipt: Receipt = {
      reportHash: report.hash,
      severity: report.severity,
      signature: signatureHex,
      publicKey: publicKeyHex,
      timestamp,
      receiptId
    };

    this.receipts.push(receipt);
    return receipt;
  }

  /**
   * Verify a receipt signature
   */
  async verifyReceipt(receipt: Receipt): Promise<boolean> {
    try {
      const receiptData = {
        reportHash: receipt.reportHash,
        severity: receipt.severity,
        timestamp: receipt.timestamp,
        receiptId: receipt.receiptId
      };

      const message = new TextEncoder().encode(JSON.stringify(receiptData));
      const signatureBytes = Buffer.from(receipt.signature, 'hex');
      const publicKeyBytes = Buffer.from(receipt.publicKey, 'hex');

      return this.kms.verify(message, signatureBytes, publicKeyBytes);
    } catch (error) {
      return false;
    }
  }

  /**
   * Get all receipts
   */
  getAllReceipts(): Receipt[] {
    return [...this.receipts];
  }

  /**
   * Get receipts by severity
   */
  getReceiptsBySeverity(severity: Severity): Receipt[] {
    return this.receipts.filter(receipt => receipt.severity === severity);
  }

  /**
   * Export receipts as JSON Lines
   */
  exportReceipts(): string {
    return this.receipts.map(receipt => JSON.stringify(receipt)).join('\n');
  }

  /**
   * Save receipts to file
   */
  async saveReceipts(filePath: string): Promise<void> {
    try {
      const fs = await import('fs/promises');
      const content = this.exportReceipts();
      await fs.writeFile(filePath, content, 'utf8');
    } catch (error) {
      throw new Error(`Failed to save receipts to ${filePath}: ${error}`);
    }
  }

  /**
   * Load receipts from file
   */
  async loadReceipts(filePath: string): Promise<void> {
    try {
      const fs = await import('fs/promises');
      const content = await fs.readFile(filePath, 'utf8');
      const lines = content.split('\n').filter(line => line.trim());
      
      this.receipts = lines.map(line => JSON.parse(line));
    } catch (error) {
      throw new Error(`Failed to load receipts from ${filePath}: ${error}`);
    }
  }

  /**
   * Get operator public key
   */
  getOperatorPublicKey(): string | null {
    if (!this.operatorKeyPair) {
      return null;
    }
    return Buffer.from(this.operatorKeyPair.publicKey).toString('hex');
  }

  /**
   * Generate PGP key for secure communication
   */
  generatePGPKey(): string {
    // Mock PGP key generation
    // In production, would use actual PGP library
    return `-----BEGIN PGP PUBLIC KEY BLOCK-----
Version: Mycelia Disclosure

mQENBF4ABCABCADK...
-----END PGP PUBLIC KEY BLOCK-----`;
  }
}
