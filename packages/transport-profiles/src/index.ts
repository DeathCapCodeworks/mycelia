import React, { useState, useEffect } from 'react';
import { isEnabled } from '@mycelia/web4-feature-flags';

export interface TransportProfile {
  id: string;
  name: string;
  description: string;
  protocol: 'quic' | 'webrtc' | 'websocket' | 'http';
  priority: number;
  enabled: boolean;
  config: Record<string, any>;
}

export interface TransportProfilesProps {
  profiles: TransportProfile[];
  activeProfile: string;
  onProfileChange: (profileId: string) => void;
  onProfileToggle: (profileId: string, enabled: boolean) => void;
}

/**
 * Transport Profiles Component
 * 
 * Manages transport profile switching and configuration.
 * Behind feature flag: transport_profiles_v1
 */
export function TransportProfiles({
  profiles,
  activeProfile,
  onProfileChange,
  onProfileToggle
}: TransportProfilesProps): React.ReactElement | null {
  const [localProfiles, setLocalProfiles] = useState<TransportProfile[]>(profiles);

  // Feature flag gate
  if (!isEnabled('transport_profiles_v1')) {
    return null;
  }

  useEffect(() => {
    setLocalProfiles(profiles);
  }, [profiles]);

  const handleProfileChange = (profileId: string) => {
    onProfileChange(profileId);
  };

  const handleProfileToggle = (profileId: string, enabled: boolean) => {
    setLocalProfiles(prev => 
      prev.map(profile => 
        profile.id === profileId ? { ...profile, enabled } : profile
      )
    );
    onProfileToggle(profileId, enabled);
  };

  const getProtocolColor = (protocol: TransportProfile['protocol']): string => {
    switch (protocol) {
      case 'quic': return '#3b82f6';
      case 'webrtc': return '#8b5cf6';
      case 'websocket': return '#06b6d4';
      case 'http': return '#10b981';
      default: return '#6b7280';
    }
  };

  return (
    <div className="transport-profiles">
      <h3>Transport Profiles</h3>
      
      <div className="profiles-list">
        {localProfiles.map(profile => (
          <div 
            key={profile.id} 
            className={`profile-item ${profile.id === activeProfile ? 'active' : ''} ${profile.enabled ? 'enabled' : 'disabled'}`}
          >
            <div className="profile-header">
              <div className="profile-info">
                <h4>{profile.name}</h4>
                <span 
                  className="protocol-badge"
                  style={{ backgroundColor: getProtocolColor(profile.protocol) }}
                >
                  {profile.protocol.toUpperCase()}
                </span>
              </div>
              
              <div className="profile-controls">
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={profile.enabled}
                    onChange={(e) => handleProfileToggle(profile.id, e.target.checked)}
                  />
                  <span className="slider"></span>
                </label>
                
                {profile.enabled && (
                  <button 
                    onClick={() => handleProfileChange(profile.id)}
                    className={`select-btn ${profile.id === activeProfile ? 'selected' : ''}`}
                  >
                    {profile.id === activeProfile ? 'Active' : 'Select'}
                  </button>
                )}
              </div>
            </div>
            
            <p className="profile-description">{profile.description}</p>
            
            <div className="profile-config">
              <strong>Priority:</strong> {profile.priority}
              {Object.keys(profile.config).length > 0 && (
                <div className="config-details">
                  <strong>Config:</strong>
                  <pre>{JSON.stringify(profile.config, null, 2)}</pre>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Headless API for transport profile management
 */
export class TransportProfileManager {
  private profiles: Map<string, TransportProfile> = new Map();
  private activeProfile: string | null = null;

  addProfile(profile: TransportProfile): void {
    this.profiles.set(profile.id, profile);
  }

  removeProfile(profileId: string): void {
    this.profiles.delete(profileId);
    if (this.activeProfile === profileId) {
      this.activeProfile = null;
    }
  }

  setActiveProfile(profileId: string): boolean {
    const profile = this.profiles.get(profileId);
    if (!profile || !profile.enabled) {
      return false;
    }

    this.activeProfile = profileId;
    return true;
  }

  toggleProfile(profileId: string): boolean {
    const profile = this.profiles.get(profileId);
    if (!profile) {
      return false;
    }

    profile.enabled = !profile.enabled;
    
    if (!profile.enabled && this.activeProfile === profileId) {
      this.activeProfile = null;
    }
    
    return true;
  }

  getActiveProfile(): TransportProfile | null {
    return this.activeProfile ? this.profiles.get(this.activeProfile) || null : null;
  }

  getEnabledProfiles(): TransportProfile[] {
    return Array.from(this.profiles.values())
      .filter(p => p.enabled)
      .sort((a, b) => b.priority - a.priority);
  }

  getAllProfiles(): TransportProfile[] {
    return Array.from(this.profiles.values());
  }

  getProfilesByProtocol(protocol: TransportProfile['protocol']): TransportProfile[] {
    return Array.from(this.profiles.values()).filter(p => p.protocol === protocol);
  }

  getBestProfile(): TransportProfile | null {
    const enabledProfiles = this.getEnabledProfiles();
    return enabledProfiles.length > 0 ? enabledProfiles[0] : null;
  }
}

export default TransportProfiles;