// Feature Flags and Safety Controls - Web4 feature flags with safety controls

import { observability } from '@mycelia/observability';

export interface Web4FeatureFlag {
  id: string;
  name: string;
  description: string;
  category: 'engine' | 'ux' | 'privacy' | 'performance' | 'experimental';
  enabled: boolean;
  defaultValue: boolean;
  isSafeToToggle: boolean;
  requiresRestart: boolean;
  dependencies: string[];
  conflicts: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  lastModified: number;
  modifiedBy: string;
  changeLog: FeatureFlagChange[];
  rolloutPercentage?: number;
  canaryEnabled?: boolean;
}

export interface FeatureFlagChange {
  timestamp: number;
  from: boolean;
  to: boolean;
  reason: string;
  modifiedBy: string;
}

export interface SafetyControl {
  id: string;
  name: string;
  description: string;
  type: 'rate_limit' | 'quota' | 'timeout' | 'circuit_breaker' | 'fallback';
  enabled: boolean;
  config: Record<string, any>;
  thresholds: {
    warning: number;
    critical: number;
    max: number;
  };
  actions: {
    onWarning: string[];
    onCritical: string[];
    onMax: string[];
  };
  lastTriggered?: number;
  triggerCount: number;
}

export interface FeatureFlagState {
  flags: Map<string, Web4FeatureFlag>;
  controls: Map<string, SafetyControl>;
  isInitialized: boolean;
  lastUpdate: number;
  canaryMode: boolean;
  canaryAllowlist: Set<string>;
}

export class Web4FeatureFlagsManager {
  private flags: Map<string, Web4FeatureFlag> = new Map();
  private controls: Map<string, SafetyControl> = new Map();
  private updateCallbacks: Set<(state: FeatureFlagState) => void> = new Set();
  private isInitialized: boolean = false;
  private canaryMode: boolean = false;
  private canaryAllowlist: Set<string> = new Set();

  constructor() {
    this.initializeDefaultFlags();
    this.initializeSafetyControls();
    this.loadFromStorage();
    this.setupEventListeners();
  }

  private initializeDefaultFlags(): void {
    const defaultFlags: Web4FeatureFlag[] = [
      // Engine flags
      {
        id: 'engine_av1_encode',
        name: 'AV1 Encoding',
        description: 'Enable AV1 video encoding in media pipeline',
        category: 'engine',
        enabled: true,
        defaultValue: true,
        isSafeToToggle: true,
        requiresRestart: false,
        dependencies: [],
        conflicts: [],
        riskLevel: 'low',
        lastModified: Date.now(),
        modifiedBy: 'system',
        changeLog: [],
        rolloutPercentage: 100,
        canaryEnabled: false
      },
      {
        id: 'av1_encode_rollout',
        name: 'AV1 Encode Rollout',
        description: 'Rollout percentage for AV1 encoding',
        category: 'engine',
        enabled: true,
        defaultValue: true,
        isSafeToToggle: true,
        requiresRestart: false,
        dependencies: [],
        conflicts: [],
        riskLevel: 'low',
        lastModified: Date.now(),
        modifiedBy: 'system',
        changeLog: [],
        rolloutPercentage: 100
      },
      {
        id: 'engine_av1_decode',
        name: 'AV1 Decoding',
        description: 'Enable AV1 video decoding in media pipeline',
        category: 'engine',
        enabled: true,
        defaultValue: true,
        isSafeToToggle: true,
        requiresRestart: false,
        dependencies: [],
        conflicts: [],
        riskLevel: 'low',
        lastModified: Date.now(),
        modifiedBy: 'system',
        changeLog: [],
        rolloutPercentage: 100,
        canaryEnabled: false
      },
      {
        id: 'av1_decode_rollout',
        name: 'AV1 Decode Rollout',
        description: 'Rollout percentage for AV1 decoding',
        category: 'engine',
        enabled: true,
        defaultValue: true,
        isSafeToToggle: true,
        requiresRestart: false,
        dependencies: [],
        conflicts: [],
        riskLevel: 'low',
        lastModified: Date.now(),
        modifiedBy: 'system',
        changeLog: [],
        rolloutPercentage: 100
      },
      {
        id: 'engine_av1_svc',
        name: 'AV1 SVC',
        description: 'Enable AV1 Scalable Video Coding',
        category: 'engine',
        enabled: true,
        defaultValue: true,
        isSafeToToggle: true,
        requiresRestart: false,
        dependencies: ['engine_av1_encode'],
        conflicts: [],
        riskLevel: 'medium',
        lastModified: Date.now(),
        modifiedBy: 'system',
        changeLog: []
      },
      {
        id: 'engine_webrtc_enhanced',
        name: 'Enhanced WebRTC',
        description: 'Enable enhanced WebRTC features',
        category: 'engine',
        enabled: true,
        defaultValue: true,
        isSafeToToggle: true,
        requiresRestart: false,
        dependencies: [],
        conflicts: [],
        riskLevel: 'low',
        lastModified: Date.now(),
        modifiedBy: 'system',
        changeLog: []
      },
      {
        id: 'engine_quic_transport',
        name: 'QUIC Transport',
        description: 'Enable QUIC transport protocol',
        category: 'engine',
        enabled: true,
        defaultValue: true,
        isSafeToToggle: true,
        requiresRestart: false,
        dependencies: [],
        conflicts: [],
        riskLevel: 'medium',
        lastModified: Date.now(),
        modifiedBy: 'system',
        changeLog: []
      },
      // UX flags
      {
        id: 'intent_bar_v1',
        name: 'Intent Bar v1',
        description: 'Enable Intent Bar for composing actions',
        category: 'ux',
        enabled: false,
        defaultValue: false,
        isSafeToToggle: true,
        requiresRestart: false,
        dependencies: [],
        conflicts: [],
        riskLevel: 'low',
        lastModified: Date.now(),
        modifiedBy: 'system',
        changeLog: [],
        rolloutPercentage: 0,
        canaryEnabled: false
      },
      {
        id: 'intent_bar_v1_rollout',
        name: 'Intent Bar v1 Rollout',
        description: 'Rollout percentage for Intent Bar v1',
        category: 'ux',
        enabled: true,
        defaultValue: true,
        isSafeToToggle: true,
        requiresRestart: false,
        dependencies: [],
        conflicts: [],
        riskLevel: 'low',
        lastModified: Date.now(),
        modifiedBy: 'system',
        changeLog: [],
        rolloutPercentage: 0
      },
      {
        id: 'applets_v1',
        name: 'Portable Applets v1',
        description: 'Enable portable applets functionality',
        category: 'ux',
        enabled: false,
        defaultValue: false,
        isSafeToToggle: true,
        requiresRestart: false,
        dependencies: [],
        conflicts: [],
        riskLevel: 'medium',
        lastModified: Date.now(),
        modifiedBy: 'system',
        changeLog: [],
        rolloutPercentage: 0,
        canaryEnabled: false
      },
      {
        id: 'applets_v1_rollout',
        name: 'Portable Applets v1 Rollout',
        description: 'Rollout percentage for Portable Applets v1',
        category: 'ux',
        enabled: true,
        defaultValue: true,
        isSafeToToggle: true,
        requiresRestart: false,
        dependencies: [],
        conflicts: [],
        riskLevel: 'low',
        lastModified: Date.now(),
        modifiedBy: 'system',
        changeLog: [],
        rolloutPercentage: 0
      },
      {
        id: 'social_overlay_v1',
        name: 'Social Overlay v1',
        description: 'Enable social overlay for DID contacts',
        category: 'ux',
        enabled: false,
        defaultValue: false,
        isSafeToToggle: true,
        requiresRestart: false,
        dependencies: [],
        conflicts: [],
        riskLevel: 'low',
        lastModified: Date.now(),
        modifiedBy: 'system',
        changeLog: []
      },
      {
        id: 'live_captions_vault',
        name: 'Live Captions Vault',
        description: 'Enable live captions with vault storage',
        category: 'ux',
        enabled: false,
        defaultValue: false,
        isSafeToToggle: true,
        requiresRestart: false,
        dependencies: [],
        conflicts: [],
        riskLevel: 'medium',
        lastModified: Date.now(),
        modifiedBy: 'system',
        changeLog: [],
        rolloutPercentage: 0,
        canaryEnabled: false
      },
      {
        id: 'live_captions_rollout',
        name: 'Live Captions Rollout',
        description: 'Rollout percentage for Live Captions Vault',
        category: 'ux',
        enabled: true,
        defaultValue: true,
        isSafeToToggle: true,
        requiresRestart: false,
        dependencies: [],
        conflicts: [],
        riskLevel: 'low',
        lastModified: Date.now(),
        modifiedBy: 'system',
        changeLog: [],
        rolloutPercentage: 0
      },
      {
        id: 'offline_bundles_v1',
        name: 'Offline Bundles v1',
        description: 'Enable offline-first bundle installation',
        category: 'ux',
        enabled: false,
        defaultValue: false,
        isSafeToToggle: true,
        requiresRestart: false,
        dependencies: [],
        conflicts: [],
        riskLevel: 'medium',
        lastModified: Date.now(),
        modifiedBy: 'system',
        changeLog: []
      },
      // Privacy flags
      {
        id: 'consent_cards_v1',
        name: 'Consent Cards v1',
        description: 'Enable consent cards for capability management',
        category: 'privacy',
        enabled: true,
        defaultValue: true,
        isSafeToToggle: true,
        requiresRestart: false,
        dependencies: [],
        conflicts: [],
        riskLevel: 'low',
        lastModified: Date.now(),
        modifiedBy: 'system',
        changeLog: []
      },
      {
        id: 'provenance_receipts_v1',
        name: 'Provenance Receipts v1',
        description: 'Enable page provenance receipts',
        category: 'privacy',
        enabled: true,
        defaultValue: true,
        isSafeToToggle: true,
        requiresRestart: false,
        dependencies: [],
        conflicts: [],
        riskLevel: 'low',
        lastModified: Date.now(),
        modifiedBy: 'system',
        changeLog: []
      },
      {
        id: 'data_dividend_meter_v1',
        name: 'Data Dividend Meter v1',
        description: 'Enable data dividend meter for earnings tracking',
        category: 'privacy',
        enabled: true,
        defaultValue: true,
        isSafeToToggle: true,
        requiresRestart: false,
        dependencies: [],
        conflicts: [],
        riskLevel: 'low',
        lastModified: Date.now(),
        modifiedBy: 'system',
        changeLog: []
      },
      // Performance flags
      {
        id: 'transport_profiles_v1',
        name: 'Transport Profiles v1',
        description: 'Enable transport profile switching',
        category: 'performance',
        enabled: true,
        defaultValue: true,
        isSafeToToggle: true,
        requiresRestart: false,
        dependencies: [],
        conflicts: [],
        riskLevel: 'low',
        lastModified: Date.now(),
        modifiedBy: 'system',
        changeLog: []
      },
      {
        id: 'session_time_machine_v1',
        name: 'Session Time Machine v1',
        description: 'Enable session time machine for workspace snapshots',
        category: 'performance',
        enabled: true,
        defaultValue: true,
        isSafeToToggle: true,
        requiresRestart: false,
        dependencies: [],
        conflicts: [],
        riskLevel: 'low',
        lastModified: Date.now(),
        modifiedBy: 'system',
        changeLog: []
      },
      // Experimental flags
      {
        id: 'ai_inference_local',
        name: 'Local AI Inference',
        description: 'Enable local AI inference capabilities',
        category: 'experimental',
        enabled: false,
        defaultValue: false,
        isSafeToToggle: false,
        requiresRestart: true,
        dependencies: [],
        conflicts: [],
        riskLevel: 'high',
        lastModified: Date.now(),
        modifiedBy: 'system',
        changeLog: []
      },
      {
        id: 'p2p_messaging',
        name: 'P2P Messaging',
        description: 'Enable peer-to-peer messaging',
        category: 'experimental',
        enabled: false,
        defaultValue: false,
        isSafeToToggle: false,
        requiresRestart: true,
        dependencies: [],
        conflicts: [],
        riskLevel: 'high',
        lastModified: Date.now(),
        modifiedBy: 'system',
        changeLog: []
      }
    ];

    defaultFlags.forEach(flag => {
      this.flags.set(flag.id, flag);
    });
  }

  private initializeSafetyControls(): void {
    const defaultControls: SafetyControl[] = [
      {
        id: 'rate_limit_oracle_queries',
        name: 'Oracle Query Rate Limit',
        description: 'Limit the rate of oracle queries to prevent abuse',
        type: 'rate_limit',
        enabled: true,
        config: {
          windowMs: 60000, // 1 minute
          maxRequests: 100
        },
        thresholds: {
          warning: 80,
          critical: 95,
          max: 100
        },
        actions: {
          onWarning: ['log_warning', 'notify_user'],
          onCritical: ['log_critical', 'notify_user', 'throttle_requests'],
          onMax: ['log_max', 'block_requests', 'notify_admin']
        },
        triggerCount: 0
      },
      {
        id: 'quota_data_processing',
        name: 'Data Processing Quota',
        description: 'Limit data processing to prevent resource exhaustion',
        type: 'quota',
        enabled: true,
        config: {
          dailyLimit: 1000000000, // 1GB
          hourlyLimit: 100000000 // 100MB
        },
        thresholds: {
          warning: 0.8,
          critical: 0.9,
          max: 1.0
        },
        actions: {
          onWarning: ['log_warning', 'notify_user'],
          onCritical: ['log_critical', 'notify_user', 'throttle_processing'],
          onMax: ['log_max', 'block_processing', 'notify_admin']
        },
        triggerCount: 0
      },
      {
        id: 'timeout_media_processing',
        name: 'Media Processing Timeout',
        description: 'Timeout media processing operations to prevent hanging',
        type: 'timeout',
        enabled: true,
        config: {
          defaultTimeout: 30000, // 30 seconds
          maxTimeout: 300000 // 5 minutes
        },
        thresholds: {
          warning: 0.8,
          critical: 0.9,
          max: 1.0
        },
        actions: {
          onWarning: ['log_warning', 'notify_user'],
          onCritical: ['log_critical', 'notify_user', 'reduce_timeout'],
          onMax: ['log_max', 'cancel_operation', 'notify_admin']
        },
        triggerCount: 0
      },
      {
        id: 'circuit_breaker_network',
        name: 'Network Circuit Breaker',
        description: 'Circuit breaker for network operations',
        type: 'circuit_breaker',
        enabled: true,
        config: {
          failureThreshold: 5,
          recoveryTimeout: 30000,
          halfOpenMaxCalls: 3
        },
        thresholds: {
          warning: 0.6,
          critical: 0.8,
          max: 1.0
        },
        actions: {
          onWarning: ['log_warning', 'notify_user'],
          onCritical: ['log_critical', 'notify_user', 'open_circuit'],
          onMax: ['log_max', 'block_requests', 'notify_admin']
        },
        triggerCount: 0
      },
      {
        id: 'fallback_offline_mode',
        name: 'Offline Mode Fallback',
        description: 'Fallback to offline mode when online services fail',
        type: 'fallback',
        enabled: true,
        config: {
          maxRetries: 3,
          retryDelay: 1000,
          fallbackTimeout: 5000
        },
        thresholds: {
          warning: 0.5,
          critical: 0.8,
          max: 1.0
        },
        actions: {
          onWarning: ['log_warning', 'notify_user'],
          onCritical: ['log_critical', 'notify_user', 'enable_offline_mode'],
          onMax: ['log_max', 'force_offline_mode', 'notify_admin']
        },
        triggerCount: 0
      }
    ];

    defaultControls.forEach(control => {
      this.controls.set(control.id, control);
    });
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem('mycelia-web4-feature-flags');
      if (stored) {
        const data = JSON.parse(stored);
        this.flags = new Map(data.flags || []);
        this.controls = new Map(data.controls || []);
        this.canaryMode = data.canaryMode || false;
        this.canaryAllowlist = new Set(data.canaryAllowlist || []);
      }
    } catch (error) {
      console.warn('Failed to load feature flags from storage:', error);
    }
  }

  private saveToStorage(): void {
    try {
      const data = {
        flags: Array.from(this.flags.entries()),
        controls: Array.from(this.controls.entries()),
        canaryMode: this.canaryMode,
        canaryAllowlist: Array.from(this.canaryAllowlist),
        timestamp: Date.now()
      };
      localStorage.setItem('mycelia-web4-feature-flags', JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save feature flags to storage:', error);
    }
  }

  private setupEventListeners(): void {
    // Listen for flag toggle requests
    document.addEventListener('feature-flag-toggle', (event: any) => {
      this.toggleFlag(event.detail.flagId, event.detail.reason);
    });

    // Listen for safety control triggers
    document.addEventListener('safety-control-trigger', (event: any) => {
      this.handleSafetyControlTrigger(event.detail.controlId, event.detail.level);
    });
  }

  // Flag management
  getFlag(flagId: string): Web4FeatureFlag | undefined {
    return this.flags.get(flagId);
  }

  getAllFlags(): Web4FeatureFlag[] {
    return Array.from(this.flags.values());
  }

  getFlagsByCategory(category: Web4FeatureFlag['category']): Web4FeatureFlag[] {
    return Array.from(this.flags.values()).filter(flag => flag.category === category);
  }

  getEnabledFlags(): Web4FeatureFlag[] {
    return Array.from(this.flags.values()).filter(flag => flag.enabled);
  }

  getDisabledFlags(): Web4FeatureFlag[] {
    return Array.from(this.flags.values()).filter(flag => !flag.enabled);
  }

  isFlagEnabled(flagId: string): boolean {
    const flag = this.flags.get(flagId);
    return flag ? flag.enabled : false;
  }

  isFlagEnabledForUser(flagId: string, userId?: string): boolean {
    const flag = this.flags.get(flagId);
    if (!flag) {
      return false;
    }

    // Check if flag is explicitly enabled
    if (flag.enabled) {
      return true;
    }

    // Check rollout percentage
    if (flag.rolloutPercentage !== undefined && flag.rolloutPercentage > 0) {
      const userHash = this.hashUser(userId);
      const rolloutValue = userHash % 100;
      return rolloutValue < flag.rolloutPercentage;
    }

    // Check canary mode
    if (flag.canaryEnabled && this.canaryMode && userId) {
      return this.canaryAllowlist.has(userId);
    }

    return false;
  }

  toggleFlag(flagId: string, reason: string = 'User toggle'): boolean {
    const flag = this.flags.get(flagId);
    if (!flag) {
      return false;
    }

    // Check if it's safe to toggle
    if (!flag.isSafeToToggle) {
      console.warn(`Flag ${flagId} is not safe to toggle`);
      return false;
    }

    // Check dependencies
    if (flag.enabled && flag.dependencies.length > 0) {
      const dependentFlags = flag.dependencies.filter(depId => this.isFlagEnabled(depId));
      if (dependentFlags.length > 0) {
        console.warn(`Cannot disable ${flagId} because dependent flags are enabled: ${dependentFlags.join(', ')}`);
        return false;
      }
    }

    // Check conflicts
    if (flag.enabled && flag.conflicts.length > 0) {
      const conflictingFlags = flag.conflicts.filter(conflictId => this.isFlagEnabled(conflictId));
      if (conflictingFlags.length > 0) {
        console.warn(`Cannot enable ${flagId} because conflicting flags are enabled: ${conflictingFlags.join(', ')}`);
        return false;
      }
    }

    const oldValue = flag.enabled;
    flag.enabled = !flag.enabled;
    flag.lastModified = Date.now();
    flag.modifiedBy = 'user';

    // Add to change log
    flag.changeLog.push({
      timestamp: Date.now(),
      from: oldValue,
      to: flag.enabled,
      reason,
      modifiedBy: 'user'
    });

    // Keep only last 10 changes
    if (flag.changeLog.length > 10) {
      flag.changeLog = flag.changeLog.slice(-10);
    }

    this.flags.set(flagId, flag);
    this.saveToStorage();
    this.notifyUpdate();

    observability.logEvent('feature_flag_toggled', {
      flagId,
      flagName: flag.name,
      from: oldValue,
      to: flag.enabled,
      reason,
      riskLevel: flag.riskLevel
    });

    return true;
  }

  setFlag(flagId: string, enabled: boolean, reason: string = 'Manual set'): boolean {
    const flag = this.flags.get(flagId);
    if (!flag || flag.enabled === enabled) {
      return false;
    }

    return this.toggleFlag(flagId, reason);
  }

  resetFlagToDefault(flagId: string): boolean {
    const flag = this.flags.get(flagId);
    if (!flag) {
      return false;
    }

    if (flag.enabled === flag.defaultValue) {
      return true;
    }

    return this.setFlag(flagId, flag.defaultValue, 'Reset to default');
  }

  resetAllFlagsToDefault(): void {
    this.flags.forEach(flag => {
      if (flag.enabled !== flag.defaultValue) {
        this.setFlag(flag.id, flag.defaultValue, 'Reset all to default');
      }
    });
  }

  // Rollout management
  setRolloutPercentage(flagId: string, percentage: number): boolean {
    const flag = this.flags.get(flagId);
    if (!flag) {
      return false;
    }

    if (percentage < 0 || percentage > 100) {
      return false;
    }

    flag.rolloutPercentage = percentage;
    flag.lastModified = Date.now();
    flag.modifiedBy = 'user';

    this.flags.set(flagId, flag);
    this.saveToStorage();
    this.notifyUpdate();

    observability.logEvent('feature_flag_rollout_set', {
      flagId,
      flagName: flag.name,
      percentage
    });

    return true;
  }

  getRolloutPercentage(flagId: string): number | undefined {
    const flag = this.flags.get(flagId);
    return flag?.rolloutPercentage;
  }

  // Canary management
  enableCanaryMode(): void {
    this.canaryMode = true;
    this.saveToStorage();
    this.notifyUpdate();

    observability.logEvent('canary_mode_enabled', {
      allowlistSize: this.canaryAllowlist.size
    });
  }

  disableCanaryMode(): void {
    this.canaryMode = false;
    this.saveToStorage();
    this.notifyUpdate();

    observability.logEvent('canary_mode_disabled', {
      allowlistSize: this.canaryAllowlist.size
    });
  }

  isCanaryModeEnabled(): boolean {
    return this.canaryMode;
  }

  addToCanaryAllowlist(userId: string): void {
    this.canaryAllowlist.add(userId);
    this.saveToStorage();
    this.notifyUpdate();

    observability.logEvent('canary_user_added', {
      userId,
      allowlistSize: this.canaryAllowlist.size
    });
  }

  removeFromCanaryAllowlist(userId: string): void {
    this.canaryAllowlist.delete(userId);
    this.saveToStorage();
    this.notifyUpdate();

    observability.logEvent('canary_user_removed', {
      userId,
      allowlistSize: this.canaryAllowlist.size
    });
  }

  getCanaryAllowlist(): string[] {
    return Array.from(this.canaryAllowlist);
  }

  clearCanaryAllowlist(): void {
    this.canaryAllowlist.clear();
    this.saveToStorage();
    this.notifyUpdate();

    observability.logEvent('canary_allowlist_cleared');
  }

  // Utility methods
  private hashUser(userId?: string): number {
    if (!userId) {
      // Use a default hash for anonymous users
      return Math.floor(Math.random() * 100);
    }

    // Simple hash function for consistent user assignment
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  // Safety control management
  getControl(controlId: string): SafetyControl | undefined {
    return this.controls.get(controlId);
  }

  getAllControls(): SafetyControl[] {
    return Array.from(this.controls.values());
  }

  getEnabledControls(): SafetyControl[] {
    return Array.from(this.controls.values()).filter(control => control.enabled);
  }

  isControlEnabled(controlId: string): boolean {
    const control = this.controls.get(controlId);
    return control ? control.enabled : false;
  }

  toggleControl(controlId: string): boolean {
    const control = this.controls.get(controlId);
    if (!control) {
      return false;
    }

    control.enabled = !control.enabled;
    this.controls.set(controlId, control);
    this.saveToStorage();
    this.notifyUpdate();

    observability.logEvent('safety_control_toggled', {
      controlId,
      controlName: control.name,
      enabled: control.enabled
    });

    return true;
  }

  handleSafetyControlTrigger(controlId: string, level: 'warning' | 'critical' | 'max'): void {
    const control = this.controls.get(controlId);
    if (!control || !control.enabled) {
      return;
    }

    control.lastTriggered = Date.now();
    control.triggerCount++;

    const actions = control.actions[`on${level.charAt(0).toUpperCase() + level.slice(1)}`];
    
    actions.forEach(action => {
      this.executeSafetyAction(action, control, level);
    });

    this.controls.set(controlId, control);
    this.saveToStorage();

    observability.logEvent('safety_control_triggered', {
      controlId,
      controlName: control.name,
      level,
      triggerCount: control.triggerCount
    });
  }

  private executeSafetyAction(action: string, control: SafetyControl, level: string): void {
    switch (action) {
      case 'log_warning':
        console.warn(`Safety control ${control.name} triggered: ${level}`);
        break;
      case 'log_critical':
        console.error(`Safety control ${control.name} triggered: ${level}`);
        break;
      case 'log_max':
        console.error(`Safety control ${control.name} reached maximum: ${level}`);
        break;
      case 'notify_user':
        this.notifyUser(control.name, level);
        break;
      case 'notify_admin':
        this.notifyAdmin(control.name, level);
        break;
      case 'throttle_requests':
        this.throttleRequests(control.id);
        break;
      case 'block_requests':
        this.blockRequests(control.id);
        break;
      case 'throttle_processing':
        this.throttleProcessing(control.id);
        break;
      case 'block_processing':
        this.blockProcessing(control.id);
        break;
      case 'reduce_timeout':
        this.reduceTimeout(control.id);
        break;
      case 'cancel_operation':
        this.cancelOperation(control.id);
        break;
      case 'open_circuit':
        this.openCircuit(control.id);
        break;
      case 'enable_offline_mode':
        this.enableOfflineMode(control.id);
        break;
      case 'force_offline_mode':
        this.forceOfflineMode(control.id);
        break;
    }
  }

  private notifyUser(controlName: string, level: string): void {
    // Emit user notification event
    const event = new CustomEvent('safety-notification', {
      detail: {
        type: 'user',
        controlName,
        level,
        message: `Safety control ${controlName} triggered: ${level}`
      }
    });
    document.dispatchEvent(event);
  }

  private notifyAdmin(controlName: string, level: string): void {
    // Emit admin notification event
    const event = new CustomEvent('safety-notification', {
      detail: {
        type: 'admin',
        controlName,
        level,
        message: `Safety control ${controlName} reached critical level: ${level}`
      }
    });
    document.dispatchEvent(event);
  }

  private throttleRequests(controlId: string): void {
    // Implement request throttling
    console.log(`Throttling requests for control: ${controlId}`);
  }

  private blockRequests(controlId: string): void {
    // Implement request blocking
    console.log(`Blocking requests for control: ${controlId}`);
  }

  private throttleProcessing(controlId: string): void {
    // Implement processing throttling
    console.log(`Throttling processing for control: ${controlId}`);
  }

  private blockProcessing(controlId: string): void {
    // Implement processing blocking
    console.log(`Blocking processing for control: ${controlId}`);
  }

  private reduceTimeout(controlId: string): void {
    // Implement timeout reduction
    console.log(`Reducing timeout for control: ${controlId}`);
  }

  private cancelOperation(controlId: string): void {
    // Implement operation cancellation
    console.log(`Cancelling operation for control: ${controlId}`);
  }

  private openCircuit(controlId: string): void {
    // Implement circuit breaker opening
    console.log(`Opening circuit breaker for control: ${controlId}`);
  }

  private enableOfflineMode(controlId: string): void {
    // Implement offline mode enablement
    console.log(`Enabling offline mode for control: ${controlId}`);
  }

  private forceOfflineMode(controlId: string): void {
    // Implement forced offline mode
    console.log(`Forcing offline mode for control: ${controlId}`);
  }

  // State management
  getState(): FeatureFlagState {
    return {
      flags: new Map(this.flags),
      controls: new Map(this.controls),
      isInitialized: this.isInitialized,
      lastUpdate: Date.now(),
      canaryMode: this.canaryMode,
      canaryAllowlist: new Set(this.canaryAllowlist)
    };
  }

  // Subscription management
  subscribe(callback: (state: FeatureFlagState) => void): () => void {
    this.updateCallbacks.add(callback);
    return () => this.updateCallbacks.delete(callback);
  }

  private notifyUpdate(): void {
    const state = this.getState();
    this.updateCallbacks.forEach(callback => {
      try {
        callback(state);
      } catch (error) {
        console.error('Error in feature flag update callback:', error);
      }
    });
  }

  // Statistics
  getStats(): {
    totalFlags: number;
    enabledFlags: number;
    disabledFlags: number;
    flagsByCategory: Record<string, number>;
    totalControls: number;
    enabledControls: number;
    triggeredControls: number;
    riskDistribution: Record<string, number>;
  } {
    const flags = Array.from(this.flags.values());
    const controls = Array.from(this.controls.values());
    
    const totalFlags = flags.length;
    const enabledFlags = flags.filter(f => f.enabled).length;
    const disabledFlags = flags.filter(f => !f.enabled).length;
    
    const flagsByCategory: Record<string, number> = {};
    flags.forEach(flag => {
      flagsByCategory[flag.category] = (flagsByCategory[flag.category] || 0) + 1;
    });
    
    const totalControls = controls.length;
    const enabledControls = controls.filter(c => c.enabled).length;
    const triggeredControls = controls.filter(c => c.triggerCount > 0).length;
    
    const riskDistribution: Record<string, number> = {};
    flags.forEach(flag => {
      riskDistribution[flag.riskLevel] = (riskDistribution[flag.riskLevel] || 0) + 1;
    });

    return {
      totalFlags,
      enabledFlags,
      disabledFlags,
      flagsByCategory,
      totalControls,
      enabledControls,
      triggeredControls,
      riskDistribution
    };
  }

  // Export/Import
  exportFlags(): string {
    const flags = Array.from(this.flags.values());
    const controls = Array.from(this.controls.values());
    
    return JSON.stringify({
      flags,
      controls,
      exportedAt: Date.now()
    }, null, 2);
  }

  importFlags(data: string): boolean {
    try {
      const imported = JSON.parse(data);
      
      if (imported.flags) {
        imported.flags.forEach((flag: Web4FeatureFlag) => {
          this.flags.set(flag.id, flag);
        });
      }
      
      if (imported.controls) {
        imported.controls.forEach((control: SafetyControl) => {
          this.controls.set(control.id, control);
        });
      }
      
      this.saveToStorage();
      this.notifyUpdate();
      
      return true;
    } catch (error) {
      console.error('Failed to import feature flags:', error);
      return false;
    }
  }

  // Initialize the manager
  initialize(): void {
    if (this.isInitialized) return;
    
    this.isInitialized = true;
    this.notifyUpdate();
    
    observability.logEvent('feature_flags_initialized', {
      totalFlags: this.flags.size,
      totalControls: this.controls.size
    });
  }
}

// Global feature flags manager instance
let globalFeatureFlags: Web4FeatureFlagsManager | null = null;

export function getFeatureFlagsManager(): Web4FeatureFlagsManager {
  if (!globalFeatureFlags) {
    globalFeatureFlags = new Web4FeatureFlagsManager();
    globalFeatureFlags.initialize();
  }
  return globalFeatureFlags;
}

// Convenience exports
export const featureFlags = {
  getFlag: (flagId: string) => getFeatureFlagsManager().getFlag(flagId),
  getAllFlags: () => getFeatureFlagsManager().getAllFlags(),
  getFlagsByCategory: (category: Web4FeatureFlag['category']) => getFeatureFlagsManager().getFlagsByCategory(category),
  getEnabledFlags: () => getFeatureFlagsManager().getEnabledFlags(),
  getDisabledFlags: () => getFeatureFlagsManager().getDisabledFlags(),
  isEnabled: (flagId: string) => getFeatureFlagsManager().isFlagEnabled(flagId),
  isEnabledForUser: (flagId: string, userId?: string) => getFeatureFlagsManager().isFlagEnabledForUser(flagId, userId),
  toggle: (flagId: string, reason?: string) => getFeatureFlagsManager().toggleFlag(flagId, reason),
  set: (flagId: string, enabled: boolean, reason?: string) => getFeatureFlagsManager().setFlag(flagId, enabled, reason),
  resetToDefault: (flagId: string) => getFeatureFlagsManager().resetFlagToDefault(flagId),
  resetAllToDefault: () => getFeatureFlagsManager().resetAllFlagsToDefault(),
  setRolloutPercentage: (flagId: string, percentage: number) => getFeatureFlagsManager().setRolloutPercentage(flagId, percentage),
  getRolloutPercentage: (flagId: string) => getFeatureFlagsManager().getRolloutPercentage(flagId),
  enableCanaryMode: () => getFeatureFlagsManager().enableCanaryMode(),
  disableCanaryMode: () => getFeatureFlagsManager().disableCanaryMode(),
  isCanaryModeEnabled: () => getFeatureFlagsManager().isCanaryModeEnabled(),
  addToCanaryAllowlist: (userId: string) => getFeatureFlagsManager().addToCanaryAllowlist(userId),
  removeFromCanaryAllowlist: (userId: string) => getFeatureFlagsManager().removeFromCanaryAllowlist(userId),
  getCanaryAllowlist: () => getFeatureFlagsManager().getCanaryAllowlist(),
  clearCanaryAllowlist: () => getFeatureFlagsManager().clearCanaryAllowlist(),
  getControl: (controlId: string) => getFeatureFlagsManager().getControl(controlId),
  getAllControls: () => getFeatureFlagsManager().getAllControls(),
  getEnabledControls: () => getFeatureFlagsManager().getEnabledControls(),
  isControlEnabled: (controlId: string) => getFeatureFlagsManager().isControlEnabled(controlId),
  toggleControl: (controlId: string) => getFeatureFlagsManager().toggleControl(controlId),
  triggerControl: (controlId: string, level: 'warning' | 'critical' | 'max') => getFeatureFlagsManager().handleSafetyControlTrigger(controlId, level),
  getState: () => getFeatureFlagsManager().getState(),
  subscribe: (callback: (state: FeatureFlagState) => void) => getFeatureFlagsManager().subscribe(callback),
  getStats: () => getFeatureFlagsManager().getStats(),
  export: () => getFeatureFlagsManager().exportFlags(),
  import: (data: string) => getFeatureFlagsManager().importFlags(data),
  initialize: () => getFeatureFlagsManager().initialize()
};
