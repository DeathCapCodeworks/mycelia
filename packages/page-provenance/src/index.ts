// Page Provenance Receipts - Cryptographic proof of document viewing

import { createHash, createHmac } from 'crypto';
import { observability } from '@mycelia/observability';

export interface ProvenanceReceipt {
  id: string;
  url: string;
  title: string;
  timestamp: number;
  contentHash: string;
  viewDuration: number;
  scrollDepth: number;
  interactionCount: number;
  signature: string;
  signer: string;
  version: string;
}

export interface ProvenanceMetadata {
  url: string;
  title: string;
  contentHash: string;
  timestamp: number;
  viewDuration: number;
  scrollDepth: number;
  interactionCount: number;
  userAgent: string;
  referrer?: string;
  viewport: {
    width: number;
    height: number;
  };
  connection: {
    effectiveType: string;
    downlink: number;
  };
}

export interface ProvenanceConfig {
  autoCapture: boolean;
  minViewDuration: number; // milliseconds
  minScrollDepth: number; // percentage
  includeContent: boolean;
  includeMetadata: boolean;
  signingKey: string;
  version: string;
}

export class PageProvenanceManager {
  private receipts: Map<string, ProvenanceReceipt> = new Map();
  private config: ProvenanceConfig;
  private currentPage: ProvenanceMetadata | null = null;
  private pageStartTime: number = 0;
  private interactionCount: number = 0;
  private maxScrollDepth: number = 0;
  private isCapturing: boolean = false;

  constructor(config?: Partial<ProvenanceConfig>) {
    this.config = {
      autoCapture: true,
      minViewDuration: 5000, // 5 seconds
      minScrollDepth: 25, // 25%
      includeContent: false,
      includeMetadata: true,
      signingKey: 'default-provenance-key',
      version: '1.0.0',
      ...config
    };

    this.setupEventListeners();
    this.startPeriodicCapture();
  }

  private setupEventListeners(): void {
    // Track page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.startPageCapture();
      } else {
        this.endPageCapture();
      }
    });

    // Track scroll depth
    let scrollTimeout: number;
    window.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = window.setTimeout(() => {
        this.updateScrollDepth();
      }, 100);
    });

    // Track interactions
    const interactionEvents = ['click', 'keydown', 'touchstart', 'mousemove'];
    interactionEvents.forEach(eventType => {
      document.addEventListener(eventType, () => {
        this.interactionCount++;
      }, { passive: true });
    });

    // Track page unload
    window.addEventListener('beforeunload', () => {
      this.endPageCapture();
    });

    // Track page load
    window.addEventListener('load', () => {
      this.startPageCapture();
    });
  }

  private startPageCapture(): void {
    if (this.isCapturing) return;

    this.isCapturing = true;
    this.pageStartTime = Date.now();
    this.interactionCount = 0;
    this.maxScrollDepth = 0;

    // Capture initial page metadata
    this.currentPage = {
      url: window.location.href,
      title: document.title,
      contentHash: this.calculateContentHash(),
      timestamp: Date.now(),
      viewDuration: 0,
      scrollDepth: 0,
      interactionCount: 0,
      userAgent: navigator.userAgent,
      referrer: document.referrer || undefined,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      connection: this.getConnectionInfo()
    };

    observability.logEvent('provenance_capture_started', {
      url: this.currentPage.url,
      title: this.currentPage.title
    });
  }

  private endPageCapture(): void {
    if (!this.isCapturing || !this.currentPage) return;

    const viewDuration = Date.now() - this.pageStartTime;
    
    // Update current page metadata
    this.currentPage.viewDuration = viewDuration;
    this.currentPage.scrollDepth = this.maxScrollDepth;
    this.currentPage.interactionCount = this.interactionCount;

    // Check if we should create a receipt
    if (this.shouldCreateReceipt()) {
      this.createProvenanceReceipt();
    }

    this.isCapturing = false;
    this.currentPage = null;

    observability.logEvent('provenance_capture_ended', {
      viewDuration,
      scrollDepth: this.maxScrollDepth,
      interactionCount: this.interactionCount
    });
  }

  private shouldCreateReceipt(): boolean {
    if (!this.currentPage) return false;

    return (
      this.currentPage.viewDuration >= this.config.minViewDuration &&
      this.currentPage.scrollDepth >= this.config.minScrollDepth
    );
  }

  private updateScrollDepth(): void {
    if (!this.isCapturing) return;

    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const documentHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrollDepth = documentHeight > 0 ? (scrollTop / documentHeight) * 100 : 0;
    
    this.maxScrollDepth = Math.max(this.maxScrollDepth, scrollDepth);
  }

  private calculateContentHash(): string {
    if (!this.config.includeContent) {
      return this.createHash(this.currentPage?.url || '');
    }

    // Extract text content from the page
    const textContent = document.body.innerText || document.body.textContent || '';
    const contentToHash = `${this.currentPage?.url || ''}:${textContent.substring(0, 10000)}`; // Limit to first 10k chars
    
    return this.createHash(contentToHash);
  }

  private createHash(data: string): string {
    return createHash('sha256').update(data).digest('hex');
  }

  private createSignature(data: string): string {
    return createHmac('sha256', this.config.signingKey).update(data).digest('hex');
  }

  private getConnectionInfo(): { effectiveType: string; downlink: number } {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    
    return {
      effectiveType: connection?.effectiveType || 'unknown',
      downlink: connection?.downlink || 0
    };
  }

  private createProvenanceReceipt(): void {
    if (!this.currentPage) return;

    const receipt: ProvenanceReceipt = {
      id: this.generateReceiptId(),
      url: this.currentPage.url,
      title: this.currentPage.title,
      timestamp: this.currentPage.timestamp,
      contentHash: this.currentPage.contentHash,
      viewDuration: this.currentPage.viewDuration,
      scrollDepth: this.currentPage.scrollDepth,
      interactionCount: this.currentPage.interactionCount,
      signature: '',
      signer: 'mycelia-provenance-manager',
      version: this.config.version
    };

    // Create signature
    const signatureData = `${receipt.id}:${receipt.url}:${receipt.timestamp}:${receipt.contentHash}`;
    receipt.signature = this.createSignature(signatureData);

    // Store receipt
    this.receipts.set(receipt.id, receipt);
    this.saveReceiptsToStorage();

    // Emit event
    const event = new CustomEvent('provenance-receipt-created', {
      detail: receipt
    });
    document.dispatchEvent(event);

    observability.logEvent('provenance_receipt_created', {
      receiptId: receipt.id,
      url: receipt.url,
      viewDuration: receipt.viewDuration,
      scrollDepth: receipt.scrollDepth
    });
  }

  private generateReceiptId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2);
    return `provenance_${timestamp}_${random}`;
  }

  private startPeriodicCapture(): void {
    // Capture receipts every 30 seconds if auto-capture is enabled
    if (this.config.autoCapture) {
      setInterval(() => {
        if (this.isCapturing && this.shouldCreateReceipt()) {
          this.createProvenanceReceipt();
        }
      }, 30000);
    }
  }

  private saveReceiptsToStorage(): void {
    try {
      const receiptsArray = Array.from(this.receipts.values());
      localStorage.setItem('mycelia-provenance-receipts', JSON.stringify(receiptsArray));
    } catch (error) {
      console.warn('Failed to save provenance receipts to storage:', error);
    }
  }

  private loadReceiptsFromStorage(): void {
    try {
      const stored = localStorage.getItem('mycelia-provenance-receipts');
      if (stored) {
        const receiptsArray = JSON.parse(stored);
        receiptsArray.forEach((receipt: ProvenanceReceipt) => {
          this.receipts.set(receipt.id, receipt);
        });
      }
    } catch (error) {
      console.warn('Failed to load provenance receipts from storage:', error);
    }
  }

  // Public API methods
  createReceipt(metadata: Partial<ProvenanceMetadata>): ProvenanceReceipt {
    const receipt: ProvenanceReceipt = {
      id: this.generateReceiptId(),
      url: metadata.url || window.location.href,
      title: metadata.title || document.title,
      timestamp: metadata.timestamp || Date.now(),
      contentHash: metadata.contentHash || this.calculateContentHash(),
      viewDuration: metadata.viewDuration || 0,
      scrollDepth: metadata.scrollDepth || 0,
      interactionCount: metadata.interactionCount || 0,
      signature: '',
      signer: 'mycelia-provenance-manager',
      version: this.config.version
    };

    const signatureData = `${receipt.id}:${receipt.url}:${receipt.timestamp}:${receipt.contentHash}`;
    receipt.signature = this.createSignature(signatureData);

    this.receipts.set(receipt.id, receipt);
    this.saveReceiptsToStorage();

    return receipt;
  }

  getReceipt(receiptId: string): ProvenanceReceipt | undefined {
    return this.receipts.get(receiptId);
  }

  getAllReceipts(): ProvenanceReceipt[] {
    return Array.from(this.receipts.values());
  }

  getReceiptsByUrl(url: string): ProvenanceReceipt[] {
    return Array.from(this.receipts.values()).filter(receipt => receipt.url === url);
  }

  getReceiptsByDomain(domain: string): ProvenanceReceipt[] {
    return Array.from(this.receipts.values()).filter(receipt => {
      try {
        const receiptDomain = new URL(receipt.url).hostname;
        return receiptDomain === domain || receiptDomain.endsWith(`.${domain}`);
      } catch {
        return false;
      }
    });
  }

  verifyReceipt(receipt: ProvenanceReceipt): boolean {
    const signatureData = `${receipt.id}:${receipt.url}:${receipt.timestamp}:${receipt.contentHash}`;
    const expectedSignature = this.createSignature(signatureData);
    return receipt.signature === expectedSignature;
  }

  shareReceipt(receiptId: string): string {
    const receipt = this.receipts.get(receiptId);
    if (!receipt) {
      throw new Error('Receipt not found');
    }

    // Create a shareable proof without exposing content
    const proof = {
      id: receipt.id,
      url: receipt.url,
      timestamp: receipt.timestamp,
      contentHash: receipt.contentHash,
      signature: receipt.signature,
      signer: receipt.signer,
      version: receipt.version
    };

    return btoa(JSON.stringify(proof));
  }

  verifySharedProof(proofData: string): { valid: boolean; receipt?: ProvenanceReceipt } {
    try {
      const proof = JSON.parse(atob(proofData));
      const signatureData = `${proof.id}:${proof.url}:${proof.timestamp}:${proof.contentHash}`;
      const expectedSignature = this.createSignature(signatureData);
      
      if (proof.signature === expectedSignature) {
        const receipt = this.receipts.get(proof.id);
        return { valid: true, receipt };
      }
      
      return { valid: false };
    } catch (error) {
      return { valid: false };
    }
  }

  exportReceipts(format: 'json' | 'csv' = 'json'): string {
    const receipts = Array.from(this.receipts.values());
    
    if (format === 'csv') {
      const headers = ['id', 'url', 'title', 'timestamp', 'contentHash', 'viewDuration', 'scrollDepth', 'interactionCount', 'signature', 'signer', 'version'];
      const rows = receipts.map(receipt => [
        receipt.id,
        receipt.url,
        receipt.title,
        new Date(receipt.timestamp).toISOString(),
        receipt.contentHash,
        receipt.viewDuration,
        receipt.scrollDepth,
        receipt.interactionCount,
        receipt.signature,
        receipt.signer,
        receipt.version
      ]);
      
      return [headers, ...rows].map(row => row.join(',')).join('\n');
    } else {
      return JSON.stringify(receipts, null, 2);
    }
  }

  getStats(): {
    totalReceipts: number;
    totalViewTime: number;
    averageViewTime: number;
    totalScrollDepth: number;
    averageScrollDepth: number;
    totalInteractions: number;
    averageInteractions: number;
    uniqueDomains: number;
  } {
    const receipts = Array.from(this.receipts.values());
    const totalReceipts = receipts.length;
    const totalViewTime = receipts.reduce((sum, r) => sum + r.viewDuration, 0);
    const averageViewTime = totalReceipts > 0 ? totalViewTime / totalReceipts : 0;
    const totalScrollDepth = receipts.reduce((sum, r) => sum + r.scrollDepth, 0);
    const averageScrollDepth = totalReceipts > 0 ? totalScrollDepth / totalReceipts : 0;
    const totalInteractions = receipts.reduce((sum, r) => sum + r.interactionCount, 0);
    const averageInteractions = totalReceipts > 0 ? totalInteractions / totalReceipts : 0;
    
    const domains = new Set();
    receipts.forEach(receipt => {
      try {
        const domain = new URL(receipt.url).hostname;
        domains.add(domain);
      } catch {
        // Ignore invalid URLs
      }
    });
    const uniqueDomains = domains.size;

    return {
      totalReceipts,
      totalViewTime,
      averageViewTime,
      totalScrollDepth,
      averageScrollDepth,
      totalInteractions,
      averageInteractions,
      uniqueDomains
    };
  }

  updateConfig(newConfig: Partial<ProvenanceConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  getConfig(): ProvenanceConfig {
    return { ...this.config };
  }

  clearReceipts(): void {
    this.receipts.clear();
    localStorage.removeItem('mycelia-provenance-receipts');
  }

  // Initialize on page load
  initialize(): void {
    this.loadReceiptsFromStorage();
    if (this.config.autoCapture) {
      this.startPageCapture();
    }
  }
}

// Global provenance manager instance
let globalProvenanceManager: PageProvenanceManager | null = null;

export function getProvenanceManager(config?: Partial<ProvenanceConfig>): PageProvenanceManager {
  if (!globalProvenanceManager) {
    globalProvenanceManager = new PageProvenanceManager(config);
    globalProvenanceManager.initialize();
  }
  return globalProvenanceManager;
}

// Convenience exports
export const provenanceManager = {
  createReceipt: (metadata?: Partial<ProvenanceMetadata>) => getProvenanceManager().createReceipt(metadata),
  getReceipt: (receiptId: string) => getProvenanceManager().getReceipt(receiptId),
  getAllReceipts: () => getProvenanceManager().getAllReceipts(),
  getReceiptsByUrl: (url: string) => getProvenanceManager().getReceiptsByUrl(url),
  getReceiptsByDomain: (domain: string) => getProvenanceManager().getReceiptsByDomain(domain),
  verifyReceipt: (receipt: ProvenanceReceipt) => getProvenanceManager().verifyReceipt(receipt),
  shareReceipt: (receiptId: string) => getProvenanceManager().shareReceipt(receiptId),
  verifySharedProof: (proofData: string) => getProvenanceManager().verifySharedProof(proofData),
  exportReceipts: (format?: 'json' | 'csv') => getProvenanceManager().exportReceipts(format),
  getStats: () => getProvenanceManager().getStats(),
  updateConfig: (config: Partial<ProvenanceConfig>) => getProvenanceManager().updateConfig(config),
  getConfig: () => getProvenanceManager().getConfig(),
  clearReceipts: () => getProvenanceManager().clearReceipts()
};
