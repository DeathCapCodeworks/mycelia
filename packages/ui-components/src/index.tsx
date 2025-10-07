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

// =====================
// Consent Cards UI
// =====================
import React, { useMemo, useState } from 'react';

export interface ConsentCardRowProps {
  card: { id: string; requester: string; scopes: string[]; issuedAt: number; durationMs: number; purpose: string; signature: string; revoked?: boolean };
  onRevoke?: (id: string) => void;
}

export const ConsentCardRow: React.FC<ConsentCardRowProps> = ({ card, onRevoke }) => {
  const expiresAt = card.issuedAt + card.durationMs;
  const remainingMs = Math.max(0, expiresAt - Date.now());
  const remainingMin = Math.floor(remainingMs / 60000);
  return (
    <div className={`mc-consent-row ${card.revoked ? 'revoked' : ''}`}>
      <div className="mc-consent-main">
        <div className="mc-consent-requester">{card.requester}</div>
        <div className="mc-consent-purpose">{card.purpose}</div>
        <div className="mc-consent-scopes">{card.scopes.join(', ')}</div>
      </div>
      <div className="mc-consent-meta">
        <div className="mc-consent-expiry">{card.revoked ? 'revoked' : `${remainingMin} min left`}</div>
        {!card.revoked && onRevoke && (
          <button className="mc-btn mc-btn-danger" onClick={() => onRevoke(card.id)}>Revoke</button>
        )}
      </div>
    </div>
  );
};

export interface ConsentDrawerProps {
  cards: ConsentCardRowProps['card'][];
  onRevoke?: (id: string) => void;
}

export const ConsentDrawer: React.FC<ConsentDrawerProps> = ({ cards, onRevoke }) => {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return cards.filter(c => c.requester.toLowerCase().includes(q) || c.scopes.join(',').toLowerCase().includes(q) || c.purpose.toLowerCase().includes(q));
  }, [cards, query]);

  const exportJsonl = () => {
    const lines = filtered.map(c => JSON.stringify(c)).join('\n');
    const blob = new Blob([lines], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'consent-cards.jsonl'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mc-consent-drawer">
      <div className="mc-consent-toolbar">
        <input className="mc-input" placeholder="Search cards" value={query} onChange={e => setQuery(e.target.value)} />
        <button className="mc-btn" onClick={exportJsonl}>Export JSON Lines</button>
      </div>
      <div className="mc-consent-list">
        {filtered.map(c => (
          <ConsentCardRow key={c.id} card={c} onRevoke={onRevoke} />
        ))}
        {filtered.length === 0 && <div className="mc-empty">No matching consent cards</div>}
      </div>
    </div>
  );
};

