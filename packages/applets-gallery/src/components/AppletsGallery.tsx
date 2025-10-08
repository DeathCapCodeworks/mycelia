import React, { useState, useEffect } from 'react';
import { observability } from '@mycelia/observability';
import { featureFlags } from '@mycelia/web4-feature-flags';
import type { AppletManifest, AppletInstallation, ConsentCardDiff, GalleryFilters } from '../index';

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

      <style jsx>{`
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
