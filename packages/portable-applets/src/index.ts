import React, { useState, useEffect } from 'react';
import { isEnabled } from '@mycelia/web4-feature-flags';

export interface PortableApplet {
  id: string;
  name: string;
  version: string;
  description: string;
  icon?: string;
  capabilities: string[];
  installed: boolean;
  lastUsed: number;
}

export interface PortableAppletsProps {
  applets: PortableApplet[];
  onInstall: (appletId: string) => void;
  onUninstall: (appletId: string) => void;
  onLaunch: (appletId: string) => void;
}

/**
 * Portable Applets Component
 * 
 * Manages portable applet installation and launching.
 * Behind feature flag: applets_v1
 */
export function PortableApplets({
  applets,
  onInstall,
  onUninstall,
  onLaunch
}: PortableAppletsProps): React.ReactElement | null {
  const [localApplets, setLocalApplets] = useState<PortableApplet[]>(applets);

  // Feature flag gate
  if (!isEnabled('applets_v1')) {
    return null;
  }

  useEffect(() => {
    setLocalApplets(applets);
  }, [applets]);

  const handleInstall = (appletId: string) => {
    setLocalApplets(prev => 
      prev.map(applet => 
        applet.id === appletId ? { ...applet, installed: true } : applet
      )
    );
    onInstall(appletId);
  };

  const handleUninstall = (appletId: string) => {
    setLocalApplets(prev => 
      prev.map(applet => 
        applet.id === appletId ? { ...applet, installed: false } : applet
      )
    );
    onUninstall(appletId);
  };

  const handleLaunch = (appletId: string) => {
    setLocalApplets(prev => 
      prev.map(applet => 
        applet.id === appletId ? { ...applet, lastUsed: Date.now() } : applet
      )
    );
    onLaunch(appletId);
  };

  return (
    <div className="portable-applets">
      <h3>Portable Applets</h3>
      
      <div className="applets-grid">
        {localApplets.map(applet => (
          <div key={applet.id} className={`applet-card ${applet.installed ? 'installed' : ''}`}>
            <div className="applet-header">
              {applet.icon && <img src={applet.icon} alt={applet.name} className="applet-icon" />}
              <h4>{applet.name}</h4>
              <span className="version">v{applet.version}</span>
            </div>
            
            <p className="applet-description">{applet.description}</p>
            
            <div className="applet-capabilities">
              <strong>Capabilities:</strong>
              <ul>
                {applet.capabilities.map(cap => (
                  <li key={cap}>{cap}</li>
                ))}
              </ul>
            </div>
            
            <div className="applet-actions">
              {applet.installed ? (
                <>
                  <button onClick={() => handleLaunch(applet.id)} className="launch-btn">
                    Launch
                  </button>
                  <button onClick={() => handleUninstall(applet.id)} className="uninstall-btn">
                    Uninstall
                  </button>
                </>
              ) : (
                <button onClick={() => handleInstall(applet.id)} className="install-btn">
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
 * Headless API for portable applet management
 */
export class PortableAppletManager {
  private applets: Map<string, PortableApplet> = new Map();

  addApplet(applet: PortableApplet): void {
    this.applets.set(applet.id, applet);
  }

  removeApplet(appletId: string): void {
    this.applets.delete(appletId);
  }

  installApplet(appletId: string): boolean {
    const applet = this.applets.get(appletId);
    if (!applet) {
      return false;
    }

    applet.installed = true;
    return true;
  }

  uninstallApplet(appletId: string): boolean {
    const applet = this.applets.get(appletId);
    if (!applet) {
      return false;
    }

    applet.installed = false;
    return true;
  }

  launchApplet(appletId: string): boolean {
    const applet = this.applets.get(appletId);
    if (!applet || !applet.installed) {
      return false;
    }

    applet.lastUsed = Date.now();
    return true;
  }

  getInstalledApplets(): PortableApplet[] {
    return Array.from(this.applets.values()).filter(a => a.installed);
  }

  getAvailableApplets(): PortableApplet[] {
    return Array.from(this.applets.values()).filter(a => !a.installed);
  }

  getAllApplets(): PortableApplet[] {
    return Array.from(this.applets.values());
  }

  getRecentlyUsedApplets(limit: number = 5): PortableApplet[] {
    return Array.from(this.applets.values())
      .filter(a => a.installed && a.lastUsed > 0)
      .sort((a, b) => b.lastUsed - a.lastUsed)
      .slice(0, limit);
  }
}

export default PortableApplets;