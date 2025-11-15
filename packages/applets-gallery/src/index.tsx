// Applets Gallery - User installable applets with manifest and scopes

import React, { useState, useEffect } from 'react';
import { getObservability } from '@mycelia/observability';
import { getFeatureFlagsManager } from '@mycelia/web4-feature-flags';

export interface AppletManifest {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  category: 'productivity' | 'entertainment' | 'utilities' | 'social' | 'finance';
  icon: string;
  size_kb: number;
  offline_ready: boolean;
  verified: boolean;
  scopes: AppletScope[];
  permissions: AppletPermission[];
  install_url: string;
  wasm_url?: string;
  dependencies?: string[];
}

export interface AppletScope {
  name: string;
  description: string;
  required: boolean;
  category: 'storage' | 'network' | 'crypto' | 'ui' | 'system';
}

export interface AppletPermission {
  type: 'read' | 'write' | 'execute' | 'network';
  resource: string;
  description: string;
}

export interface AppletInstallation {
  manifest: AppletManifest;
  installed_at: number;
  status: 'installed' | 'updating' | 'failed';
  permissions_granted: string[];
}

export interface ConsentCardDiff {
  added_permissions: AppletPermission[];
  removed_permissions: AppletPermission[];
  changed_permissions: AppletPermission[];
  summary: string;
}

export interface GalleryFilters {
  category?: string;
  offline_ready?: boolean;
  verified?: boolean;
  search?: string;
}

export class AppletsGalleryManager {
  private installedApplets: Map<string, AppletInstallation> = new Map();
  private availableApplets: AppletManifest[] = [];

  constructor() {
    this.loadInstalledApplets();
    this.loadAvailableApplets();
  }

  private loadInstalledApplets(): void {
    try {
      const stored = localStorage.getItem('mycelia-installed-applets');
      if (stored) {
        const data = JSON.parse(stored);
        this.installedApplets = new Map(data);
      }
    } catch (error) {
      console.warn('Failed to load installed applets:', error);
    }
  }

  private saveInstalledApplets(): void {
    try {
      const data = Array.from(this.installedApplets.entries());
      localStorage.setItem('mycelia-installed-applets', JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save installed applets:', error);
    }
  }

  private loadAvailableApplets(): void {
    // Mock applets for demo
    this.availableApplets = [
      {
        id: 'weather-widget',
        name: 'Weather Widget',
        description: 'Get current weather and forecasts',
        version: '1.0.0',
        author: 'Mycelia Team',
        category: 'utilities',
        icon: '🌤️',
        size_kb: 45,
        offline_ready: false,
        verified: true,
        scopes: [
          {
            name: 'location',
            description: 'Access your location for weather data',
            required: true,
            category: 'system'
          },
          {
            name: 'network',
            description: 'Fetch weather data from API',
            required: true,
            category: 'network'
          }
        ],
        permissions: [
          {
            type: 'read',
            resource: 'location',
            description: 'Read your current location'
          },
          {
            type: 'network',
            resource: 'weather-api',
            description: 'Fetch weather data'
          }
        ],
        install_url: '/applets/weather-widget.wasm'
      },
      {
        id: 'note-taker',
        name: 'Note Taker',
        description: 'Take notes and sync across devices',
        version: '1.2.0',
        author: 'Community',
        category: 'productivity',
        icon: '📝',
        size_kb: 78,
        offline_ready: true,
        verified: true,
        scopes: [
          {
            name: 'storage',
            description: 'Store notes locally and in vault',
            required: true,
            category: 'storage'
          }
        ],
        permissions: [
          {
            type: 'write',
            resource: 'vault/notes',
            description: 'Save notes to your vault'
          },
          {
            type: 'read',
            resource: 'vault/notes',
            description: 'Read your saved notes'
          }
        ],
        install_url: '/applets/note-taker.wasm'
      },
      {
        id: 'crypto-tracker',
        name: 'Crypto Tracker',
        description: 'Track cryptocurrency prices',
        version: '2.1.0',
        author: 'CryptoDev',
        category: 'finance',
        icon: '₿',
        size_kb: 120,
        offline_ready: false,
        verified: false,
        scopes: [
          {
            name: 'network',
            description: 'Fetch crypto prices',
            required: true,
            category: 'network'
          },
          {
            name: 'storage',
            description: 'Cache price data',
            required: false,
            category: 'storage'
          }
        ],
        permissions: [
          {
            type: 'network',
            resource: 'crypto-api',
            description: 'Fetch cryptocurrency prices'
          },
          {
            type: 'write',
            resource: 'cache/crypto',
            description: 'Cache price data'
          }
        ],
        install_url: '/applets/crypto-tracker.wasm'
      }
    ];
  }

  getAvailableApplets(filters?: GalleryFilters): AppletManifest[] {
    let filtered = [...this.availableApplets];

    if (filters?.category) {
      filtered = filtered.filter(applet => applet.category === filters.category);
    }

    if (filters?.offline_ready !== undefined) {
      filtered = filtered.filter(applet => applet.offline_ready === filters.offline_ready);
    }

    if (filters?.verified !== undefined) {
      filtered = filtered.filter(applet => applet.verified === filters.verified);
    }

    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(applet => 
        applet.name.toLowerCase().includes(searchLower) ||
        applet.description.toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  }

  getInstalledApplets(): AppletInstallation[] {
    return Array.from(this.installedApplets.values());
  }

  isInstalled(appletId: string): boolean {
    return this.installedApplets.has(appletId);
  }

  generateConsentCardDiff(applet: AppletManifest): ConsentCardDiff {
    const currentPermissions = this.getCurrentPermissions();
    const appletPermissions = applet.permissions;

    const added_permissions = appletPermissions.filter(perm => 
      !currentPermissions.some(current => 
        current.type === perm.type && current.resource === perm.resource
      )
    );

    const removed_permissions: AppletPermission[] = []; // Not applicable for new installs
    const changed_permissions: AppletPermission[] = []; // Not applicable for new installs

    const summary = added_permissions.length > 0 
      ? `This applet will request ${added_permissions.length} new permission${added_permissions.length > 1 ? 's' : ''}`
      : 'This applet requires no additional permissions';

    return {
      added_permissions,
      removed_permissions,
      changed_permissions,
      summary
    };
  }

  private getCurrentPermissions(): AppletPermission[] {
    // Mock current permissions - in real implementation, this would come from vault
    return [
      {
        type: 'read',
        resource: 'profile',
        description: 'Read your profile information'
      }
    ];
  }

  async installApplet(applet: AppletManifest, grantedPermissions: string[]): Promise<boolean> {
    try {
      // Download and validate applet
      const wasmData = await this.downloadApplet(applet.install_url);
      
      // Validate WASM
      if (!this.validateWasm(wasmData)) {
        throw new Error('Invalid WASM file');
      }

      // Write manifest to vault
      await this.writeManifestToVault(applet);

      // Install applet
      const installation: AppletInstallation = {
        manifest: applet,
        installed_at: Date.now(),
        status: 'installed',
        permissions_granted: grantedPermissions
      };

      this.installedApplets.set(applet.id, installation);
      this.saveInstalledApplets();

      // Log installation event
      getObservability().logEvent('applet_install', {
        applet_id: applet.id,
        size_kb: applet.size_kb,
        permissions_granted: grantedPermissions.length,
        offline_ready: applet.offline_ready,
        verified: applet.verified
      });

      return true;
    } catch (error) {
      console.error('Failed to install applet:', error);
      return false;
    }
  }

  async uninstallApplet(appletId: string): Promise<boolean> {
    try {
      const installation = this.installedApplets.get(appletId);
      if (!installation) {
        return false;
      }

      // Remove from vault
      await this.removeManifestFromVault(appletId);

      // Remove from installed list
      this.installedApplets.delete(appletId);
      this.saveInstalledApplets();

      // Log uninstallation event
      getObservability().logEvent('applet_uninstall', {
        applet_id: appletId,
        installed_duration: Date.now() - installation.installed_at
      });

      return true;
    } catch (error) {
      console.error('Failed to uninstall applet:', error);
      return false;
    }
  }

  private async downloadApplet(url: string): Promise<ArrayBuffer> {
    // Mock download - in real implementation, this would fetch the WASM file
    return new ArrayBuffer(1024);
  }

  private validateWasm(data: ArrayBuffer): boolean {
    // Mock validation - in real implementation, this would validate WASM
    return data.byteLength > 0;
  }

  private async writeManifestToVault(applet: AppletManifest): Promise<void> {
    // Mock vault write - in real implementation, this would write to vault
    console.log('Writing manifest to vault:', applet.id);
  }

  private async removeManifestFromVault(appletId: string): Promise<void> {
    // Mock vault removal - in real implementation, this would remove from vault
    console.log('Removing manifest from vault:', appletId);
  }

  getCategories(): string[] {
    return ['productivity', 'entertainment', 'utilities', 'social', 'finance'];
  }
}

// React Components
export const AppletsGallery: React.FC = () => {
  const [galleryManager] = useState(() => new AppletsGalleryManager());
  const [applets, setApplets] = useState<AppletManifest[]>([]);
  const [installedApplets, setInstalledApplets] = useState<AppletInstallation[]>([]);
  const [filters, setFilters] = useState<GalleryFilters>({});
  const [selectedApplet, setSelectedApplet] = useState<AppletManifest | null>(null);
  const [showConsentCard, setShowConsentCard] = useState(false);
  const [consentDiff, setConsentDiff] = useState<ConsentCardDiff | null>(null);

  useEffect(() => {
    loadApplets();
    loadInstalledApplets();
  }, [filters]);

  const loadApplets = () => {
    const availableApplets = galleryManager.getAvailableApplets(filters);
    setApplets(availableApplets);
  };

  const loadInstalledApplets = () => {
    const installed = galleryManager.getInstalledApplets();
    setInstalledApplets(installed);
  };

  const handleInstall = (applet: AppletManifest) => {
    setSelectedApplet(applet);
    const diff = galleryManager.generateConsentCardDiff(applet);
    setConsentDiff(diff);
    setShowConsentCard(true);
  };

  const handleConsentApprove = async () => {
    if (!selectedApplet || !consentDiff) return;

    const grantedPermissions = consentDiff.added_permissions.map(p => p.resource);
    const success = await galleryManager.installApplet(selectedApplet, grantedPermissions);

    if (success) {
      setShowConsentCard(false);
      setSelectedApplet(null);
      setConsentDiff(null);
      loadInstalledApplets();
      alert('Applet installed successfully!');
    } else {
      alert('Failed to install applet. Please try again.');
    }
  };

  const handleUninstall = async (appletId: string) => {
    const success = await galleryManager.uninstallApplet(appletId);
    if (success) {
      loadInstalledApplets();
      alert('Applet uninstalled successfully!');
    } else {
      alert('Failed to uninstall applet. Please try again.');
    }
  };

  return (
    <div className="applets-gallery">
      <div className="gallery-header">
        <h1>Applets Gallery</h1>
        <p>Discover and install portable applets for your Web4 experience</p>
      </div>

      <div className="gallery-filters">
        <div className="filter-group">
          <label>Category:</label>
          <select 
            value={filters.category || ''} 
            onChange={(e) => setFilters({...filters, category: e.target.value || undefined})}
          >
            <option value="">All Categories</option>
            {galleryManager.getCategories().map(category => (
              <option key={category} value={category}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>
            <input 
              type="checkbox" 
              checked={filters.offline_ready || false}
              onChange={(e) => setFilters({...filters, offline_ready: e.target.checked || undefined})}
            />
            Offline Ready
          </label>
        </div>

        <div className="filter-group">
          <label>
            <input 
              type="checkbox" 
              checked={filters.verified || false}
              onChange={(e) => setFilters({...filters, verified: e.target.checked || undefined})}
            />
            Verified Only
          </label>
        </div>

        <div className="filter-group">
          <input 
            type="text" 
            placeholder="Search applets..." 
            value={filters.search || ''}
            onChange={(e) => setFilters({...filters, search: e.target.value || undefined})}
          />
        </div>
      </div>

      <div className="gallery-content">
        <div className="applets-grid">
          {applets.map(applet => (
            <div key={applet.id} className="applet-card">
              <div className="applet-header">
                <span className="applet-icon">{applet.icon}</span>
                <div className="applet-info">
                  <h3>{applet.name}</h3>
                  <p>{applet.description}</p>
                </div>
                <div className="applet-badges">
                  {applet.verified && <span className="badge verified">✓ Verified</span>}
                  {applet.offline_ready && <span className="badge offline">📱 Offline</span>}
                </div>
              </div>

              <div className="applet-details">
                <div className="detail-item">
                  <span>Size:</span>
                  <span>{applet.size_kb} KB</span>
                </div>
                <div className="detail-item">
                  <span>Version:</span>
                  <span>{applet.version}</span>
                </div>
                <div className="detail-item">
                  <span>Author:</span>
                  <span>{applet.author}</span>
                </div>
              </div>

              <div className="applet-scopes">
                <h4>Required Scopes:</h4>
                <ul>
                  {applet.scopes.map((scope, index) => (
                    <li key={index}>
                      <strong>{scope.name}:</strong> {scope.description}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="applet-actions">
                {galleryManager.isInstalled(applet.id) ? (
                  <button 
                    onClick={() => handleUninstall(applet.id)}
                    className="btn-uninstall"
                  >
                    Uninstall
                  </button>
                ) : (
                  <button 
                    onClick={() => handleInstall(applet)}
                    className="btn-install"
                  >
                    Install
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {showConsentCard && consentDiff && (
        <div className="consent-card-overlay">
          <div className="consent-card">
            <h2>Permission Request</h2>
            <p>{consentDiff.summary}</p>
            
            {consentDiff.added_permissions.length > 0 && (
              <div className="permissions-list">
                <h3>New Permissions:</h3>
                <ul>
                  {consentDiff.added_permissions.map((perm, index) => (
                    <li key={index}>
                      <strong>{perm.type}:</strong> {perm.description}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="consent-actions">
              <button 
                onClick={() => setShowConsentCard(false)}
                className="btn-cancel"
              >
                Cancel
              </button>
              <button 
                onClick={handleConsentApprove}
                className="btn-approve"
              >
                Approve & Install
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .applets-gallery {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
        }

        .gallery-header {
          text-align: center;
          margin-bottom: 30px;
        }

        .gallery-header h1 {
          color: #00d4ff;
          margin-bottom: 10px;
        }

        .gallery-filters {
          display: flex;
          gap: 20px;
          margin-bottom: 30px;
          padding: 20px;
          background: rgba(0, 212, 255, 0.1);
          border-radius: 8px;
          flex-wrap: wrap;
        }

        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .filter-group label {
          font-weight: bold;
          color: #00d4ff;
        }

        .filter-group input, .filter-group select {
          padding: 8px;
          border: 1px solid #00d4ff;
          border-radius: 4px;
          background: rgba(0, 0, 0, 0.3);
          color: white;
        }

        .applets-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 20px;
        }

        .applet-card {
          background: rgba(0, 212, 255, 0.1);
          border: 1px solid #00d4ff;
          border-radius: 8px;
          padding: 20px;
          transition: all 0.3s ease;
        }

        .applet-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 212, 255, 0.3);
        }

        .applet-header {
          display: flex;
          align-items: flex-start;
          gap: 15px;
          margin-bottom: 15px;
        }

        .applet-icon {
          font-size: 2rem;
          flex-shrink: 0;
        }

        .applet-info h3 {
          color: #00d4ff;
          margin: 0 0 5px 0;
        }

        .applet-info p {
          color: #ccc;
          margin: 0;
          font-size: 0.9rem;
        }

        .applet-badges {
          display: flex;
          flex-direction: column;
          gap: 5px;
          margin-left: auto;
        }

        .badge {
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 0.8rem;
          font-weight: bold;
        }

        .badge.verified {
          background: #00ff88;
          color: #000;
        }

        .badge.offline {
          background: #ffaa00;
          color: #000;
        }

        .applet-details {
          margin-bottom: 15px;
        }

        .detail-item {
          display: flex;
          justify-content: space-between;
          margin-bottom: 5px;
          font-size: 0.9rem;
        }

        .detail-item span:first-child {
          color: #ccc;
        }

        .detail-item span:last-child {
          color: #00d4ff;
          font-weight: bold;
        }

        .applet-scopes h4 {
          color: #00d4ff;
          margin-bottom: 10px;
          font-size: 0.9rem;
        }

        .applet-scopes ul {
          margin: 0;
          padding-left: 20px;
        }

        .applet-scopes li {
          color: #ccc;
          font-size: 0.8rem;
          margin-bottom: 5px;
        }

        .applet-actions {
          margin-top: 15px;
        }

        .btn-install, .btn-uninstall {
          width: 100%;
          padding: 10px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: bold;
          transition: all 0.3s ease;
        }

        .btn-install {
          background: #00d4ff;
          color: #000;
        }

        .btn-install:hover {
          background: #0099cc;
          color: white;
        }

        .btn-uninstall {
          background: #ff6666;
          color: white;
        }

        .btn-uninstall:hover {
          background: #cc4444;
        }

        .consent-card-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .consent-card {
          background: #1a1a1a;
          border: 1px solid #00d4ff;
          border-radius: 8px;
          padding: 30px;
          max-width: 500px;
          width: 90%;
        }

        .consent-card h2 {
          color: #00d4ff;
          margin-bottom: 15px;
        }

        .permissions-list {
          margin: 20px 0;
        }

        .permissions-list h3 {
          color: #00d4ff;
          margin-bottom: 10px;
        }

        .permissions-list ul {
          margin: 0;
          padding-left: 20px;
        }

        .permissions-list li {
          color: #ccc;
          margin-bottom: 8px;
        }

        .consent-actions {
          display: flex;
          gap: 15px;
          justify-content: flex-end;
          margin-top: 20px;
        }

        .btn-cancel, .btn-approve {
          padding: 10px 20px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: bold;
        }

        .btn-cancel {
          background: #666;
          color: white;
        }

        .btn-approve {
          background: #00ff88;
          color: #000;
        }
      `}</style>
    </div>
  );
};

// Global gallery manager instance
let globalGalleryManager: AppletsGalleryManager | null = null;

export function getAppletsGalleryManager(): AppletsGalleryManager {
  if (!globalGalleryManager) {
    globalGalleryManager = new AppletsGalleryManager();
  }
  return globalGalleryManager;
}

// Convenience exports
export const appletsGallery = {
  getAvailableApplets: (filters?: GalleryFilters) => getAppletsGalleryManager().getAvailableApplets(filters),
  getInstalledApplets: () => getAppletsGalleryManager().getInstalledApplets(),
  isInstalled: (appletId: string) => getAppletsGalleryManager().isInstalled(appletId),
  generateConsentCardDiff: (applet: AppletManifest) => getAppletsGalleryManager().generateConsentCardDiff(applet),
  installApplet: (applet: AppletManifest, permissions: string[]) => getAppletsGalleryManager().installApplet(applet, permissions),
  uninstallApplet: (appletId: string) => getAppletsGalleryManager().uninstallApplet(appletId),
  getCategories: () => getAppletsGalleryManager().getCategories()
};
