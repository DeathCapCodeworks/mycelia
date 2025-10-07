import { Capability, CapScope, assertCap, Result } from '@mycelia/shared-kernel';
import { createConsentCard, verifyConsentCard } from '@mycelia/shared-kernel';

export interface LocalModel {
  generate(prompt: string, ctx?: Record<string, unknown>): Promise<string>;
  embed(text: string): Promise<Float32Array>;
}

export interface VectorIndex {
  add(id: string, vec: Float32Array, meta?: Record<string, unknown>): Promise<void>;
  query(vec: Float32Array, k: number): Promise<Array<{ id: string; score: number; meta?: Record<string, unknown> }>>;
}

export interface OracleInit {
  vault: {
    get(key: string, caps?: Capability[]): Uint8Array | undefined;
    list(prefix?: string, caps?: Capability[]): string[];
    put?: (key: string, data: Uint8Array, caps?: Capability[]) => void;
  };
  model: LocalModel;
  index: VectorIndex;
  kms?: { sign: (m: Uint8Array, p: Uint8Array)=>Promise<Uint8Array>|Uint8Array; verify:(m:Uint8Array,s:Uint8Array,k:Uint8Array)=>Promise<boolean>|boolean; getOperatorPublicKey:()=>string|null; getOperatorPrivateKey:()=>Uint8Array|null };
}

// Global oracle agent instance for diagnostics
let globalOracleAgent: OracleAgent | null = null;

export async function init(cfg: OracleInit): Promise<OracleAgent> {
  if (!globalOracleAgent) {
    globalOracleAgent = new OracleAgent();
  }
  globalOracleAgent.init(cfg);
  return globalOracleAgent;
}

export class OracleAgent {
  private vault!: OracleInit['vault'];
  private model!: LocalModel;
  private index!: VectorIndex;
  private caps: Capability[] = [];
  private kms?: OracleInit['kms'];

  init(cfg: OracleInit) {
    this.vault = cfg.vault;
    this.model = cfg.model;
    this.index = cfg.index;
    this.kms = cfg.kms;
  }

  private persistConsent(card: any) {
    try {
      const key = `consent/${card.id}.json`;
      const data = new TextEncoder().encode(JSON.stringify(card));
      this.vault.put?.(key, data, this.caps);
    } catch {}
  }

  async grant(cap: Capability) {
    this.caps.push(cap);
    if (this.kms) {
      const card = await createConsentCard({ requester: 'oracle', scopes: [cap.scope as any], durationMs: cap.durationMs ?? 3600000, purpose: cap.reason ?? 'cap-grant' }, this.kms as any);
      this.persistConsent(card);
    }
  }

  revoke(capId: string) {
    this.caps = this.caps.filter((c) => c.id !== capId);
    // Mark revoked if stored
    try {
      const keys = this.vault.list('consent/', this.caps);
      for (const k of keys) {
        const raw = this.vault.get(k, this.caps);
        if (!raw) continue;
        const card = JSON.parse(new TextDecoder().decode(raw));
        if (Array.isArray(card.scopes) && card.scopes.some((s:string)=> capId.includes(s))) {
          card.revoked = true;
          this.vault.put?.(k, new TextEncoder().encode(JSON.stringify(card)), this.caps);
        }
      }
    } catch {}
  }

  async mem(doc: { id: string; text: string; meta?: Record<string, unknown> }): Promise<void> {
    assertCap('oracle:query', this.caps);
    const vec = await this.model.embed(doc.text);
    await this.index.add(doc.id, vec, doc.meta);
  }

  async query(prompt: string, scope?: { prefix?: string }): Promise<Result<Array<{ id: string; score: number }>>> {
    try {
      assertCap('oracle:query', this.caps);
      const qv = await this.model.embed(prompt);
      const hits = await this.index.query(qv, 5);
      if (scope?.prefix) {
        return { ok: true, value: hits.filter((h) => h.id.startsWith(scope.prefix!)).map(({ id, score }) => ({ id, score })) };
      }
      return { ok: true, value: hits.map(({ id, score }) => ({ id, score })) };
    } catch (e: any) {
      return { ok: false, error: e };
    }
  }
}

// Simple in-memory index and mock model for now
export class MockModel implements LocalModel {
  async generate(prompt: string): Promise<string> {
    return `mock:${prompt}`;
  }
  async embed(text: string): Promise<Float32Array> {
    // hash to a tiny vector deterministically
    let h = 0;
    for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0;
    const v = new Float32Array(8);
    for (let i = 0; i < v.length; i++) v[i] = ((h >>> (i % 4)) & 0xff) / 255;
    return v;
  }
}

export class MemIndex implements VectorIndex {
  private items: Array<{ id: string; vec: Float32Array; meta?: Record<string, unknown> }> = [];
  async add(id: string, vec: Float32Array, meta?: Record<string, unknown>): Promise<void> {
    this.items.push({ id, vec, meta });
  }
  async query(vec: Float32Array, k: number) {
    const score = (a: Float32Array, b: Float32Array) => {
      let s = 0;
      for (let i = 0; i < a.length; i++) s += a[i] * b[i];
      return s;
    };
    return this.items
      .map((it) => ({ id: it.id, score: score(it.vec, vec), meta: it.meta }))
      .sort((x, y) => y.score - x.score)
      .slice(0, k);
  }
}

