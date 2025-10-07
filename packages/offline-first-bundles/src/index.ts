// Offline First Bundles - Install any page as offline bundle with signed assets

import { createHash, createHmac } from 'crypto';
import { observability } from '@mycelia/observability';

export interface BundleManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  url: string;
  icon?: string;
  author: string;
  createdAt: number;
  updatedAt: number;
  size: number;
  assets: BundleAsset[];
  dependencies: string[];
  permissions: BundlePermission[];
  capabilities: BundleCapability[];
  signature: string;
  signer: string;
}

export interface BundleAsset {
  id: string;
  url: string;
  type: 'html' | 'css' | 'js' | 'image' | 'font' | 'data' | 'other';
  size: number;
  hash: string;
  mimeType: string;
  isEssential: boolean;
  isCached: boolean;
  lastModified: number;
}

export interface BundlePermission {
  type: 'storage' | 'network' | 'camera' | 'microphone' | 'location' | 'notifications' | 'file_system';
  scope: string;
  description: string;
  required: boolean;
}

export interface BundleCapability {
  type: 'oracle_query' | 'social_interaction' | 'wallet_transaction' | 'data_processing' | 'ai_inference';
  scope: string;
  description: string;
  required: boolean;
}

export interface BundleState {
  id: string;
  status: 'installing' | 'installed' | 'updating' | 'error' | 'uninstalled';
  installProgress: number;
  lastUsed: number;
  useCount: number;
  errorCount: number;
  lastError?: string;
  localData: Record<string, any>;
  cacheSize: number;
  lastUpdate: number;
}

export interface BundleUpdate {
  id: string;
  bundleId: string;
  version: string;
  changes: string[];
  size: number;
  signature: string;
  timestamp: number;
}

export class OfflineFirstBundlesManager {
  private bundles: Map<string, BundleManifest> = new Map();
  private states: Map<string, BundleState> = new Map();
  private updates: Map<string, BundleUpdate[]> = new Map();
  private cache: Map<string, ArrayBuffer> = new Map();
  private installedBundles: Set<string> = new Set();
  private p2pConnections: Map<string, any> = new Map();

  constructor() {
    this.loadFromStorage();
    this.setupEventListeners();
    this.initializeP2P();
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem('mycelia-offline-bundles');
      if (stored) {
        const data = JSON.parse(stored);
        this.bundles = new Map(data.bundles || []);
        this.states = new Map(data.states || []);
        this.installedBundles = new Set(data.installed || []);
      }
    } catch (error) {
      console.warn('Failed to load offline bundles from storage:', error);
    }
  }

  private saveToStorage(): void {
    try {
      const data = {
        bundles: Array.from(this.bundles.entries()),
        states: Array.from(this.states.entries()),
        installed: Array.from(this.installedBundles),
        timestamp: Date.now()
      };
      localStorage.setItem('mycelia-offline-bundles', JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save offline bundles to storage:', error);
    }
  }

  private setupEventListeners(): void {
    // Listen for bundle installation requests
    document.addEventListener('bundle-install-request', (event: any) => {
      this.installBundle(event.detail.url, event.detail.options);
    });

    // Listen for bundle update requests
    document.addEventListener('bundle-update-request', (event: any) => {
      this.updateBundle(event.detail.bundleId);
    });

    // Listen for bundle uninstall requests
    document.addEventListener('bundle-uninstall-request', (event: any) => {
      this.uninstallBundle(event.detail.bundleId);
    });
  }

  private initializeP2P(): void {
    // Mock P2P initialization - in real implementation, this would set up WebRTC or similar
    console.log('P2P network initialized for bundle updates');
  }

  async installBundle(url: string, options?: {
    name?: string;
    description?: string;
    permissions?: BundlePermission[];
    capabilities?: BundleCapability[];
  }): Promise<BundleManifest | null> {
    try {
      const bundleId = this.generateBundleId(url);
      
      // Check if already installed
      if (this.installedBundles.has(bundleId)) {
        throw new Error('Bundle already installed');
      }

      // Create initial state
      const state: BundleState = {
        id: bundleId,
        status: 'installing',
        installProgress: 0,
        lastUsed: 0,
        useCount: 0,
        errorCount: 0,
        localData: {},
        cacheSize: 0,
        lastUpdate: Date.now()
      };
      this.states.set(bundleId, state);

      // Fetch page content
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch page: ${response.status}`);
      }

      const html = await response.text();
      state.installProgress = 25;

      // Parse HTML and extract assets
      const assets = await this.extractAssets(html, url);
      state.installProgress = 50;

      // Download and cache assets
      await this.downloadAssets(assets, state);
      state.installProgress = 75;

      // Create bundle manifest
      const manifest: BundleManifest = {
        id: bundleId,
        name: options?.name || this.extractTitle(html) || new URL(url).hostname,
        version: '1.0.0',
        description: options?.description || this.extractDescription(html) || 'Offline bundle',
        url,
        author: new URL(url).hostname,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        size: assets.reduce((sum, asset) => sum + asset.size, 0),
        assets,
        dependencies: [],
        permissions: options?.permissions || [],
        capabilities: options?.capabilities || [],
        signature: '',
        signer: 'mycelia-bundle-manager'
      };

      // Sign manifest
      manifest.signature = this.signManifest(manifest);

      // Complete installation
      this.bundles.set(bundleId, manifest);
      state.status = 'installed';
      state.installProgress = 100;
      state.lastUsed = Date.now();
      this.installedBundles.add(bundleId);
      this.saveToStorage();

      observability.logEvent('bundle_installed', {
        bundleId,
        name: manifest.name,
        url,
        assetCount: assets.length,
        totalSize: manifest.size
      });

      return manifest;
    } catch (error) {
      console.error('Failed to install bundle:', error);
      
      // Update error state
      const state = this.states.get(this.generateBundleId(url));
      if (state) {
        state.status = 'error';
        state.errorCount++;
        state.lastError = error instanceof Error ? error.message : String(error);
        this.states.set(state.id, state);
      }

      return null;
    }
  }

  private async extractAssets(html: string, baseUrl: string): Promise<BundleAsset[]> {
    const assets: BundleAsset[] = [];
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Extract CSS files
    const cssLinks = doc.querySelectorAll('link[rel="stylesheet"]');
    for (const link of cssLinks) {
      const href = link.getAttribute('href');
      if (href) {
        const asset = await this.createAsset(href, baseUrl, 'css');
        if (asset) assets.push(asset);
      }
    }

    // Extract JavaScript files
    const jsScripts = doc.querySelectorAll('script[src]');
    for (const script of jsScripts) {
      const src = script.getAttribute('src');
      if (src) {
        const asset = await this.createAsset(src, baseUrl, 'js');
        if (asset) assets.push(asset);
      }
    }

    // Extract images
    const images = doc.querySelectorAll('img[src]');
    for (const img of images) {
      const src = img.getAttribute('src');
      if (src) {
        const asset = await this.createAsset(src, baseUrl, 'image');
        if (asset) assets.push(asset);
      }
    }

    // Extract fonts
    const fontLinks = doc.querySelectorAll('link[href*=".woff"], link[href*=".woff2"], link[href*=".ttf"], link[href*=".otf"]');
    for (const link of fontLinks) {
      const href = link.getAttribute('href');
      if (href) {
        const asset = await this.createAsset(href, baseUrl, 'font');
        if (asset) assets.push(asset);
      }
    }

    return assets;
  }

  private async createAsset(url: string, baseUrl: string, type: BundleAsset['type']): Promise<BundleAsset | null> {
    try {
      const absoluteUrl = new URL(url, baseUrl).href;
      const response = await fetch(absoluteUrl);
      
      if (!response.ok) {
        return null;
      }

      const data = await response.arrayBuffer();
      const hash = this.createHash(data);
      const mimeType = response.headers.get('content-type') || 'application/octet-stream';

      return {
        id: this.generateAssetId(absoluteUrl),
        url: absoluteUrl,
        type,
        size: data.byteLength,
        hash,
        mimeType,
        isEssential: type === 'css' || type === 'js',
        isCached: false,
        lastModified: Date.now()
      };
    } catch (error) {
      console.warn(`Failed to create asset for ${url}:`, error);
      return null;
    }
  }

  private async downloadAssets(assets: BundleAsset[], state: BundleState): Promise<void> {
    for (const asset of assets) {
      try {
        const response = await fetch(asset.url);
        if (response.ok) {
          const data = await response.arrayBuffer();
          this.cache.set(asset.id, data);
          asset.isCached = true;
          state.cacheSize += data.byteLength;
        }
      } catch (error) {
        console.warn(`Failed to download asset ${asset.url}:`, error);
      }
    }
  }

  private extractTitle(html: string): string {
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    return titleMatch ? titleMatch[1].trim() : '';
  }

  private extractDescription(html: string): string {
    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i);
    return descMatch ? descMatch[1].trim() : '';
  }

  async updateBundle(bundleId: string): Promise<boolean> {
    const manifest = this.bundles.get(bundleId);
    const state = this.states.get(bundleId);

    if (!manifest || !state) {
      return false;
    }

    try {
      state.status = 'updating';
      this.saveToStorage();

      // Check for updates
      const response = await fetch(manifest.url);
      if (!response.ok) {
        throw new Error(`Failed to fetch updated page: ${response.status}`);
      }

      const html = await response.text();
      const newAssets = await this.extractAssets(html, manifest.url);

      // Compare with existing assets
      const changes = this.detectChanges(manifest.assets, newAssets);
      
      if (changes.length === 0) {
        state.status = 'installed';
        this.saveToStorage();
        return true;
      }

      // Download updated assets
      await this.downloadAssets(newAssets, state);

      // Update manifest
      manifest.assets = newAssets;
      manifest.updatedAt = Date.now();
      manifest.size = newAssets.reduce((sum, asset) => sum + asset.size, 0);
      manifest.signature = this.signManifest(manifest);

      // Create update record
      const update: BundleUpdate = {
        id: this.generateUpdateId(),
        bundleId,
        version: '1.0.1',
        changes,
        size: manifest.size,
        signature: manifest.signature,
        timestamp: Date.now()
      };

      const updates = this.updates.get(bundleId) || [];
      updates.push(update);
      this.updates.set(bundleId, updates);

      // Complete update
      state.status = 'installed';
      state.lastUpdate = Date.now();
      this.bundles.set(bundleId, manifest);
      this.saveToStorage();

      observability.logEvent('bundle_updated', {
        bundleId,
        changes: changes.length,
        newSize: manifest.size
      });

      return true;
    } catch (error) {
      console.error('Failed to update bundle:', error);
      state.status = 'error';
      state.errorCount++;
      state.lastError = error instanceof Error ? error.message : String(error);
      this.saveToStorage();
      return false;
    }
  }

  private detectChanges(oldAssets: BundleAsset[], newAssets: BundleAsset[]): string[] {
    const changes: string[] = [];
    const oldMap = new Map(oldAssets.map(asset => [asset.url, asset]));

    for (const newAsset of newAssets) {
      const oldAsset = oldMap.get(newAsset.url);
      if (!oldAsset) {
        changes.push(`Added asset: ${newAsset.url}`);
      } else if (oldAsset.hash !== newAsset.hash) {
        changes.push(`Updated asset: ${newAsset.url}`);
      }
    }

    for (const oldAsset of oldAssets) {
      if (!newAssets.find(asset => asset.url === oldAsset.url)) {
        changes.push(`Removed asset: ${oldAsset.url}`);
      }
    }

    return changes;
  }

  uninstallBundle(bundleId: string): boolean {
    if (!this.installedBundles.has(bundleId)) {
      return false;
    }

    // Remove from cache
    const manifest = this.bundles.get(bundleId);
    if (manifest) {
      manifest.assets.forEach(asset => {
        this.cache.delete(asset.id);
      });
    }

    // Update state
    const state = this.states.get(bundleId);
    if (state) {
      state.status = 'uninstalled';
      this.states.set(bundleId, state);
    }

    this.installedBundles.delete(bundleId);
    this.saveToStorage();

    observability.logEvent('bundle_uninstalled', {
      bundleId
    });

    return true;
  }

  getInstalledBundles(): BundleManifest[] {
    return Array.from(this.installedBundles)
      .map(id => this.bundles.get(id))
      .filter((manifest): manifest is BundleManifest => !!manifest);
  }

  getBundleState(bundleId: string): BundleState | undefined {
    return this.states.get(bundleId);
  }

  getAllBundleStates(): BundleState[] {
    return Array.from(this.states.values());
  }

  getBundleUpdates(bundleId: string): BundleUpdate[] {
    return this.updates.get(bundleId) || [];
  }

  getCachedAsset(assetId: string): ArrayBuffer | undefined {
    return this.cache.get(assetId);
  }

  isAssetCached(assetId: string): boolean {
    return this.cache.has(assetId);
  }

  getBundleStats(): {
    totalInstalled: number;
    totalSize: number;
    totalAssets: number;
    averageSize: number;
    totalUpdates: number;
    cacheSize: number;
  } {
    const bundles = this.getInstalledBundles();
    const totalInstalled = bundles.length;
    const totalSize = bundles.reduce((sum, bundle) => sum + bundle.size, 0);
    const totalAssets = bundles.reduce((sum, bundle) => sum + bundle.assets.length, 0);
    const averageSize = totalInstalled > 0 ? totalSize / totalInstalled : 0;
    const totalUpdates = Array.from(this.updates.values()).reduce((sum, updates) => sum + updates.length, 0);
    const cacheSize = Array.from(this.cache.values()).reduce((sum, data) => sum + data.byteLength, 0);

    return {
      totalInstalled,
      totalSize,
      totalAssets,
      averageSize,
      totalUpdates,
      cacheSize
    };
  }

  private generateBundleId(url: string): string {
    const hash = this.createHash(url);
    return `bundle_${hash.substring(0, 16)}`;
  }

  private generateAssetId(url: string): string {
    const hash = this.createHash(url);
    return `asset_${hash.substring(0, 16)}`;
  }

  private generateUpdateId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2);
    return `update_${timestamp}_${random}`;
  }

  private createHash(data: string | ArrayBuffer): string {
    if (typeof data === 'string') {
      return createHash('sha256').update(data).digest('hex');
    } else {
      return createHash('sha256').update(new Uint8Array(data)).digest('hex');
    }
  }

  private signManifest(manifest: BundleManifest): string {
    const data = `${manifest.id}:${manifest.url}:${manifest.version}:${manifest.size}`;
    return createHmac('sha256', 'mycelia-bundle-key').update(data).digest('hex');
  }

  // Utility methods for external integration
  simulateBundleInstallation(url: string, name: string): BundleManifest | null {
    const permissions: BundlePermission[] = [
      { type: 'storage', scope: 'local', description: 'Local data storage', required: true },
      { type: 'network', scope: url, description: 'Access to site resources', required: false }
    ];

    const capabilities: BundleCapability[] = [
      { type: 'data_processing', scope: 'user_data', description: 'Process user data', required: false },
      { type: 'oracle_query', scope: 'general', description: 'Query oracle for information', required: false }
    ];

    return this.installBundle(url, {
      name,
      description: `Offline bundle for ${name}`,
      permissions,
      capabilities
    });
  }

  exportBundles(): string {
    const bundles = this.getInstalledBundles();
    const states = this.getAllBundleStates();
    
    return JSON.stringify({
      bundles,
      states,
      exportedAt: Date.now()
    }, null, 2);
  }

  importBundles(data: string): boolean {
    try {
      const imported = JSON.parse(data);
      
      if (imported.bundles) {
        imported.bundles.forEach((manifest: BundleManifest) => {
          this.bundles.set(manifest.id, manifest);
        });
      }
      
      if (imported.states) {
        imported.states.forEach((state: BundleState) => {
          this.states.set(state.id, state);
          if (state.status !== 'uninstalled') {
            this.installedBundles.add(state.id);
          }
        });
      }
      
      this.saveToStorage();
      return true;
    } catch (error) {
      console.error('Failed to import bundles:', error);
      return false;
    }
  }

  clearCache(): void {
    this.cache.clear();
    this.saveToStorage();
  }

  clearAll(): void {
    this.bundles.clear();
    this.states.clear();
    this.updates.clear();
    this.cache.clear();
    this.installedBundles.clear();
    this.saveToStorage();
  }
}

// Global offline bundles manager instance
let globalOfflineBundles: OfflineFirstBundlesManager | null = null;

export function getOfflineBundlesManager(): OfflineFirstBundlesManager {
  if (!globalOfflineBundles) {
    globalOfflineBundles = new OfflineFirstBundlesManager();
  }
  return globalOfflineBundles;
}

// Convenience exports
export const offlineBundles = {
  install: (url: string, options?: any) => getOfflineBundlesManager().installBundle(url, options),
  update: (bundleId: string) => getOfflineBundlesManager().updateBundle(bundleId),
  uninstall: (bundleId: string) => getOfflineBundlesManager().uninstallBundle(bundleId),
  getInstalled: () => getOfflineBundlesManager().getInstalledBundles(),
  getState: (bundleId: string) => getOfflineBundlesManager().getBundleState(bundleId),
  getAllStates: () => getOfflineBundlesManager().getAllBundleStates(),
  getUpdates: (bundleId: string) => getOfflineBundlesManager().getBundleUpdates(bundleId),
  getCachedAsset: (assetId: string) => getOfflineBundlesManager().getCachedAsset(assetId),
  isAssetCached: (assetId: string) => getOfflineBundlesManager().isAssetCached(assetId),
  getStats: () => getOfflineBundlesManager().getBundleStats(),
  simulateInstall: (url: string, name: string) => getOfflineBundlesManager().simulateBundleInstallation(url, name),
  export: () => getOfflineBundlesManager().exportBundles(),
  import: (data: string) => getOfflineBundlesManager().importBundles(data),
  clearCache: () => getOfflineBundlesManager().clearCache(),
  clearAll: () => getOfflineBundlesManager().clearAll()
};
