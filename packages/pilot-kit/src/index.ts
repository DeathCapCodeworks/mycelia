// Pilot Kit - Real-world pilot scaffolding for Web4 features

import { getObservability } from '@mycelia/observability';
import { getFeatureFlagsManager } from '@mycelia/web4-feature-flags';

export interface PilotConfig {
  pilotId: string;
  pilotType: 'publisher' | 'org';
  features: string[];
  duration: number; // days
  maxParticipants: number;
  feedbackEnabled: boolean;
  metricsEnabled: boolean;
  privacyCopy: string;
  acceptanceCriteria: string[];
  exitCriteria: string[];
}

export interface PilotParticipant {
  id: string;
  pilotId: string;
  joinedAt: number;
  lastActive: number;
  feedbackCount: number;
  metrics: Record<string, any>;
  status: 'active' | 'completed' | 'dropped';
}

export interface PilotFeedback {
  id: string;
  pilotId: string;
  participantId: string;
  timestamp: number;
  rating: number; // 1-5
  comments: string;
  feature: string;
  category: 'usability' | 'performance' | 'privacy' | 'general';
  tags: string[];
}

export interface PilotMetrics {
  pilotId: string;
  timestamp: number;
  participants: {
    total: number;
    active: number;
    completed: number;
    dropped: number;
  };
  features: Record<string, {
    usageCount: number;
    successRate: number;
    avgRating: number;
    feedbackCount: number;
  }>;
  overall: {
    avgRating: number;
    completionRate: number;
    retentionRate: number;
  };
}

export interface PilotReport {
  pilotId: string;
  pilotType: 'publisher' | 'org';
  startDate: number;
  endDate: number;
  duration: number;
  participants: PilotParticipant[];
  feedback: PilotFeedback[];
  metrics: PilotMetrics[];
  summary: {
    totalParticipants: number;
    avgRating: number;
    completionRate: number;
    topFeatures: string[];
    recommendations: string[];
  };
  csvExport: string;
}

export class PilotKitManager {
  private pilots: Map<string, PilotConfig> = new Map();
  private participants: Map<string, PilotParticipant> = new Map();
  private feedback: Map<string, PilotFeedback> = new Map();
  private metrics: Map<string, PilotMetrics[]> = new Map();
  private isPilotMode: boolean = false;
  private currentPilotId: string | null = null;

  constructor() {
    this.loadFromStorage();
    this.setupEventListeners();
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem('mycelia-pilot-kit');
      if (stored) {
        const data = JSON.parse(stored);
        this.pilots = new Map(data.pilots || []);
        this.participants = new Map(data.participants || []);
        this.feedback = new Map(data.feedback || []);
        this.metrics = new Map(data.metrics || []);
        this.isPilotMode = data.isPilotMode || false;
        this.currentPilotId = data.currentPilotId || null;
      }
    } catch (error) {
      console.warn('Failed to load pilot kit data from storage:', error);
    }
  }

  private saveToStorage(): void {
    try {
      const data = {
        pilots: Array.from(this.pilots.entries()),
        participants: Array.from(this.participants.entries()),
        feedback: Array.from(this.feedback.entries()),
        metrics: Array.from(this.metrics.entries()),
        isPilotMode: this.isPilotMode,
        currentPilotId: this.currentPilotId,
        timestamp: Date.now()
      };
      localStorage.setItem('mycelia-pilot-kit', JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save pilot kit data to storage:', error);
    }
  }

  private setupEventListeners(): void {
    // Listen for pilot events
    document.addEventListener('pilot-join', (event: any) => {
      this.joinPilot(event.detail.pilotId, event.detail.participantId);
    });

    document.addEventListener('pilot-feedback', (event: any) => {
      this.submitFeedback(event.detail);
    });

    document.addEventListener('pilot-metric', (event: any) => {
      this.recordMetric(event.detail);
    });
  }

  // Publisher Pilot
  createPublisherPilot(config: Partial<PilotConfig>): PilotConfig {
    const pilotConfig: PilotConfig = {
      pilotId: this.generatePilotId('publisher'),
      pilotType: 'publisher',
      features: ['bloom_rewards', 'live_captions'],
      duration: 14, // 2 weeks
      maxParticipants: 50,
      feedbackEnabled: true,
      metricsEnabled: true,
      privacyCopy: 'This pilot collects usage data to improve Web4 features. All data is anonymized and used only for product development.',
      acceptanceCriteria: [
        'BLOOM Rewards toggle works correctly',
        'Live Captions accuracy ≥ 90%',
        'User satisfaction ≥ 4.0/5.0',
        'No critical bugs reported'
      ],
      exitCriteria: [
        '≥ 2 green metrics achieved',
        'Completion rate ≥ 70%',
        'Retention rate ≥ 60%'
      ],
      ...config
    };

    this.pilots.set(pilotConfig.pilotId, pilotConfig);
    this.saveToStorage();

    getObservability().logEvent('pilot_created', {
      pilotId: pilotConfig.pilotId,
      pilotType: pilotConfig.pilotType,
      features: pilotConfig.features,
      maxParticipants: pilotConfig.maxParticipants
    });

    return pilotConfig;
  }

  // Organization Pilot
  createOrgPilot(config: Partial<PilotConfig>): PilotConfig {
    const pilotConfig: PilotConfig = {
      pilotId: this.generatePilotId('org'),
      pilotType: 'org',
      features: ['intent_bar', 'applets'],
      duration: 21, // 3 weeks
      maxParticipants: 20,
      feedbackEnabled: true,
      metricsEnabled: true,
      privacyCopy: 'This pilot collects usage data to improve Web4 features. All data is anonymized and used only for product development.',
      acceptanceCriteria: [
        'Intent Bar task completion time ≤ 30s',
        'Applets installation success rate ≥ 95%',
        'User satisfaction ≥ 4.0/5.0',
        'No critical bugs reported'
      ],
      exitCriteria: [
        '≥ 2 green metrics achieved',
        'Completion rate ≥ 80%',
        'Retention rate ≥ 70%'
      ],
      ...config
    };

    this.pilots.set(pilotConfig.pilotId, pilotConfig);
    this.saveToStorage();

    getObservability().logEvent('pilot_created', {
      pilotId: pilotConfig.pilotId,
      pilotType: pilotConfig.pilotType,
      features: pilotConfig.features,
      maxParticipants: pilotConfig.maxParticipants
    });

    return pilotConfig;
  }

  // Pilot Management
  joinPilot(pilotId: string, participantId: string): boolean {
    const pilot = this.pilots.get(pilotId);
    if (!pilot) {
      return false;
    }

    // Check if pilot is full
    const currentParticipants = Array.from(this.participants.values())
      .filter(p => p.pilotId === pilotId && p.status === 'active').length;
    
    if (currentParticipants >= pilot.maxParticipants) {
      return false;
    }

    const participant: PilotParticipant = {
      id: participantId,
      pilotId,
      joinedAt: Date.now(),
      lastActive: Date.now(),
      feedbackCount: 0,
      metrics: {},
      status: 'active'
    };

    this.participants.set(participantId, participant);
    this.saveToStorage();

    // Enable pilot mode
    this.isPilotMode = true;
    this.currentPilotId = pilotId;

    // Enable pilot features
    this.enablePilotFeatures(pilot.features);

    getObservability().logEvent('pilot_joined', {
      pilotId,
      participantId,
      pilotType: pilot.pilotType,
      features: pilot.features
    });

    return true;
  }

  leavePilot(participantId: string): boolean {
    const participant = this.participants.get(participantId);
    if (!participant) {
      return false;
    }

    participant.status = 'dropped';
    participant.lastActive = Date.now();
    this.participants.set(participantId, participant);
    this.saveToStorage();

    // Check if this was the last participant
    const activeParticipants = Array.from(this.participants.values())
      .filter(p => p.pilotId === participant.pilotId && p.status === 'active').length;

    if (activeParticipants === 0) {
      this.isPilotMode = false;
      this.currentPilotId = null;
    }

    getObservability().logEvent('pilot_left', {
      pilotId: participant.pilotId,
      participantId,
      reason: 'manual_leave'
    });

    return true;
  }

  completePilot(participantId: string): boolean {
    const participant = this.participants.get(participantId);
    if (!participant) {
      return false;
    }

    participant.status = 'completed';
    participant.lastActive = Date.now();
    this.participants.set(participantId, participant);
    this.saveToStorage();

    getObservability().logEvent('pilot_completed', {
      pilotId: participant.pilotId,
      participantId,
      duration: Date.now() - participant.joinedAt
    });

    return true;
  }

  // Feedback Management
  submitFeedback(feedback: Omit<PilotFeedback, 'id'>): string {
    const feedbackId = this.generateFeedbackId();
    const pilotFeedback: PilotFeedback = {
      ...feedback,
      id: feedbackId
    };

    this.feedback.set(feedbackId, pilotFeedback);
    this.saveToStorage();

    // Update participant feedback count
    const participant = this.participants.get(feedback.participantId);
    if (participant) {
      participant.feedbackCount++;
      participant.lastActive = Date.now();
      this.participants.set(feedback.participantId, participant);
    }

    getObservability().logEvent('pilot_feedback_submitted', {
      pilotId: feedback.pilotId,
      participantId: feedback.participantId,
      rating: feedback.rating,
      feature: feedback.feature,
      category: feedback.category
    });

    return feedbackId;
  }

  getFeedback(pilotId: string): PilotFeedback[] {
    return Array.from(this.feedback.values())
      .filter(f => f.pilotId === pilotId)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  // Metrics Management
  recordMetric(metric: { pilotId: string; participantId: string; feature: string; value: any }): void {
    const participant = this.participants.get(metric.participantId);
    if (!participant) {
      return;
    }

    participant.metrics[metric.feature] = metric.value;
    participant.lastActive = Date.now();
    this.participants.set(metric.participantId, participant);

    // Update pilot metrics
    this.updatePilotMetrics(metric.pilotId);

    getObservability().logEvent('pilot_metric_recorded', {
      pilotId: metric.pilotId,
      participantId: metric.participantId,
      feature: metric.feature,
      value: metric.value
    });
  }

  private updatePilotMetrics(pilotId: string): void {
    const pilot = this.pilots.get(pilotId);
    if (!pilot) {
      return;
    }

    const participants = Array.from(this.participants.values())
      .filter(p => p.pilotId === pilotId);
    
    const feedback = Array.from(this.feedback.values())
      .filter(f => f.pilotId === pilotId);

    const metrics: PilotMetrics = {
      pilotId,
      timestamp: Date.now(),
      participants: {
        total: participants.length,
        active: participants.filter(p => p.status === 'active').length,
        completed: participants.filter(p => p.status === 'completed').length,
        dropped: participants.filter(p => p.status === 'dropped').length
      },
      features: {},
      overall: {
        avgRating: 0,
        completionRate: 0,
        retentionRate: 0
      }
    };

    // Calculate feature metrics
    pilot.features.forEach(feature => {
      const featureFeedback = feedback.filter(f => f.feature === feature);
      const featureMetrics = participants.map(p => p.metrics[feature]).filter(Boolean);
      
      metrics.features[feature] = {
        usageCount: featureMetrics.length,
        successRate: featureMetrics.length > 0 ? 
          featureMetrics.filter(m => m.success === true).length / featureMetrics.length : 0,
        avgRating: featureFeedback.length > 0 ?
          featureFeedback.reduce((sum, f) => sum + f.rating, 0) / featureFeedback.length : 0,
        feedbackCount: featureFeedback.length
      };
    });

    // Calculate overall metrics
    if (feedback.length > 0) {
      metrics.overall.avgRating = feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length;
    }
    
    if (participants.length > 0) {
      metrics.overall.completionRate = metrics.participants.completed / participants.length;
      metrics.overall.retentionRate = (metrics.participants.active + metrics.participants.completed) / participants.length;
    }

    // Store metrics
    const pilotMetrics = this.metrics.get(pilotId) || [];
    pilotMetrics.push(metrics);
    this.metrics.set(pilotId, pilotMetrics);
    this.saveToStorage();
  }

  // Pilot Status
  isInPilotMode(): boolean {
    return this.isPilotMode;
  }

  getCurrentPilotId(): string | null {
    return this.currentPilotId;
  }

  getCurrentPilot(): PilotConfig | null {
    if (!this.currentPilotId) {
      return null;
    }
    return this.pilots.get(this.currentPilotId) || null;
  }

  // Pilot Reports
  generatePilotReport(pilotId: string): PilotReport | null {
    const pilot = this.pilots.get(pilotId);
    if (!pilot) {
      return null;
    }

    const participants = Array.from(this.participants.values())
      .filter(p => p.pilotId === pilotId);
    
    const feedback = Array.from(this.feedback.values())
      .filter(f => f.pilotId === pilotId);
    
    const metrics = this.metrics.get(pilotId) || [];

    const startDate = Math.min(...participants.map(p => p.joinedAt));
    const endDate = Math.max(...participants.map(p => p.lastActive));
    const duration = endDate - startDate;

    // Calculate summary
    const totalParticipants = participants.length;
    const avgRating = feedback.length > 0 ?
      feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length : 0;
    const completionRate = totalParticipants > 0 ?
      participants.filter(p => p.status === 'completed').length / totalParticipants : 0;
    
    const topFeatures = pilot.features
      .map(feature => ({
        feature,
        rating: feedback.filter(f => f.feature === feature)
          .reduce((sum, f) => sum + f.rating, 0) / feedback.filter(f => f.feature === feature).length || 0
      }))
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 3)
      .map(f => f.feature);

    const recommendations = this.generateRecommendations(pilot, participants, feedback);

    // Generate CSV export
    const csvExport = this.generateCSVExport(pilotId);

    return {
      pilotId,
      pilotType: pilot.pilotType,
      startDate,
      endDate,
      duration,
      participants,
      feedback,
      metrics,
      summary: {
        totalParticipants,
        avgRating,
        completionRate,
        topFeatures,
        recommendations
      },
      csvExport
    };
  }

  private generateRecommendations(
    pilot: PilotConfig, 
    participants: PilotParticipant[], 
    feedback: PilotFeedback[]
  ): string[] {
    const recommendations: string[] = [];

    // Check acceptance criteria
    const avgRating = feedback.length > 0 ?
      feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length : 0;
    
    if (avgRating < 4.0) {
      recommendations.push('Improve user experience based on feedback');
    }

    const completionRate = participants.length > 0 ?
      participants.filter(p => p.status === 'completed').length / participants.length : 0;
    
    if (completionRate < 0.7) {
      recommendations.push('Investigate barriers to completion');
    }

    // Check exit criteria
    const greenMetrics = this.countGreenMetrics(pilot, participants, feedback);
    if (greenMetrics < 2) {
      recommendations.push('Focus on achieving green metrics before expanding');
    }

    return recommendations;
  }

  private countGreenMetrics(
    pilot: PilotConfig, 
    participants: PilotParticipant[], 
    feedback: PilotFeedback[]
  ): number {
    let greenMetrics = 0;

    // Check each acceptance criterion
    pilot.acceptanceCriteria.forEach(criterion => {
      if (criterion.includes('satisfaction') && criterion.includes('≥ 4.0')) {
        const avgRating = feedback.length > 0 ?
          feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length : 0;
        if (avgRating >= 4.0) greenMetrics++;
      }
      
      if (criterion.includes('completion rate') && criterion.includes('≥ 70%')) {
        const completionRate = participants.length > 0 ?
          participants.filter(p => p.status === 'completed').length / participants.length : 0;
        if (completionRate >= 0.7) greenMetrics++;
      }
    });

    return greenMetrics;
  }

  private generateCSVExport(pilotId: string): string {
    const participants = Array.from(this.participants.values())
      .filter(p => p.pilotId === pilotId);
    
    const feedback = Array.from(this.feedback.values())
      .filter(f => f.pilotId === pilotId);

    const csvLines: string[] = [];
    
    // Participants CSV
    csvLines.push('=== PARTICIPANTS ===');
    csvLines.push('id,pilotId,joinedAt,lastActive,feedbackCount,status');
    participants.forEach(p => {
      csvLines.push(`${p.id},${p.pilotId},${new Date(p.joinedAt).toISOString()},${new Date(p.lastActive).toISOString()},${p.feedbackCount},${p.status}`);
    });
    
    csvLines.push('');
    
    // Feedback CSV
    csvLines.push('=== FEEDBACK ===');
    csvLines.push('id,pilotId,participantId,timestamp,rating,feature,category,comments');
    feedback.forEach(f => {
      csvLines.push(`${f.id},${f.pilotId},${f.participantId},${new Date(f.timestamp).toISOString()},${f.rating},${f.feature},${f.category},"${f.comments}"`);
    });

    return csvLines.join('\n');
  }

  // Utility Methods
  private generatePilotId(type: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2);
    return `pilot_${type}_${timestamp}_${random}`;
  }

  private generateFeedbackId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2);
    return `feedback_${timestamp}_${random}`;
  }

  private enablePilotFeatures(features: string[]): void {
    features.forEach(feature => {
      // Enable corresponding feature flags
      const flagId = `${feature}_rollout`;
      getFeatureFlagsManager().setRolloutPercentage(flagId, 100);
    });
  }

  // Get all pilots
  getAllPilots(): PilotConfig[] {
    return Array.from(this.pilots.values());
  }

  // Get pilot by ID
  getPilot(pilotId: string): PilotConfig | undefined {
    return this.pilots.get(pilotId);
  }

  // Get participants for a pilot
  getPilotParticipants(pilotId: string): PilotParticipant[] {
    return Array.from(this.participants.values())
      .filter(p => p.pilotId === pilotId);
  }

  // Get metrics for a pilot
  getPilotMetrics(pilotId: string): PilotMetrics[] {
    return this.metrics.get(pilotId) || [];
  }

  // Clear all data
  clearAllData(): void {
    this.pilots.clear();
    this.participants.clear();
    this.feedback.clear();
    this.metrics.clear();
    this.isPilotMode = false;
    this.currentPilotId = null;
    this.saveToStorage();
  }
}

// Global pilot kit manager instance
let globalPilotKit: PilotKitManager | null = null;

export function getPilotKitManager(): PilotKitManager {
  if (!globalPilotKit) {
    globalPilotKit = new PilotKitManager();
  }
  return globalPilotKit;
}

// Convenience exports
export const pilotKit = {
  createPublisherPilot: (config?: Partial<PilotConfig>) => getPilotKitManager().createPublisherPilot(config || {}),
  createOrgPilot: (config?: Partial<PilotConfig>) => getPilotKitManager().createOrgPilot(config || {}),
  joinPilot: (pilotId: string, participantId: string) => getPilotKitManager().joinPilot(pilotId, participantId),
  leavePilot: (participantId: string) => getPilotKitManager().leavePilot(participantId),
  completePilot: (participantId: string) => getPilotKitManager().completePilot(participantId),
  submitFeedback: (feedback: Omit<PilotFeedback, 'id'>) => getPilotKitManager().submitFeedback(feedback),
  getFeedback: (pilotId: string) => getPilotKitManager().getFeedback(pilotId),
  recordMetric: (metric: any) => getPilotKitManager().recordMetric(metric),
  isInPilotMode: () => getPilotKitManager().isInPilotMode(),
  getCurrentPilotId: () => getPilotKitManager().getCurrentPilotId(),
  getCurrentPilot: () => getPilotKitManager().getCurrentPilot(),
  generateReport: (pilotId: string) => getPilotKitManager().generatePilotReport(pilotId),
  getAllPilots: () => getPilotKitManager().getAllPilots(),
  getPilot: (pilotId: string) => getPilotKitManager().getPilot(pilotId),
  getPilotParticipants: (pilotId: string) => getPilotKitManager().getPilotParticipants(pilotId),
  getPilotMetrics: (pilotId: string) => getPilotKitManager().getPilotMetrics(pilotId),
  clearAllData: () => getPilotKitManager().clearAllData()
};
