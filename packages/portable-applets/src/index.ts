// Portable Applets - Turn site actions into local applets with WASM sandbox

import { observability } from '@mycelia/observability';

export interface AppletManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  icon?: string;
  author: string;
  permissions: AppletPermission[];
  capabilities: AppletCapability[];
  entryPoint: string;
  wasmModule?: string;
  dependencies: string[];
  minEngineVersion: string;
  createdAt: number;
  updatedAt: number;
}

export interface AppletPermission {
  type: 'file_read' | 'file_write' | 'network' | 'storage' | 'camera' | 'microphone' | 'location' | 'notifications';
  scope: string;
  description: string;
  required: boolean;
}

export interface AppletCapability {
  type: 'oracle_query' | 'social_interaction' | 'wallet_transaction' | 'calendar_access' | 'data_processing';
  scope: string;
  description: string;
  required: boolean;
}

export interface AppletState {
  id: string;
  status: 'installed' | 'running' | 'paused' | 'error' | 'uninstalled';
  lastRun: number;
  runCount: number;
  errorCount: number;
  lastError?: string;
  data: Record<string, any>;
  permissions: Record<string, boolean>;
  capabilities: Record<string, boolean>;
}

export interface AppletSandbox {
  id: string;
  wasmInstance?: WebAssembly.Instance;
  memory: WebAssembly.Memory;
  exports: Record<string, any>;
  permissions: Set<string>;
  capabilities: Set<string>;
  isRunning: boolean;
  startTime?: number;
}

export interface AppletExecutionResult {
  success: boolean;
  output?: any;
  error?: string;
  executionTime: number;
  memoryUsed: number;
  permissionsUsed: string[];
  capabilitiesUsed: string[];
}

export class PortableAppletsManager {
  private applets: Map<string, AppletManifest> = new Map();
  private states: Map<string, AppletState> = new Map();
  private sandboxes: Map<string, AppletSandbox> = new Map();
  private installedApplets: Set<string> = new Set();

  constructor() {
    this.loadFromStorage();
    this.setupEventListeners();
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem('mycelia-applets');
      if (stored) {
        const data = JSON.parse(stored);
        this.applets = new Map(data.applets || []);
        this.states = new Map(data.states || []);
        this.installedApplets = new Set(data.installed || []);
      }
    } catch (error) {
      console.warn('Failed to load applets from storage:', error);
    }
  }

  private saveToStorage(): void {
    try {
      const data = {
        applets: Array.from(this.applets.entries()),
        states: Array.from(this.states.entries()),
        installed: Array.from(this.installedApplets),
        timestamp: Date.now()
      };
      localStorage.setItem('mycelia-applets', JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save applets to storage:', error);
    }
  }

  private setupEventListeners(): void {
    // Listen for applet installation requests
    document.addEventListener('applet-install-request', (event: any) => {
      this.installApplet(event.detail.manifest);
    });

    // Listen for applet execution requests
    document.addEventListener('applet-execute-request', (event: any) => {
      this.executeApplet(event.detail.appletId, event.detail.input);
    });
  }

  createAppletFromSiteAction(
    siteUrl: string,
    actionName: string,
    actionDescription: string,
    permissions: AppletPermission[],
    capabilities: AppletCapability[]
  ): AppletManifest {
    const manifest: AppletManifest = {
      id: this.generateAppletId(siteUrl, actionName),
      name: actionName,
      version: '1.0.0',
      description: actionDescription,
      author: new URL(siteUrl).hostname,
      permissions,
      capabilities,
      entryPoint: `${siteUrl}/applet/${actionName}`,
      dependencies: [],
      minEngineVersion: '1.0.0',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    this.applets.set(manifest.id, manifest);
    this.saveToStorage();

    observability.logEvent('applet_created', {
      appletId: manifest.id,
      siteUrl,
      actionName,
      permissionCount: permissions.length,
      capabilityCount: capabilities.length
    });

    return manifest;
  }

  installApplet(manifest: AppletManifest): boolean {
    try {
      // Validate manifest
      if (!this.validateManifest(manifest)) {
        throw new Error('Invalid applet manifest');
      }

      // Check permissions and capabilities
      const permissionGranted = this.requestPermissions(manifest.permissions);
      const capabilityGranted = this.requestCapabilities(manifest.capabilities);

      if (!permissionGranted || !capabilityGranted) {
        throw new Error('Required permissions or capabilities not granted');
      }

      // Create applet state
      const state: AppletState = {
        id: manifest.id,
        status: 'installed',
        lastRun: 0,
        runCount: 0,
        errorCount: 0,
        data: {},
        permissions: {},
        capabilities: {}
      };

      // Initialize permissions and capabilities
      manifest.permissions.forEach(perm => {
        state.permissions[perm.type] = perm.required;
      });
      manifest.capabilities.forEach(cap => {
        state.capabilities[cap.type] = cap.required;
      });

      this.states.set(manifest.id, state);
      this.installedApplets.add(manifest.id);
      this.saveToStorage();

      observability.logEvent('applet_installed', {
        appletId: manifest.id,
        name: manifest.name,
        version: manifest.version
      });

      return true;
    } catch (error) {
      console.error('Failed to install applet:', error);
      return false;
    }
  }

  private validateManifest(manifest: AppletManifest): boolean {
    return !!(
      manifest.id &&
      manifest.name &&
      manifest.version &&
      manifest.description &&
      manifest.author &&
      manifest.permissions &&
      manifest.capabilities &&
      manifest.entryPoint
    );
  }

  private requestPermissions(permissions: AppletPermission[]): boolean {
    // Mock permission request - in real implementation, this would show UI
    return permissions.every(perm => {
      if (perm.required) {
        // For demo purposes, grant all required permissions
        return true;
      }
      return true;
    });
  }

  private requestCapabilities(capabilities: AppletCapability[]): boolean {
    // Mock capability request - in real implementation, this would show UI
    return capabilities.every(cap => {
      if (cap.required) {
        // For demo purposes, grant all required capabilities
        return true;
      }
      return true;
    });
  }

  async executeApplet(appletId: string, input?: any): Promise<AppletExecutionResult> {
    const startTime = Date.now();
    const manifest = this.applets.get(appletId);
    const state = this.states.get(appletId);

    if (!manifest || !state) {
      return {
        success: false,
        error: 'Applet not found',
        executionTime: Date.now() - startTime,
        memoryUsed: 0,
        permissionsUsed: [],
        capabilitiesUsed: []
      };
    }

    if (!this.installedApplets.has(appletId)) {
      return {
        success: false,
        error: 'Applet not installed',
        executionTime: Date.now() - startTime,
        memoryUsed: 0,
        permissionsUsed: [],
        capabilitiesUsed: []
      };
    }

    try {
      // Create or get sandbox
      let sandbox = this.sandboxes.get(appletId);
      if (!sandbox) {
        sandbox = await this.createSandbox(manifest);
        this.sandboxes.set(appletId, sandbox);
      }

      // Execute applet
      const result = await this.runInSandbox(sandbox, input);
      
      // Update state
      state.status = 'running';
      state.lastRun = Date.now();
      state.runCount++;
      state.data = { ...state.data, ...result.data };

      this.states.set(appletId, state);
      this.saveToStorage();

      observability.logEvent('applet_executed', {
        appletId,
        success: result.success,
        executionTime: Date.now() - startTime,
        runCount: state.runCount
      });

      return {
        success: result.success,
        output: result.output,
        error: result.error,
        executionTime: Date.now() - startTime,
        memoryUsed: sandbox.memory.buffer.byteLength,
        permissionsUsed: Array.from(sandbox.permissions),
        capabilitiesUsed: Array.from(sandbox.capabilities)
      };
    } catch (error) {
      // Update error state
      state.status = 'error';
      state.errorCount++;
      state.lastError = error instanceof Error ? error.message : String(error);

      this.states.set(appletId, state);
      this.saveToStorage();

      return {
        success: false,
        error: state.lastError,
        executionTime: Date.now() - startTime,
        memoryUsed: 0,
        permissionsUsed: [],
        capabilitiesUsed: []
      };
    }
  }

  private async createSandbox(manifest: AppletManifest): Promise<AppletSandbox> {
    const sandbox: AppletSandbox = {
      id: manifest.id,
      memory: new WebAssembly.Memory({ initial: 16, maximum: 64 }),
      exports: {},
      permissions: new Set(manifest.permissions.map(p => p.type)),
      capabilities: new Set(manifest.capabilities.map(c => c.type)),
      isRunning: false
    };

    // Load WASM module if available
    if (manifest.wasmModule) {
      try {
        const wasmModule = await WebAssembly.compile(new Uint8Array(await fetch(manifest.wasmModule).then(r => r.arrayBuffer())));
        sandbox.wasmInstance = await WebAssembly.instantiate(wasmModule, {
          env: {
            memory: sandbox.memory,
            console_log: (ptr: number, len: number) => {
              const bytes = new Uint8Array(sandbox.memory.buffer, ptr, len);
              const str = new TextDecoder().decode(bytes);
              console.log(`[Applet ${manifest.id}]`, str);
            }
          }
        });
        sandbox.exports = sandbox.wasmInstance.exports;
      } catch (error) {
        console.warn(`Failed to load WASM module for applet ${manifest.id}:`, error);
      }
    }

    return sandbox;
  }

  private async runInSandbox(sandbox: AppletSandbox, input?: any): Promise<{ success: boolean; output?: any; error?: string; data?: any }> {
    sandbox.isRunning = true;
    sandbox.startTime = Date.now();

    try {
      // Mock execution - in real implementation, this would run the actual applet code
      const result = await this.mockAppletExecution(sandbox, input);
      
      sandbox.isRunning = false;
      return result;
    } catch (error) {
      sandbox.isRunning = false;
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async mockAppletExecution(sandbox: AppletSandbox, input?: any): Promise<{ success: boolean; output?: any; data?: any }> {
    // Simulate applet execution
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));

    // Mock different types of applet behavior based on capabilities
    if (sandbox.capabilities.has('oracle_query')) {
      return {
        success: true,
        output: { query: input?.query || 'default query', result: 'Mock oracle result' },
        data: { lastQuery: input?.query, queryCount: 1 }
      };
    } else if (sandbox.capabilities.has('wallet_transaction')) {
      return {
        success: true,
        output: { transaction: input?.transaction || 'mock_tx', status: 'completed' },
        data: { lastTransaction: input?.transaction, transactionCount: 1 }
      };
    } else if (sandbox.capabilities.has('data_processing')) {
      return {
        success: true,
        output: { processed: input?.data || 'mock data', processedAt: Date.now() },
        data: { processedData: input?.data, processingCount: 1 }
      };
    } else {
      return {
        success: true,
        output: { message: 'Applet executed successfully', input },
        data: { executionCount: 1 }
      };
    }
  }

  uninstallApplet(appletId: string): boolean {
    if (!this.installedApplets.has(appletId)) {
      return false;
    }

    // Stop running applet
    const sandbox = this.sandboxes.get(appletId);
    if (sandbox) {
      sandbox.isRunning = false;
      this.sandboxes.delete(appletId);
    }

    // Update state
    const state = this.states.get(appletId);
    if (state) {
      state.status = 'uninstalled';
      this.states.set(appletId, state);
    }

    this.installedApplets.delete(appletId);
    this.saveToStorage();

    observability.logEvent('applet_uninstalled', {
      appletId
    });

    return true;
  }

  getInstalledApplets(): AppletManifest[] {
    return Array.from(this.installedApplets)
      .map(id => this.applets.get(id))
      .filter((manifest): manifest is AppletManifest => !!manifest);
  }

  getAppletState(appletId: string): AppletState | undefined {
    return this.states.get(appletId);
  }

  getAllAppletStates(): AppletState[] {
    return Array.from(this.states.values());
  }

  getAppletStats(): {
    totalInstalled: number;
    totalRunning: number;
    totalErrors: number;
    averageRunCount: number;
    totalExecutionTime: number;
  } {
    const states = Array.from(this.states.values());
    const totalInstalled = states.length;
    const totalRunning = states.filter(s => s.status === 'running').length;
    const totalErrors = states.reduce((sum, s) => sum + s.errorCount, 0);
    const averageRunCount = totalInstalled > 0 ? states.reduce((sum, s) => sum + s.runCount, 0) / totalInstalled : 0;
    const totalExecutionTime = states.reduce((sum, s) => sum + (Date.now() - s.lastRun), 0);

    return {
      totalInstalled,
      totalRunning,
      totalErrors,
      averageRunCount,
      totalExecutionTime
    };
  }

  private generateAppletId(siteUrl: string, actionName: string): string {
    const domain = new URL(siteUrl).hostname;
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2);
    return `applet_${domain.replace(/[^a-zA-Z0-9]/g, '_')}_${actionName.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}_${random}`;
  }

  // Utility methods for external integration
  simulateAppletInstallation(siteUrl: string, actionName: string): AppletManifest {
    const permissions: AppletPermission[] = [
      { type: 'network', scope: siteUrl, description: 'Access to site resources', required: true },
      { type: 'storage', scope: 'local', description: 'Local data storage', required: false }
    ];

    const capabilities: AppletCapability[] = [
      { type: 'oracle_query', scope: 'general', description: 'Query oracle for information', required: false },
      { type: 'data_processing', scope: 'user_data', description: 'Process user data', required: false }
    ];

    return this.createAppletFromSiteAction(
      siteUrl,
      actionName,
      `Portable applet for ${actionName} from ${siteUrl}`,
      permissions,
      capabilities
    );
  }

  exportApplets(): string {
    const installedApplets = this.getInstalledApplets();
    const states = this.getAllAppletStates();
    
    return JSON.stringify({
      applets: installedApplets,
      states: states,
      exportedAt: Date.now()
    }, null, 2);
  }

  importApplets(data: string): boolean {
    try {
      const imported = JSON.parse(data);
      
      if (imported.applets) {
        imported.applets.forEach((manifest: AppletManifest) => {
          this.applets.set(manifest.id, manifest);
        });
      }
      
      if (imported.states) {
        imported.states.forEach((state: AppletState) => {
          this.states.set(state.id, state);
          if (state.status !== 'uninstalled') {
            this.installedApplets.add(state.id);
          }
        });
      }
      
      this.saveToStorage();
      return true;
    } catch (error) {
      console.error('Failed to import applets:', error);
      return false;
    }
  }
}

// Global applets manager instance
let globalAppletsManager: PortableAppletsManager | null = null;

export function getAppletsManager(): PortableAppletsManager {
  if (!globalAppletsManager) {
    globalAppletsManager = new PortableAppletsManager();
  }
  return globalAppletsManager;
}

// Convenience exports
export const appletsManager = {
  createFromSiteAction: (siteUrl: string, actionName: string, description: string, permissions: AppletPermission[], capabilities: AppletCapability[]) =>
    getAppletsManager().createAppletFromSiteAction(siteUrl, actionName, description, permissions, capabilities),
  install: (manifest: AppletManifest) => getAppletsManager().installApplet(manifest),
  execute: (appletId: string, input?: any) => getAppletsManager().executeApplet(appletId, input),
  uninstall: (appletId: string) => getAppletsManager().uninstallApplet(appletId),
  getInstalled: () => getAppletsManager().getInstalledApplets(),
  getState: (appletId: string) => getAppletsManager().getAppletState(appletId),
  getAllStates: () => getAppletsManager().getAllAppletStates(),
  getStats: () => getAppletsManager().getAppletStats(),
  simulateInstall: (siteUrl: string, actionName: string) => getAppletsManager().simulateAppletInstallation(siteUrl, actionName),
  export: () => getAppletsManager().exportApplets(),
  import: (data: string) => getAppletsManager().importApplets(data)
};
