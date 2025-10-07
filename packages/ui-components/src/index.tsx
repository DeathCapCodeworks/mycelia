import React from 'react';
import { bloomToSats, satsToBloom, assertPeg } from '@mycelia/tokenomics';

export function VaultGrantButton({ onGrant }: { onGrant: () => void }) {
  return <button onClick={onGrant}>Grant Vault Access</button>;
}

export function OracleSearchBox({ onQuery }: { onQuery: (q: string) => void }) {
  const [q, setQ] = React.useState('');
  return (
    <form onSubmit={(e) => { e.preventDefault(); onQuery(q); }}>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" />
      <button type="submit">Search</button>
    </form>
  );
}

export function WorkspaceSwitcher({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="Work">Work</option>
      <option value="Home">Home</option>
      <option value="Dev">Dev</option>
    </select>
  );
}

export function RewardsEarningsCard({ epoch, amount }: { epoch: string; amount: number }) {
  return <div><strong>{epoch}</strong> earnings, {amount.toFixed(4)} BLOOM</div>;
}

export function GraphPermissionPanel({ onGrant, onRevoke }: { onGrant: () => void; onRevoke: () => void }) {
  return (
    <div>
      <button onClick={onGrant}>Grant Read</button>
      <button onClick={onRevoke}>Revoke</button>
    </div>
  );
}

/**
 * PegBadge component displays the canonical peg statement
 */
export function PegBadge({ className = '' }: { className?: string }) {
  return (
    <div className={`peg-badge ${className}`} title="Each BLOOM is redeemable at the fixed rate and fully backed by locked BTC.">
      {assertPeg()}
    </div>
  );
}

/**
 * PegConverter component for converting between BLOOM and BTC
 * Uses exact integer math with satoshis
 */
export function PegConverter({ className = '' }: { className?: string }) {
  const [bloomInput, setBloomInput] = React.useState('');
  const [btcInput, setBtcInput] = React.useState('');

  const handleBloomChange = (value: string) => {
    setBloomInput(value);
    if (value === '') {
      setBtcInput('');
      return;
    }
    
    try {
      const bloom = BigInt(value);
      const sats = bloomToSats(bloom);
      const btc = Number(sats) / 100_000_000; // Convert sats to BTC
      setBtcInput(btc.toFixed(8));
    } catch {
      setBtcInput('');
    }
  };

  const handleBtcChange = (value: string) => {
    setBtcInput(value);
    if (value === '') {
      setBloomInput('');
      return;
    }
    
    try {
      const btc = parseFloat(value);
      const sats = BigInt(Math.floor(btc * 100_000_000)); // Convert BTC to sats
      const bloom = satsToBloom(sats);
      setBloomInput(bloom.toString());
    } catch {
      setBloomInput('');
    }
  };

  return (
    <div className={`peg-converter ${className}`}>
      <div className="converter-row">
        <label>
          BLOOM:
          <input
            type="text"
            value={bloomInput}
            onChange={(e) => handleBloomChange(e.target.value)}
            placeholder="0"
          />
        </label>
        <span className="equals">=</span>
        <label>
          BTC:
          <input
            type="text"
            value={btcInput}
            onChange={(e) => handleBtcChange(e.target.value)}
            placeholder="0.00000000"
          />
        </label>
      </div>
      <div className="peg-note">
        Conversion uses exact peg: 10 BLOOM = 1 BTC
      </div>
    </div>
  );
}

export { default as Background } from './Background';

