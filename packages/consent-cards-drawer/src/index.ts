// Consent Cards Drawer - Persistent drawer for managing capability grants

import { ConsentCard } from '@mycelia/shared-kernel';
import { observability } from '@mycelia/observability';

export interface ConsentCardWithStatus extends ConsentCard {
  status: 'active' | 'expired' | 'revoked';
  lastUsed?: number;
  usageCount: number;
  auditLink?: string;
}

export interface ConsentDrawerState {
  cards: ConsentCardWithStatus[];
  filter: 'all' | 'active' | 'expired' | 'revoked';
  searchQuery: string;
  sortBy: 'issuedAt' | 'lastUsed' | 'usageCount' | 'requester';
  sortOrder: 'asc' | 'desc';
  isOpen: boolean;
}

export interface ConsentAuditEntry {
  cardId: string;
  action: 'granted' | 'used' | 'revoked' | 'expired';
  timestamp: number;
  details: string;
  signature: string;
}

export class ConsentCardsDrawer {
  private cards: ConsentCardWithStatus[] = [];
  private auditEntries: ConsentAuditEntry[] = [];
  private state: ConsentDrawerState;
  private updateCallbacks: Set<(state: ConsentDrawerState) => void> = new Set();

  constructor() {
    this.state = {
      cards: [],
      filter: 'all',
      searchQuery: '',
      sortBy: 'issuedAt',
      sortOrder: 'desc',
      isOpen: false
    };

    this.loadFromStorage();
    this.startPeriodicCleanup();
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem('mycelia-consent-cards');
      if (stored) {
        const data = JSON.parse(stored);
        this.cards = data.cards || [];
        this.auditEntries = data.auditEntries || [];
      }
    } catch (error) {
      console.warn('Failed to load consent cards from storage:', error);
    }
  }

  private saveToStorage(): void {
    try {
      const data = {
        cards: this.cards,
        auditEntries: this.auditEntries,
        timestamp: Date.now()
      };
      localStorage.setItem('mycelia-consent-cards', JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save consent cards to storage:', error);
    }
  }

  private startPeriodicCleanup(): void {
    // Clean up expired cards every hour
    setInterval(() => {
      this.cleanupExpiredCards();
    }, 60 * 60 * 1000);
  }

  addConsentCard(card: ConsentCard): void {
    const cardWithStatus: ConsentCardWithStatus = {
      ...card,
      status: 'active',
      usageCount: 0,
      auditLink: this.generateAuditLink(card.id)
    };

    this.cards.push(cardWithStatus);
    
    // Add audit entry
    this.addAuditEntry({
      cardId: card.id,
      action: 'granted',
      timestamp: Date.now(),
      details: `Granted access to ${card.scopes.join(', ')} for ${card.purpose}`,
      signature: card.signature
    });

    this.saveToStorage();
    this.notifyUpdate();
    
    // Log observability event
    observability.logEvent('consent_card_added', {
      cardId: card.id,
      requester: card.requester,
      scopes: card.scopes,
      duration: card.durationMs
    });
  }

  revokeConsentCard(cardId: string): boolean {
    const card = this.cards.find(c => c.id === cardId);
    if (!card || card.status !== 'active') {
      return false;
    }

    card.status = 'revoked';
    
    // Add audit entry
    this.addAuditEntry({
      cardId: cardId,
      action: 'revoked',
      timestamp: Date.now(),
      details: 'Consent revoked by user',
      signature: card.signature
    });

    this.saveToStorage();
    this.notifyUpdate();
    
    // Log observability event
    observability.logEvent('consent_card_revoked', {
      cardId: cardId,
      requester: card.requester
    });

    return true;
  }

  useConsentCard(cardId: string, action: string): boolean {
    const card = this.cards.find(c => c.id === cardId);
    if (!card || card.status !== 'active') {
      return false;
    }

    // Check if card is expired
    const now = Date.now();
    if (now > card.issuedAt + card.durationMs) {
      card.status = 'expired';
      this.addAuditEntry({
        cardId: cardId,
        action: 'expired',
        timestamp: now,
        details: 'Consent expired due to duration',
        signature: card.signature
      });
      return false;
    }

    card.lastUsed = now;
    card.usageCount++;
    
    // Add audit entry
    this.addAuditEntry({
      cardId: cardId,
      action: 'used',
      timestamp: now,
      details: `Used for: ${action}`,
      signature: card.signature
    });

    this.saveToStorage();
    this.notifyUpdate();
    
    // Log observability event
    observability.logEvent('consent_card_used', {
      cardId: cardId,
      action: action,
      usageCount: card.usageCount
    });

    return true;
  }

  private addAuditEntry(entry: ConsentAuditEntry): void {
    this.auditEntries.push(entry);
    
    // Keep only last 1000 audit entries
    if (this.auditEntries.length > 1000) {
      this.auditEntries = this.auditEntries.slice(-1000);
    }
  }

  private generateAuditLink(cardId: string): string {
    // Generate a signed audit link (mock implementation)
    const timestamp = Date.now();
    const data = `${cardId}:${timestamp}`;
    const signature = btoa(data); // Mock signature
    return `/audit/consent/${cardId}?t=${timestamp}&s=${signature}`;
  }

  private cleanupExpiredCards(): void {
    const now = Date.now();
    let cleanedCount = 0;

    this.cards.forEach(card => {
      if (card.status === 'active' && now > card.issuedAt + card.durationMs) {
        card.status = 'expired';
        cleanedCount++;
        
        this.addAuditEntry({
          cardId: card.id,
          action: 'expired',
          timestamp: now,
          details: 'Consent expired due to duration',
          signature: card.signature
        });
      }
    });

    if (cleanedCount > 0) {
      this.saveToStorage();
      this.notifyUpdate();
      
      observability.logEvent('consent_cards_cleaned', {
        expiredCount: cleanedCount
      });
    }
  }

  getFilteredCards(): ConsentCardWithStatus[] {
    let filtered = this.cards;

    // Apply filter
    if (this.state.filter !== 'all') {
      filtered = filtered.filter(card => card.status === this.state.filter);
    }

    // Apply search
    if (this.state.searchQuery) {
      const query = this.state.searchQuery.toLowerCase();
      filtered = filtered.filter(card => 
        card.requester.toLowerCase().includes(query) ||
        card.scopes.some(scope => scope.toLowerCase().includes(query)) ||
        card.purpose.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (this.state.sortBy) {
        case 'issuedAt':
          aValue = a.issuedAt;
          bValue = b.issuedAt;
          break;
        case 'lastUsed':
          aValue = a.lastUsed || 0;
          bValue = b.lastUsed || 0;
          break;
        case 'usageCount':
          aValue = a.usageCount;
          bValue = b.usageCount;
          break;
        case 'requester':
          aValue = a.requester;
          bValue = b.requester;
          break;
        default:
          aValue = a.issuedAt;
          bValue = b.issuedAt;
      }

      if (this.state.sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }

  getCardById(cardId: string): ConsentCardWithStatus | undefined {
    return this.cards.find(card => card.id === cardId);
  }

  getAuditEntries(cardId?: string): ConsentAuditEntry[] {
    if (cardId) {
      return this.auditEntries.filter(entry => entry.cardId === cardId);
    }
    return [...this.auditEntries];
  }

  exportAuditLog(format: 'json' | 'csv' = 'json'): string {
    if (format === 'csv') {
      const headers = ['timestamp', 'cardId', 'action', 'details', 'signature'];
      const rows = this.auditEntries.map(entry => [
        new Date(entry.timestamp).toISOString(),
        entry.cardId,
        entry.action,
        entry.details,
        entry.signature
      ]);
      
      return [headers, ...rows].map(row => row.join(',')).join('\n');
    } else {
      return JSON.stringify(this.auditEntries, null, 2);
    }
  }

  exportConsentCards(format: 'json' | 'csv' = 'json'): string {
    if (format === 'csv') {
      const headers = ['id', 'issuedAt', 'requester', 'scopes', 'durationMs', 'purpose', 'status', 'usageCount', 'lastUsed'];
      const rows = this.cards.map(card => [
        card.id,
        new Date(card.issuedAt).toISOString(),
        card.requester,
        card.scopes.join(';'),
        card.durationMs,
        card.purpose,
        card.status,
        card.usageCount,
        card.lastUsed ? new Date(card.lastUsed).toISOString() : ''
      ]);
      
      return [headers, ...rows].map(row => row.join(',')).join('\n');
    } else {
      return JSON.stringify(this.cards, null, 2);
    }
  }

  // State management
  getState(): ConsentDrawerState {
    return { ...this.state };
  }

  setFilter(filter: ConsentDrawerState['filter']): void {
    this.state.filter = filter;
    this.notifyUpdate();
  }

  setSearchQuery(query: string): void {
    this.state.searchQuery = query;
    this.notifyUpdate();
  }

  setSorting(sortBy: ConsentDrawerState['sortBy'], sortOrder: ConsentDrawerState['sortOrder']): void {
    this.state.sortBy = sortBy;
    this.state.sortOrder = sortOrder;
    this.notifyUpdate();
  }

  openDrawer(): void {
    this.state.isOpen = true;
    this.notifyUpdate();
  }

  closeDrawer(): void {
    this.state.isOpen = false;
    this.notifyUpdate();
  }

  toggleDrawer(): void {
    this.state.isOpen = !this.state.isOpen;
    this.notifyUpdate();
  }

  // Subscription management
  subscribe(callback: (state: ConsentDrawerState) => void): () => void {
    this.updateCallbacks.add(callback);
    return () => this.updateCallbacks.delete(callback);
  }

  private notifyUpdate(): void {
    this.updateCallbacks.forEach(callback => {
      try {
        callback({ ...this.state });
      } catch (error) {
        console.error('Error in consent drawer update callback:', error);
      }
    });
  }

  // Statistics
  getStats(): {
    total: number;
    active: number;
    expired: number;
    revoked: number;
    totalUsage: number;
    averageUsagePerCard: number;
  } {
    const total = this.cards.length;
    const active = this.cards.filter(c => c.status === 'active').length;
    const expired = this.cards.filter(c => c.status === 'expired').length;
    const revoked = this.cards.filter(c => c.status === 'revoked').length;
    const totalUsage = this.cards.reduce((sum, c) => sum + c.usageCount, 0);
    const averageUsagePerCard = total > 0 ? totalUsage / total : 0;

    return {
      total,
      active,
      expired,
      revoked,
      totalUsage,
      averageUsagePerCard
    };
  }

  // Bulk operations
  revokeAllExpired(): number {
    const now = Date.now();
    let revokedCount = 0;

    this.cards.forEach(card => {
      if (card.status === 'active' && now > card.issuedAt + card.durationMs) {
        card.status = 'expired';
        revokedCount++;
        
        this.addAuditEntry({
          cardId: card.id,
          action: 'expired',
          timestamp: now,
          details: 'Bulk expired due to duration',
          signature: card.signature
        });
      }
    });

    if (revokedCount > 0) {
      this.saveToStorage();
      this.notifyUpdate();
    }

    return revokedCount;
  }

  clearRevokedCards(): number {
    const initialLength = this.cards.length;
    this.cards = this.cards.filter(card => card.status !== 'revoked');
    const removedCount = initialLength - this.cards.length;

    if (removedCount > 0) {
      this.saveToStorage();
      this.notifyUpdate();
    }

    return removedCount;
  }
}

// Global consent cards drawer instance
let globalConsentDrawer: ConsentCardsDrawer | null = null;

export function getConsentCardsDrawer(): ConsentCardsDrawer {
  if (!globalConsentDrawer) {
    globalConsentDrawer = new ConsentCardsDrawer();
  }
  return globalConsentDrawer;
}

// Convenience exports
export const consentDrawer = {
  addCard: (card: ConsentCard) => getConsentCardsDrawer().addConsentCard(card),
  revokeCard: (cardId: string) => getConsentCardsDrawer().revokeConsentCard(cardId),
  useCard: (cardId: string, action: string) => getConsentCardsDrawer().useConsentCard(cardId, action),
  getCards: () => getConsentCardsDrawer().getFilteredCards(),
  getCard: (cardId: string) => getConsentCardsDrawer().getCardById(cardId),
  getAuditEntries: (cardId?: string) => getConsentCardsDrawer().getAuditEntries(cardId),
  exportAudit: (format?: 'json' | 'csv') => getConsentCardsDrawer().exportAuditLog(format),
  exportCards: (format?: 'json' | 'csv') => getConsentCardsDrawer().exportConsentCards(format),
  getState: () => getConsentCardsDrawer().getState(),
  setFilter: (filter: ConsentDrawerState['filter']) => getConsentCardsDrawer().setFilter(filter),
  setSearch: (query: string) => getConsentCardsDrawer().setSearchQuery(query),
  setSorting: (sortBy: ConsentDrawerState['sortBy'], sortOrder: ConsentDrawerState['sortOrder']) => 
    getConsentCardsDrawer().setSorting(sortBy, sortOrder),
  open: () => getConsentCardsDrawer().openDrawer(),
  close: () => getConsentCardsDrawer().closeDrawer(),
  toggle: () => getConsentCardsDrawer().toggleDrawer(),
  subscribe: (callback: (state: ConsentDrawerState) => void) => getConsentCardsDrawer().subscribe(callback),
  getStats: () => getConsentCardsDrawer().getStats(),
  revokeExpired: () => getConsentCardsDrawer().revokeAllExpired(),
  clearRevoked: () => getConsentCardsDrawer().clearRevokedCards()
};
