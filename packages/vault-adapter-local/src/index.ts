import { Capability, CapScope, assertCap } from '@mycelia/shared-kernel';

export interface LocalVaultConfig {
  rootPath: string;
}

export interface GrantToken {
  id: string;
  scope: CapScope;
}

export class LocalVault {
  private store = new Map<string, Uint8Array>();
  private grants = new Map<string, GrantToken>();
  constructor(private config: LocalVaultConfig) {}

  init() {
    return true;
  }

  grant(scope: CapScope): GrantToken {
    const id = `${scope}:${Math.random().toString(36).slice(2)}`;
    const token = { id, scope };
    this.grants.set(id, token);
    return token;
  }

  revoke(id: string) {
    this.grants.delete(id);
  }

  private require(scope: CapScope, caps?: Capability[]) {
    assertCap(scope, caps);
  }

  get(key: string, caps?: Capability[]) {
    this.require('vault:read', caps);
    return this.store.get(key);
  }

  put(key: string, bytes: Uint8Array, caps?: Capability[]) {
    this.require('vault:write', caps);
    this.store.set(key, bytes);
  }

  list(prefix = '', caps?: Capability[]) {
    this.require('vault:read', caps);
    return Array.from(this.store.keys()).filter((k) => k.startsWith(prefix));
  }
}

export function init(rootPath: string) {
  const v = new LocalVault({ rootPath });
  v.init();
  return v;
}

