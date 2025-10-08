// Applets Gallery - User installable applets with manifest and scopes

import React, { useState, useEffect } from 'react';
import { observability } from '@mycelia/observability';
import { featureFlags } from '@mycelia/web4-feature-flags';

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
      observability.logEvent('applet_install', {
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
      observability.logEvent('applet_uninstall', {
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
