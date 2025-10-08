import React, { useState, useEffect } from 'react';
import { isEnabled } from '@mycelia/web4-feature-flags';

export interface SocialContact {
  id: string;
  did: string;
  name: string;
  avatar?: string;
  status: 'online' | 'offline' | 'away';
  lastSeen: number;
}

export interface SocialOverlayProps {
  contacts: SocialContact[];
  onContactClick: (contact: SocialContact) => void;
  showPresence?: boolean;
}

/**
 * Social Overlay Component
 * 
 * Displays social contacts and presence information.
 * Behind feature flag: social_overlay_v1
 */
export function SocialOverlay({
  contacts,
  onContactClick,
  showPresence = true
}: SocialOverlayProps): React.ReactElement | null {
  const [localContacts, setLocalContacts] = useState<SocialContact[]>(contacts);

  // Feature flag gate
  if (!isEnabled('social_overlay_v1')) {
    return null;
  }

  useEffect(() => {
    setLocalContacts(contacts);
  }, [contacts]);

  const formatLastSeen = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) return 'now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  const getStatusColor = (status: SocialContact['status']): string => {
    switch (status) {
      case 'online': return '#4ade80';
      case 'away': return '#fbbf24';
      case 'offline': return '#9ca3af';
      default: return '#9ca3af';
    }
  };

  return (
    <div className="social-overlay">
      <h3>Contacts</h3>
      
      <div className="contacts-list">
        {localContacts.map(contact => (
          <div 
            key={contact.id} 
            className="contact-item"
            onClick={() => onContactClick(contact)}
          >
            <div className="contact-avatar">
              {contact.avatar ? (
                <img src={contact.avatar} alt={contact.name} />
              ) : (
                <div className="avatar-placeholder">
                  {contact.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div 
                className="status-indicator"
                style={{ backgroundColor: getStatusColor(contact.status) }}
              />
            </div>
            
            <div className="contact-info">
              <div className="contact-name">{contact.name}</div>
              <div className="contact-did">{contact.did}</div>
              {showPresence && (
                <div className="contact-status">
                  {contact.status === 'online' ? 'Online' : 
                   contact.status === 'away' ? 'Away' : 
                   `Last seen ${formatLastSeen(contact.lastSeen)}`}
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
 * Headless API for social contact management
 */
export class SocialContactManager {
  private contacts: Map<string, SocialContact> = new Map();

  addContact(contact: SocialContact): void {
    this.contacts.set(contact.id, contact);
  }

  removeContact(contactId: string): void {
    this.contacts.delete(contactId);
  }

  updateContactStatus(contactId: string, status: SocialContact['status']): boolean {
    const contact = this.contacts.get(contactId);
    if (!contact) {
      return false;
    }

    contact.status = status;
    if (status === 'offline') {
      contact.lastSeen = Date.now();
    }
    return true;
  }

  getOnlineContacts(): SocialContact[] {
    return Array.from(this.contacts.values()).filter(c => c.status === 'online');
  }

  getOfflineContacts(): SocialContact[] {
    return Array.from(this.contacts.values()).filter(c => c.status === 'offline');
  }

  getAllContacts(): SocialContact[] {
    return Array.from(this.contacts.values());
  }

  getContactByDid(did: string): SocialContact | undefined {
    return Array.from(this.contacts.values()).find(c => c.did === did);
  }

  getRecentlyActiveContacts(limit: number = 10): SocialContact[] {
    return Array.from(this.contacts.values())
      .sort((a, b) => b.lastSeen - a.lastSeen)
      .slice(0, limit);
  }
}

export default SocialOverlay;