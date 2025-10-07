import { describe, it, expect } from 'vitest';
import { OracleAgent, MockModel, MemIndex } from './index';

const cap = { id: 'q', scope: 'oracle:query' as const };

describe('OracleAgent', () => {
  it('indexes and queries with caps', async () => {
    const agent = new OracleAgent();
    agent.init({
      vault: { get: () => undefined, list: () => [] },
      model: new MockModel(),
      index: new MemIndex()
    });
    agent.grant(cap);
    await agent.mem({ id: 'history:1', text: 'Email from Alice about Tokyo flight' });
    await agent.mem({ id: 'calendar:1', text: 'Flight to Tokyo on Monday' });
    const ans = await agent.query('Tokyo flight');
    expect(ans.ok).toBe(true);
    if (ans.ok) expect(ans.value.length).toBeGreaterThan(0);
  });
});

