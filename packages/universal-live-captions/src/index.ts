// Universal Live Captions - On-device transcription for all media elements

import { observability } from '@mycelia/observability';

export interface CaptionSegment {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
  confidence: number;
  speaker?: string;
  language: string;
  isFinal: boolean;
}

export interface CaptionConfig {
  enabled: boolean;
  language: string;
  autoDetectLanguage: boolean;
  showConfidence: boolean;
  maxSegmentLength: number;
  minConfidence: number;
  enableSpeakerDetection: boolean;
  enableProfanityFilter: boolean;
  enablePunctuation: boolean;
  enableCapitalization: boolean;
  fontSize: number;
  fontFamily: string;
  backgroundColor: string;
  textColor: string;
  position: 'bottom' | 'top' | 'center';
  opacity: number;
}

export interface MediaElement {
  id: string;
  element: HTMLMediaElement;
  type: 'audio' | 'video';
  isActive: boolean;
  captions: CaptionSegment[];
  currentSegment?: CaptionSegment;
  startTime: number;
  lastUpdateTime: number;
}

export interface TranscriptionEngine {
  name: string;
  version: string;
  supportedLanguages: string[];
  maxAudioLength: number;
  isOnline: boolean;
  isHardwareAccelerated: boolean;
}

export class UniversalLiveCaptionsManager {
  private mediaElements: Map<string, MediaElement> = new Map();
  private config: CaptionConfig;
  private transcriptionEngines: Map<string, TranscriptionEngine> = new Map();
  private activeTranscriptions: Map<string, any> = new Map();
  private captionContainer: HTMLElement | null = null;
  private isInitialized: boolean = false;
  private updateCallbacks: Set<(config: CaptionConfig) => void> = new Set();

  constructor(config?: Partial<CaptionConfig>) {
    this.config = {
      enabled: true,
      language: 'en-US',
      autoDetectLanguage: true,
      showConfidence: false,
      maxSegmentLength: 100,
      minConfidence: 0.7,
      enableSpeakerDetection: false,
      enableProfanityFilter: true,
      enablePunctuation: true,
      enableCapitalization: true,
      fontSize: 16,
      fontFamily: 'Arial, sans-serif',
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      textColor: '#ffffff',
      position: 'bottom',
      opacity: 0.9,
      ...config
    };

    this.initializeTranscriptionEngines();
    this.setupEventListeners();
  }

  private initializeTranscriptionEngines(): void {
    // Mock transcription engines - in real implementation, these would be actual engines
    this.transcriptionEngines.set('web-speech', {
      name: 'Web Speech API',
      version: '1.0',
      supportedLanguages: ['en-US', 'en-GB', 'es-ES', 'fr-FR', 'de-DE', 'it-IT', 'pt-BR', 'ru-RU', 'ja-JP', 'ko-KR', 'zh-CN'],
      maxAudioLength: 60000, // 1 minute
      isOnline: true,
      isHardwareAccelerated: false
    });

    this.transcriptionEngines.set('whisper-wasm', {
      name: 'Whisper WASM',
      version: '1.0',
      supportedLanguages: ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh'],
      maxAudioLength: 300000, // 5 minutes
      isOnline: false,
      isHardwareAccelerated: true
    });

    this.transcriptionEngines.set('vosk-wasm', {
      name: 'Vosk WASM',
      version: '1.0',
      supportedLanguages: ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh'],
      maxAudioLength: 180000, // 3 minutes
      isOnline: false,
      isHardwareAccelerated: true
    });
  }

  private setupEventListeners(): void {
    // Listen for media element additions
    document.addEventListener('DOMContentLoaded', () => {
      this.scanForMediaElements();
    });

    // Listen for dynamic media element additions
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            if (element.tagName === 'AUDIO' || element.tagName === 'VIDEO') {
              this.addMediaElement(element as HTMLMediaElement);
            }
            // Check for media elements in added nodes
            const mediaElements = element.querySelectorAll('audio, video');
            mediaElements.forEach((media) => {
              this.addMediaElement(media as HTMLMediaElement);
            });
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Listen for caption toggle events
    document.addEventListener('captions-toggle', () => {
      this.toggleCaptions();
    });

    // Listen for language change events
    document.addEventListener('captions-language-change', (event: any) => {
      this.setLanguage(event.detail.language);
    });
  }

  private scanForMediaElements(): void {
    const mediaElements = document.querySelectorAll('audio, video');
    mediaElements.forEach((element) => {
      this.addMediaElement(element as HTMLMediaElement);
    });
  }

  addMediaElement(element: HTMLMediaElement): void {
    if (!this.config.enabled) return;

    const id = this.generateMediaId(element);
    
    if (this.mediaElements.has(id)) {
      return; // Already tracking this element
    }

    const mediaElement: MediaElement = {
      id,
      element,
      type: element.tagName.toLowerCase() as 'audio' | 'video',
      isActive: false,
      captions: [],
      startTime: 0,
      lastUpdateTime: 0
    };

    this.mediaElements.set(id, mediaElement);
    this.setupMediaElementListeners(mediaElement);

    observability.logEvent('media_element_added', {
      mediaId: id,
      type: mediaElement.type,
      src: element.src || element.currentSrc
    });
  }

  private setupMediaElementListeners(mediaElement: MediaElement): void {
    const { element } = mediaElement;

    element.addEventListener('play', () => {
      this.startTranscription(mediaElement);
    });

    element.addEventListener('pause', () => {
      this.pauseTranscription(mediaElement);
    });

    element.addEventListener('ended', () => {
      this.stopTranscription(mediaElement);
    });

    element.addEventListener('timeupdate', () => {
      this.updateCurrentSegment(mediaElement);
    });

    element.addEventListener('loadstart', () => {
      this.prepareTranscription(mediaElement);
    });
  }

  private startTranscription(mediaElement: MediaElement): void {
    if (!this.config.enabled) return;

    mediaElement.isActive = true;
    mediaElement.startTime = Date.now();
    
    // Start transcription based on available engines
    const engine = this.selectTranscriptionEngine();
    if (engine) {
      this.startTranscriptionWithEngine(mediaElement, engine);
    }

    observability.logEvent('transcription_started', {
      mediaId: mediaElement.id,
      engine: engine?.name || 'none'
    });
  }

  private pauseTranscription(mediaElement: MediaElement): void {
    mediaElement.isActive = false;
    
    // Pause transcription
    const transcription = this.activeTranscriptions.get(mediaElement.id);
    if (transcription) {
      transcription.pause();
    }

    observability.logEvent('transcription_paused', {
      mediaId: mediaElement.id
    });
  }

  private stopTranscription(mediaElement: MediaElement): void {
    mediaElement.isActive = false;
    
    // Stop transcription
    const transcription = this.activeTranscriptions.get(mediaElement.id);
    if (transcription) {
      transcription.stop();
      this.activeTranscriptions.delete(mediaElement.id);
    }

    observability.logEvent('transcription_stopped', {
      mediaId: mediaElement.id,
      totalSegments: mediaElement.captions.length
    });
  }

  private prepareTranscription(mediaElement: MediaElement): void {
    // Prepare transcription for the media element
    // This would typically involve setting up audio context, etc.
  }

  private selectTranscriptionEngine(): TranscriptionEngine | null {
    // Select the best available transcription engine
    const engines = Array.from(this.transcriptionEngines.values());
    
    // Prefer offline engines for privacy
    const offlineEngines = engines.filter(engine => !engine.isOnline);
    if (offlineEngines.length > 0) {
      return offlineEngines[0];
    }
    
    // Fallback to online engines
    return engines[0] || null;
  }

  private startTranscriptionWithEngine(mediaElement: MediaElement, engine: TranscriptionEngine): void {
    // Mock transcription implementation
    const transcription = {
      engine: engine.name,
      startTime: Date.now(),
      isRunning: true,
      pause: () => { this.isRunning = false; },
      stop: () => { this.isRunning = false; },
      isRunning: true
    };

    this.activeTranscriptions.set(mediaElement.id, transcription);

    // Simulate transcription results
    this.simulateTranscription(mediaElement, engine);
  }

  private simulateTranscription(mediaElement: MediaElement, engine: TranscriptionEngine): void {
    if (!mediaElement.isActive) return;

    // Simulate receiving transcription segments
    const segment: CaptionSegment = {
      id: this.generateSegmentId(),
      text: this.generateMockText(),
      startTime: Date.now() - mediaElement.startTime,
      endTime: Date.now() - mediaElement.startTime + 2000,
      confidence: 0.85 + Math.random() * 0.1,
      language: this.config.language,
      isFinal: Math.random() > 0.3
    };

    this.addCaptionSegment(mediaElement, segment);

    // Continue simulation if still active
    if (mediaElement.isActive) {
      setTimeout(() => {
        this.simulateTranscription(mediaElement, engine);
      }, 2000 + Math.random() * 1000);
    }
  }

  private generateMockText(): string {
    const mockTexts = [
      "Hello, welcome to this presentation.",
      "Today we'll be discussing the latest developments.",
      "This is a demonstration of live captions.",
      "The system is working correctly.",
      "Thank you for your attention.",
      "Please feel free to ask questions.",
      "We'll now move on to the next topic.",
      "This concludes our presentation."
    ];
    
    return mockTexts[Math.floor(Math.random() * mockTexts.length)];
  }

  private addCaptionSegment(mediaElement: MediaElement, segment: CaptionSegment): void {
    mediaElement.captions.push(segment);
    mediaElement.lastUpdateTime = Date.now();

    // Update current segment
    if (segment.isFinal) {
      mediaElement.currentSegment = segment;
      this.displayCaption(mediaElement, segment);
    }

    // Limit caption history
    if (mediaElement.captions.length > 100) {
      mediaElement.captions = mediaElement.captions.slice(-100);
    }

    observability.logEvent('caption_segment_added', {
      mediaId: mediaElement.id,
      segmentId: segment.id,
      text: segment.text,
      confidence: segment.confidence,
      isFinal: segment.isFinal
    });
  }

  private displayCaption(mediaElement: MediaElement, segment: CaptionSegment): void {
    if (!this.config.enabled) return;

    this.ensureCaptionContainer();
    if (!this.captionContainer) return;

    // Create caption element
    const captionElement = document.createElement('div');
    captionElement.className = 'mycelia-caption';
    captionElement.textContent = segment.text;
    captionElement.style.cssText = `
      position: fixed;
      ${this.config.position}: 20px;
      left: 50%;
      transform: translateX(-50%);
      background-color: ${this.config.backgroundColor};
      color: ${this.config.textColor};
      padding: 8px 16px;
      border-radius: 4px;
      font-size: ${this.config.fontSize}px;
      font-family: ${this.config.fontFamily};
      opacity: ${this.config.opacity};
      z-index: 10000;
      max-width: 80%;
      text-align: center;
      word-wrap: break-word;
    `;

    // Add confidence indicator if enabled
    if (this.config.showConfidence) {
      const confidenceElement = document.createElement('span');
      confidenceElement.textContent = ` (${Math.round(segment.confidence * 100)}%)`;
      confidenceElement.style.opacity = '0.7';
      captionElement.appendChild(confidenceElement);
    }

    // Add to container
    this.captionContainer.appendChild(captionElement);

    // Remove after segment duration
    setTimeout(() => {
      if (captionElement.parentNode) {
        captionElement.parentNode.removeChild(captionElement);
      }
    }, segment.endTime - segment.startTime);
  }

  private ensureCaptionContainer(): void {
    if (!this.captionContainer) {
      this.captionContainer = document.createElement('div');
      this.captionContainer.id = 'mycelia-caption-container';
      this.captionContainer.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 10000;
      `;
      document.body.appendChild(this.captionContainer);
    }
  }

  private updateCurrentSegment(mediaElement: MediaElement): void {
    if (!mediaElement.isActive || !mediaElement.currentSegment) return;

    const currentTime = mediaElement.element.currentTime * 1000;
    const segment = mediaElement.currentSegment;

    // Check if current segment has ended
    if (currentTime > segment.endTime) {
      // Find next segment
      const nextSegment = mediaElement.captions.find(caption => 
        caption.startTime > currentTime && caption.isFinal
      );
      
      if (nextSegment) {
        mediaElement.currentSegment = nextSegment;
        this.displayCaption(mediaElement, nextSegment);
      }
    }
  }

  // Public API methods
  toggleCaptions(): void {
    this.config.enabled = !this.config.enabled;
    this.notifyUpdate();

    if (this.config.enabled) {
      this.scanForMediaElements();
    } else {
      this.hideAllCaptions();
    }

    observability.logEvent('captions_toggled', {
      enabled: this.config.enabled
    });
  }

  setLanguage(language: string): void {
    this.config.language = language;
    this.notifyUpdate();

    // Restart transcription for active media elements
    this.mediaElements.forEach(mediaElement => {
      if (mediaElement.isActive) {
        this.stopTranscription(mediaElement);
        this.startTranscription(mediaElement);
      }
    });

    observability.logEvent('captions_language_changed', {
      language
    });
  }

  updateConfig(newConfig: Partial<CaptionConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.notifyUpdate();

    // Apply visual changes immediately
    if (this.captionContainer) {
      this.captionContainer.style.display = this.config.enabled ? 'block' : 'none';
    }

    observability.logEvent('captions_config_updated', {
      config: newConfig
    });
  }

  getConfig(): CaptionConfig {
    return { ...this.config };
  }

  getMediaElements(): MediaElement[] {
    return Array.from(this.mediaElements.values());
  }

  getMediaElement(id: string): MediaElement | undefined {
    return this.mediaElements.get(id);
  }

  getCaptions(mediaId: string): CaptionSegment[] {
    const mediaElement = this.mediaElements.get(mediaId);
    return mediaElement ? mediaElement.captions : [];
  }

  getTranscriptionEngines(): TranscriptionEngine[] {
    return Array.from(this.transcriptionEngines.values());
  }

  exportCaptions(mediaId: string, format: 'srt' | 'vtt' | 'json' = 'json'): string {
    const captions = this.getCaptions(mediaId);
    
    if (format === 'srt') {
      return this.exportAsSRT(captions);
    } else if (format === 'vtt') {
      return this.exportAsVTT(captions);
    } else {
      return JSON.stringify(captions, null, 2);
    }
  }

  private exportAsSRT(captions: CaptionSegment[]): string {
    return captions.map((caption, index) => {
      const startTime = this.formatSRTTime(caption.startTime);
      const endTime = this.formatSRTTime(caption.endTime);
      return `${index + 1}\n${startTime} --> ${endTime}\n${caption.text}\n`;
    }).join('\n');
  }

  private exportAsVTT(captions: CaptionSegment[]): string {
    const header = 'WEBVTT\n\n';
    const body = captions.map(caption => {
      const startTime = this.formatVTTTime(caption.startTime);
      const endTime = this.formatVTTTime(caption.endTime);
      return `${startTime} --> ${endTime}\n${caption.text}\n`;
    }).join('\n');
    
    return header + body;
  }

  private formatSRTTime(timeMs: number): string {
    const hours = Math.floor(timeMs / 3600000);
    const minutes = Math.floor((timeMs % 3600000) / 60000);
    const seconds = Math.floor((timeMs % 60000) / 1000);
    const milliseconds = timeMs % 1000;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`;
  }

  private formatVTTTime(timeMs: number): string {
    const hours = Math.floor(timeMs / 3600000);
    const minutes = Math.floor((timeMs % 3600000) / 60000);
    const seconds = Math.floor((timeMs % 60000) / 1000);
    const milliseconds = timeMs % 1000;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
  }

  private hideAllCaptions(): void {
    if (this.captionContainer) {
      this.captionContainer.style.display = 'none';
    }
  }

  private generateMediaId(element: HTMLMediaElement): string {
    return `media_${element.src || element.currentSrc || 'unknown'}_${Date.now()}`;
  }

  private generateSegmentId(): string {
    return `segment_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  // Subscription management
  subscribe(callback: (config: CaptionConfig) => void): () => void {
    this.updateCallbacks.add(callback);
    return () => this.updateCallbacks.delete(callback);
  }

  private notifyUpdate(): void {
    this.updateCallbacks.forEach(callback => {
      try {
        callback({ ...this.config });
      } catch (error) {
        console.error('Error in captions update callback:', error);
      }
    });
  }

  // Statistics
  getStats(): {
    totalMediaElements: number;
    activeTranscriptions: number;
    totalCaptions: number;
    averageConfidence: number;
    supportedLanguages: number;
  } {
    const mediaElements = Array.from(this.mediaElements.values());
    const totalMediaElements = mediaElements.length;
    const activeTranscriptions = mediaElements.filter(me => me.isActive).length;
    const totalCaptions = mediaElements.reduce((sum, me) => sum + me.captions.length, 0);
    
    const allCaptions = mediaElements.flatMap(me => me.captions);
    const averageConfidence = allCaptions.length > 0 
      ? allCaptions.reduce((sum, c) => sum + c.confidence, 0) / allCaptions.length 
      : 0;
    
    const supportedLanguages = this.transcriptionEngines.size;

    return {
      totalMediaElements,
      activeTranscriptions,
      totalCaptions,
      averageConfidence,
      supportedLanguages
    };
  }

  // Initialize the manager
  initialize(): void {
    if (this.isInitialized) return;
    
    this.scanForMediaElements();
    this.isInitialized = true;
    
    observability.logEvent('captions_manager_initialized', {
      mediaElementsFound: this.mediaElements.size,
      enginesAvailable: this.transcriptionEngines.size
    });
  }

  destroy(): void {
    // Stop all transcriptions
    this.mediaElements.forEach(mediaElement => {
      this.stopTranscription(mediaElement);
    });

    // Remove caption container
    if (this.captionContainer && this.captionContainer.parentNode) {
      this.captionContainer.parentNode.removeChild(this.captionContainer);
    }

    this.mediaElements.clear();
    this.activeTranscriptions.clear();
    this.isInitialized = false;
  }
}

// Global captions manager instance
let globalCaptionsManager: UniversalLiveCaptionsManager | null = null;

export function getCaptionsManager(config?: Partial<CaptionConfig>): UniversalLiveCaptionsManager {
  if (!globalCaptionsManager) {
    globalCaptionsManager = new UniversalLiveCaptionsManager(config);
    globalCaptionsManager.initialize();
  }
  return globalCaptionsManager;
}

// Convenience exports
export const liveCaptions = {
  toggle: () => getCaptionsManager().toggleCaptions(),
  setLanguage: (language: string) => getCaptionsManager().setLanguage(language),
  updateConfig: (config: Partial<CaptionConfig>) => getCaptionsManager().updateConfig(config),
  getConfig: () => getCaptionsManager().getConfig(),
  getMediaElements: () => getCaptionsManager().getMediaElements(),
  getMediaElement: (id: string) => getCaptionsManager().getMediaElement(id),
  getCaptions: (mediaId: string) => getCaptionsManager().getCaptions(mediaId),
  getEngines: () => getCaptionsManager().getTranscriptionEngines(),
  exportCaptions: (mediaId: string, format?: 'srt' | 'vtt' | 'json') => getCaptionsManager().exportCaptions(mediaId, format),
  subscribe: (callback: (config: CaptionConfig) => void) => getCaptionsManager().subscribe(callback),
  getStats: () => getCaptionsManager().getStats(),
  initialize: () => getCaptionsManager().initialize(),
  destroy: () => getCaptionsManager().destroy()
};
