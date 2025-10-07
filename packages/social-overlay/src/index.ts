// Social Overlay - Show DID contacts with context on current domain

import { observability } from '@mycelia/observability';

export interface DIDContact {
  did: string;
  name: string;
  avatar?: string;
  domain: string;
  lastSeen: number;
  relationship: 'friend' | 'colleague' | 'acquaintance' | 'unknown';
  notes: string;
  tags: string[];
  verified: boolean;
  publicKey?: string;
}

export interface DomainContext {
  domain: string;
  contactCount: number;
  lastActivity: number;
  sharedInterests: string[];
  commonConnections: string[];
  trustLevel: 'high' | 'medium' | 'low' | 'unknown';
  notes: string;
}

export interface SocialNote {
  id: string;
  contactDid: string;
  domain: string;
  content: string;
  timestamp: number;
  tags: string[];
  isPrivate: boolean;
  isEncrypted: boolean;
}

export interface SocialOverlayState {
  isVisible: boolean;
  currentDomain: string;
  contacts: DIDContact[];
  context: DomainContext | null;
  searchQuery: string;
  filterBy: 'all' | 'friends' | 'colleagues' | 'acquaintances' | 'verified';
  sortBy: 'name' | 'lastSeen' | 'relationship' | 'domain';
  sortOrder: 'asc' | 'desc';
}

export class SocialOverlayManager {
  private contacts: Map<string, DIDContact> = new Map();
  private domainContexts: Map<string, DomainContext> = new Map();
  private socialNotes: Map<string, SocialNote> = new Map();
  private state: SocialOverlayState;
  private updateCallbacks: Set<(state: SocialOverlayState) => void> = new Set();
  private isActive: boolean = false;

  constructor() {
    this.state = {
      isVisible: false,
      currentDomain: '',
      contacts: [],
      context: null,
      searchQuery: '',
      filterBy: 'all',
      sortBy: 'name',
      sortOrder: 'asc'
    };

    this.loadFromStorage();
    this.setupEventListeners();
    this.startDomainTracking();
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem('mycelia-social-overlay');
      if (stored) {
        const data = JSON.parse(stored);
        this.contacts = new Map(data.contacts || []);
        this.domainContexts = new Map(data.domainContexts || []);
        this.socialNotes = new Map(data.socialNotes || []);
      }
    } catch (error) {
      console.warn('Failed to load social overlay data from storage:', error);
    }
  }

  private saveToStorage(): void {
    try {
      const data = {
        contacts: Array.from(this.contacts.entries()),
        domainContexts: Array.from(this.domainContexts.entries()),
        socialNotes: Array.from(this.socialNotes.entries()),
        timestamp: Date.now()
      };
      localStorage.setItem('mycelia-social-overlay', JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save social overlay data to storage:', error);
    }
  }

  private setupEventListeners(): void {
    // Listen for domain changes
    window.addEventListener('popstate', () => {
      this.updateCurrentDomain();
    });

    // Listen for social overlay toggle
    document.addEventListener('social-overlay-toggle', () => {
      this.toggleOverlay();
    });

    // Listen for contact updates
    document.addEventListener('contact-updated', (event: any) => {
      this.updateContact(event.detail);
    });
  }

  private startDomainTracking(): void {
    this.updateCurrentDomain();
    
    // Track domain changes
    let lastDomain = this.state.currentDomain;
    setInterval(() => {
      const currentDomain = window.location.hostname;
      if (currentDomain !== lastDomain) {
        this.updateCurrentDomain();
        lastDomain = currentDomain;
      }
    }, 1000);
  }

  private updateCurrentDomain(): void {
    const domain = window.location.hostname;
    this.state.currentDomain = domain;
    
    // Update context for current domain
    this.state.context = this.domainContexts.get(domain) || null;
    
    // Update contacts for current domain
    this.updateContactsForDomain(domain);
    
    this.notifyUpdate();
    
    observability.logEvent('domain_changed', {
      domain,
      contactCount: this.state.contacts.length,
      hasContext: !!this.state.context
    });
  }

  private updateContactsForDomain(domain: string): void {
    const domainContacts = Array.from(this.contacts.values())
      .filter(contact => contact.domain === domain);
    
    this.state.contacts = domainContacts;
  }

  addContact(contact: DIDContact): void {
    this.contacts.set(contact.did, contact);
    this.saveToStorage();
    this.updateContactsForDomain(this.state.currentDomain);
    this.notifyUpdate();
    
    observability.logEvent('contact_added', {
      did: contact.did,
      name: contact.name,
      domain: contact.domain,
      relationship: contact.relationship
    });
  }

  updateContact(contact: Partial<DIDContact> & { did: string }): void {
    const existing = this.contacts.get(contact.did);
    if (existing) {
      const updated = { ...existing, ...contact };
      this.contacts.set(contact.did, updated);
      this.saveToStorage();
      this.updateContactsForDomain(this.state.currentDomain);
      this.notifyUpdate();
      
      observability.logEvent('contact_updated', {
        did: contact.did,
        updatedFields: Object.keys(contact)
      });
    }
  }

  removeContact(did: string): void {
    if (this.contacts.delete(did)) {
      this.saveToStorage();
      this.updateContactsForDomain(this.state.currentDomain);
      this.notifyUpdate();
      
      observability.logEvent('contact_removed', {
        did
      });
    }
  }

  addSocialNote(note: Omit<SocialNote, 'id'>): void {
    const socialNote: SocialNote = {
      ...note,
      id: this.generateNoteId()
    };
    
    this.socialNotes.set(socialNote.id, socialNote);
    this.saveToStorage();
    this.notifyUpdate();
    
    observability.logEvent('social_note_added', {
      noteId: socialNote.id,
      contactDid: socialNote.contactDid,
      domain: socialNote.domain,
      isPrivate: socialNote.isPrivate
    });
  }

  getSocialNotes(contactDid?: string, domain?: string): SocialNote[] {
    let notes = Array.from(this.socialNotes.values());
    
    if (contactDid) {
      notes = notes.filter(note => note.contactDid === contactDid);
    }
    
    if (domain) {
      notes = notes.filter(note => note.domain === domain);
    }
    
    return notes.sort((a, b) => b.timestamp - a.timestamp);
  }

  updateDomainContext(domain: string, context: Partial<DomainContext>): void {
    const existing = this.domainContexts.get(domain);
    const updated = existing ? { ...existing, ...context } : {
      domain,
      contactCount: 0,
      lastActivity: Date.now(),
      sharedInterests: [],
      commonConnections: [],
      trustLevel: 'unknown',
      notes: '',
      ...context
    };
    
    this.domainContexts.set(domain, updated);
    this.saveToStorage();
    
    if (domain === this.state.currentDomain) {
      this.state.context = updated;
      this.notifyUpdate();
    }
    
    observability.logEvent('domain_context_updated', {
      domain,
      contactCount: updated.contactCount,
      trustLevel: updated.trustLevel
    });
  }

  getFilteredContacts(): DIDContact[] {
    let filtered = this.state.contacts;

    // Apply filter
    if (this.state.filterBy !== 'all') {
      filtered = filtered.filter(contact => contact.relationship === this.state.filterBy);
    }

    // Apply search
    if (this.state.searchQuery) {
      const query = this.state.searchQuery.toLowerCase();
      filtered = filtered.filter(contact => 
        contact.name.toLowerCase().includes(query) ||
        contact.did.toLowerCase().includes(query) ||
        contact.notes.toLowerCase().includes(query) ||
        contact.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (this.state.sortBy) {
        case 'name':
          aValue = a.name;
          bValue = b.name;
          break;
        case 'lastSeen':
          aValue = a.lastSeen;
          bValue = b.lastSeen;
          break;
        case 'relationship':
          aValue = a.relationship;
          bValue = b.relationship;
          break;
        case 'domain':
          aValue = a.domain;
          bValue = b.domain;
          break;
        default:
          aValue = a.name;
          bValue = b.name;
      }

      if (this.state.sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }

  getContactByDid(did: string): DIDContact | undefined {
    return this.contacts.get(did);
  }

  getContactsByDomain(domain: string): DIDContact[] {
    return Array.from(this.contacts.values()).filter(contact => contact.domain === domain);
  }

  getContactsByRelationship(relationship: DIDContact['relationship']): DIDContact[] {
    return Array.from(this.contacts.values()).filter(contact => contact.relationship === relationship);
  }

  // State management
  getState(): SocialOverlayState {
    return { ...this.state };
  }

  setSearchQuery(query: string): void {
    this.state.searchQuery = query;
    this.notifyUpdate();
  }

  setFilter(filter: SocialOverlayState['filterBy']): void {
    this.state.filterBy = filter;
    this.notifyUpdate();
  }

  setSorting(sortBy: SocialOverlayState['sortBy'], sortOrder: SocialOverlayState['sortOrder']): void {
    this.state.sortBy = sortBy;
    this.state.sortOrder = sortOrder;
    this.notifyUpdate();
  }

  showOverlay(): void {
    this.state.isVisible = true;
    this.isActive = true;
    this.notifyUpdate();
    
    observability.logEvent('social_overlay_shown', {
      domain: this.state.currentDomain,
      contactCount: this.state.contacts.length
    });
  }

  hideOverlay(): void {
    this.state.isVisible = false;
    this.isActive = false;
    this.notifyUpdate();
    
    observability.logEvent('social_overlay_hidden', {
      domain: this.state.currentDomain
    });
  }

  toggleOverlay(): void {
    if (this.state.isVisible) {
      this.hideOverlay();
    } else {
      this.showOverlay();
    }
  }

  // Subscription management
  subscribe(callback: (state: SocialOverlayState) => void): () => void {
    this.updateCallbacks.add(callback);
    return () => this.updateCallbacks.delete(callback);
  }

  private notifyUpdate(): void {
    this.updateCallbacks.forEach(callback => {
      try {
        callback({ ...this.state });
      } catch (error) {
        console.error('Error in social overlay update callback:', error);
      }
    });
  }

  // Statistics
  getStats(): {
    totalContacts: number;
    contactsByDomain: Record<string, number>;
    contactsByRelationship: Record<string, number>;
    totalNotes: number;
    verifiedContacts: number;
    averageNotesPerContact: number;
  } {
    const contacts = Array.from(this.contacts.values());
    const totalContacts = contacts.length;
    
    const contactsByDomain: Record<string, number> = {};
    const contactsByRelationship: Record<string, number> = {};
    let verifiedContacts = 0;
    
    contacts.forEach(contact => {
      contactsByDomain[contact.domain] = (contactsByDomain[contact.domain] || 0) + 1;
      contactsByRelationship[contact.relationship] = (contactsByRelationship[contact.relationship] || 0) + 1;
      if (contact.verified) verifiedContacts++;
    });
    
    const totalNotes = this.socialNotes.size;
    const averageNotesPerContact = totalContacts > 0 ? totalNotes / totalContacts : 0;

    return {
      totalContacts,
      contactsByDomain,
      contactsByRelationship,
      totalNotes,
      verifiedContacts,
      averageNotesPerContact
    };
  }

  // Utility methods
  private generateNoteId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2);
    return `note_${timestamp}_${random}`;
  }

  simulateContact(domain: string, name: string, relationship: DIDContact['relationship'] = 'acquaintance'): DIDContact {
    const contact: DIDContact = {
      did: `did:mycelia:${name.toLowerCase().replace(/\s+/g, '')}_${Date.now()}`,
      name,
      domain,
      lastSeen: Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000, // Random time in last week
      relationship,
      notes: `Contact from ${domain}`,
      tags: [domain, relationship],
      verified: Math.random() > 0.5
    };

    this.addContact(contact);
    return contact;
  }

  simulateDomainContext(domain: string): DomainContext {
    const context: DomainContext = {
      domain,
      contactCount: Math.floor(Math.random() * 10) + 1,
      lastActivity: Date.now() - Math.random() * 24 * 60 * 60 * 1000, // Random time in last day
      sharedInterests: ['technology', 'web3', 'privacy'],
      commonConnections: ['alice', 'bob', 'charlie'],
      trustLevel: ['high', 'medium', 'low'][Math.floor(Math.random() * 3)] as DomainContext['trustLevel'],
      notes: `Context for ${domain}`
    };

    this.updateDomainContext(domain, context);
    return context;
  }

  exportData(): string {
    const contacts = Array.from(this.contacts.values());
    const domainContexts = Array.from(this.domainContexts.values());
    const socialNotes = Array.from(this.socialNotes.values());
    
    return JSON.stringify({
      contacts,
      domainContexts,
      socialNotes,
      exportedAt: Date.now()
    }, null, 2);
  }

  importData(data: string): boolean {
    try {
      const imported = JSON.parse(data);
      
      if (imported.contacts) {
        imported.contacts.forEach((contact: DIDContact) => {
          this.contacts.set(contact.did, contact);
        });
      }
      
      if (imported.domainContexts) {
        imported.domainContexts.forEach((context: DomainContext) => {
          this.domainContexts.set(context.domain, context);
        });
      }
      
      if (imported.socialNotes) {
        imported.socialNotes.forEach((note: SocialNote) => {
          this.socialNotes.set(note.id, note);
        });
      }
      
      this.saveToStorage();
      this.updateContactsForDomain(this.state.currentDomain);
      this.notifyUpdate();
      
      return true;
    } catch (error) {
      console.error('Failed to import social overlay data:', error);
      return false;
    }
  }

  clearData(): void {
    this.contacts.clear();
    this.domainContexts.clear();
    this.socialNotes.clear();
    this.state.contacts = [];
    this.state.context = null;
    this.saveToStorage();
    this.notifyUpdate();
  }
}

// Global social overlay manager instance
let globalSocialOverlay: SocialOverlayManager | null = null;

export function getSocialOverlayManager(): SocialOverlayManager {
  if (!globalSocialOverlay) {
    globalSocialOverlay = new SocialOverlayManager();
  }
  return globalSocialOverlay;
}

// Convenience exports
export const socialOverlay = {
  addContact: (contact: DIDContact) => getSocialOverlayManager().addContact(contact),
  updateContact: (contact: Partial<DIDContact> & { did: string }) => getSocialOverlayManager().updateContact(contact),
  removeContact: (did: string) => getSocialOverlayManager().removeContact(did),
  addNote: (note: Omit<SocialNote, 'id'>) => getSocialOverlayManager().addSocialNote(note),
  getNotes: (contactDid?: string, domain?: string) => getSocialOverlayManager().getSocialNotes(contactDid, domain),
  updateDomainContext: (domain: string, context: Partial<DomainContext>) => getSocialOverlayManager().updateDomainContext(domain, context),
  getContacts: () => getSocialOverlayManager().getFilteredContacts(),
  getContact: (did: string) => getSocialOverlayManager().getContactByDid(did),
  getContactsByDomain: (domain: string) => getSocialOverlayManager().getContactsByDomain(domain),
  getContactsByRelationship: (relationship: DIDContact['relationship']) => getSocialOverlayManager().getContactsByRelationship(relationship),
  getState: () => getSocialOverlayManager().getState(),
  setSearch: (query: string) => getSocialOverlayManager().setSearchQuery(query),
  setFilter: (filter: SocialOverlayState['filterBy']) => getSocialOverlayManager().setFilter(filter),
  setSorting: (sortBy: SocialOverlayState['sortBy'], sortOrder: SocialOverlayState['sortOrder']) => 
    getSocialOverlayManager().setSorting(sortBy, sortOrder),
  show: () => getSocialOverlayManager().showOverlay(),
  hide: () => getSocialOverlayManager().hideOverlay(),
  toggle: () => getSocialOverlayManager().toggleOverlay(),
  subscribe: (callback: (state: SocialOverlayState) => void) => getSocialOverlayManager().subscribe(callback),
  getStats: () => getSocialOverlayManager().getStats(),
  simulateContact: (domain: string, name: string, relationship?: DIDContact['relationship']) => 
    getSocialOverlayManager().simulateContact(domain, name, relationship),
  simulateContext: (domain: string) => getSocialOverlayManager().simulateDomainContext(domain),
  exportData: () => getSocialOverlayManager().exportData(),
  importData: (data: string) => getSocialOverlayManager().importData(data),
  clearData: () => getSocialOverlayManager().clearData()
};
