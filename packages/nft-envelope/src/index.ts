import { observability } from '@mycelia/observability';
import { featureFlags } from '@mycelia/web4-feature-flags';
import CryptoJS from 'crypto-js';

export interface EnvelopeMeta {
  title: string;
  description: string;
  mediaTypes: string[];
  license: 'Original' | 'CC' | 'Licensed';
  regions?: string[];
  versionCid?: string | null;
  indexable: boolean;
}

export interface Envelope {
  meta: EnvelopeMeta;
  cids: string[];
  encrypted: boolean;
  keyWraps?: {
    recipientDid: string;
    wrappedKey: string;
  }[];
}

export interface IndexingPermit {
  envelopeCid: string;
  indexable: boolean;
  signature: string;
}

export interface FileWithMeta {
  file: File;
  name: string;
  type: string;
  size: number;
}

export class NFTEnvelope {
  private ipfs: any = null;
  private isInitialized = false;

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      // Initialize IPFS node
      const { create } = await import('ipfs-core');
      this.ipfs = await create({
        repo: '.cache/ipfs-envelope',
        config: {
          Addresses: {
            Swarm: ['/ip4/0.0.0.0/tcp/4002']
          }
        }
      });
      this.isInitialized = true;
      
      observability.logEvent('nft_envelope_initialized', {
        ipfs_peer_id: this.ipfs.peerId?.toString()
      });
    } catch (error) {
      console.error('Failed to initialize NFT Envelope:', error);
      observability.logEvent('nft_envelope_init_failed', {
        error: (error as Error).message
      });
    }
  }

  async createPrivateEnvelope(files: FileWithMeta[], meta: EnvelopeMeta): Promise<Envelope> {
    if (!featureFlags.isFlagEnabled('nft_envelopes')) {
      throw new Error('NFT envelopes feature flag disabled');
    }

    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Generate encryption key
      const encryptionKey = CryptoJS.lib.WordArray.random(256/8).toString();
      
      // Encrypt files and upload to IPFS
      const cids: string[] = [];
      const encryptedFiles: Buffer[] = [];

      for (const fileWithMeta of files) {
        const fileBuffer = await fileWithMeta.file.arrayBuffer();
        const encrypted = CryptoJS.AES.encrypt(
          CryptoJS.lib.WordArray.create(fileBuffer),
          encryptionKey
        ).toString();
        
        const encryptedBuffer = Buffer.from(encrypted, 'utf8');
        encryptedFiles.push(encryptedBuffer);
        
        // Upload to IPFS
        const result = await this.ipfs.add(encryptedBuffer, {
          pin: true,
          cidVersion: 1
        });
        cids.push(result.cid.toString());
      }

      // Create envelope metadata
      const envelope: Envelope = {
        meta: {
          ...meta,
          indexable: false // Private envelopes are not indexable
        },
        cids,
        encrypted: true,
        keyWraps: [] // Will be populated when sharing
      };

      // Store encryption key in vault (mock implementation)
      await this.storeKeyInVault(encryptionKey, envelope);

      observability.logEvent('nft_envelope_created', {
        type: 'private',
        file_count: files.length,
        encrypted: true,
        indexable: false
      });

      return envelope;

    } catch (error) {
      console.error('Failed to create private envelope:', error);
      observability.logEvent('nft_envelope_create_failed', {
        type: 'private',
        error: (error as Error).message
      });
      throw error;
    }
  }

  async createPublicEnvelope(files: FileWithMeta[], meta: EnvelopeMeta): Promise<Envelope> {
    if (!featureFlags.isFlagEnabled('nft_envelopes')) {
      throw new Error('NFT envelopes feature flag disabled');
    }

    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const cids: string[] = [];

      for (const fileWithMeta of files) {
        const fileBuffer = await fileWithMeta.file.arrayBuffer();
        const buffer = Buffer.from(fileBuffer);
        
        // Upload to IPFS without encryption
        const result = await this.ipfs.add(buffer, {
          pin: true,
          cidVersion: 1
        });
        cids.push(result.cid.toString());
      }

      const envelope: Envelope = {
        meta: {
          ...meta,
          indexable: true // Public envelopes are indexable by default
        },
        cids,
        encrypted: false
      };

      observability.logEvent('nft_envelope_created', {
        type: 'public',
        file_count: files.length,
        encrypted: false,
        indexable: true
      });

      return envelope;

    } catch (error) {
      console.error('Failed to create public envelope:', error);
      observability.logEvent('nft_envelope_create_failed', {
        type: 'public',
        error: (error as Error).message
      });
      throw error;
    }
  }

  async publish(envelope: Envelope): Promise<IndexingPermit> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Upload envelope metadata to IPFS
      const envelopeBuffer = Buffer.from(JSON.stringify(envelope), 'utf8');
      const result = await this.ipfs.add(envelopeBuffer, {
        pin: true,
        cidVersion: 1
      });

      const envelopeCid = result.cid.toString();

      // Create indexing permit
      const permit: IndexingPermit = {
        envelopeCid,
        indexable: envelope.meta.indexable,
        signature: await this.signPermit(envelopeCid, envelope.meta.indexable)
      };

      observability.logEvent('nft_envelope_published', {
        envelope_cid: envelopeCid,
        indexable: envelope.meta.indexable,
        encrypted: envelope.encrypted
      });

      return permit;

    } catch (error) {
      console.error('Failed to publish envelope:', error);
      observability.logEvent('nft_envelope_publish_failed', {
        error: (error as Error).message
      });
      throw error;
    }
  }

  async makePrivate(envelopeCid: string): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Retrieve envelope
      const envelopeData = await this.ipfs.cat(envelopeCid);
      const envelope: Envelope = JSON.parse(envelopeData.toString());

      // Update indexable flag
      envelope.meta.indexable = false;

      // Re-upload with updated metadata
      const updatedBuffer = Buffer.from(JSON.stringify(envelope), 'utf8');
      await this.ipfs.add(updatedBuffer, {
        pin: true,
        cidVersion: 1
      });

      observability.logEvent('nft_envelope_made_private', {
        envelope_cid: envelopeCid,
        previous_indexable: true,
        new_indexable: false
      });

    } catch (error) {
      console.error('Failed to make envelope private:', error);
      observability.logEvent('nft_envelope_make_private_failed', {
        envelope_cid: envelopeCid,
        error: (error as Error).message
      });
      throw error;
    }
  }

  async decryptFile(cid: string, encryptionKey: string): Promise<Buffer> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const encryptedData = await this.ipfs.cat(cid);
      const encryptedString = encryptedData.toString();
      
      const decrypted = CryptoJS.AES.decrypt(encryptedString, encryptionKey);
      const decryptedBuffer = Buffer.from(decrypted.toString(CryptoJS.enc.Utf8), 'utf8');
      
      return decryptedBuffer;

    } catch (error) {
      console.error('Failed to decrypt file:', error);
      observability.logEvent('nft_envelope_decrypt_failed', {
        cid,
        error: (error as Error).message
      });
      throw error;
    }
  }

  async getSeedingHealth(): Promise<{ totalCids: number; pinnedCids: number }> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const pins = await this.ipfs.pin.ls();
      const totalCids = pins.length;
      const pinnedCids = pins.filter(pin => pin.type === 'recursive').length;

      return { totalCids, pinnedCids };

    } catch (error) {
      console.error('Failed to get seeding health:', error);
      return { totalCids: 0, pinnedCids: 0 };
    }
  }

  private async storeKeyInVault(key: string, envelope: Envelope): Promise<void> {
    // Mock implementation - in real app, this would store in encrypted vault
    console.log('Storing encryption key in vault for envelope:', envelope);
    observability.logEvent('nft_envelope_key_stored', {
      envelope_cids: envelope.cids.length
    });
  }

  private async signPermit(envelopeCid: string, indexable: boolean): Promise<string> {
    // Mock signature - in real app, this would use proper cryptographic signing
    const message = `${envelopeCid}:${indexable}:${Date.now()}`;
    return CryptoJS.SHA256(message).toString();
  }

  async destroy(): Promise<void> {
    if (this.ipfs) {
      await this.ipfs.stop();
      this.ipfs = null;
    }
    this.isInitialized = false;
  }
}

// Global instance
let globalNFTEnvelope: NFTEnvelope | null = null;

export function getNFTEnvelope(): NFTEnvelope {
  if (!globalNFTEnvelope) {
    globalNFTEnvelope = new NFTEnvelope();
  }
  return globalNFTEnvelope;
}

// Convenience exports
export const nftEnvelope = {
  createPrivateEnvelope: (files: FileWithMeta[], meta: EnvelopeMeta) => 
    getNFTEnvelope().createPrivateEnvelope(files, meta),
  createPublicEnvelope: (files: FileWithMeta[], meta: EnvelopeMeta) => 
    getNFTEnvelope().createPublicEnvelope(files, meta),
  publish: (envelope: Envelope) => getNFTEnvelope().publish(envelope),
  makePrivate: (envelopeCid: string) => getNFTEnvelope().makePrivate(envelopeCid),
  decryptFile: (cid: string, key: string) => getNFTEnvelope().decryptFile(cid, key),
  getSeedingHealth: () => getNFTEnvelope().getSeedingHealth()
};
