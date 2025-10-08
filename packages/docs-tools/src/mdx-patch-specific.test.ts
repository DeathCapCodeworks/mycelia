import { describe, it, expect } from 'vitest';
import { MDXSpecificPatcher } from './mdx-patch-specific';

describe('MDXSpecificPatcher', () => {
  it('should patch mainnet-por missing braces', () => {
    const patcher = new MDXSpecificPatcher();
    const lines = ['Some text with `{por.freshness} missing brace'];
    const result = { edits: [], success: false };
    
    const modified = patcher['patchMainnetPor'](lines, result);
    
    expect(modified).toBe(true);
    expect(lines[0]).toBe('Some text with `{por.freshness} missing brace}');
    expect(result.edits).toHaveLength(1);
  });

  it('should patch media-pipeline unclosed tags', () => {
    const patcher = new MDXSpecificPatcher();
    const lines = ['<EncodedChunkStream>some content'];
    const result = { edits: [], success: false };
    
    const modified = patcher['patchMediaPipeline'](lines, result);
    
    expect(modified).toBe(true);
    expect(lines[0]).toContain('```tsx');
    expect(result.edits).toHaveLength(1);
  });

  it('should patch net-stack pseudo-tags', () => {
    const patcher = new MDXSpecificPatcher();
    const lines = ['Some text with <http/3> pseudo-tag'];
    const result = { edits: [], success: false };
    
    const modified = patcher['patchNetStack'](lines, result);
    
    expect(modified).toBe(true);
    expect(lines[0]).toBe('Some text with `http/3` pseudo-tag');
    expect(result.edits).toHaveLength(1);
  });

  it('should patch webrtc-enhanced void tags', () => {
    const patcher = new MDXSpecificPatcher();
    const lines = ['<void>some content'];
    const result = { edits: [], success: false };
    
    const modified = patcher['patchWebrtcEnhanced'](lines, result);
    
    expect(modified).toBe(true);
    expect(lines[0]).toBe('<span class="void">some content</span>');
    expect(result.edits).toHaveLength(1);
  });
});
