# Governance Simulator

This document describes Mycelia's governance simulator for safely testing and validating governance proposals before execution.

## Overview

The Governance Simulator provides a safe environment to test governance proposals, particularly P-0001 (Bitcoin mainnet redemption), with comprehensive health checks and risk assessment. It ensures proposals can be executed safely by validating system invariants and providing rollback procedures.

## Architecture

### Simulation Pipeline

1. **Proposal Loading:** Load proposal details and flag changes
2. **Health Checks:** Validate system health metrics
3. **Risk Assessment:** Evaluate proposal risks and impacts
4. **Dry Run:** Simulate flag changes in sandbox environment
5. **Validation:** Verify system stability after changes
6. **Rollback Plan:** Generate rollback procedures if needed

### Health Checklist

The simulator validates critical system metrics:

- **PoR Age:** Proof of Reserves age ≤ 60 minutes
- **Diagnostics:** System diagnostics score ≥ 0.9
- **SLOs:** Service Level Objectives ≥ 0.9
- **Rollouts:** Feature rollout stability ≥ 0.95

## API Reference

### Basic Usage

```typescript
import { GovernanceSimulator } from '@mycelia/governance-ui';

const simulator = new GovernanceSimulator();

// Run simulation for P-0001
const result = await simulator.simulate('P-0001');

console.log('Simulation success:', result.success);
console.log('Can proceed:', result.canProceed);
console.log('Health checks:', result.healthChecklist);
```

### Simulation Result

```typescript
interface SimulationResult {
  success: boolean;                    // Overall simulation success
  healthChecklist: HealthChecklist;    // Health check results
  affectedFlags: string[];            // Flags that would be changed
  rollbackPlan: string[];             // Rollback procedures
  riskAssessment: string;             // Risk evaluation
  canProceed: boolean;                // Whether execution is safe
}
```

### Health Checklist

```typescript
interface HealthChecklist {
  porAge: { status: 'pass' | 'fail'; value: number; threshold: number };
  diagnostics: { status: 'pass' | 'fail'; value: number; threshold: number };
  slos: { status: 'pass' | 'fail'; value: number; threshold: number };
  rollouts: { status: 'pass' | 'fail'; value: number; threshold: number };
}
```

## P-0001 Proposal Details

### Proposal Overview

**Title:** Enable Bitcoin Mainnet Redemption
**ID:** P-0001
**Status:** Active
**Risk Level:** Critical

### Flag Changes

The proposal enables three critical flags:

1. **btc_mainnet_redemption**
   - **Current:** Disabled
   - **Proposed:** Enabled
   - **Impact:** Critical
   - **Description:** Enable Bitcoin mainnet redemption functionality

2. **btc_redemption_rate_limit**
   - **Current:** Disabled
   - **Proposed:** Enabled
   - **Impact:** High
   - **Description:** Enable rate limiting for Bitcoin redemptions

3. **btc_redemption_2fa**
   - **Current:** Disabled
   - **Proposed:** Enabled
   - **Impact:** Medium
   - **Description:** Require 2FA for Bitcoin redemptions above threshold

### Risk Assessment

**Critical Risk Factors:**
- Direct Bitcoin mainnet exposure
- High-value transactions
- Irreversible operations
- Regulatory implications

**Mitigation Strategies:**
- Comprehensive health checks
- Rate limiting implementation
- 2FA requirements
- Rollback procedures

## Health Check Implementation

### PoR Age Check

```typescript
async function checkPoRAge(): Promise<HealthCheckResult> {
  const porData = await fetchProofOfReserves();
  const ageMinutes = (Date.now() - porData.timestamp) / (1000 * 60);
  
  return {
    status: ageMinutes <= 60 ? 'pass' : 'fail',
    value: ageMinutes,
    threshold: 60
  };
}
```

### Diagnostics Check

```typescript
async function checkDiagnostics(): Promise<HealthCheckResult> {
  const diagnostics = await runSystemDiagnostics();
  const score = diagnostics.overallScore;
  
  return {
    status: score >= 0.9 ? 'pass' : 'fail',
    value: score,
    threshold: 0.9
  };
}
```

### SLO Check

```typescript
async function checkSLOs(): Promise<HealthCheckResult> {
  const sloMetrics = await getSLOMetrics();
  const score = sloMetrics.overallCompliance;
  
  return {
    status: score >= 0.9 ? 'pass' : 'fail',
    value: score,
    threshold: 0.9
  };
}
```

### Rollout Check

```typescript
async function checkRollouts(): Promise<HealthCheckResult> {
  const rolloutStatus = await getRolloutStatus();
  const stability = rolloutStatus.stabilityScore;
  
  return {
    status: stability >= 0.95 ? 'pass' : 'fail',
    value: stability,
    threshold: 0.95
  };
}
```

## Rollback Procedures

### Automatic Rollback

If health checks fail after flag changes:

1. **Immediate Response:**
   - Disable `btc_mainnet_redemption` flag
   - Pause all pending Bitcoin redemptions
   - Notify users of temporary suspension

2. **Investigation:**
   - Review system logs and metrics
   - Identify root cause of issues
   - Assess impact on users

3. **Resolution:**
   - Fix identified issues
   - Implement additional safeguards
   - Re-enable with enhanced monitoring

### Manual Rollback

If automatic rollback fails:

1. **Emergency Procedures:**
   - Manual flag disable via admin interface
   - Direct database updates if necessary
   - Emergency communication to users

2. **Recovery Steps:**
   - System health verification
   - Data integrity checks
   - Service restoration

## Vote Package Generation

### Vote Package Structure

```typescript
interface VotePackage {
  proposalId: string;        // Proposal identifier
  vote: 'for' | 'against' | 'abstain';  // Vote choice
  timestamp: number;        // Vote timestamp
  signature: string;        // Cryptographic signature
  voterDid: string;        // Voter decentralized identifier
}
```

### Signature Generation

```typescript
async function generateVoteSignature(
  proposalId: string,
  vote: string,
  voterDid: string,
  timestamp: number
): Promise<string> {
  const message = `${proposalId}:${vote}:${voterDid}:${timestamp}`;
  const signature = await crypto.subtle.sign(
    'ECDSA',
    privateKey,
    new TextEncoder().encode(message)
  );
  
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
```

## Integration Examples

### React Component

```tsx
import React, { useState, useEffect } from 'react';
import { GovernanceSimulator } from '@mycelia/governance-ui';

const GovernanceDashboard: React.FC = () => {
  const [simulationResult, setSimulationResult] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);

  const runSimulation = async () => {
    setIsSimulating(true);
    try {
      const result = await GovernanceSimulator.simulate('P-0001');
      setSimulationResult(result);
    } catch (error) {
      console.error('Simulation failed:', error);
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div>
      <h2>P-0001 Simulation</h2>
      <button onClick={runSimulation} disabled={isSimulating}>
        {isSimulating ? 'Running...' : 'Run Simulation'}
      </button>
      
      {simulationResult && (
        <div>
          <h3>Results</h3>
          <p>Success: {simulationResult.success ? 'Yes' : 'No'}</p>
          <p>Can Proceed: {simulationResult.canProceed ? 'Yes' : 'No'}</p>
          
          <h4>Health Checks</h4>
          {Object.entries(simulationResult.healthChecklist).map(([key, check]) => (
            <div key={key}>
              {key}: {check.status} ({check.value}/{check.threshold})
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
```

### CLI Integration

```bash
# Run governance simulation
npx @mycelia/governance-ui simulate P-0001

# Generate vote package
npx @mycelia/governance-ui vote --proposal P-0001 --choice for --did did:mycelia:voter123

# Check health status
npx @mycelia/governance-ui health-check
```

## Monitoring and Alerting

### Health Monitoring

```typescript
// Continuous health monitoring
setInterval(async () => {
  const health = await checkSystemHealth();
  
  if (health.porAge.status === 'fail') {
    alert('PoR age exceeded threshold');
  }
  
  if (health.diagnostics.status === 'fail') {
    alert('Diagnostics score below threshold');
  }
}, 60000); // Check every minute
```

### Alert Configuration

```yaml
# alerting.yml
alerts:
  - name: PoR Age Exceeded
    condition: por_age > 60
    severity: critical
    action: pause_redemptions
    
  - name: Diagnostics Failed
    condition: diagnostics_score < 0.9
    severity: warning
    action: notify_team
    
  - name: SLO Violation
    condition: slo_compliance < 0.9
    severity: critical
    action: emergency_response
```

## Testing

### Unit Tests

```typescript
import { GovernanceSimulator } from '@mycelia/governance-ui';

describe('Governance Simulator', () => {
  test('should validate health checks', async () => {
    const result = await GovernanceSimulator.simulate('P-0001');
    
    expect(result.healthChecklist).toBeDefined();
    expect(result.healthChecklist.porAge).toBeDefined();
    expect(result.healthChecklist.diagnostics).toBeDefined();
  });

  test('should generate rollback plan', async () => {
    const result = await GovernanceSimulator.simulate('P-0001');
    
    expect(result.rollbackPlan).toBeDefined();
    expect(result.rollbackPlan.length).toBeGreaterThan(0);
  });
});
```

### Integration Tests

```typescript
test('should handle health check failures', async () => {
  // Mock failing health checks
  jest.spyOn(healthChecker, 'checkPoRAge').mockResolvedValue({
    status: 'fail',
    value: 120,
    threshold: 60
  });

  const result = await GovernanceSimulator.simulate('P-0001');
  
  expect(result.success).toBe(false);
  expect(result.canProceed).toBe(false);
});
```

## Security Considerations

### Access Control

- **Admin Access:** Only authorized administrators can run simulations
- **Audit Logging:** All simulation runs are logged
- **Signature Verification:** Vote packages require valid signatures

### Data Protection

- **Sandbox Environment:** Simulations run in isolated environment
- **No Real Data:** No actual transactions are processed
- **Secure Storage:** Vote packages stored securely

## Troubleshooting

### Common Issues

**"Health checks failing"**
- Check system metrics and logs
- Verify threshold configurations
- Review system maintenance schedules

**"Simulation timeout"**
- Check system performance
- Review simulation complexity
- Optimize health check procedures

**"Vote package invalid"**
- Verify signature generation
- Check voter DID format
- Review timestamp accuracy

## Future Enhancements

### Planned Features

1. **Multiple Proposals:** Support for various proposal types
2. **Advanced Analytics:** Detailed impact analysis
3. **Automated Testing:** Continuous simulation runs
4. **Integration APIs:** External system integration

### Performance Improvements

1. **Parallel Processing:** Concurrent health checks
2. **Caching:** Cache health check results
3. **Optimization:** Faster simulation execution
4. **Monitoring:** Real-time health dashboards

## Support

For governance simulator issues:
- Check system health metrics
- Review simulation logs
- Verify proposal configurations
- Contact the governance team
- Submit issues to the Mycelia repository
