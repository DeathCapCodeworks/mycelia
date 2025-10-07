import { describe, it, expect } from 'vitest';
import { LocalVault } from './index';

const capRead = { id: 'r', scope: 'vault:read' as const };
const capWrite = { id: 'w', scope: 'vault:write' as const };

describe('LocalVault', () => {
  it('enforces capabilities and round-trips data', () => {
    const v = new LocalVault({ rootPath: '/tmp' });
    v.init();
    expect(() => v.get('a')).toThrow();
    expect(() => v.put('a', new TextEncoder().encode('x'))).toThrow();

    v.put('a', new TextEncoder().encode('x'), [capWrite]);
    const out = v.get('a', [capRead]);
    expect(new TextDecoder().decode(out!)).toBe('x');
    expect(v.list('', [capRead])).toContain('a');
  });
});

