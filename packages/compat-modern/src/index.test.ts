import { describe, it, expect } from 'vitest';
import { detectAll } from './detect';

describe('compat-modern', () => {
  it('produces a report with required keys', () => {
    const r = detectAll();
    expect(r).toHaveProperty('av1');
    expect(r).toHaveProperty('webgpu');
    expect(r).toHaveProperty('webcodecs');
    expect(r.timestamp).toBeTypeOf('string');
  });
});
