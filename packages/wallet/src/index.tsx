// Wallet GA Polish - Peg proof panel, 2FA hooks, per-site allowances

import React, { useState, useEffect } from 'react';
import { getObservability } from '@mycelia/observability';
import { getFeatureFlagsManager } from '@mycelia/web4-feature-flags';

export interface PegProof {
  operation: string;
  sats_amount: number;
  bloom_amount: number;
  exchange_rate: number;
  timestamp: number;
  calculation: string;
}

export interface SiteAllowance {
  domain: string;
  max_amount_sats: number;
  max_amount_bloom: number;
  daily_limit: number;
  used_today: number;
  created_at: number;
  last_used: number;
}

export interface WebAuthn2FA {
  enabled: boolean;
  threshold_sats: number;
  threshold_bloom: number;
  registered_credentials: number;
  last_used: number;
}

export interface WalletTransaction {
  id: string;
  type: 'earn' | 'spend' | 'redeem' | 'transfer';
  amount_sats: number;
  amount_bloom: number;
  domain?: string;
  description: string;
  timestamp: number;
  status: 'pending' | 'completed' | 'failed';
  peg_proof?: PegProof;
}

export class WalletManager {
  private transactions: WalletTransaction[] = [];
  private siteAllowances: Map<string, SiteAllowance> = new Map();
  private webAuthn2FA: WebAuthn2FA = {
    enabled: false,
    threshold_sats: 100000, // 0.001 BTC
    threshold_bloom: 1000,
    registered_credentials: 0,
    last_used: 0
  };
  private currentBalance: { sats: number; bloom: number } = { sats: 0, bloom: 0 };

  constructor() {
    this.loadWalletData();
    this.loadSiteAllowances();
    this.loadWebAuthn2FA();
  }

  private loadWalletData(): void {
    try {
      const stored = localStorage.getItem('mycelia-wallet-data');
      if (stored) {
        const data = JSON.parse(stored);
        this.transactions = data.transactions || [];
        this.currentBalance = data.balance || { sats: 0, bloom: 0 };
      }
    } catch (error) {
      console.warn('Failed to load wallet data:', error);
    }
  }

  private saveWalletData(): void {
    try {
      const data = {
        transactions: this.transactions,
        balance: this.currentBalance,
        timestamp: Date.now()
      };
      localStorage.setItem('mycelia-wallet-data', JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save wallet data:', error);
    }
  }

  private loadSiteAllowances(): void {
    try {
      const stored = localStorage.getItem('mycelia-site-allowances');
      if (stored) {
        const data = JSON.parse(stored);
        this.siteAllowances = new Map(data);
      }
    } catch (error) {
      console.warn('Failed to load site allowances:', error);
    }
  }

  private saveSiteAllowances(): void {
    try {
      const data = Array.from(this.siteAllowances.entries());
      localStorage.setItem('mycelia-site-allowances', JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save site allowances:', error);
    }
  }

  private loadWebAuthn2FA(): void {
    try {
      const stored = localStorage.getItem('mycelia-webauthn-2fa');
      if (stored) {
        this.webAuthn2FA = JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Failed to load WebAuthn 2FA:', error);
    }
  }

  private saveWebAuthn2FA(): void {
    try {
      localStorage.setItem('mycelia-webauthn-2fa', JSON.stringify(this.webAuthn2FA));
    } catch (error) {
      console.warn('Failed to save WebAuthn 2FA:', error);
    }
  }

  getCurrentBalance(): { sats: number; bloom: number } {
    return this.currentBalance;
  }

  getTransactions(): WalletTransaction[] {
    return [...this.transactions].sort((a, b) => b.timestamp - a.timestamp);
  }

  generatePegProof(operation: string, satsAmount: number): PegProof {
    const exchangeRate = 100000; // 1 BTC = 100,000 BLOOM (example rate)
    const bloomAmount = Math.floor(satsAmount * exchangeRate / 100000000); // Convert sats to BTC, then to BLOOM
    const calculation = `${satsAmount} sats ÷ 100,000,000 × ${exchangeRate} = ${bloomAmount} BLOOM`;

    const pegProof: PegProof = {
      operation,
      sats_amount: satsAmount,
      bloom_amount: bloomAmount,
      exchange_rate: exchangeRate,
      timestamp: Date.now(),
      calculation
    };

    return pegProof;
  }

  async addTransaction(transaction: Omit<WalletTransaction, 'id' | 'peg_proof'>): Promise<WalletTransaction> {
    const id = `tx_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    
    // Generate peg proof for relevant operations
    let pegProof: PegProof | undefined;
    if (transaction.type === 'earn' || transaction.type === 'redeem') {
      pegProof = this.generatePegProof(transaction.type, transaction.amount_sats);
    }

    const newTransaction: WalletTransaction = {
      ...transaction,
      id,
      peg_proof: pegProof
    };

    this.transactions.push(newTransaction);
    
    // Update balance
    if (transaction.type === 'earn') {
      this.currentBalance.sats += transaction.amount_sats;
      this.currentBalance.bloom += transaction.amount_bloom;
    } else if (transaction.type === 'spend' || transaction.type === 'redeem') {
      this.currentBalance.sats -= transaction.amount_sats;
      this.currentBalance.bloom -= transaction.amount_bloom;
    }

    this.saveWalletData();

    // Log transaction event
    getObservability().logEvent('wallet_transaction', {
      transaction_id: id,
      type: transaction.type,
      amount_sats: transaction.amount_sats,
      amount_bloom: transaction.amount_bloom,
      domain: transaction.domain,
      peg_proof_generated: !!pegProof
    });

    return newTransaction;
  }

  getSiteAllowances(): SiteAllowance[] {
    return Array.from(this.siteAllowances.values());
  }

  getSiteAllowance(domain: string): SiteAllowance | undefined {
    return this.siteAllowances.get(domain);
  }

  async createSiteAllowance(domain: string, maxAmountSats: number, dailyLimit: number): Promise<SiteAllowance> {
    const exchangeRate = 100000;
    const maxAmountBloom = Math.floor(maxAmountSats * exchangeRate / 100000000);

    const allowance: SiteAllowance = {
      domain,
      max_amount_sats: maxAmountSats,
      max_amount_bloom: maxAmountBloom,
      daily_limit: dailyLimit,
      used_today: 0,
      created_at: Date.now(),
      last_used: 0
    };

    this.siteAllowances.set(domain, allowance);
    this.saveSiteAllowances();

    getObservability().logEvent('wallet_site_allowance_created', {
      domain,
      max_amount_sats: maxAmountSats,
      daily_limit: dailyLimit
    });

    return allowance;
  }

  async revokeSiteAllowance(domain: string): Promise<boolean> {
    const allowance = this.siteAllowances.get(domain);
    if (!allowance) {
      return false;
    }

    this.siteAllowances.delete(domain);
    this.saveSiteAllowances();

    getObservability().logEvent('wallet_site_allowance_revoked', {
      domain,
      allowance_duration: Date.now() - allowance.created_at
    });

    return true;
  }

  async updateSiteAllowanceUsage(domain: string, amountSats: number): Promise<boolean> {
    const allowance = this.siteAllowances.get(domain);
    if (!allowance) {
      return false;
    }

    allowance.used_today += amountSats;
    allowance.last_used = Date.now();
    this.siteAllowances.set(domain, allowance);
    this.saveSiteAllowances();

    return true;
  }

  getWebAuthn2FA(): WebAuthn2FA {
    return this.webAuthn2FA;
  }

  async enableWebAuthn2FA(thresholdSats: number, thresholdBloom: number): Promise<boolean> {
    try {
      // Mock WebAuthn registration
      const credential = await this.registerWebAuthnCredential();
      
      this.webAuthn2FA = {
        enabled: true,
        threshold_sats: thresholdSats,
        threshold_bloom: thresholdBloom,
        registered_credentials: 1,
        last_used: 0
      };

      this.saveWebAuthn2FA();

      getObservability().logEvent('wallet_webauthn_enabled', {
        threshold_sats: thresholdSats,
        threshold_bloom: thresholdBloom
      });

      return true;
    } catch (error) {
      console.error('Failed to enable WebAuthn 2FA:', error);
      return false;
    }
  }

  async disableWebAuthn2FA(): Promise<boolean> {
    this.webAuthn2FA = {
      enabled: false,
      threshold_sats: 100000,
      threshold_bloom: 1000,
      registered_credentials: 0,
      last_used: 0
    };

    this.saveWebAuthn2FA();

    getObservability().logEvent('wallet_webauthn_disabled', {});

    return true;
  }

  async verifyWebAuthn2FA(): Promise<boolean> {
    if (!this.webAuthn2FA.enabled) {
      return true; // No 2FA required
    }

    try {
      // Mock WebAuthn verification
      const verified = await this.verifyWebAuthnCredential();
      
      if (verified) {
        this.webAuthn2FA.last_used = Date.now();
        this.saveWebAuthn2FA();
      }

      return verified;
    } catch (error) {
      console.error('WebAuthn verification failed:', error);
      return false;
    }
  }

  async check2FARequired(amountSats: number, amountBloom: number): Promise<boolean> {
    return this.webAuthn2FA.enabled && 
           (amountSats >= this.webAuthn2FA.threshold_sats || 
            amountBloom >= this.webAuthn2FA.threshold_bloom);
  }

  private async registerWebAuthnCredential(): Promise<any> {
    // Mock WebAuthn registration
    return {
      id: 'mock_credential_id',
      type: 'public-key',
      rawId: new ArrayBuffer(32),
      response: {
        attestationObject: new ArrayBuffer(64),
        clientDataJSON: new ArrayBuffer(128)
      }
    };
  }

  private async verifyWebAuthnCredential(): Promise<boolean> {
    // Mock WebAuthn verification
    return Math.random() > 0.1; // 90% success rate for demo
  }

  // Mock methods for demo
  async earnRewards(amountSats: number, domain: string, description: string): Promise<WalletTransaction> {
    const exchangeRate = 100000;
    const amountBloom = Math.floor(amountSats * exchangeRate / 100000000);

    return this.addTransaction({
      type: 'earn',
      amount_sats: amountSats,
      amount_bloom: amountBloom,
      domain,
      description,
      timestamp: Date.now(),
      status: 'completed'
    });
  }

  async spendRewards(amountSats: number, domain: string, description: string): Promise<WalletTransaction> {
    const exchangeRate = 100000;
    const amountBloom = Math.floor(amountSats * exchangeRate / 100000000);

    // Check if 2FA is required
    const requires2FA = await this.check2FARequired(amountSats, amountBloom);
    if (requires2FA) {
      const verified = await this.verifyWebAuthn2FA();
      if (!verified) {
        throw new Error('2FA verification required but failed');
      }
    }

    return this.addTransaction({
      type: 'spend',
      amount_sats: amountSats,
      amount_bloom: amountBloom,
      domain,
      description,
      timestamp: Date.now(),
      status: 'completed'
    });
  }
}

// React Components
export const WalletDashboard: React.FC = () => {
  const [walletManager] = useState(() => new WalletManager());
  const [balance, setBalance] = useState({ sats: 0, bloom: 0 });
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [siteAllowances, setSiteAllowances] = useState<SiteAllowance[]>([]);
  const [webAuthn2FA, setWebAuthn2FA] = useState<WebAuthn2FA>({
    enabled: false,
    threshold_sats: 100000,
    threshold_bloom: 1000,
    registered_credentials: 0,
    last_used: 0
  });
  const [showPegProof, setShowPegProof] = useState<WalletTransaction | null>(null);
  const [showSiteAllowances, setShowSiteAllowances] = useState(false);

  useEffect(() => {
    loadWalletData();
  }, []);

  const loadWalletData = () => {
    setBalance(walletManager.getCurrentBalance());
    setTransactions(walletManager.getTransactions());
    setSiteAllowances(walletManager.getSiteAllowances());
    setWebAuthn2FA(walletManager.getWebAuthn2FA());
  };

  const handleEarnRewards = async () => {
    const amountSats = 1000; // 0.00001 BTC
    const domain = 'example.com';
    const description = 'Content engagement reward';
    
    try {
      await walletManager.earnRewards(amountSats, domain, description);
      loadWalletData();
      alert('Rewards earned successfully!');
    } catch (error) {
      console.error('Failed to earn rewards:', error);
      alert('Failed to earn rewards');
    }
  };

  const handleSpendRewards = async () => {
    const amountSats = 50000; // 0.0005 BTC
    const domain = 'shop.example.com';
    const description = 'Purchase premium content';
    
    try {
      await walletManager.spendRewards(amountSats, domain, description);
      loadWalletData();
      alert('Rewards spent successfully!');
    } catch (error) {
      console.error('Failed to spend rewards:', error);
      alert('Failed to spend rewards: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  const handleCreateSiteAllowance = async () => {
    const domain = prompt('Enter domain for allowance:');
    if (!domain) return;

    const maxAmountSats = 100000; // 0.001 BTC
    const dailyLimit = 5;

    try {
      await walletManager.createSiteAllowance(domain, maxAmountSats, dailyLimit);
      loadWalletData();
      alert('Site allowance created successfully!');
    } catch (error) {
      console.error('Failed to create site allowance:', error);
      alert('Failed to create site allowance');
    }
  };

  const handleRevokeSiteAllowance = async (domain: string) => {
    try {
      await walletManager.revokeSiteAllowance(domain);
      loadWalletData();
      alert('Site allowance revoked successfully!');
    } catch (error) {
      console.error('Failed to revoke site allowance:', error);
      alert('Failed to revoke site allowance');
    }
  };

  const handleToggle2FA = async () => {
    if (webAuthn2FA.enabled) {
      await walletManager.disableWebAuthn2FA();
    } else {
      await walletManager.enableWebAuthn2FA(100000, 1000);
    }
    loadWalletData();
  };

  return (
    <div className="wallet-dashboard">
      <div className="wallet-header">
        <h1>Web4 Wallet</h1>
        <p>Manage your BLOOM rewards and site allowances</p>
      </div>

      <div className="wallet-balance">
        <h2>Current Balance</h2>
        <div className="balance-display">
          <div className="balance-item">
            <span className="balance-label">Sats:</span>
            <span className="balance-value">{balance.sats.toLocaleString()}</span>
          </div>
          <div className="balance-item">
            <span className="balance-label">BLOOM:</span>
            <span className="balance-value">{balance.bloom.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="wallet-actions">
        <button onClick={handleEarnRewards} className="btn-earn">
          Earn Rewards (Demo)
        </button>
        <button onClick={handleSpendRewards} className="btn-spend">
          Spend Rewards (Demo)
        </button>
      </div>

      <div className="wallet-features">
        <div className="feature-section">
          <h3>WebAuthn 2FA</h3>
          <div className="feature-status">
            <span>Status:</span>
            <span className={webAuthn2FA.enabled ? 'status-enabled' : 'status-disabled'}>
              {webAuthn2FA.enabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>
          {webAuthn2FA.enabled && (
            <div className="feature-details">
              <div className="detail-item">
                <span>Threshold:</span>
                <span>{webAuthn2FA.threshold_sats.toLocaleString()} sats / {webAuthn2FA.threshold_bloom.toLocaleString()} BLOOM</span>
              </div>
              <div className="detail-item">
                <span>Credentials:</span>
                <span>{webAuthn2FA.registered_credentials}</span>
              </div>
            </div>
          )}
          <button onClick={handleToggle2FA} className="btn-toggle-2fa">
            {webAuthn2FA.enabled ? 'Disable 2FA' : 'Enable 2FA'}
          </button>
        </div>

        <div className="feature-section">
          <h3>Site Allowances</h3>
          <div className="allowances-header">
            <span>Manage per-site spending limits</span>
            <button onClick={handleCreateSiteAllowance} className="btn-create-allowance">
              Create Allowance
            </button>
          </div>
          
          {siteAllowances.length > 0 && (
            <div className="allowances-list">
              {siteAllowances.map((allowance, index) => (
                <div key={index} className="allowance-item">
                  <div className="allowance-info">
                    <div className="allowance-domain">{allowance.domain}</div>
                    <div className="allowance-limits">
                      Max: {allowance.max_amount_sats.toLocaleString()} sats
                      <br />
                      Daily: {allowance.daily_limit} transactions
                    </div>
                    <div className="allowance-usage">
                      Used today: {allowance.used_today.toLocaleString()} sats
                    </div>
                  </div>
                  <button 
                    onClick={() => handleRevokeSiteAllowance(allowance.domain)}
                    className="btn-revoke"
                  >
                    Revoke
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="wallet-transactions">
        <h3>Recent Transactions</h3>
        <div className="transactions-list">
          {transactions.slice(0, 10).map(transaction => (
            <div key={transaction.id} className="transaction-item">
              <div className="transaction-info">
                <div className="transaction-type">{transaction.type}</div>
                <div className="transaction-description">{transaction.description}</div>
                <div className="transaction-domain">{transaction.domain}</div>
                <div className="transaction-amount">
                  {transaction.amount_sats.toLocaleString()} sats / {transaction.amount_bloom.toLocaleString()} BLOOM
                </div>
                <div className="transaction-time">
                  {new Date(transaction.timestamp).toLocaleString()}
                </div>
              </div>
              {transaction.peg_proof && (
                <button 
                  onClick={() => setShowPegProof(transaction)}
                  className="btn-show-proof"
                >
                  Show Peg Proof
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {showPegProof && showPegProof.peg_proof && (
        <div className="peg-proof-overlay">
          <div className="peg-proof-modal">
            <h2>Peg Proof</h2>
            <div className="proof-details">
              <div className="proof-item">
                <span>Operation:</span>
                <span>{showPegProof.peg_proof.operation}</span>
              </div>
              <div className="proof-item">
                <span>Sats Amount:</span>
                <span>{showPegProof.peg_proof.sats_amount.toLocaleString()}</span>
              </div>
              <div className="proof-item">
                <span>BLOOM Amount:</span>
                <span>{showPegProof.peg_proof.bloom_amount.toLocaleString()}</span>
              </div>
              <div className="proof-item">
                <span>Exchange Rate:</span>
                <span>1 BTC = {showPegProof.peg_proof.exchange_rate.toLocaleString()} BLOOM</span>
              </div>
              <div className="proof-item">
                <span>Calculation:</span>
                <span className="proof-calculation">{showPegProof.peg_proof.calculation}</span>
              </div>
              <div className="proof-item">
                <span>Timestamp:</span>
                <span>{new Date(showPegProof.peg_proof.timestamp).toLocaleString()}</span>
              </div>
            </div>
            <button 
              onClick={() => setShowPegProof(null)}
              className="btn-close"
            >
              Close
            </button>
          </div>
        </div>
      )}

      <style>{`
        .wallet-dashboard {
          max-width: 1000px;
          margin: 0 auto;
          padding: 20px;
        }

        .wallet-header {
          text-align: center;
          margin-bottom: 30px;
        }

        .wallet-header h1 {
          color: #00d4ff;
          margin-bottom: 10px;
        }

        .wallet-balance {
          background: rgba(0, 212, 255, 0.1);
          border: 1px solid #00d4ff;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 30px;
        }

        .wallet-balance h2 {
          color: #00d4ff;
          margin-bottom: 15px;
        }

        .balance-display {
          display: flex;
          gap: 30px;
        }

        .balance-item {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .balance-label {
          color: #ccc;
          font-size: 0.9rem;
          margin-bottom: 5px;
        }

        .balance-value {
          color: #00d4ff;
          font-size: 1.5rem;
          font-weight: bold;
        }

        .wallet-actions {
          display: flex;
          gap: 15px;
          justify-content: center;
          margin-bottom: 30px;
        }

        .btn-earn, .btn-spend {
          padding: 12px 24px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: bold;
          transition: all 0.3s ease;
        }

        .btn-earn {
          background: #00ff88;
          color: #000;
        }

        .btn-earn:hover {
          background: #00cc6a;
        }

        .btn-spend {
          background: #ff6666;
          color: white;
        }

        .btn-spend:hover {
          background: #cc4444;
        }

        .wallet-features {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 30px;
        }

        .feature-section {
          background: rgba(0, 212, 255, 0.1);
          border: 1px solid #00d4ff;
          border-radius: 8px;
          padding: 20px;
        }

        .feature-section h3 {
          color: #00d4ff;
          margin-bottom: 15px;
        }

        .feature-status {
          display: flex;
          justify-content: space-between;
          margin-bottom: 10px;
        }

        .status-enabled {
          color: #00ff88;
          font-weight: bold;
        }

        .status-disabled {
          color: #ff6666;
          font-weight: bold;
        }

        .feature-details {
          margin-bottom: 15px;
        }

        .detail-item {
          display: flex;
          justify-content: space-between;
          margin-bottom: 5px;
          font-size: 0.9rem;
        }

        .detail-item span:first-child {
          color: #ccc;
        }

        .detail-item span:last-child {
          color: #00d4ff;
        }

        .btn-toggle-2fa, .btn-create-allowance {
          padding: 8px 16px;
          border: 1px solid #00d4ff;
          border-radius: 4px;
          background: transparent;
          color: #00d4ff;
          cursor: pointer;
          font-weight: bold;
        }

        .btn-toggle-2fa:hover, .btn-create-allowance:hover {
          background: #00d4ff;
          color: #000;
        }

        .allowances-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
        }

        .allowances-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .allowance-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 4px;
          border: 1px solid rgba(0, 212, 255, 0.2);
        }

        .allowance-info {
          flex: 1;
        }

        .allowance-domain {
          color: #00d4ff;
          font-weight: bold;
          margin-bottom: 5px;
        }

        .allowance-limits {
          color: #ccc;
          font-size: 0.8rem;
          margin-bottom: 5px;
        }

        .allowance-usage {
          color: #ffaa00;
          font-size: 0.8rem;
        }

        .btn-revoke {
          padding: 5px 10px;
          border: 1px solid #ff6666;
          border-radius: 4px;
          background: transparent;
          color: #ff6666;
          cursor: pointer;
          font-size: 0.8rem;
        }

        .btn-revoke:hover {
          background: #ff6666;
          color: white;
        }

        .wallet-transactions {
          background: rgba(0, 212, 255, 0.1);
          border: 1px solid #00d4ff;
          border-radius: 8px;
          padding: 20px;
        }

        .wallet-transactions h3 {
          color: #00d4ff;
          margin-bottom: 15px;
        }

        .transactions-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .transaction-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 15px;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 4px;
          border: 1px solid rgba(0, 212, 255, 0.2);
        }

        .transaction-info {
          flex: 1;
        }

        .transaction-type {
          color: #00d4ff;
          font-weight: bold;
          text-transform: capitalize;
          margin-bottom: 5px;
        }

        .transaction-description {
          color: #ccc;
          margin-bottom: 5px;
        }

        .transaction-domain {
          color: #ffaa00;
          font-size: 0.8rem;
          margin-bottom: 5px;
        }

        .transaction-amount {
          color: #00ff88;
          font-weight: bold;
          margin-bottom: 5px;
        }

        .transaction-time {
          color: #999;
          font-size: 0.8rem;
        }

        .btn-show-proof {
          padding: 5px 10px;
          border: 1px solid #00d4ff;
          border-radius: 4px;
          background: transparent;
          color: #00d4ff;
          cursor: pointer;
          font-size: 0.8rem;
        }

        .btn-show-proof:hover {
          background: #00d4ff;
          color: #000;
        }

        .peg-proof-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .peg-proof-modal {
          background: #1a1a1a;
          border: 1px solid #00d4ff;
          border-radius: 8px;
          padding: 30px;
          max-width: 500px;
          width: 90%;
        }

        .peg-proof-modal h2 {
          color: #00d4ff;
          margin-bottom: 20px;
        }

        .proof-details {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-bottom: 20px;
        }

        .proof-item {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid rgba(0, 212, 255, 0.2);
        }

        .proof-item span:first-child {
          color: #ccc;
          font-weight: bold;
        }

        .proof-item span:last-child {
          color: #00d4ff;
        }

        .proof-calculation {
          font-family: monospace;
          background: rgba(0, 0, 0, 0.3);
          padding: 5px;
          border-radius: 4px;
        }

        .btn-close {
          width: 100%;
          padding: 10px;
          border: none;
          border-radius: 6px;
          background: #00d4ff;
          color: #000;
          cursor: pointer;
          font-weight: bold;
        }

        .btn-close:hover {
          background: #0099cc;
          color: white;
        }
      `}</style>
    </div>
  );
};

// Global wallet manager instance
let globalWalletManager: WalletManager | null = null;

export function getWalletManager(): WalletManager {
  if (!globalWalletManager) {
    globalWalletManager = new WalletManager();
  }
  return globalWalletManager;
}

// Convenience exports
export const wallet = {
  getCurrentBalance: () => getWalletManager().getCurrentBalance(),
  getTransactions: () => getWalletManager().getTransactions(),
  generatePegProof: (operation: string, satsAmount: number) => getWalletManager().generatePegProof(operation, satsAmount),
  addTransaction: (transaction: any) => getWalletManager().addTransaction(transaction),
  getSiteAllowances: () => getWalletManager().getSiteAllowances(),
  getSiteAllowance: (domain: string) => getWalletManager().getSiteAllowance(domain),
  createSiteAllowance: (domain: string, maxAmountSats: number, dailyLimit: number) => getWalletManager().createSiteAllowance(domain, maxAmountSats, dailyLimit),
  revokeSiteAllowance: (domain: string) => getWalletManager().revokeSiteAllowance(domain),
  getWebAuthn2FA: () => getWalletManager().getWebAuthn2FA(),
  enableWebAuthn2FA: (thresholdSats: number, thresholdBloom: number) => getWalletManager().enableWebAuthn2FA(thresholdSats, thresholdBloom),
  disableWebAuthn2FA: () => getWalletManager().disableWebAuthn2FA(),
  verifyWebAuthn2FA: () => getWalletManager().verifyWebAuthn2FA(),
  check2FARequired: (amountSats: number, amountBloom: number) => getWalletManager().check2FARequired(amountSats, amountBloom),
  earnRewards: (amountSats: number, domain: string, description: string) => getWalletManager().earnRewards(amountSats, domain, description),
  spendRewards: (amountSats: number, domain: string, description: string) => getWalletManager().spendRewards(amountSats, domain, description)
};
