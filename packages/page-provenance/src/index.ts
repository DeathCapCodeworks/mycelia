import React, { useState, useEffect } from 'react';
import { isEnabled } from '@mycelia/web4-feature-flags';

export interface ProvenanceReceipt {
  id: string;
  url: string;
  timestamp: number;
  hash: string;
  signature: string;
  metadata: {
    title?: string;
    description?: string;
    author?: string;
    version?: string;
  };
}

export interface PageProvenanceProps {
  url: string;
  onReceiptGenerated?: (receipt: ProvenanceReceipt) => void;
  showHistory?: boolean;
}

/**
 * Page Provenance Component
 * 
 * Generates and displays page provenance receipts.
 * Behind feature flag: provenance_receipts_v1
 */
export function PageProvenance({
  url,
  onReceiptGenerated,
  showHistory = true
}: PageProvenanceProps): React.ReactElement | null {
  const [receipts, setReceipts] = useState<ProvenanceReceipt[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // Feature flag gate
  if (!isEnabled('provenance_receipts_v1')) {
    return null;
  }

  const generateReceipt = async () => {
    setIsGenerating(true);
    
    try {
      // Mock receipt generation - in production would hash page content
      const receipt: ProvenanceReceipt = {
        id: `receipt_${Date.now()}`,
        url,
        timestamp: Date.now(),
        hash: `sha256_${Math.random().toString(36).substr(2, 9)}`,
        signature: `sig_${Math.random().toString(36).substr(2, 9)}`,
        metadata: {
          title: document.title || 'Untitled',
          description: 'Page provenance receipt',
          author: 'Mycelia Navigator',
          version: '1.0.0'
        }
      };

      setReceipts(prev => [receipt, ...prev]);
      onReceiptGenerated?.(receipt);
    } catch (error) {
      console.error('Failed to generate provenance receipt:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const formatTimestamp = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="page-provenance">
      <div className="provenance-header">
        <h3>Page Provenance</h3>
        <button 
          onClick={generateReceipt} 
          disabled={isGenerating}
          className="generate-btn"
        >
          {isGenerating ? 'Generating...' : 'Generate Receipt'}
        </button>
      </div>

      <div className="current-url">
        <strong>URL:</strong> {url}
      </div>

      {showHistory && receipts.length > 0 && (
        <div className="receipts-history">
          <h4>Receipt History</h4>
          <div className="receipts-list">
            {receipts.map(receipt => (
              <div key={receipt.id} className="receipt-item">
                <div className="receipt-header">
                  <span className="receipt-id">{receipt.id}</span>
                  <span className="receipt-timestamp">{formatTimestamp(receipt.timestamp)}</span>
                </div>
                
                <div className="receipt-details">
                  <div className="receipt-hash">
                    <strong>Hash:</strong> {receipt.hash}
                  </div>
                  <div className="receipt-signature">
                    <strong>Signature:</strong> {receipt.signature}
                  </div>
                </div>

                {receipt.metadata.title && (
                  <div className="receipt-metadata">
                    <strong>Title:</strong> {receipt.metadata.title}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Headless API for page provenance management
 */
export class PageProvenanceManager {
  private receipts: Map<string, ProvenanceReceipt> = new Map();

  generateReceipt(url: string, metadata?: ProvenanceReceipt['metadata']): ProvenanceReceipt {
    const receipt: ProvenanceReceipt = {
      id: `receipt_${Date.now()}`,
      url,
      timestamp: Date.now(),
      hash: this.generateHash(url),
      signature: this.generateSignature(url),
      metadata: {
        title: document.title || 'Untitled',
        description: 'Page provenance receipt',
        author: 'Mycelia Navigator',
        version: '1.0.0',
        ...metadata
      }
    };

    this.receipts.set(receipt.id, receipt);
    return receipt;
  }

  getReceipt(receiptId: string): ProvenanceReceipt | undefined {
    return this.receipts.get(receiptId);
  }

  getReceiptsForUrl(url: string): ProvenanceReceipt[] {
    return Array.from(this.receipts.values())
      .filter(receipt => receipt.url === url)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  getAllReceipts(): ProvenanceReceipt[] {
    return Array.from(this.receipts.values())
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  verifyReceipt(receipt: ProvenanceReceipt): boolean {
    // Mock verification - in production would verify signature
    return receipt.hash === this.generateHash(receipt.url);
  }

  private generateHash(url: string): string {
    // Mock hash generation
    return `sha256_${btoa(url).substr(0, 9)}`;
  }

  private generateSignature(url: string): string {
    // Mock signature generation
    return `sig_${btoa(url).substr(0, 9)}`;
  }
}

export default PageProvenance;