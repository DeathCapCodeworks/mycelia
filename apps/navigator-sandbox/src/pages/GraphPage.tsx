import React, { useState } from 'react';
import { SocialGraph } from '@mycelia/social-graph';
import { GraphPermissionPanel } from '@mycelia/ui-components';

export default function GraphPage() {
  const [graph] = useState(() => {
    const g = new SocialGraph();
    g.grantCap({ id: 'rw', scope: 'graph:write' });
    g.grantCap({ id: 'r', scope: 'graph:read' });
    // Seed contacts
    g.addContact('did:example:alice', { nickname: 'Alice' });
    g.addContact('did:example:bob', { nickname: 'Bob' });
    return g;
  });
  const [contacts, setContacts] = useState(graph.list());
  const [grants, setGrants] = useState<string[]>([]);

  const handleGrant = () => {
    const token = graph.grant('demo-app', 'read');
    setGrants([...grants, token.tokenId]);
  };

  const handleRevoke = (tokenId: string) => {
    graph.revoke(tokenId);
    setGrants(grants.filter(id => id !== tokenId));
  };

  return (
    <div>
      <h1>Portable Social Graph Demo</h1>
      <p>DID anchored contacts that live in the vault and travel across apps by capability grants.</p>
      
      <div style={{ margin: '1rem 0' }}>
        <h3>Contacts</h3>
        {contacts.map((c) => (
          <div key={c.did} style={{ padding: '0.5rem', border: '1px solid #333', margin: '0.5rem 0' }}>
            {c.did} {c.meta?.nickname && `(${c.meta.nickname})`}
          </div>
        ))}
      </div>
      
      <div style={{ margin: '1rem 0' }}>
        <h3>Active Grants</h3>
        {grants.map((tokenId) => (
          <div key={tokenId} style={{ padding: '0.5rem', border: '1px solid #333', margin: '0.5rem 0' }}>
            {tokenId} <button onClick={() => handleRevoke(tokenId)}>Revoke</button>
          </div>
        ))}
      </div>
      
      <GraphPermissionPanel onGrant={handleGrant} onRevoke={() => {}} />
    </div>
  );
}
