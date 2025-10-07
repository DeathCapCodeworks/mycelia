import React from 'react';
import { ConsentDrawer } from '@mycelia/ui-components';

export default function PrivacyPage() {
  const [cards, setCards] = React.useState([
    { id: 'cc_demo_1', requester: 'oracle@demo', scopes: ['read:vector', 'embed:doc'], issuedAt: Date.now()-5*60000, durationMs: 60*60000, purpose: 'demo search', signature: 'deadbeef' },
    { id: 'cc_demo_2', requester: 'graph@demo', scopes: ['read:contacts'], issuedAt: Date.now()-30*60000, durationMs: 45*60000, purpose: 'contact lookup', signature: 'c0ffee' }
  ]);

  const revoke = (id: string) => setCards(prev => prev.map(c => c.id === id ? { ...c, revoked: true } : c));

  return (
    <div className="card">
      <h2>Consent Cards</h2>
      <p className="myc-muted">List of capability grants issued as signed Consent Cards. You can search, revoke, and export cards as signed JSON Lines.</p>
      <ConsentDrawer cards={cards} onRevoke={revoke} />
    </div>
  );
}
