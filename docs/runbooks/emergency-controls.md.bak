# Emergency Controls

## Overview

This document describes the emergency controls available in the Mycelia system, including feature flags, kill switches, and safety mechanisms. These controls are designed to provide immediate response capabilities during critical incidents.

## Control Categories

### 1. Ops-Controlled Flags
These flags can be changed by operations team without governance approval:

- **`rewards_slow_mode`**: Enable slow mode for rewards processing
- **`oracle_read_scope_max`**: Maximum Oracle read scope limit (numeric cap)

### 2. Governance-Controlled Flags
These flags require governance approval to change:

- **`btc_mainnet_redemption`**: Bitcoin mainnet redemption functionality
- **`staking_slashing`**: Staking slashing penalties
- **`rewards_mainnet`**: Mainnet rewards distribution
- **`governance_v1`**: Governance v1 features

## Emergency Controls

### 1. Redemption Kill Switch

#### Purpose
Immediately pause Bitcoin mainnet redemption functionality in case of security incidents or system issues.

#### Control
```bash
# Pause redemption
mycelia-launchctl pause redemption

# Resume redemption (requires governance token)
mycelia-launchctl resume redemption
```

#### Verification
```bash
# Check flag status
mycelia-flags status

# Verify system response
curl -f http://localhost:3000/api/feature-flags/btc_mainnet_redemption
```

#### Rollback
```bash
# Resume redemption
mycelia-launchctl resume redemption
```

#### Who Can Use
- **Primary**: Operations team
- **Secondary**: Incident response team
- **Emergency**: Any authorized personnel with governance token

### 2. Rewards Slow Mode

#### Purpose
Enable slow mode for rewards processing to reduce system load during high-traffic periods or performance issues.

#### Control
```bash
# Enable slow mode
mycelia-launchctl slow rewards

# Disable slow mode
mycelia-flags disable rewards_slow_mode
```

#### Verification
```bash
# Check flag status
mycelia-flags status

# Monitor rewards processing
pnpm run ops:tail | grep "rewards"
```

#### Rollback
```bash
# Disable slow mode
mycelia-flags disable rewards_slow_mode
```

#### Who Can Use
- **Primary**: Operations team
- **Secondary**: Performance team
- **Emergency**: Any authorized personnel

### 3. Oracle Read Scope Cap

#### Purpose
Limit Oracle read scope in emergencies to prevent resource exhaustion or security issues.

#### Control
```bash
# Cap Oracle read scope
mycelia-launchctl cap oracle 0

# Set specific limit
mycelia-launchctl cap oracle 100
```

#### Verification
```bash
# Check flag status
mycelia-flags status

# Monitor Oracle usage
pnpm run ops:tail | grep "oracle"
```

#### Rollback
```bash
# Remove cap
mycelia-launchctl cap oracle 1000
```

#### Who Can Use
- **Primary**: Operations team
- **Secondary**: Security team
- **Emergency**: Any authorized personnel

## Emergency Procedures

### 1. Security Incident Response

#### Immediate Actions
1. **Assess Threat Level**
   - Determine if immediate action is required
   - Identify affected systems
   - Evaluate potential impact

2. **Activate Emergency Controls**
   ```bash
   # Pause redemption if Bitcoin-related
   mycelia-launchctl pause redemption
   
   # Enable slow mode for performance
   mycelia-launchctl slow rewards
   
   # Cap Oracle if resource-related
   mycelia-launchctl cap oracle 0
   ```

3. **Notify Stakeholders**
   - Alert incident response team
   - Update status page
   - Notify community

#### Investigation Phase
1. **Gather Evidence**
   - Collect system logs
   - Analyze monitoring data
   - Document incident timeline

2. **Root Cause Analysis**
   - Identify root cause
   - Assess impact scope
   - Develop remediation plan

#### Recovery Phase
1. **Implement Fixes**
   - Deploy security patches
   - Update system configuration
   - Test remediation

2. **Restore Services**
   ```bash
   # Resume normal operations
   mycelia-launchctl resume redemption
   mycelia-flags disable rewards_slow_mode
   mycelia-launchctl cap oracle 1000
   ```

### 2. Performance Incident Response

#### Immediate Actions
1. **Enable Slow Mode**
   ```bash
   mycelia-launchctl slow rewards
   ```

2. **Cap Resource Usage**
   ```bash
   mycelia-launchctl cap oracle 100
   ```

3. **Monitor System**
   ```bash
   pnpm run ops:tail
   pnpm run ops:lint
   ```

#### Investigation Phase
1. **Analyze Performance Metrics**
   - Check SLO compliance
   - Review resource usage
   - Identify bottlenecks

2. **Optimize System**
   - Scale resources
   - Optimize code
   - Update configuration

#### Recovery Phase
1. **Gradual Restoration**
   ```bash
   # Gradually increase limits
   mycelia-launchctl cap oracle 500
   mycelia-launchctl cap oracle 1000
   
   # Disable slow mode
   mycelia-flags disable rewards_slow_mode
   ```

### 3. Governance Emergency

#### Immediate Actions
1. **Pause Critical Operations**
   ```bash
   mycelia-launchctl pause redemption
   ```

2. **Notify Governance**
   - Alert governance committee
   - Schedule emergency vote
   - Prepare proposal

#### Investigation Phase
1. **Assess Governance Issue**
   - Review proposal details
   - Evaluate community impact
   - Consult legal team

2. **Develop Response**
   - Prepare counter-proposal
   - Engage community
   - Update documentation

#### Recovery Phase
1. **Implement Governance Decision**
   - Execute approved changes
   - Update system configuration
   - Resume operations

## Monitoring and Alerting

### 1. Real-time Monitoring
```bash
# Monitor system status
pnpm run ops:tail

# Check SLO compliance
pnpm run ops:lint

# Verify feature flags
mycelia-flags status
```

### 2. Alert Conditions
- **SLO Violations**: Critical SLO breaches
- **Security Incidents**: Unauthorized access or attacks
- **Performance Issues**: System slowdown or failures
- **Governance Issues**: Critical governance problems

### 3. Alert Response
- **Immediate**: Activate emergency controls
- **Investigation**: Root cause analysis
- **Recovery**: System restoration
- **Communication**: Stakeholder notification

## Testing and Validation

### 1. Regular Testing
- **Monthly**: Test emergency controls
- **Quarterly**: Full emergency response drill
- **Annually**: Comprehensive disaster recovery test

### 2. Test Scenarios
- **Security Incident**: Simulate security breach
- **Performance Issue**: Simulate system overload
- **Governance Emergency**: Simulate governance crisis

### 3. Test Validation
- **Control Effectiveness**: Verify controls work as expected
- **Response Time**: Measure time to activate controls
- **Recovery Time**: Measure time to restore services

## Documentation and Training

### 1. Documentation Updates
- **Regular Reviews**: Monthly documentation reviews
- **Incident Updates**: Update after each incident
- **Procedure Refinement**: Continuous improvement

### 2. Team Training
- **Emergency Procedures**: Regular training on emergency procedures
- **Control Usage**: Training on emergency control usage
- **Incident Response**: Incident response team training

### 3. Knowledge Sharing
- **Post-Incident Reviews**: Share lessons learned
- **Best Practices**: Document best practices
- **Community Updates**: Keep community informed

## Contact Information

### Emergency Contacts
- **24/7 Hotline**: [Phone Number]
- **Incident Response**: [Email]
- **Security Team**: [Email]
- **Operations Team**: [Email]

### Escalation Contacts
- **Management**: [Name] - [Phone] - [Email]
- **Legal**: [Name] - [Phone] - [Email]
- **PR**: [Name] - [Phone] - [Email]

### External Contacts
- **Infrastructure Provider**: [Contact Info]
- **Security Consultant**: [Contact Info]
- **Legal Counsel**: [Contact Info]

## Tools and Resources

### Emergency Tools
- **Launch Controller**: `mycelia-launchctl`
- **Feature Flags**: `mycelia-flags`
- **Monitoring**: `pnpm run ops:tail`
- **Diagnostics**: `pnpm run diagnose`

### Documentation
- **Emergency Procedures**: This document
- **Incident Response**: [Incident Playbook](/runbooks/incident-playbook)
- **Rollback Procedures**: [Rollback Guide](/runbooks/rollback)
- **System Architecture**: [Architecture Docs](/docs/architecture)

---

**Last Updated**: [Date]
**Version**: 1.0
**Next Review**: [Date]
