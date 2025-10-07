import { Capability, CapScope, assertCap } from '@mycelia/shared-kernel';
import { createConsentCard } from '@mycelia/shared-kernel';

type Contact = { did: string; meta?: Record<string, unknown> };
type Grant = { tokenId: string; appId: string; scope: 'read' | 'write' };

export class SocialGraph {
  private contacts = new Map<string, Contact>();
  private grants = new Map<string, Grant>();
  private caps: Capability[] = [];
  private kms?: { sign: (m: Uint8Array, p: Uint8Array)=>Promise<Uint8Array>|Uint8Array; verify:(m:Uint8Array,s:Uint8Array,k:Uint8Array)=>Promise<boolean>|boolean; getOperatorPublicKey:()=>string|null; getOperatorPrivateKey:()=>Uint8Array|null };
  private persist?: (key: string, data: Uint8Array) => void;

  constructor(opts?: { kms?: SocialGraph['kms']; persist?: (key: string, data: Uint8Array)=>void }) {
    this.kms = opts?.kms;
    this.persist = opts?.persist;
  }

  grantCap(cap: Capability) { this.caps.push(cap); }
  revokeCap(id: string) { this.caps = this.caps.filter((c) => c.id !== id); }

  addContact(did: string, meta?: Record<string, unknown>) {
    assertCap('graph:write', this.caps);
    this.contacts.set(did, { did, meta });
  }

  follow(did: string) {
    assertCap('graph:write', this.caps);
    if (!this.contacts.has(did)) this.contacts.set(did, { did });
  }

  list(filter?: (c: Contact) => boolean) {
    assertCap('graph:read', this.caps);
    const arr = Array.from(this.contacts.values());
    return filter ? arr.filter(filter) : arr;
  }

  grant(appId: string, scope: 'read' | 'write') {
    assertCap('graph:write', this.caps);
    const tokenId = `${appId}:${scope}:${Math.random().toString(36).slice(2)}`;
    const g = { tokenId, appId, scope };
    this.grants.set(tokenId, g);
    if (this.kms) {
      const durationMs = 3600000;
      createConsentCard({ requester: `graph:${appId}`, scopes: [`graph:${scope}`], durationMs, purpose: 'graph-grant' }, this.kms as any)
        .then((card) => {
          const key = `consent/${card.id}.json`;
          const data = new TextEncoder().encode(JSON.stringify(card));
          this.persist?.(key, data);
        }).catch(() => {});
    }
    return g;
  }

  revoke(tokenId: string) {
    assertCap('graph:write', this.caps);
    this.grants.delete(tokenId);
    // mark consent revoked if persisted would require lookup; keep simple here
  }
}

