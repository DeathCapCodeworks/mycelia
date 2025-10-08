import { Request, Response } from 'express';
import { featureFlags } from '@mycelia/web4-feature-flags';
import { observability } from '@mycelia/observability';

export interface ServiceHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastCheck: number;
  responseTime?: number;
  error?: string;
}

export interface StatusResponse {
  timestamp: number;
  version: string;
  environment: string;
  featureFlags: {
    summary: {
      total: number;
      enabled: number;
      disabled: number;
    };
    flags: Array<{
      id: string;
      name: string;
      enabled: boolean;
      category: string;
      riskLevel: string;
    }>;
  };
  services: ServiceHealth[];
  diagnostics: {
    envelopeEncryptDecrypt: boolean;
    directoryIndexing: boolean;
    radioSfuLoopback: boolean;
    databoxShred: boolean;
    evmProviderResponses: boolean;
  };
}

// Mock service health checks
const checkServiceHealth = async (serviceName: string, endpoint: string): Promise<ServiceHealth> => {
  const startTime = Date.now();
  try {
    // Mock health check - in real implementation, this would make actual HTTP requests
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100)); // Simulate network delay
    
    const responseTime = Date.now() - startTime;
    const isHealthy = Math.random() > 0.1; // 90% chance of being healthy
    
    return {
      name: serviceName,
      status: isHealthy ? 'healthy' : 'degraded',
      lastCheck: Date.now(),
      responseTime,
      error: isHealthy ? undefined : 'Mock service degradation'
    };
  } catch (error) {
    return {
      name: serviceName,
      status: 'unhealthy',
      lastCheck: Date.now(),
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

// Mock diagnostic checks
const runDiagnostics = async () => {
  return {
    envelopeEncryptDecrypt: Math.random() > 0.05, // 95% success rate
    directoryIndexing: Math.random() > 0.1, // 90% success rate
    radioSfuLoopback: Math.random() > 0.15, // 85% success rate
    databoxShred: Math.random() > 0.05, // 95% success rate
    evmProviderResponses: Math.random() > 0.1 // 90% success rate
  };
};

export const statusHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const startTime = Date.now();
    
    // Get feature flags summary
    const allFlags = featureFlags.getAllFlags();
    const enabledFlags = allFlags.filter(flag => flag.enabled);
    const disabledFlags = allFlags.filter(flag => !flag.enabled);
    
    const flagsSummary = {
      total: allFlags.length,
      enabled: enabledFlags.length,
      disabled: disabledFlags.length
    };
    
    const flagsDetails = allFlags.map(flag => ({
      id: flag.id,
      name: flag.name,
      enabled: flag.enabled,
      category: flag.category,
      riskLevel: flag.riskLevel
    }));
    
    // Check service health
    const services = await Promise.all([
      checkServiceHealth('public-directory', 'http://localhost:3001/health'),
      checkServiceHealth('radio-sfu', 'http://localhost:3002/health'),
      checkServiceHealth('ipfs', 'http://localhost:5001/api/v0/version'),
      checkServiceHealth('attestation-indexer', 'http://localhost:3004/health')
    ]);
    
    // Run diagnostics
    const diagnostics = await runDiagnostics();
    
    const statusResponse: StatusResponse = {
      timestamp: Date.now(),
      version: process.env.npm_package_version || '0.1.0',
      environment: process.env.NODE_ENV || 'development',
      featureFlags: {
        summary: flagsSummary,
        flags: flagsDetails
      },
      services,
      diagnostics
    };
    
    const responseTime = Date.now() - startTime;
    
    // Log status check
    observability.logEvent('status_check_completed', {
      responseTime,
      servicesChecked: services.length,
      healthyServices: services.filter(s => s.status === 'healthy').length,
      totalFlags: flagsSummary.total,
      enabledFlags: flagsSummary.enabled
    });
    
    res.status(200).json(statusResponse);
  } catch (error) {
    console.error('Status check failed:', error);
    
    observability.logEvent('status_check_failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    res.status(500).json({
      timestamp: Date.now(),
      error: 'Status check failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
