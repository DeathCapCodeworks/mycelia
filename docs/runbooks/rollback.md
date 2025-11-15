---
title: Rollback
---

# Rollback Procedures

## Overview

This document provides precise steps to revert the Mycelia system to a previous state in case of critical issues during or after mainnet launch.

## Rollback Types

### 1. Feature Flag Rollback
- **Scope**: Disable specific features
- **Time**: Immediate (seconds)
- **Impact**: Minimal user impact
- **Reversibility**: Fully reversible

### 2. Configuration Rollback
- **Scope**: Revert system configuration
- **Time**: Minutes
- **Impact**: Moderate user impact
- **Reversibility**: Fully reversible

### 3. Full System Rollback
- **Scope**: Revert entire system
- **Time**: Hours
- **Impact**: Significant user impact
- **Reversibility**: Complex reversal

## Emergency Rollback Triggers

### Automatic Triggers
- **SLO Violations**: Critical SLO breaches
- **Security Incidents**: Security breaches or compromises
- **System Failures**: Complete system failures
- **Data Corruption**: Data integrity issues

### Manual Triggers
- **Executive Decision**: Management decision
- **Community Request**: Significant community concern
- **Regulatory Issues**: Regulatory compliance issues
- **Technical Issues**: Critical technical problems

## Rollback Procedures

### 1. Feature Flag Rollback

#### BTC Mainnet Redemption Pause
```bash
# Immediate pause
mycelia-launchctl pause redemption

# Verify pause
mycelia-launchctl status
```text

**Steps:**
1. **Execute pause command**
   ```bash
   mycelia-launchctl pause redemption
   ```text

2. **Verify flag status**
   ```bash
   # Check feature flag status
   curl -f http://localhost:3000/api/feature-flags/btc_mainnet_redemption
   ```text

3. **Update status page**
   - Update status page to reflect pause
   - Notify users of temporary suspension
   - Provide estimated resolution time

4. **Monitor system**
   - Monitor system stability
   - Check error rates
   - Verify user impact

#### Resume Redemption
```bash
# Resume redemption
mycelia-launchctl resume redemption

# Verify resume
mycelia-launchctl status
```text

### 2. Configuration Rollback

#### Genesis Configuration Rollback
```bash
# Backup current configuration
cp -r ./release/mainnet ./release/mainnet-backup-$(date +%Y%m%d-%H%M%S)

# Restore previous configuration
cp -r ./release/mainnet-previous ./release/mainnet

# Verify configuration
pnpm run release:verify
```text

**Steps:**
1. **Backup current state**
   ```bash
   # Create backup of current state
   cp -r ./release/mainnet ./release/mainnet-backup-$(date +%Y%m%d-%H%M%S)
   ```text

2. **Restore previous configuration**
   ```bash
   # Restore from backup
   cp -r ./release/mainnet-previous ./release/mainnet
   ```text

3. **Verify configuration**
   ```bash
   # Run verification
   pnpm run release:verify
   ```text

4. **Deploy configuration**
   ```bash
   # Deploy new configuration
   pnpm run release:publish
   ```text

### 3. Full System Rollback

#### Complete System Rollback
```bash
# Stop all services
systemctl stop mycelia-*

# Restore from backup
tar -xzf ./backups/system-backup-$(date +%Y%m%d).tar.gz -C /

# Restart services
systemctl start mycelia-*

# Verify system
pnpm run diagnose
```text

**Steps:**
1. **Stop all services**
   ```bash
   # Stop all Mycelia services
   systemctl stop mycelia-*
   ```text

2. **Restore from backup**
   ```bash
   # Restore system from backup
   tar -xzf ./backups/system-backup-$(date +%Y%m%d).tar.gz -C /
   ```text

3. **Restart services**
   ```bash
   # Start all services
   systemctl start mycelia-*
   ```text

4. **Verify system**
   ```bash
   # Run diagnostics
   pnpm run diagnose
   ```text

## Rollback Verification

### 1. System Health Check
```bash
# Run comprehensive diagnostics
pnpm run diagnose

# Check SLO compliance
pnpm run ops:lint

# Verify system status
curl -f http://localhost:3000/ops/status.json
```text

### 2. Feature Verification
```bash
# Check feature flags
mycelia-launchctl status

# Verify PoR attestation
mycelia-attest verify ./release/mainnet/por.json

# Test critical paths
pnpm --filter @mycelia/redemption start -- --test-flow
```text

### 3. User Impact Assessment
- **Check user feedback**
- **Monitor support tickets**
- **Review community channels**
- **Analyze system metrics**

## Communication Procedures

### 1. Internal Communication
- **Slack**: #incidents channel
- **Email**: incident-response@mycelia.com
- **Phone**: Emergency hotline

### 2. External Communication
- **Status Page**: Update with rollback status
- **Community**: Announce rollback and reason
- **Partners**: Notify affected partners
- **Media**: Press release if necessary

### 3. Communication Templates

#### Rollback Announcement
```text
Subject: [URGENT] System Rollback - [Reason]

We are implementing an emergency rollback due to [reason].

Impact: [Description of impact]
Duration: [Estimated duration]
Next Update: [Time]

We apologize for any inconvenience and will provide updates as they become available.
```text

#### Rollback Resolution
```text
Subject: Rollback Complete - System Restored

The system rollback has been completed successfully.

Status: System restored to previous state
Impact: [Description of impact]
Next Steps: [Description of next steps]

Thank you for your patience during this incident.
```text

## Rollback Recovery

### 1. Immediate Recovery
- **System restoration**
- **Service verification**
- **User communication**
- **Monitoring activation**

### 2. Root Cause Analysis
- **Investigate cause**
- **Document findings**
- **Implement fixes**
- **Test solutions**

### 3. Forward Recovery
- **Deploy fixes**
- **Re-enable features**
- **Monitor stability**
- **Update procedures**

## Rollback Testing

### 1. Regular Testing
- **Monthly rollback drills**
- **Quarterly full system tests**
- **Annual disaster recovery tests**
- **Continuous monitoring**

### 2. Test Scenarios
- **Feature flag rollback**
- **Configuration rollback**
- **Full system rollback**
- **Partial system rollback**

### 3. Test Results
- **Document test results**
- **Identify improvements**
- **Update procedures**
- **Train team members**

## Rollback Metrics

### 1. Key Metrics
- **Rollback time**: Time to complete rollback
- **Recovery time**: Time to restore service
- **User impact**: Number of affected users
- **System downtime**: Total downtime duration

### 2. Success Criteria
- **Rollback completed within SLA**
- **No data loss**
- **Minimal user impact**
- **Successful recovery**

### 3. Improvement Tracking
- **Rollback frequency**
- **Recovery time trends**
- **User satisfaction**
- **System stability**

## Emergency Contacts

### Rollback Team
- **Rollback Commander**: [Name] - [Phone] - [Email]
- **Technical Lead**: [Name] - [Phone] - [Email]
- **Operations Lead**: [Name] - [Phone] - [Email]
- **Communication Lead**: [Name] - [Phone] - [Email]

### Escalation Contacts
- **Management**: [Name] - [Phone] - [Email]
- **Legal**: [Name] - [Phone] - [Email]
- **PR**: [Name] - [Phone] - [Email]

### External Contacts
- **Infrastructure Provider**: [Contact Info]
- **Security Consultant**: [Contact Info]
- **Legal Counsel**: [Contact Info]

## Tools and Resources

### Rollback Tools
- **Launch Controller**: `mycelia-launchctl`
- **Feature Flags**: `mycelia-feature-flags`
- **Diagnostics**: `pnpm run diagnose`
- **Monitoring**: `pnpm run ops:tail`

### Documentation
- **Rollback Procedures**: This document
- **Incident Response**: [Incident Playbook](/runbooks/incident-playbook)
- **System Architecture**: [Architecture Docs](/docs/architecture)
- **Emergency Contacts**: [Contact List](/docs/contacts)

---

**Last Updated**: [Date]
**Version**: 1.0
**Next Review**: [Date]
