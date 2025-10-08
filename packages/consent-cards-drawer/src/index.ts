import React, { useState, useEffect } from 'react';
import { isEnabled } from '@mycelia/web4-feature-flags';

export interface ConsentCard {
  id: string;
  title: string;
  description: string;
  required: boolean;
  granted: boolean;
  capabilities: string[];
}

export interface ConsentCardsDrawerProps {
  cards: ConsentCard[];
  onConsentChange: (cardId: string, granted: boolean) => void;
  onClose: () => void;
  open: boolean;
}

/**
 * Consent Cards Drawer Component
 * 
 * Provides a UI for managing capability consent cards.
 * Behind feature flag: consent_cards_v1
 */
export function ConsentCardsDrawer({
  cards,
  onConsentChange,
  onClose,
  open
}: ConsentCardsDrawerProps): React.ReactElement | null {
  const [localCards, setLocalCards] = useState<ConsentCard[]>(cards);

  // Feature flag gate
  if (!isEnabled('consent_cards_v1')) {
    return null;
  }

  useEffect(() => {
    setLocalCards(cards);
  }, [cards]);

  const handleToggle = (cardId: string, granted: boolean) => {
    setLocalCards(prev => 
      prev.map(card => 
        card.id === cardId ? { ...card, granted } : card
      )
    );
    onConsentChange(cardId, granted);
  };

  if (!open) {
    return null;
  }

  return (
    <div className="consent-cards-drawer">
      <div className="drawer-header">
        <h2>Capability Consent</h2>
        <button onClick={onClose} className="close-button">×</button>
      </div>
      
      <div className="drawer-content">
        {localCards.map(card => (
          <div key={card.id} className={`consent-card ${card.required ? 'required' : ''}`}>
            <div className="card-header">
              <h3>{card.title}</h3>
              {card.required && <span className="required-badge">Required</span>}
            </div>
            
            <p className="card-description">{card.description}</p>
            
            <div className="capabilities">
              <strong>Capabilities:</strong>
              <ul>
                {card.capabilities.map(cap => (
                  <li key={cap}>{cap}</li>
                ))}
              </ul>
            </div>
            
            <div className="card-actions">
              <label>
                <input
                  type="checkbox"
                  checked={card.granted}
                  onChange={(e) => handleToggle(card.id, e.target.checked)}
                  disabled={card.required}
                />
                {card.required ? 'Required' : 'Grant Consent'}
              </label>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Headless API for consent management
 */
export class ConsentManager {
  private cards: Map<string, ConsentCard> = new Map();

  addCard(card: ConsentCard): void {
    this.cards.set(card.id, card);
  }

  removeCard(cardId: string): void {
    this.cards.delete(cardId);
  }

  getCard(cardId: string): ConsentCard | undefined {
    return this.cards.get(cardId);
  }

  getAllCards(): ConsentCard[] {
    return Array.from(this.cards.values());
  }

  updateConsent(cardId: string, granted: boolean): boolean {
    const card = this.cards.get(cardId);
    if (!card) {
      return false;
    }

    if (card.required && !granted) {
      return false; // Cannot revoke required consent
    }

    card.granted = granted;
    return true;
  }

  getRequiredCards(): ConsentCard[] {
    return Array.from(this.cards.values()).filter(card => card.required);
  }

  getGrantedCards(): ConsentCard[] {
    return Array.from(this.cards.values()).filter(card => card.granted);
  }

  hasAllRequiredConsent(): boolean {
    const requiredCards = this.getRequiredCards();
    return requiredCards.every(card => card.granted);
  }
}

// Default export for convenience
export default ConsentCardsDrawer;