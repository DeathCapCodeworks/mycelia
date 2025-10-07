import { Capability, CapScope, assertCap } from '@mycelia/shared-kernel';

type Contact = { did: string; meta?: Record<string, unknown> };
type Grant = { tokenId: string; appId: string; scope: 'read' | 'write' };

export class SocialGraph {
  private contacts = new Map<string, Contact>();
  private grants = new Map<string, Grant>();
  private caps: Capability[] = [];

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
    return g;
  }

  revoke(tokenId: string) {
    assertCap('graph:write', this.caps);
    this.grants.delete(tokenId);
  }
}

