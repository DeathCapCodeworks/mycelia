import React, { useState } from 'react';
import { PegConverter } from '@mycelia/ui-components';

export default function RedemptionPage() {
  const [bloomAmount, setBloomAmount] = useState<string>('10');
  const [btcAddress, setBtcAddress] = useState<string>('tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx');
  const [redemptionIntent, setRedemptionIntent] = useState<any>(null);
  const [secret, setSecret] = useState<string>('');
  const [claimResult, setClaimResult] = useState<string>('');

  const handleRedeem = async () => {
    try {
      // Mock redemption request
      const intent = {
        id: `redeem_${Date.now()}`,
        bloomAmount: BigInt(bloomAmount),
        btcAddress,
        quotedSats: BigInt(bloomAmount) * 10_000_000n, // 10 BLOOM = 1 BTC
        deadline: Date.now() + (24 * 60 * 60 * 1000),
        status: 'pending',
        htlc: {
          txid: `mock-htlc-${Date.now()}`,
          vout: 0,
          redeemScriptHex: 'mock-script-hex'
        },
        secretHash: 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3'
      };
      
      setRedemptionIntent(intent);
      setSecret('hello'); // Mock secret for demo
    } catch (error) {
      console.error('Redemption failed:', error);
    }
  };

  const handleClaim = async () => {
    try {
      // Mock HTLC claim
      const claimTxid = `claim-${Date.now()}`;
      setClaimResult(claimTxid);
      
      // Simulate completion
      if (redemptionIntent) {
        setRedemptionIntent({
          ...redemptionIntent,
          status: 'completed',
          btcTxId: claimTxid
        });
      }
    } catch (error) {
      console.error('Claim failed:', error);
    }
  };

  return (
    <div className="card">
      <h2>Bitcoin Testnet Redemption</h2>
      <p className="myc-muted">
        Redeem BLOOM tokens for BTC on Bitcoin testnet using HTLC (Hash Time Locked Contracts).
        <strong> Testnet only - mainnet not yet available.</strong>
      </p>

      <div className="myc-grid">
        <div className="card">
          <h3>Redeem BLOOM for BTC</h3>
          
          <div className="form-group">
            <label>BLOOM Amount:</label>
            <input
              type="number"
              value={bloomAmount}
              onChange={(e) => setBloomAmount(e.target.value)}
              placeholder="10"
            />
          </div>

          <div className="form-group">
            <label>Bitcoin Testnet Address:</label>
            <input
              type="text"
              value={btcAddress}
              onChange={(e) => setBtcAddress(e.target.value)}
              placeholder="tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx"
            />
          </div>

          <div className="form-group">
            <PegConverter bloomAmount={BigInt(bloomAmount || '0')} />
          </div>

          <button onClick={handleRedeem} className="btn btn-primary">
            Create HTLC Redemption
          </button>
        </div>

        {redemptionIntent && (
          <div className="card">
            <h3>HTLC Details</h3>
            <div className="myc-grid">
              <div>
                <strong>Redemption ID:</strong> {redemptionIntent.id}
              </div>
              <div>
                <strong>BLOOM Amount:</strong> {redemptionIntent.bloomAmount.toString()}
              </div>
              <div>
                <strong>BTC Address:</strong> {redemptionIntent.btcAddress}
              </div>
              <div>
                <strong>Quoted Sats:</strong> {redemptionIntent.quotedSats.toString()}
              </div>
              <div>
                <strong>HTLC TXID:</strong> {redemptionIntent.htlc.txid}
              </div>
              <div>
                <strong>Secret Hash:</strong> {redemptionIntent.secretHash}
              </div>
              <div>
                <strong>Status:</strong> 
                <span className={`status-${redemptionIntent.status}`}>
                  {redemptionIntent.status}
                </span>
              </div>
              <div>
                <strong>Deadline:</strong> {new Date(redemptionIntent.deadline).toLocaleString()}
              </div>
            </div>

            {redemptionIntent.status === 'pending' && (
              <div className="form-group">
                <label>Secret (for demo):</label>
                <input
                  type="text"
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  placeholder="hello"
                />
                <button onClick={handleClaim} className="btn btn-success">
                  Claim HTLC
                </button>
              </div>
            )}

            {claimResult && (
              <div className="success">
                <strong>Claim TXID:</strong> {claimResult}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="card">
        <h3>How It Works</h3>
        <ol>
          <li>Enter BLOOM amount and Bitcoin testnet address</li>
          <li>System creates HTLC with 24-hour timeout</li>
          <li>HTLC locks BTC at the quoted amount</li>
          <li>User claims BTC using secret (demo mode)</li>
          <li>BLOOM tokens are burned from supply</li>
        </ol>
        
        <div className="warning">
          <strong>Testnet Only:</strong> This is a demonstration on Bitcoin testnet. 
          Mainnet redemption will be available in future releases.
        </div>
      </div>
    </div>
  );
}
