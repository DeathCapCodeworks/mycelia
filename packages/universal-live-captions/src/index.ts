import React, { useState, useEffect } from 'react';
import { isEnabled } from '@mycelia/web4-feature-flags';

export interface CaptionSegment {
  id: string;
  text: string;
  timestamp: number;
  confidence: number;
  speaker?: string;
}

export interface UniversalLiveCaptionsProps {
  onCaptionUpdate?: (captions: CaptionSegment[]) => void;
  autoStart?: boolean;
  language?: string;
}

/**
 * Universal Live Captions Component
 * 
 * Provides live captions with vault storage.
 * Behind feature flag: live_captions_vault
 */
export function UniversalLiveCaptions({
  onCaptionUpdate,
  autoStart = false,
  language = 'en'
}: UniversalLiveCaptionsProps): React.ReactElement | null {
  const [captions, setCaptions] = useState<CaptionSegment[]>([]);
  const [isActive, setIsActive] = useState(autoStart);
  const [isProcessing, setIsProcessing] = useState(false);

  // Feature flag gate
  if (!isEnabled('live_captions_vault')) {
    return null;
  }

  useEffect(() => {
    if (isActive) {
      startCaptions();
    } else {
      stopCaptions();
    }
  }, [isActive]);

  const startCaptions = () => {
    setIsProcessing(true);
    
    // Mock caption generation - in production would use Web Speech API or similar
    const mockCaptions: CaptionSegment[] = [
      {
        id: '1',
        text: 'Welcome to Mycelia Navigator',
        timestamp: Date.now() - 5000,
        confidence: 0.95,
        speaker: 'System'
      },
      {
        id: '2',
        text: 'This is a live caption demonstration',
        timestamp: Date.now() - 3000,
        confidence: 0.88,
        speaker: 'System'
      },
      {
        id: '3',
        text: 'Captions are being generated in real-time',
        timestamp: Date.now() - 1000,
        confidence: 0.92,
        speaker: 'System'
      }
    ];

    setCaptions(mockCaptions);
    setIsProcessing(false);
    onCaptionUpdate?.(mockCaptions);
  };

  const stopCaptions = () => {
    setIsProcessing(false);
  };

  const toggleCaptions = () => {
    setIsActive(!isActive);
  };

  const clearCaptions = () => {
    setCaptions([]);
    onCaptionUpdate?.([]);
  };

  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  return (
    <div className="universal-live-captions">
      <div className="captions-header">
        <h3>Live Captions</h3>
        <div className="captions-controls">
          <button 
            onClick={toggleCaptions}
            className={`toggle-btn ${isActive ? 'active' : ''}`}
            disabled={isProcessing}
          >
            {isProcessing ? 'Processing...' : isActive ? 'Stop' : 'Start'}
          </button>
          <button onClick={clearCaptions} className="clear-btn">
            Clear
          </button>
        </div>
      </div>

      <div className="captions-status">
        <span className={`status-indicator ${isActive ? 'active' : 'inactive'}`}>
          {isActive ? '●' : '○'}
        </span>
        <span className="status-text">
          {isActive ? 'Captions Active' : 'Captions Inactive'}
        </span>
        <span className="language-tag">{language.toUpperCase()}</span>
      </div>

      <div className="captions-display">
        {captions.length === 0 ? (
          <div className="no-captions">
            {isActive ? 'Listening for speech...' : 'Captions will appear here'}
          </div>
        ) : (
          <div className="captions-list">
            {captions.map(caption => (
              <div key={caption.id} className="caption-item">
                <div className="caption-header">
                  <span className="timestamp">{formatTimestamp(caption.timestamp)}</span>
                  <span className="confidence">{(caption.confidence * 100).toFixed(0)}%</span>
                  {caption.speaker && <span className="speaker">{caption.speaker}</span>}
                </div>
                <div className="caption-text">{caption.text}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Headless API for live captions management
 */
export class LiveCaptionsManager {
  private captions: Map<string, CaptionSegment> = new Map();
  private isActive: boolean = false;
  private language: string = 'en';

  startCaptions(language: string = 'en'): void {
    this.isActive = true;
    this.language = language;
  }

  stopCaptions(): void {
    this.isActive = false;
  }

  addCaption(caption: CaptionSegment): void {
    this.captions.set(caption.id, caption);
  }

  removeCaption(captionId: string): void {
    this.captions.delete(captionId);
  }

  getCaptions(): CaptionSegment[] {
    return Array.from(this.captions.values())
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  getRecentCaptions(limit: number = 10): CaptionSegment[] {
    return this.getCaptions().slice(-limit);
  }

  getCaptionsBySpeaker(speaker: string): CaptionSegment[] {
    return Array.from(this.captions.values())
      .filter(c => c.speaker === speaker)
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  getCaptionsByConfidence(minConfidence: number): CaptionSegment[] {
    return Array.from(this.captions.values())
      .filter(c => c.confidence >= minConfidence)
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  clearCaptions(): void {
    this.captions.clear();
  }

  isCaptionsActive(): boolean {
    return this.isActive;
  }

  getLanguage(): string {
    return this.language;
  }

  exportCaptions(): string {
    return JSON.stringify(this.getCaptions(), null, 2);
  }

  importCaptions(captionsJson: string): boolean {
    try {
      const captions: CaptionSegment[] = JSON.parse(captionsJson);
      captions.forEach(caption => this.addCaption(caption));
      return true;
    } catch (error) {
      return false;
    }
  }
}

export default UniversalLiveCaptions;