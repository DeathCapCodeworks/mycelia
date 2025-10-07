import React, { useState, useEffect } from 'react';
import { RewardsEngine } from '@mycelia/bloom-rewards';
import { RewardsEarningsCard, PegConverter } from '@mycelia/ui-components';
import { SupplyLedger } from '@mycelia/shared-kernel';
import { StaticReserveFeed } from '@mycelia/proof-of-reserve';
import { RedemptionEngine, MockHtlcSimulator } from '@mycelia/redemption';
import { bloomToSats } from '@mycelia/tokenomics';

export default function RewardsPage() {
  const [supplyLedger] = useState(() => new SupplyLedger());
  const [reserveFeed] = useState(() => new StaticReserveFeed(100_000_000n)); // 1 BTC
  const [htlcSimulator] = useState(() => new MockHtlcSimulator());
  const [redemptionEngine] = useState(() => new RedemptionEngine(supplyLedger, htlcSimulator));
  
  const [engine] = useState(() => {
    const e = new RewardsEngine(supplyLedger);
    e.enable();
    e.grant({ id: 'acc', scope: 'rewards:account' });
    
    // Set up minting feeds for peg enforcement
    const supplyFeed = {
      async getBloomOutstanding() {
        return supplyLedger.currentSupply();
      }
    };
    e.setMintingFeeds({ reserve: reserveFeed, supply: supplyFeed });
    
    return e;
  });
  
  const [ledger, setLedger] = useState(engine.getLedger());
  const [earnings, setEarnings] = useState(0);
  const [bloomBalance, setBloomBalance] = useState(0);
  const [redemptionAmount, setRedemptionAmount] = useState('');

  useEffect(() => {
    setBloomBalance(Number(supplyLedger.currentSupply()));
  }, []);

  const handleImpression = () => {
    engine.account('impression', { id: Date.now() });
    setLedger([...engine.getLedger()]);
  };

  const handleClick = () => {
    engine.account('click', { id: Date.now() });
    setLedger([...engine.getLedger()]);
  };

  const handleSettle = async () => {
    const receipts = await engine.settle('2025-Q4', 0.85);
    const newEarnings = earnings + 0.01; // mock
    setEarnings(newEarnings);
    
    // Mint BLOOM tokens for earnings
    try {
      const bloomAmount = BigInt(Math.floor(newEarnings * 100)); // Convert to smallest unit
      await engine.mintBloom(bloomAmount);
      setBloomBalance(Number(supplyLedger.currentSupply()));
    } catch (error) {
      console.error('Minting failed:', error);
    }
    
    setLedger([]);
  };

  const handleRedeem = async () => {
    if (!redemptionAmount) return;
    
    try {
      const amount = BigInt(redemptionAmount);
      const intent = await redemptionEngine.requestRedeemBloom(amount, 'bc1demo123');
      
      // Complete redemption immediately for demo
      const success = await redemptionEngine.completeRedemption(intent.id);
      
      if (success) {
        setBloomBalance(Number(supplyLedger.currentSupply()));
        setRedemptionAmount('');
        alert(`Successfully redeemed ${redemptionAmount} BLOOM for ${Number(intent.quotedSats) / 100_000_000} BTC`);
      }
    } catch (error) {
      alert(`Redemption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const btcEquivalent = bloomBalance > 0 ? Number(bloomToSats(BigInt(bloomBalance))) / 100_000_000 : 0;

  return (
    <div>
      <h1>BLOOM Rewards Demo</h1>
      <p>Privacy safe on device ad decisioning. User receives 80 to 90 percent of revenue.</p>
      
      <div style={{ margin: '1rem 0', padding: '1rem', border: '1px solid #333' }}>
        <h3>Mock Ad Slot</h3>
        <p>This is a mock ad that would be rendered based on local auction decisioning.</p>
        <button onClick={handleImpression}>Simulate Impression</button>
        <button onClick={handleClick} style={{ marginLeft: '1rem' }}>Simulate Click</button>
      </div>
      
      <RewardsEarningsCard epoch="2025-Q4" amount={earnings} />
      
      <div style={{ margin: '1rem 0', padding: '1rem', background: '#f8f9fa', borderRadius: '8px' }}>
        <h3>BLOOM Balance</h3>
        <div style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>
          <strong>{bloomBalance.toFixed(4)} BLOOM</strong>
          <span style={{ marginLeft: '1rem', color: '#666' }}>
            ≈ {btcEquivalent.toFixed(8)} BTC
          </span>
        </div>
        
        <PegConverter />
        
        <div style={{ marginTop: '1rem' }}>
          <h4>Redeem BLOOM for BTC</h4>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="number"
              value={redemptionAmount}
              onChange={(e) => setRedemptionAmount(e.target.value)}
              placeholder="Amount to redeem"
              style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
            />
            <button 
              onClick={handleRedeem}
              disabled={!redemptionAmount || bloomBalance === 0}
              style={{ 
                padding: '8px 16px', 
                background: '#28a745', 
                color: 'white', 
                border: 'none', 
                borderRadius: '4px',
                cursor: bloomBalance === 0 ? 'not-allowed' : 'pointer',
                opacity: bloomBalance === 0 ? 0.5 : 1
              }}
            >
              Redeem
            </button>
          </div>
        </div>
      </div>
      
      <div style={{ margin: '1rem 0' }}>
        <h3>Local Ledger</h3>
        <div>
          {ledger.map((entry, i) => (
            <div key={i} style={{ padding: '0.25rem', fontSize: '0.9rem' }}>
              {entry.type} at {new Date(entry.ts).toLocaleTimeString()}
            </div>
          ))}
        </div>
        <button onClick={handleSettle} disabled={ledger.length === 0}>
          Settle Epoch (User Share: 85%)
        </button>
      </div>
    </div>
  );
}
