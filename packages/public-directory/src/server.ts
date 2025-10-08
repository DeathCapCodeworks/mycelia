import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import sqlite3 from 'sqlite3';
import { create } from 'ipfs-core';
import { observability } from '@mycelia/observability';
import { EnvelopeMeta, IndexingPermit } from '@mycelia/nft-envelope';

export interface DirectoryEntry {
  id: string;
  envelopeCid: string;
  meta: EnvelopeMeta;
  indexedAt: number;
  moderated: boolean;
  moderationReason?: string;
}

export interface SearchFilters {
  regions?: string[];
  license?: string[];
  mediaTypes?: string[];
  moderated?: boolean;
}

export interface ModerationAction {
  envelopeCid: string;
  action: 'hide' | 'show';
  reason: string;
  moderatorDid: string;
  signature: string;
}

export class PublicDirectory {
  private app: express.Application;
  private db: sqlite3.Database;
  private ipfs: any = null;
  private port: number;

  constructor(port: number = 3001) {
    this.port = port;
    this.app = express();
    this.db = new sqlite3.Database('.cache/public-directory.db');
    this.setupMiddleware();
    this.setupRoutes();
    this.initializeDatabase();
    this.initializeIPFS();
  }

  private setupMiddleware(): void {
    this.app.use(helmet());
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
  }

  private async initializeDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        this.db.run(`
          CREATE TABLE IF NOT EXISTS envelopes (
            id TEXT PRIMARY KEY,
            envelope_cid TEXT UNIQUE NOT NULL,
            meta TEXT NOT NULL,
            indexed_at INTEGER NOT NULL,
            moderated BOOLEAN DEFAULT FALSE,
            moderation_reason TEXT
          )
        `);

        this.db.run(`
          CREATE TABLE IF NOT EXISTS moderation_actions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            envelope_cid TEXT NOT NULL,
            action TEXT NOT NULL,
            reason TEXT NOT NULL,
            moderator_did TEXT NOT NULL,
            signature TEXT NOT NULL,
            timestamp INTEGER NOT NULL
          )
        `);

        this.db.run(`
          CREATE TABLE IF NOT EXISTS dmca_reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            envelope_cid TEXT NOT NULL,
            reporter_email TEXT NOT NULL,
            description TEXT NOT NULL,
            timestamp INTEGER NOT NULL,
            status TEXT DEFAULT 'pending'
          )
        `);

        resolve();
      });
    });
  }

  private async initializeIPFS(): Promise<void> {
    try {
      this.ipfs = await create({
        repo: '.cache/ipfs-directory',
        config: {
          Addresses: {
            Swarm: ['/ip4/0.0.0.0/tcp/4003']
          }
        }
      });

      observability.logEvent('public_directory_initialized', {
        ipfs_peer_id: this.ipfs.peerId?.toString(),
        port: this.port
      });
    } catch (error) {
      console.error('Failed to initialize IPFS for directory:', error);
    }
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({ status: 'healthy', timestamp: Date.now() });
    });

    // Index envelope
    this.app.post('/index', async (req, res) => {
      try {
        const permit: IndexingPermit = req.body;
        
        if (!await this.validatePermit(permit)) {
          return res.status(400).json({ error: 'Invalid permit signature' });
        }

        if (!permit.indexable) {
          return res.status(400).json({ error: 'Envelope not marked as indexable' });
        }

        // Retrieve envelope from IPFS
        const envelopeData = await this.ipfs.cat(permit.envelopeCid);
        const envelope = JSON.parse(envelopeData.toString());

        // Store in database
        const entry: DirectoryEntry = {
          id: permit.envelopeCid,
          envelopeCid: permit.envelopeCid,
          meta: envelope.meta,
          indexedAt: Date.now(),
          moderated: false
        };

        await this.addEntry(entry);

        observability.logEvent('directory_envelope_indexed', {
          envelope_cid: permit.envelopeCid,
          title: envelope.meta.title,
          license: envelope.meta.license
        });

        res.json({ success: true, id: entry.id });

      } catch (error) {
        console.error('Failed to index envelope:', error);
        res.status(500).json({ error: 'Failed to index envelope' });
      }
    });

    // Search envelopes
    this.app.get('/search', async (req, res) => {
      try {
        const filters: SearchFilters = req.query;
        const entries = await this.searchEntries(filters);
        
        res.json({
          entries: entries.map(entry => ({
            id: entry.id,
            envelopeCid: entry.envelopeCid,
            meta: entry.meta,
            indexedAt: entry.indexedAt
          })),
          total: entries.length
        });

      } catch (error) {
        console.error('Failed to search envelopes:', error);
        res.status(500).json({ error: 'Failed to search envelopes' });
      }
    });

    // Get envelope details
    this.app.get('/envelope/:cid', async (req, res) => {
      try {
        const { cid } = req.params;
        const entry = await this.getEntry(cid);
        
        if (!entry) {
          return res.status(404).json({ error: 'Envelope not found' });
        }

        if (entry.moderated) {
          return res.status(403).json({ 
            error: 'Envelope has been moderated',
            reason: entry.moderationReason
          });
        }

        res.json(entry);

      } catch (error) {
        console.error('Failed to get envelope:', error);
        res.status(500).json({ error: 'Failed to get envelope' });
      }
    });

    // Moderate envelope
    this.app.post('/moderate', async (req, res) => {
      try {
        const action: ModerationAction = req.body;
        
        if (!await this.validateModerationAction(action)) {
          return res.status(400).json({ error: 'Invalid moderation action signature' });
        }

        await this.performModerationAction(action);

        observability.logEvent('directory_envelope_moderated', {
          envelope_cid: action.envelopeCid,
          action: action.action,
          reason: action.reason,
          moderator_did: action.moderatorDid
        });

        res.json({ success: true });

      } catch (error) {
        console.error('Failed to moderate envelope:', error);
        res.status(500).json({ error: 'Failed to moderate envelope' });
      }
    });

    // DMCA report
    this.app.post('/dmca', async (req, res) => {
      try {
        const { envelopeCid, reporterEmail, description } = req.body;
        
        await this.addDMCAReport(envelopeCid, reporterEmail, description);

        observability.logEvent('directory_dmca_reported', {
          envelope_cid: envelopeCid,
          reporter_email: reporterEmail
        });

        res.json({ success: true, message: 'DMCA report submitted' });

      } catch (error) {
        console.error('Failed to submit DMCA report:', error);
        res.status(500).json({ error: 'Failed to submit DMCA report' });
      }
    });

    // Remove envelope (de-index)
    this.app.delete('/envelope/:cid', async (req, res) => {
      try {
        const { cid } = req.params;
        
        await this.removeEntry(cid);

        observability.logEvent('directory_envelope_removed', {
          envelope_cid: cid
        });

        res.json({ success: true });

      } catch (error) {
        console.error('Failed to remove envelope:', error);
        res.status(500).json({ error: 'Failed to remove envelope' });
      }
    });
  }

  private async validatePermit(permit: IndexingPermit): Promise<boolean> {
    // Mock validation - in real app, this would verify cryptographic signature
    return permit.signature && permit.signature.length > 0;
  }

  private async validateModerationAction(action: ModerationAction): Promise<boolean> {
    // Mock validation - in real app, this would verify moderator signature
    return action.signature && action.signature.length > 0;
  }

  private async addEntry(entry: DirectoryEntry): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT OR REPLACE INTO envelopes (id, envelope_cid, meta, indexed_at, moderated, moderation_reason)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          entry.id,
          entry.envelopeCid,
          JSON.stringify(entry.meta),
          entry.indexedAt,
          entry.moderated,
          entry.moderationReason
        ],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  private async searchEntries(filters: SearchFilters): Promise<DirectoryEntry[]> {
    return new Promise((resolve, reject) => {
      let query = 'SELECT * FROM envelopes WHERE moderated = FALSE';
      const params: any[] = [];

      if (filters.regions && filters.regions.length > 0) {
        query += ' AND JSON_EXTRACT(meta, "$.regions") IS NOT NULL';
        // Additional region filtering logic would go here
      }

      if (filters.license && filters.license.length > 0) {
        query += ' AND JSON_EXTRACT(meta, "$.license") IN (' + 
          filters.license.map(() => '?').join(',') + ')';
        params.push(...filters.license);
      }

      if (filters.mediaTypes && filters.mediaTypes.length > 0) {
        query += ' AND JSON_EXTRACT(meta, "$.mediaTypes") IS NOT NULL';
        // Additional media type filtering logic would go here
      }

      query += ' ORDER BY indexed_at DESC';

      this.db.all(query, params, (err, rows: any[]) => {
        if (err) {
          reject(err);
        } else {
          const entries: DirectoryEntry[] = rows.map(row => ({
            id: row.id,
            envelopeCid: row.envelope_cid,
            meta: JSON.parse(row.meta),
            indexedAt: row.indexed_at,
            moderated: row.moderated === 1,
            moderationReason: row.moderation_reason
          }));
          resolve(entries);
        }
      });
    });
  }

  private async getEntry(cid: string): Promise<DirectoryEntry | null> {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM envelopes WHERE envelope_cid = ?',
        [cid],
        (err, row: any) => {
          if (err) {
            reject(err);
          } else if (!row) {
            resolve(null);
          } else {
            resolve({
              id: row.id,
              envelopeCid: row.envelope_cid,
              meta: JSON.parse(row.meta),
              indexedAt: row.indexed_at,
              moderated: row.moderated === 1,
              moderationReason: row.moderation_reason
            });
          }
        }
      );
    });
  }

  private async performModerationAction(action: ModerationAction): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        // Update envelope moderation status
        this.db.run(
          'UPDATE envelopes SET moderated = ?, moderation_reason = ? WHERE envelope_cid = ?',
          [action.action === 'hide' ? 1 : 0, action.reason, action.envelopeCid],
          (err) => {
            if (err) {
              reject(err);
              return;
            }

            // Record moderation action
            this.db.run(
              `INSERT INTO moderation_actions (envelope_cid, action, reason, moderator_did, signature, timestamp)
               VALUES (?, ?, ?, ?, ?, ?)`,
              [action.envelopeCid, action.action, action.reason, action.moderatorDid, action.signature, Date.now()],
              (err) => {
                if (err) reject(err);
                else resolve();
              }
            );
          }
        );
      });
    });
  }

  private async addDMCAReport(envelopeCid: string, reporterEmail: string, description: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO dmca_reports (envelope_cid, reporter_email, description, timestamp)
         VALUES (?, ?, ?, ?)`,
        [envelopeCid, reporterEmail, description, Date.now()],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  private async removeEntry(cid: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(
        'DELETE FROM envelopes WHERE envelope_cid = ?',
        [cid],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.app.listen(this.port, () => {
        console.log(`Public Directory server running on port ${this.port}`);
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    if (this.ipfs) {
      await this.ipfs.stop();
    }
    this.db.close();
  }
}

// CLI interface
export class DirectoryCLI {
  private directory: PublicDirectory;

  constructor() {
    this.directory = new PublicDirectory();
  }

  async add(envelopeCid: string): Promise<void> {
    // Mock implementation - would validate and add envelope
    console.log(`Adding envelope ${envelopeCid} to directory`);
  }

  async remove(envelopeCid: string): Promise<void> {
    // Mock implementation - would remove envelope
    console.log(`Removing envelope ${envelopeCid} from directory`);
  }

  async list(): Promise<void> {
    // Mock implementation - would list all envelopes
    console.log('Listing all envelopes in directory');
  }

  async moderate(envelopeCid: string, action: string, reason: string): Promise<void> {
    // Mock implementation - would moderate envelope
    console.log(`Moderating envelope ${envelopeCid}: ${action} - ${reason}`);
  }
}

export default PublicDirectory;
