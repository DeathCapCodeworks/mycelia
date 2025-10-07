import { describe, it, expect } from 'vitest';
import { SocialGraph } from './index';

describe('SocialGraph', () => {
  it('manages contacts and grants with caps', () => {
    const g = new SocialGraph();
    g.grantCap({ id: 'rw', scope: 'graph:write' });
    g.grantCap({ id: 'r', scope: 'graph:read' });
    g.addContact('did:example:alice', { nickname: 'Alice' });
    g.follow('did:example:bob');
    const list = g.list();
    expect(list.length).toBe(2);
    const token = g.grant('demo-app', 'read');
    g.revoke(token.tokenId);
  });
});

