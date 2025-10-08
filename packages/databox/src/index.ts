import CryptoJS from 'crypto-js';
import sqlite3 from 'sqlite3';
import { observability } from '@mycelia/observability';
import { featureFlags } from '@mycelia/web4-feature-flags';

export interface Interaction {
  id: string;
  type: 'envelope_created' | 'envelope_shared' | 'envelope_accessed' | 'room_joined' | 'room_left' | 'presence_joined' | 'presence_left';
  timestamp: number;
  data: any;
  encrypted: boolean;
}

export interface ConsentLog {
  id: string;
  consentId: string;
  action: 'granted' | 'revoked' | 'modified';
  timestamp: number;
  scope: string;
  data: any;
  encrypted: boolean;
}

export interface ContentKey {
  id: string;
  envelopeId: string;
  encryptedKey: string;
  createdAt: number;
  lastAccessed: number;
  accessCount: number;
}

export interface UserPreference {
  id: string;
  key: string;
  value: any;
  encrypted: boolean;
  updatedAt: number;
}

export interface DataboxExport {
  version: string;
  exportedAt: number;
  interactions: Interaction[];
  consentLogs: ConsentLog[];
  contentKeys: ContentKey[];
  preferences: UserPreference[];
  metadata: {
    totalInteractions: number;
    totalConsents: number;
    totalKeys: number;
    totalPreferences: number;
  };
}

export interface StorageBackend {
  type: 'local' | 'remote_pin' | 'trusted_host';
  config: any;
}

export class Databox {
  private db: sqlite3.Database;
  private masterKey: string | null = null;
  private isInitialized = false;
  private storageBackend: StorageBackend;

  constructor(storageBackend: StorageBackend = { type: 'local', config: {} }) {
    this.storageBackend = storageBackend;
    this.db = new sqlite3.Database('.cache/databox.db');
    this.initialize();
  }

  private async initialize(): Promise<void> {
    if (!featureFlags.isFlagEnabled('databox_v0')) {
      throw new Error('Databox v0 feature flag disabled');
    }

    try {
      await this.initializeDatabase();
      await this.initializeMasterKey();
      this.isInitialized = true;

      observability.logEvent('databox_initialized', {
        storage_backend: this.storageBackend.type
      });

    } catch (error) {
      console.error('Failed to initialize Databox:', error);
      observability.logEvent('databox_init_failed', {
        error: (error as Error).message
      });
      throw error;
    }
  }

  private async initializeDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        this.db.run(`
          CREATE TABLE IF NOT EXISTS interactions (
            id TEXT PRIMARY KEY,
            type TEXT NOT NULL,
            timestamp INTEGER NOT NULL,
            data TEXT NOT NULL,
            encrypted BOOLEAN DEFAULT FALSE
          )
        `);

        this.db.run(`
          CREATE TABLE IF NOT EXISTS consent_logs (
            id TEXT PRIMARY KEY,
            consent_id TEXT NOT NULL,
            action TEXT NOT NULL,
            timestamp INTEGER NOT NULL,
            scope TEXT NOT NULL,
            data TEXT NOT NULL,
            encrypted BOOLEAN DEFAULT FALSE
          )
        `);

        this.db.run(`
          CREATE TABLE IF NOT EXISTS content_keys (
            id TEXT PRIMARY KEY,
            envelope_id TEXT NOT NULL,
            encrypted_key TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            last_accessed INTEGER NOT NULL,
            access_count INTEGER DEFAULT 0
          )
        `);

        this.db.run(`
          CREATE TABLE IF NOT EXISTS preferences (
            id TEXT PRIMARY KEY,
            key TEXT UNIQUE NOT NULL,
            value TEXT NOT NULL,
            encrypted BOOLEAN DEFAULT FALSE,
            updated_at INTEGER NOT NULL
          )
        `);

        resolve();
      });
    });
  }

  private async initializeMasterKey(): Promise<void> {
    // In a real implementation, this would derive from user's master password
    // For demo purposes, we'll use a mock key
    this.masterKey = 'demo-master-key-12345';
  }

  async logInteraction(type: Interaction['type'], data: any, encrypt: boolean = true): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Databox not initialized');
    }

    try {
      const interaction: Interaction = {
        id: this.generateId(),
        type,
        timestamp: Date.now(),
        data: encrypt ? this.encryptData(data) : data,
        encrypted: encrypt
      };

      await this.saveInteraction(interaction);

      observability.logEvent('databox_interaction_logged', {
        type,
        encrypted: encrypt
      });

    } catch (error) {
      console.error('Failed to log interaction:', error);
      observability.logEvent('databox_interaction_log_failed', {
        type,
        error: (error as Error).message
      });
      throw error;
    }
  }

  async logConsent(consentId: string, action: ConsentLog['action'], scope: string, data: any, encrypt: boolean = true): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Databox not initialized');
    }

    try {
      const consentLog: ConsentLog = {
        id: this.generateId(),
        consentId,
        action,
        timestamp: Date.now(),
        scope,
        data: encrypt ? this.encryptData(data) : data,
        encrypted: encrypt
      };

      await this.saveConsentLog(consentLog);

      observability.logEvent('databox_consent_logged', {
        consent_id: consentId,
        action,
        scope,
        encrypted: encrypt
      });

    } catch (error) {
      console.error('Failed to log consent:', error);
      observability.logEvent('databox_consent_log_failed', {
        consent_id: consentId,
        action,
        error: (error as Error).message
      });
      throw error;
    }
  }

  async storeContentKey(envelopeId: string, key: string): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Databox not initialized');
    }

    try {
      const contentKey: ContentKey = {
        id: this.generateId(),
        envelopeId,
        encryptedKey: this.encryptData(key),
        createdAt: Date.now(),
        lastAccessed: Date.now(),
        accessCount: 0
      };

      await this.saveContentKey(contentKey);

      observability.logEvent('databox_content_key_stored', {
        envelope_id: envelopeId
      });

    } catch (error) {
      console.error('Failed to store content key:', error);
      observability.logEvent('databox_content_key_store_failed', {
        envelope_id: envelopeId,
        error: (error as Error).message
      });
      throw error;
    }
  }

  async retrieveContentKey(envelopeId: string): Promise<string | null> {
    if (!this.isInitialized) {
      throw new Error('Databox not initialized');
    }

    try {
      const contentKey = await this.getContentKey(envelopeId);
      if (!contentKey) {
        return null;
      }

      // Update access tracking
      await this.updateContentKeyAccess(contentKey.id);

      const decryptedKey = this.decryptData(contentKey.encryptedKey);

      observability.logEvent('databox_content_key_retrieved', {
        envelope_id: envelopeId,
        access_count: contentKey.accessCount + 1
      });

      return decryptedKey;

    } catch (error) {
      console.error('Failed to retrieve content key:', error);
      observability.logEvent('databox_content_key_retrieve_failed', {
        envelope_id: envelopeId,
        error: (error as Error).message
      });
      throw error;
    }
  }

  async setPreference(key: string, value: any, encrypt: boolean = true): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Databox not initialized');
    }

    try {
      const preference: UserPreference = {
        id: this.generateId(),
        key,
        value: encrypt ? this.encryptData(value) : value,
        encrypted: encrypt,
        updatedAt: Date.now()
      };

      await this.savePreference(preference);

      observability.logEvent('databox_preference_set', {
        key,
        encrypted: encrypt
      });

    } catch (error) {
      console.error('Failed to set preference:', error);
      observability.logEvent('databox_preference_set_failed', {
        key,
        error: (error as Error).message
      });
      throw error;
    }
  }

  async getPreference(key: string): Promise<any | null> {
    if (!this.isInitialized) {
      throw new Error('Databox not initialized');
    }

    try {
      const preference = await this.getPreferenceByKey(key);
      if (!preference) {
        return null;
      }

      return preference.encrypted ? this.decryptData(preference.value) : preference.value;

    } catch (error) {
      console.error('Failed to get preference:', error);
      observability.logEvent('databox_preference_get_failed', {
        key,
        error: (error as Error).message
      });
      throw error;
    }
  }

  async export(): Promise<DataboxExport> {
    if (!this.isInitialized) {
      throw new Error('Databox not initialized');
    }

    try {
      const interactions = await this.getAllInteractions();
      const consentLogs = await this.getAllConsentLogs();
      const contentKeys = await this.getAllContentKeys();
      const preferences = await this.getAllPreferences();

      const exportData: DataboxExport = {
        version: '1.0',
        exportedAt: Date.now(),
        interactions,
        consentLogs,
        contentKeys,
        preferences,
        metadata: {
          totalInteractions: interactions.length,
          totalConsents: consentLogs.length,
          totalKeys: contentKeys.length,
          totalPreferences: preferences.length
        }
      };

      observability.logEvent('databox_exported', {
        interactions_count: interactions.length,
        consents_count: consentLogs.length,
        keys_count: contentKeys.length,
        preferences_count: preferences.length
      });

      return exportData;

    } catch (error) {
      console.error('Failed to export databox:', error);
      observability.logEvent('databox_export_failed', {
        error: (error as Error).message
      });
      throw error;
    }
  }

  async import(exportData: DataboxExport): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Databox not initialized');
    }

    try {
      // Clear existing data
      await this.clearAllData();

      // Import new data
      for (const interaction of exportData.interactions) {
        await this.saveInteraction(interaction);
      }

      for (const consentLog of exportData.consentLogs) {
        await this.saveConsentLog(consentLog);
      }

      for (const contentKey of exportData.contentKeys) {
        await this.saveContentKey(contentKey);
      }

      for (const preference of exportData.preferences) {
        await this.savePreference(preference);
      }

      observability.logEvent('databox_imported', {
        interactions_count: exportData.interactions.length,
        consents_count: exportData.consentLogs.length,
        keys_count: exportData.contentKeys.length,
        preferences_count: exportData.preferences.length
      });

    } catch (error) {
      console.error('Failed to import databox:', error);
      observability.logEvent('databox_import_failed', {
        error: (error as Error).message
      });
      throw error;
    }
  }

  async shredKeys(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Databox not initialized');
    }

    try {
      // Delete all content keys
      await this.deleteAllContentKeys();

      // Request de-indexing from public directory
      await this.requestDeIndexing();

      // Clear local pins
      await this.clearLocalPins();

      observability.logEvent('databox_keys_shredded', {
        action: 'complete_shred'
      });

    } catch (error) {
      console.error('Failed to shred keys:', error);
      observability.logEvent('databox_keys_shred_failed', {
        error: (error as Error).message
      });
      throw error;
    }
  }

  async tombstone(consentId: string): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Databox not initialized');
    }

    try {
      // Mark consent as revoked
      await this.logConsent(consentId, 'revoked', 'all', { tombstoned: true });

      // Remove associated data
      await this.removeConsentData(consentId);

      observability.logEvent('databox_consent_tombstoned', {
        consent_id: consentId
      });

    } catch (error) {
      console.error('Failed to tombstone consent:', error);
      observability.logEvent('databox_consent_tombstone_failed', {
        consent_id: consentId,
        error: (error as Error).message
      });
      throw error;
    }
  }

  private encryptData(data: any): string {
    if (!this.masterKey) {
      throw new Error('Master key not initialized');
    }
    return CryptoJS.AES.encrypt(JSON.stringify(data), this.masterKey).toString();
  }

  private decryptData(encryptedData: string): any {
    if (!this.masterKey) {
      throw new Error('Master key not initialized');
    }
    const decrypted = CryptoJS.AES.decrypt(encryptedData, this.masterKey);
    return JSON.parse(decrypted.toString(CryptoJS.enc.Utf8));
  }

  private generateId(): string {
    return 'databox_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
  }

  // Database operations
  private async saveInteraction(interaction: Interaction): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(
        'INSERT OR REPLACE INTO interactions (id, type, timestamp, data, encrypted) VALUES (?, ?, ?, ?, ?)',
        [interaction.id, interaction.type, interaction.timestamp, JSON.stringify(interaction.data), interaction.encrypted ? 1 : 0],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  private async saveConsentLog(consentLog: ConsentLog): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(
        'INSERT OR REPLACE INTO consent_logs (id, consent_id, action, timestamp, scope, data, encrypted) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [consentLog.id, consentLog.consentId, consentLog.action, consentLog.timestamp, consentLog.scope, JSON.stringify(consentLog.data), consentLog.encrypted ? 1 : 0],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  private async saveContentKey(contentKey: ContentKey): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(
        'INSERT OR REPLACE INTO content_keys (id, envelope_id, encrypted_key, created_at, last_accessed, access_count) VALUES (?, ?, ?, ?, ?, ?)',
        [contentKey.id, contentKey.envelopeId, contentKey.encryptedKey, contentKey.createdAt, contentKey.lastAccessed, contentKey.accessCount],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  private async savePreference(preference: UserPreference): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(
        'INSERT OR REPLACE INTO preferences (id, key, value, encrypted, updated_at) VALUES (?, ?, ?, ?, ?)',
        [preference.id, preference.key, JSON.stringify(preference.value), preference.encrypted ? 1 : 0, preference.updatedAt],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  private async getAllInteractions(): Promise<Interaction[]> {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT * FROM interactions ORDER BY timestamp DESC', (err, rows: any[]) => {
        if (err) reject(err);
        else {
          const interactions = rows.map(row => ({
            id: row.id,
            type: row.type,
            timestamp: row.timestamp,
            data: JSON.parse(row.data),
            encrypted: row.encrypted === 1
          }));
          resolve(interactions);
        }
      });
    });
  }

  private async getAllConsentLogs(): Promise<ConsentLog[]> {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT * FROM consent_logs ORDER BY timestamp DESC', (err, rows: any[]) => {
        if (err) reject(err);
        else {
          const consentLogs = rows.map(row => ({
            id: row.id,
            consentId: row.consent_id,
            action: row.action,
            timestamp: row.timestamp,
            scope: row.scope,
            data: JSON.parse(row.data),
            encrypted: row.encrypted === 1
          }));
          resolve(consentLogs);
        }
      });
    });
  }

  private async getAllContentKeys(): Promise<ContentKey[]> {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT * FROM content_keys ORDER BY created_at DESC', (err, rows: any[]) => {
        if (err) reject(err);
        else {
          const contentKeys = rows.map(row => ({
            id: row.id,
            envelopeId: row.envelope_id,
            encryptedKey: row.encrypted_key,
            createdAt: row.created_at,
            lastAccessed: row.last_accessed,
            accessCount: row.access_count
          }));
          resolve(contentKeys);
        }
      });
    });
  }

  private async getAllPreferences(): Promise<UserPreference[]> {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT * FROM preferences ORDER BY updated_at DESC', (err, rows: any[]) => {
        if (err) reject(err);
        else {
          const preferences = rows.map(row => ({
            id: row.id,
            key: row.key,
            value: JSON.parse(row.value),
            encrypted: row.encrypted === 1,
            updatedAt: row.updated_at
          }));
          resolve(preferences);
        }
      });
    });
  }

  private async getContentKey(envelopeId: string): Promise<ContentKey | null> {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM content_keys WHERE envelope_id = ?',
        [envelopeId],
        (err, row: any) => {
          if (err) reject(err);
          else if (!row) resolve(null);
          else {
            resolve({
              id: row.id,
              envelopeId: row.envelope_id,
              encryptedKey: row.encrypted_key,
              createdAt: row.created_at,
              lastAccessed: row.last_accessed,
              accessCount: row.access_count
            });
          }
        }
      );
    });
  }

  private async getPreferenceByKey(key: string): Promise<UserPreference | null> {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM preferences WHERE key = ?',
        [key],
        (err, row: any) => {
          if (err) reject(err);
          else if (!row) resolve(null);
          else {
            resolve({
              id: row.id,
              key: row.key,
              value: JSON.parse(row.value),
              encrypted: row.encrypted === 1,
              updatedAt: row.updated_at
            });
          }
        }
      );
    });
  }

  private async updateContentKeyAccess(keyId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(
        'UPDATE content_keys SET last_accessed = ?, access_count = access_count + 1 WHERE id = ?',
        [Date.now(), keyId],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  private async clearAllData(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        this.db.run('DELETE FROM interactions');
        this.db.run('DELETE FROM consent_logs');
        this.db.run('DELETE FROM content_keys');
        this.db.run('DELETE FROM preferences', (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });
  }

  private async deleteAllContentKeys(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM content_keys', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  private async requestDeIndexing(): Promise<void> {
    // Mock implementation - would call public directory API
    console.log('Requesting de-indexing from public directory');
  }

  private async clearLocalPins(): Promise<void> {
    // Mock implementation - would clear IPFS pins
    console.log('Clearing local IPFS pins');
  }

  private async removeConsentData(consentId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(
        'DELETE FROM consent_logs WHERE consent_id = ?',
        [consentId],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  async destroy(): Promise<void> {
    this.db.close();
    this.isInitialized = false;
  }
}

// Global instance
let globalDatabox: Databox | null = null;

export function getDatabox(): Databox {
  if (!globalDatabox) {
    globalDatabox = new Databox();
  }
  return globalDatabox;
}

// Convenience exports
export const databox = {
  logInteraction: (type: Interaction['type'], data: any, encrypt?: boolean) => 
    getDatabox().logInteraction(type, data, encrypt),
  logConsent: (consentId: string, action: ConsentLog['action'], scope: string, data: any, encrypt?: boolean) => 
    getDatabox().logConsent(consentId, action, scope, data, encrypt),
  storeContentKey: (envelopeId: string, key: string) => 
    getDatabox().storeContentKey(envelopeId, key),
  retrieveContentKey: (envelopeId: string) => 
    getDatabox().retrieveContentKey(envelopeId),
  setPreference: (key: string, value: any, encrypt?: boolean) => 
    getDatabox().setPreference(key, value, encrypt),
  getPreference: (key: string) => 
    getDatabox().getPreference(key),
  export: () => getDatabox().export(),
  import: (exportData: DataboxExport) => getDatabox().import(exportData),
  shredKeys: () => getDatabox().shredKeys(),
  tombstone: (consentId: string) => getDatabox().tombstone(consentId)
};
