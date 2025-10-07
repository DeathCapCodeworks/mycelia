// Intent Bar v1 - Omni prompt for composing actions across Mycelia services

import { oracleAgent } from '@mycelia/oracle-agent';
import { socialGraph } from '@mycelia/social-graph';
import { workspacesEngine } from '@mycelia/workspaces-engine';
import { createConsentCard, verifyConsentCard } from '@mycelia/shared-kernel';

export interface IntentPlan {
  id: string;
  description: string;
  actions: IntentAction[];
  scopes: string[];
  estimatedDuration: number;
  requiresCapabilities: boolean;
  dryRunResult?: any;
}

export interface IntentAction {
  type: 'calendar' | 'wallet' | 'graph' | 'files' | 'oracle' | 'social' | 'workspace';
  operation: string;
  parameters: Record<string, any>;
  estimatedTime: number;
  requiresPermission: boolean;
}

export interface CapabilityPrompt {
  id: string;
  scopes: string[];
  purpose: string;
  duration: number;
  requester: string;
  timestamp: number;
}

export class IntentBar {
  private activePlans: Map<string, IntentPlan> = new Map();
  private capabilityPrompts: Map<string, CapabilityPrompt> = new Map();
  private isProcessing = false;

  constructor() {
    this.initializeEventListeners();
  }

  private initializeEventListeners(): void {
    // Listen for capability grants/revocations
    document.addEventListener('capability-granted', (event: any) => {
      this.handleCapabilityGranted(event.detail);
    });

    document.addEventListener('capability-revoked', (event: any) => {
      this.handleCapabilityRevoked(event.detail);
    });
  }

  async composeIntent(description: string): Promise<IntentPlan> {
    if (this.isProcessing) {
      throw new Error('Intent composition already in progress');
    }

    this.isProcessing = true;

    try {
      // Use Oracle Agent to analyze the intent
      const analysis = await oracleAgent.analyzeIntent(description);
      
      // Generate action plan
      const actions = await this.generateActionPlan(analysis);
      
      // Determine required scopes
      const scopes = this.extractScopes(actions);
      
      // Estimate duration
      const estimatedDuration = actions.reduce((total, action) => total + action.estimatedTime, 0);

      const plan: IntentPlan = {
        id: `intent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        description,
        actions,
        scopes,
        estimatedDuration,
        requiresCapabilities: scopes.length > 0
      };

      this.activePlans.set(plan.id, plan);
      
      return plan;
    } finally {
      this.isProcessing = false;
    }
  }

  private async generateActionPlan(analysis: any): Promise<IntentAction[]> {
    const actions: IntentAction[] = [];

    // Calendar actions
    if (analysis.includesCalendar) {
      actions.push({
        type: 'calendar',
        operation: 'schedule_meeting',
        parameters: { title: analysis.meetingTitle, duration: analysis.duration },
        estimatedTime: 2000,
        requiresPermission: true
      });
    }

    // Wallet actions
    if (analysis.includesPayment) {
      actions.push({
        type: 'wallet',
        operation: 'send_payment',
        parameters: { amount: analysis.amount, recipient: analysis.recipient },
        estimatedTime: 5000,
        requiresPermission: true
      });
    }

    // Social graph actions
    if (analysis.includesSocial) {
      actions.push({
        type: 'social',
        operation: 'share_content',
        parameters: { content: analysis.content, audience: analysis.audience },
        estimatedTime: 3000,
        requiresPermission: true
      });
    }

    // File operations
    if (analysis.includesFiles) {
      actions.push({
        type: 'files',
        operation: 'organize_files',
        parameters: { pattern: analysis.filePattern, action: analysis.fileAction },
        estimatedTime: 4000,
        requiresPermission: true
      });
    }

    // Oracle queries
    if (analysis.includesQuery) {
      actions.push({
        type: 'oracle',
        operation: 'search_knowledge',
        parameters: { query: analysis.query, context: analysis.context },
        estimatedTime: 1500,
        requiresPermission: false
      });
    }

    // Workspace operations
    if (analysis.includesWorkspace) {
      actions.push({
        type: 'workspace',
        operation: 'create_session',
        parameters: { name: analysis.sessionName, config: analysis.sessionConfig },
        estimatedTime: 1000,
        requiresPermission: false
      });
    }

    return actions;
  }

  private extractScopes(actions: IntentAction[]): string[] {
    const scopes = new Set<string>();

    for (const action of actions) {
      switch (action.type) {
        case 'calendar':
          scopes.add('calendar:read');
          scopes.add('calendar:write');
          break;
        case 'wallet':
          scopes.add('wallet:read');
          scopes.add('wallet:send');
          break;
        case 'social':
          scopes.add('social:read');
          scopes.add('social:write');
          break;
        case 'files':
          scopes.add('files:read');
          scopes.add('files:write');
          break;
        case 'oracle':
          scopes.add('oracle:query');
          break;
        case 'workspace':
          scopes.add('workspace:create');
          break;
      }
    }

    return Array.from(scopes);
  }

  async showCapabilityPrompt(plan: IntentPlan): Promise<CapabilityPrompt> {
    const prompt: CapabilityPrompt = {
      id: `prompt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      scopes: plan.scopes,
      purpose: plan.description,
      duration: plan.estimatedDuration,
      requester: 'intent-bar',
      timestamp: Date.now()
    };

    this.capabilityPrompts.set(prompt.id, prompt);

    // Emit event for UI to show prompt
    const event = new CustomEvent('capability-prompt', {
      detail: {
        prompt,
        plan
      }
    });
    document.dispatchEvent(event);

    return prompt;
  }

  async executePlan(planId: string, approvedScopes: string[]): Promise<any> {
    const plan = this.activePlans.get(planId);
    if (!plan) {
      throw new Error(`Plan ${planId} not found`);
    }

    // Verify all required scopes are approved
    const missingScopes = plan.scopes.filter(scope => !approvedScopes.includes(scope));
    if (missingScopes.length > 0) {
      throw new Error(`Missing required scopes: ${missingScopes.join(', ')}`);
    }

    // Execute actions in sequence
    const results = [];
    
    for (const action of plan.actions) {
      try {
        const result = await this.executeAction(action, approvedScopes);
        results.push({ action, result, success: true });
      } catch (error) {
        results.push({ action, error, success: false });
        console.error(`Action ${action.type}.${action.operation} failed:`, error);
      }
    }

    // Clean up
    this.activePlans.delete(planId);

    return {
      planId,
      results,
      success: results.every(r => r.success)
    };
  }

  private async executeAction(action: IntentAction, approvedScopes: string[]): Promise<any> {
    // Check if action requires permission and if it's approved
    if (action.requiresPermission) {
      const requiredScope = this.getActionScope(action);
      if (!approvedScopes.includes(requiredScope)) {
        throw new Error(`Action requires scope: ${requiredScope}`);
      }
    }

    // Simulate action execution
    await new Promise(resolve => setTimeout(resolve, action.estimatedTime));

    switch (action.type) {
      case 'calendar':
        return this.executeCalendarAction(action);
      case 'wallet':
        return this.executeWalletAction(action);
      case 'social':
        return this.executeSocialAction(action);
      case 'files':
        return this.executeFilesAction(action);
      case 'oracle':
        return this.executeOracleAction(action);
      case 'workspace':
        return this.executeWorkspaceAction(action);
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  private getActionScope(action: IntentAction): string {
    switch (action.type) {
      case 'calendar':
        return 'calendar:write';
      case 'wallet':
        return 'wallet:send';
      case 'social':
        return 'social:write';
      case 'files':
        return 'files:write';
      case 'oracle':
        return 'oracle:query';
      case 'workspace':
        return 'workspace:create';
      default:
        return 'unknown:scope';
    }
  }

  private async executeCalendarAction(action: IntentAction): Promise<any> {
    // Mock calendar operation
    return {
      eventId: `event-${Date.now()}`,
      title: action.parameters.title,
      scheduled: true
    };
  }

  private async executeWalletAction(action: IntentAction): Promise<any> {
    // Mock wallet operation
    return {
      transactionId: `tx-${Date.now()}`,
      amount: action.parameters.amount,
      recipient: action.parameters.recipient,
      status: 'pending'
    };
  }

  private async executeSocialAction(action: IntentAction): Promise<any> {
    // Mock social operation
    return {
      postId: `post-${Date.now()}`,
      content: action.parameters.content,
      audience: action.parameters.audience,
      published: true
    };
  }

  private async executeFilesAction(action: IntentAction): Promise<any> {
    // Mock file operation
    return {
      operationId: `file-op-${Date.now()}`,
      pattern: action.parameters.pattern,
      action: action.parameters.action,
      filesProcessed: Math.floor(Math.random() * 10) + 1
    };
  }

  private async executeOracleAction(action: IntentAction): Promise<any> {
    // Use actual Oracle Agent
    return await oracleAgent.query(action.parameters.query, action.parameters.context);
  }

  private async executeWorkspaceAction(action: IntentAction): Promise<any> {
    // Use actual Workspaces Engine
    return await workspacesEngine.createSession(action.parameters.name, action.parameters.config);
  }

  async dryRunPlan(planId: string): Promise<any> {
    const plan = this.activePlans.get(planId);
    if (!plan) {
      throw new Error(`Plan ${planId} not found`);
    }

    // Simulate execution without actually performing actions
    const dryRunResults = [];
    
    for (const action of plan.actions) {
      const dryRunResult = {
        action: action.type + '.' + action.operation,
        parameters: action.parameters,
        estimatedTime: action.estimatedTime,
        requiresPermission: action.requiresPermission,
        simulatedResult: this.simulateActionResult(action)
      };
      dryRunResults.push(dryRunResult);
    }

    plan.dryRunResult = dryRunResults;
    return dryRunResults;
  }

  private simulateActionResult(action: IntentAction): any {
    switch (action.type) {
      case 'calendar':
        return { eventId: 'sim-event-123', scheduled: true };
      case 'wallet':
        return { transactionId: 'sim-tx-123', status: 'simulated' };
      case 'social':
        return { postId: 'sim-post-123', published: true };
      case 'files':
        return { filesProcessed: 5, operation: 'simulated' };
      case 'oracle':
        return { queryId: 'sim-query-123', results: ['simulated result'] };
      case 'workspace':
        return { sessionId: 'sim-session-123', created: true };
      default:
        return { simulated: true };
    }
  }

  private handleCapabilityGranted(detail: any): void {
    console.log('Capability granted:', detail);
    // Update internal state if needed
  }

  private handleCapabilityRevoked(detail: any): void {
    console.log('Capability revoked:', detail);
    // Update internal state if needed
  }

  getActivePlans(): IntentPlan[] {
    return Array.from(this.activePlans.values());
  }

  getCapabilityPrompts(): CapabilityPrompt[] {
    return Array.from(this.capabilityPrompts.values());
  }

  clearCompletedPlans(): void {
    // Remove plans that have been executed
    for (const [id, plan] of this.activePlans.entries()) {
      if (plan.dryRunResult) {
        this.activePlans.delete(id);
      }
    }
  }
}

// Global intent bar instance
let globalIntentBar: IntentBar | null = null;

export function getIntentBar(): IntentBar {
  if (!globalIntentBar) {
    globalIntentBar = new IntentBar();
  }
  return globalIntentBar;
}

// Convenience exports
export const intentBar = {
  compose: (description: string) => getIntentBar().composeIntent(description),
  showPrompt: (plan: IntentPlan) => getIntentBar().showCapabilityPrompt(plan),
  execute: (planId: string, scopes: string[]) => getIntentBar().executePlan(planId, scopes),
  dryRun: (planId: string) => getIntentBar().dryRunPlan(planId),
  getActivePlans: () => getIntentBar().getActivePlans(),
  getPrompts: () => getIntentBar().getCapabilityPrompts(),
  clearCompleted: () => getIntentBar().clearCompletedPlans()
};
