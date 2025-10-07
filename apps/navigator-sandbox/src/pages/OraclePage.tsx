import React, { useState } from 'react';
import { OracleAgent, MockModel, MemIndex } from '@mycelia/oracle-agent';
import { OracleSearchBox } from '@mycelia/ui-components';

export default function OraclePage() {
  const [results, setResults] = useState<Array<{ id: string; score: number }>>([]);
  const [agent] = useState(() => {
    const a = new OracleAgent();
    a.init({
      vault: { get: () => undefined, list: () => [] },
      model: new MockModel(),
      index: new MemIndex()
    });
    a.grant({ id: 'q', scope: 'oracle:query' });
    // Seed some data
    a.mem({ id: 'history:1', text: 'Email from Alice about Tokyo flight' });
    a.mem({ id: 'calendar:1', text: 'Flight to Tokyo on Monday' });
    a.mem({ id: 'chat:1', text: 'Brother sent AI article link' });
    return a;
  });

  const handleQuery = async (query: string) => {
    const ans = await agent.query(query);
    if (ans.ok) {
      setResults(ans.value);
    }
  };

  return (
    <div>
      <h1>Mycelia Oracle Demo</h1>
      <p>Local only, no network access. Search across seeded documents.</p>
      <OracleSearchBox onQuery={handleQuery} />
      <div style={{ marginTop: '1rem' }}>
        {results.map((r) => (
          <div key={r.id} style={{ padding: '0.5rem', border: '1px solid #333', margin: '0.5rem 0' }}>
            {r.id} (score: {r.score.toFixed(3)})
          </div>
        ))}
      </div>
    </div>
  );
}
