import React, { useState, useEffect } from 'react';
import { isEnabled } from '@mycelia/web4-feature-flags';

export interface OfflineBundle {
  id: string;
  name: string;
  version: string;
  size: number; // in bytes
  dependencies: string[];
  installed: boolean;
  lastUsed: number;
}

export interface OfflineFirstBundlesProps {
  bundles: OfflineBundle[];
  onInstall: (bundleId: string) => void;
  onUninstall: (bundleId: string) => void;
}

/**
 * Offline First Bundles Component
 * 
 * Manages offline-first bundle installation and usage.
 * Behind feature flag: offline_bundles_v1
 */
export function OfflineFirstBundles({
  bundles,
  onInstall,
  onUninstall
}: OfflineFirstBundlesProps): React.ReactElement | null {
  const [localBundles, setLocalBundles] = useState<OfflineBundle[]>(bundles);

  // Feature flag gate
  if (!isEnabled('offline_bundles_v1')) {
    return null;
  }

  useEffect(() => {
    setLocalBundles(bundles);
  }, [bundles]);

  const handleInstall = (bundleId: string) => {
    setLocalBundles(prev => 
      prev.map(bundle => 
        bundle.id === bundleId ? { ...bundle, installed: true } : bundle
      )
    );
    onInstall(bundleId);
  };

  const handleUninstall = (bundleId: string) => {
    setLocalBundles(prev => 
      prev.map(bundle => 
        bundle.id === bundleId ? { ...bundle, installed: false } : bundle
      )
    );
    onUninstall(bundleId);
  };

  const formatSize = (bytes: number): string => {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  return (
    <div className="offline-first-bundles">
      <h3>Offline Bundles</h3>
      
      <div className="bundles-list">
        {localBundles.map(bundle => (
          <div key={bundle.id} className={`bundle-item ${bundle.installed ? 'installed' : ''}`}>
            <div className="bundle-header">
              <h4>{bundle.name}</h4>
              <span className="version">v{bundle.version}</span>
            </div>
            
            <div className="bundle-details">
              <span className="size">{formatSize(bundle.size)}</span>
              <span className="dependencies">{bundle.dependencies.length} deps</span>
            </div>
            
            <div className="bundle-actions">
              {bundle.installed ? (
                <button onClick={() => handleUninstall(bundle.id)} className="uninstall-btn">
                  Uninstall
                </button>
              ) : (
                <button onClick={() => handleInstall(bundle.id)} className="install-btn">
                  Install
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Headless API for offline bundle management
 */
export class OfflineBundleManager {
  private bundles: Map<string, OfflineBundle> = new Map();

  addBundle(bundle: OfflineBundle): void {
    this.bundles.set(bundle.id, bundle);
  }

  removeBundle(bundleId: string): void {
    this.bundles.delete(bundleId);
  }

  installBundle(bundleId: string): boolean {
    const bundle = this.bundles.get(bundleId);
    if (!bundle) {
      return false;
    }

    bundle.installed = true;
    bundle.lastUsed = Date.now();
    return true;
  }

  uninstallBundle(bundleId: string): boolean {
    const bundle = this.bundles.get(bundleId);
    if (!bundle) {
      return false;
    }

    bundle.installed = false;
    return true;
  }

  getInstalledBundles(): OfflineBundle[] {
    return Array.from(this.bundles.values()).filter(b => b.installed);
  }

  getAvailableBundles(): OfflineBundle[] {
    return Array.from(this.bundles.values()).filter(b => !b.installed);
  }

  getAllBundles(): OfflineBundle[] {
    return Array.from(this.bundles.values());
  }

  getBundleSize(): number {
    return this.getInstalledBundles().reduce((total, bundle) => total + bundle.size, 0);
  }
}

export default OfflineFirstBundles;