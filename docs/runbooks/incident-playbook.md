---
title: Incident Playbook
---

# Incident Playbook

## Overview

This playbook provides step-by-step procedures for responding to critical incidents in the Mycelia system. It covers common scenarios, escalation procedures, and recovery steps.

## Incident Classification

### Severity Levels

- **P0 (Critical)**: System down, data loss, security breach
- **P1 (High)**: Major functionality impaired, significant user impact
- **P2 (Medium)**: Minor functionality issues, limited user impact
- **P3 (Low)**: Cosmetic issues, no user impact

### Response Times

- **P0**: Immediate response (within 15 minutes)
- **P1**: Response within 1 hour
- **P2**: Response within 4 hours
- **P3**: Response within 24 hours

## Incident Response Team

### Primary On-Call
- **Role**: First responder, initial assessment
- **Responsibilities**: Acknowledge incident, assess severity, begin mitigation

### Secondary On-Call
- **Role**: Backup responder, escalation point
- **Responsibilities**: Support primary, escalate if needed

### Incident Commander
- **Role**: Overall incident coordination
- **Responsibilities**: Coordinate response, communicate with stakeholders

### Subject Matter Experts
- **Role**: Technical specialists
- **Responsibilities**: Provide expertise, implement fixes

## Common Incident Scenarios

### 1. Peg Violation (P0)

**Symptoms:**
- BLOOM/BTC peg ratio incorrect
- Collateralization below 100%
- Mint guard failures

**Immediate Actions:**
1. **Stop all minting operations**
   ```bash
   # Disable minting via feature flags
   pnpm --filter @mycelia/feature-flags start -- --disable rewards_mainnet
   ```text

2. **Check collateralization**
   ```bash
   # Run diagnostics
   pnpm run diagnose
   ```text

3. **Verify reserves**
   ```bash
   # Check PoR attestations
   pnpm --filter @mycelia/attestations start -- --verify-latest
   ```text

**Investigation Steps:**
1. Check recent transactions for anomalies
2. Verify reserve feed accuracy
3. Review mint guard logs
4. Check for system compromises

**Recovery Steps:**
1. Fix collateralization issue
2. Re-enable minting with monitoring
3. Update procedures to prevent recurrence

### 2. Redemption System Failure (P1)

**Symptoms:**
- Redemption requests failing
- HTLC creation errors
- Bitcoin bridge connectivity issues

**Immediate Actions:**
1. **Check system status**
   ```bash
   # Check redemption service
   curl -f http://localhost:3000/ops/status.json
   ```text

2. **Review error logs**
   ```bash
   # Tail logs
   pnpm run ops:tail
   ```text

3. **Check Bitcoin bridge**
   ```bash
   # Test bridge connectivity
   pnpm --filter @mycelia/btc-bridge start -- --test-connectivity
   ```text

**Investigation Steps:**
1. Check Bitcoin network status
2. Verify HTLC parameters
3. Review rate limiting
4. Check operator key status

**Recovery Steps:**
1. Restart affected services
2. Clear rate limit queues
3. Verify Bitcoin connectivity
4. Test redemption flow

### 3. Proof of Reserves Failure (P1)

**Symptoms:**
- PoR attestations failing
- SPV feed unavailable
- Reserve verification errors

**Immediate Actions:**
1. **Check PoR status**
   ```bash
   # Run PoR diagnostics
   pnpm --filter @mycelia/proof-of-reserve start -- --check-status
   ```text

2. **Verify SPV feed**
   ```bash
   # Check SPV connectivity
   pnpm --filter @mycelia/proof-of-reserve start -- --check-spv
   ```text

3. **Fallback to static feed**
   ```bash
   # Enable static fallback
   export RESERVE_SATS=100000000000
   ```text

**Investigation Steps:**
1. Check Bitcoin node connectivity
2. Verify UTXO data accuracy
3. Review Merkle proof verification
4. Check header sync status

**Recovery Steps:**
1. Restart SPV feed
2. Re-sync headers
3. Verify UTXO data
4. Generate new attestation

### 4. Security Breach (P0)

**Symptoms:**
- Unauthorized access detected
- Key compromise suspected
- Unusual transaction patterns

**Immediate Actions:**
1. **Isolate affected systems**
   ```bash
   # Disable all external access
   pnpm --filter @mycelia/feature-flags start -- --disable-all
   ```text

2. **Rotate all keys**
   ```bash
   # Emergency key rotation
   pnpm --filter @mycelia/kms-local start -- --rotate-emergency
   ```text

3. **Preserve evidence**
   ```bash
   # Export logs
   pnpm run ops:tail > incident-logs-$(date +%Y%m%d-%H%M%S).json
   ```text

**Investigation Steps:**
1. Analyze access logs
2. Check for data exfiltration
3. Review key usage patterns
4. Assess impact scope

**Recovery Steps:**
1. Patch security vulnerabilities
2. Implement additional monitoring
3. Update security procedures
4. Conduct post-incident review

### 5. Performance Degradation (P2)

**Symptoms:**
- High latency
- SLO violations
- Resource exhaustion

**Immediate Actions:**
1. **Check SLO status**
   ```bash
   # Check SLO violations
   pnpm run ops:lint
   ```text

2. **Monitor resource usage**
   ```bash
   # Check system metrics
   pnpm --filter @mycelia/observability start -- --metrics
   ```text

3. **Scale resources**
   ```bash
   # Increase resource limits
   # (Implementation depends on deployment)
   ```text

**Investigation Steps:**
1. Analyze performance metrics
2. Check for resource bottlenecks
3. Review recent changes
4. Identify root cause

**Recovery Steps:**
1. Optimize performance bottlenecks
2. Scale resources
3. Implement caching
4. Update monitoring

## Escalation Procedures

### Level 1 Escalation
- **Trigger**: P0 incident, P1 not resolved in 1 hour
- **Action**: Notify incident commander
- **Communication**: Slack #incidents channel

### Level 2 Escalation
- **Trigger**: P0 not resolved in 2 hours, P1 not resolved in 4 hours
- **Action**: Notify management team
- **Communication**: Email to management list

### Level 3 Escalation
- **Trigger**: P0 not resolved in 4 hours
- **Action**: Notify executive team
- **Communication**: Phone call to CTO/CEO

## Communication Procedures

### Internal Communication
- **Slack**: #incidents channel for real-time updates
- **Email**: incident-response@mycelia.com for formal updates
- **Status Page**: Update public status page

### External Communication
- **Users**: Status page updates, email notifications
- **Partners**: Direct communication via established channels
- **Media**: Coordinate through PR team

### Communication Templates

#### Initial Incident Notification
```text
Subject: [P0/P1/P2/P3] Incident: [Brief Description]

Incident Details:
- Severity: [P0/P1/P2/P3]
- Start Time: [Timestamp]
- Affected Systems: [List]
- Impact: [Description]
- Status: [Investigating/Mitigating/Resolved]

Next Update: [Time]
```text

#### Status Update
```text
Subject: [P0/P1/P2/P3] Incident Update: [Brief Description]

Current Status: [Investigating/Mitigating/Resolved]
Progress: [Description of actions taken]
ETA: [Estimated resolution time]
Next Update: [Time]
```text

#### Resolution Notification
```text
Subject: [P0/P1/P2/P3] Incident Resolved: [Brief Description]

Resolution: [Description of fix]
Root Cause: [Brief description]
Prevention: [Steps to prevent recurrence]
Post-Incident Review: [Scheduled time]
```text

## Recovery Procedures

### System Recovery
1. **Verify system integrity**
   ```bash
   # Run full diagnostics
   pnpm run diagnose
   ```text

2. **Check all services**
   ```bash
   # Verify service health
   curl -f http://localhost:3000/health
   ```text

3. **Test critical paths**
   ```bash
   # Test redemption flow
   pnpm --filter @mycelia/redemption start -- --test-flow
   ```text

### Data Recovery
1. **Verify data integrity**
   ```bash
   # Check database consistency
   pnpm --filter @mycelia/shared-kernel start -- --verify-data
   ```text

2. **Restore from backup if needed**
   ```bash
   # Restore from latest backup
   # (Implementation depends on backup system)
   ```text

3. **Verify transaction history**
   ```bash
   # Check transaction logs
   pnpm --filter @mycelia/observability start -- --verify-transactions
   ```text

## Post-Incident Procedures

### Immediate Post-Incident (0-24 hours)
1. **Document incident**
   - Record timeline
   - Document actions taken
   - Note lessons learned

2. **Communicate resolution**
   - Update status page
   - Notify stakeholders
   - Send resolution notification

3. **Monitor system stability**
   - Watch for recurrence
   - Monitor SLOs
   - Check error rates

### Post-Incident Review (1-7 days)
1. **Conduct post-incident review**
   - Analyze root cause
   - Review response effectiveness
   - Identify improvement opportunities

2. **Update procedures**
   - Update playbooks
   - Improve monitoring
   - Enhance alerting

3. **Implement improvements**
   - Deploy fixes
   - Update documentation
   - Train team members

### Long-term Follow-up (1-4 weeks)
1. **Monitor improvements**
   - Track effectiveness
   - Measure success metrics
   - Adjust as needed

2. **Share learnings**
   - Document best practices
   - Share with team
   - Update training materials

## Tools and Resources

### Monitoring Tools
- **Observability**: `pnpm run ops:tail`
- **Diagnostics**: `pnpm run diagnose`
- **SLO Monitoring**: `pnpm run ops:lint`

### Communication Tools
- **Slack**: #incidents channel
- **Email**: incident-response@mycelia.com
- **Status Page**: https://status.mycelia.com

### Documentation
- **Runbooks**: `/docs/runbooks/`
- **API Docs**: `/docs/api-reference.md`
- **Architecture**: `/docs/architecture.md`

## Emergency Contacts

### On-Call Rotation
- **Primary**: [Name] - [Phone] - [Email]
- **Secondary**: [Name] - [Phone] - [Email]
- **Incident Commander**: [Name] - [Phone] - [Email]

### Escalation Contacts
- **CTO**: [Name] - [Phone] - [Email]
- **CEO**: [Name] - [Phone] - [Email]
- **Security Officer**: [Name] - [Phone] - [Email]

### External Contacts
- **Bitcoin Node Provider**: [Contact Info]
- **Infrastructure Provider**: [Contact Info]
- **Security Consultant**: [Contact Info]

## Training and Drills

### Regular Training
- **Monthly**: Incident response procedures
- **Quarterly**: Security incident handling
- **Annually**: Full system recovery

### Drills
- **Monthly**: P2 incident simulation
- **Quarterly**: P1 incident simulation
- **Annually**: P0 incident simulation

### Metrics
- **Response Time**: Average time to acknowledge
- **Resolution Time**: Average time to resolve
- **Communication**: Quality of updates
- **Recovery**: Success rate of recovery procedures

---

**Last Updated**: [Date]
**Version**: 1.0
**Next Review**: [Date]
