import React, { useState, useEffect } from 'react';
import { StaticReserveFeed, composeReserveFeed, MockSpvProofFeed } from '@mycelia/proof-of-reserve';
import { SupplyLedger } from '@mycelia/shared-kernel';
import { collateralizationRatio, isFullyReserved, assertPeg } from '@mycelia/tokenomics';

export default function FundingPage() {
  const [supplyLedger] = useState(() => new SupplyLedger());
  const [reserveFeed] = useState(() => {
    const staticFeed = new StaticReserveFeed(100_000_000n); // 1 BTC
    const spvFeed = new MockSpvProofFeed();
    return composeReserveFeed(spvFeed, staticFeed);
  });
  
  const [lockedSats, setLockedSats] = useState<bigint>(0n);
  const [outstandingBloom, setOutstandingBloom] = useState<bigint>(0n);
  const [collateralRatio, setCollateralRatio] = useState<number>(0);

  useEffect(() => {
    const updateData = async () => {
      try {
        const sats = await reserveFeed.getLockedBtcSats();
        const bloom = supplyLedger.currentSupply();
        
        setLockedSats(sats);
        setOutstandingBloom(bloom);
        setCollateralRatio(collateralizationRatio(sats, bloom));
      } catch (error) {
        console.error('Failed to fetch reserve data:', error);
      }
    };

    updateData();
    const interval = setInterval(updateData, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, [reserveFeed, supplyLedger]);

  const btcAmount = Number(lockedSats) / 100_000_000;
  const isFullyReservedStatus = isFullyReserved(lockedSats, outstandingBloom);

  return (
    <div>
      <h1>Funding and Governance</h1>
      
      <div style={{ padding: '1rem', border: '1px solid #333', margin: '1rem 0' }}>
        <h2>Treasury Statement</h2>
        <p>
          The project is backed by a treasury of <strong>$20,000,000,000</strong> (Twenty Billion USD), 
          secured entirely through cash donations. This capital underwrites operations, collateralizes 
          the treasury, and guarantees long term financial sovereignty and stability for the network.
        </p>
      </div>

      <div style={{ padding: '1rem', border: '1px solid #333', margin: '1rem 0' }}>
        <h2>Peg and Collateralization</h2>
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
            {assertPeg()}
          </div>
          <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1rem' }}>
            Peg is hard coded at 10 BLOOM = 1 BTC. Minting is blocked when collateral would fall below 100 percent.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div style={{ padding: '1rem', background: '#f8f9fa', borderRadius: '8px' }}>
            <h3>Locked BTC</h3>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#28a745' }}>
              {btcAmount.toFixed(8)} BTC
            </div>
            <div style={{ fontSize: '0.9rem', color: '#666' }}>
              {lockedSats.toLocaleString()} sats
            </div>
          </div>

          <div style={{ padding: '1rem', background: '#f8f9fa', borderRadius: '8px' }}>
            <h3>Outstanding BLOOM</h3>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#007bff' }}>
              {Number(outstandingBloom).toLocaleString()} BLOOM
            </div>
            <div style={{ fontSize: '0.9rem', color: '#666' }}>
              Requires {(Number(outstandingBloom) * 0.1).toFixed(8)} BTC
            </div>
          </div>
        </div>

        <div style={{ padding: '1rem', background: isFullyReservedStatus ? '#d4edda' : '#f8d7da', borderRadius: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ margin: 0, color: isFullyReservedStatus ? '#155724' : '#721c24' }}>
                Collateralization Ratio
              </h3>
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: isFullyReservedStatus ? '#155724' : '#721c24' }}>
                {(collateralRatio * 100).toFixed(2)}%
              </div>
            </div>
            <div style={{ 
              padding: '0.5rem 1rem', 
              background: isFullyReservedStatus ? '#28a745' : '#dc3545',
              color: 'white',
              borderRadius: '4px',
              fontWeight: 'bold'
            }}>
              {isFullyReservedStatus ? 'Fully Reserved' : 'Under-collateralized'}
            </div>
          </div>
        </div>

        <div style={{ marginTop: '1rem', padding: '1rem', background: '#e9ecef', borderRadius: '8px' }}>
          <h4>FAQ</h4>
          <div style={{ marginBottom: '0.5rem' }}>
            <strong>Is an external price feed used?</strong>
            <div style={{ fontSize: '0.9rem', color: '#666' }}>
              No. The peg is rule based and does not change with market prices.
            </div>
          </div>
          <div>
            <strong>What proves reserves?</strong>
            <div style={{ fontSize: '0.9rem', color: '#666' }}>
              The network verifies locked BTC through a proof of reserves feed. The initial release uses a static audit value. The roadmap adds SPV proofs and on chain verification.
            </div>
          </div>
        </div>
      </div>
      
      <div style={{ padding: '1rem', border: '1px solid #333', margin: '1rem 0' }}>
        <h2>Runway and Reserves</h2>
        <p>Multi year runway with risk reserves for audits and incident response.</p>
      </div>
      
      <div style={{ padding: '1rem', border: '1px solid #333', margin: '1rem 0' }}>
        <h2>Governance</h2>
        <p>High level governance model with technical steering, risk, and treasury oversight.</p>
      </div>
    </div>
  );
}
