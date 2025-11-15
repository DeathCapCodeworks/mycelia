# Rollout Playbook

This document outlines the progressive rollout process for Web4 features, including percentage-based rollouts, canary deployments, and rollback procedures.

## Overview

The rollout system provides:
- Percentage-based feature rollouts
- Canary deployments with allowlists
- Gradual rollout progression
- Automatic rollback capabilities
- Real-time monitoring and control

## Rollout Strategy

### 1% → 10% → 50% → 100% Progression

#### Phase 1: 1% Rollout
- **Duration**: 24-48 hours
- **Monitoring**: Critical metrics only
- **Rollback**: Immediate if issues detected
- **Success Criteria**: No critical errors, basic functionality works

#### Phase 2: 10% Rollout
- **Duration**: 3-5 days
- **Monitoring**: All metrics, user feedback
- **Rollback**: Within 1 hour if issues detected
- **Success Criteria**: Performance targets met, user satisfaction ≥ 4.0

#### Phase 3: 50% Rollout
- **Duration**: 1-2 weeks
- **Monitoring**: Full observability, A/B testing
- **Rollback**: Within 30 minutes if issues detected
- **Success Criteria**: All acceptance criteria met, completion rate ≥ 70%

#### Phase 4: 100% Rollout
- **Duration**: Permanent
- **Monitoring**: Continuous monitoring
- **Rollback**: Emergency rollback available
- **Success Criteria**: All exit criteria met, retention rate ≥ 60%

## Feature Flags

### Rollout Flags
- `intent_bar_v1_rollout`: Intent Bar rollout percentage
- `applets_v1_rollout`: Portable Applets rollout percentage
- `live_captions_rollout`: Live Captions rollout percentage
- `av1_encode_rollout`: AV1 encoding rollout percentage
- `av1_decode_rollout`: AV1 decoding rollout percentage

### Canary Flags
- `canary_mode`: Enable/disable canary mode
- `canary_allowlist`: List of users in canary

## CLI Commands

### Set Rollout Percentage
```bash
# Set Intent Bar rollout to 10%
mycelia-flags rollout intent_bar_v1_rollout 10

# Set Applets rollout to 25%
mycelia-flags rollout applets_v1_rollout 25

# Set Live Captions rollout to 50%
mycelia-flags rollout live_captions_rollout 50
```

### Canary Management
```bash
# Enable canary mode
mycelia-flags canary on

# Add user to canary allowlist
mycelia-flags canary-add user123

# Remove user from canary allowlist
mycelia-flags canary-remove user123

# List canary allowlist
mycelia-flags canary-list

# Disable canary mode
mycelia-flags canary off
```

### Status Monitoring
```bash
# Check current rollout status
mycelia-flags status

# Get specific flag status
mycelia-flags get intent_bar_v1_rollout
```

## Rollout Process

### Step 1: Preparation
1. **Feature Complete**: All acceptance criteria met
2. **Testing Complete**: Unit, integration, and E2E tests pass
3. **Performance Validated**: Benchmarks meet SLO targets
4. **Documentation Updated**: User guides and API docs ready
5. **Monitoring Setup**: Observability and alerting configured

### Step 2: Canary Deployment
1. **Enable Canary Mode**: `mycelia-flags canary on`
2. **Add Trusted Users**: Add 5-10 trusted users to allowlist
3. **Monitor Metrics**: Watch for 24-48 hours
4. **Collect Feedback**: Gather user feedback and metrics
5. **Validate Success**: Ensure no critical issues

### Step 3: Gradual Rollout
1. **1% Rollout**: Set rollout percentage to 1%
2. **Monitor Critical Metrics**: Watch for errors and performance
3. **24-48 Hour Wait**: Allow time for data collection
4. **10% Rollout**: Increase to 10% if successful
5. **Continue Progression**: Follow 1% → 10% → 50% → 100%

### Step 4: Full Deployment
1. **100% Rollout**: Set rollout percentage to 100%
2. **Continuous Monitoring**: Monitor all metrics
3. **User Support**: Provide support for any issues
4. **Success Validation**: Confirm all exit criteria met

## Rollback Procedures

### Immediate Rollback
```bash
# Rollback to 0% (disable feature)
mycelia-flags rollout intent_bar_v1_rollout 0

# Disable canary mode
mycelia-flags canary off
```

### Gradual Rollback
```bash
# Reduce rollout percentage
mycelia-flags rollout intent_bar_v1_rollout 25

# Remove users from canary
mycelia-flags canary-remove user123
```

### Emergency Rollback
1. **Identify Issue**: Determine root cause
2. **Assess Impact**: Evaluate user impact
3. **Execute Rollback**: Use immediate rollback commands
4. **Notify Team**: Alert development team
5. **Investigate**: Root cause analysis
6. **Fix Issue**: Address underlying problem
7. **Re-deploy**: Resume rollout after fix

## Monitoring and Metrics

### Key Metrics
- **Error Rate**: Should be < 1%
- **Performance**: Should meet SLO targets
- **User Satisfaction**: Should be ≥ 4.0/5.0
- **Completion Rate**: Should be ≥ 70%
- **Retention Rate**: Should be ≥ 60%

### Alerting Thresholds
- **Critical**: Error rate > 5%
- **Warning**: Error rate > 2%
- **Info**: Performance degradation > 20%

### Status Endpoints
- `/status.json`: Real-time rollout status
- `/ops/status.json`: Operational metrics
- `/health`: Health check endpoint

## User Experience

### Rollout Notification
Users see a banner when features are rolled out:
```
🎯 New Feature Available
Intent Bar is now available for 10% of users.
```

### Feature Discovery
- **Progressive Disclosure**: Features appear gradually
- **User Education**: Tooltips and help text
- **Feedback Collection**: Easy feedback mechanisms

### Graceful Degradation
- **Fallback Behavior**: Features degrade gracefully
- **Error Handling**: Clear error messages
- **Performance**: Maintains acceptable performance

## Best Practices

### Rollout Planning
1. **Start Small**: Begin with 1% rollout
2. **Monitor Closely**: Watch metrics during rollout
3. **Be Patient**: Allow time for data collection
4. **Have Rollback Plan**: Always be ready to rollback

### Communication
1. **Internal Updates**: Keep team informed
2. **User Communication**: Clear feature announcements
3. **Status Updates**: Regular progress reports
4. **Issue Communication**: Transparent about problems

### Risk Management
1. **Feature Flags**: Use flags for quick rollback
2. **Monitoring**: Comprehensive observability
3. **Testing**: Thorough testing before rollout
4. **Documentation**: Clear procedures and runbooks

## Troubleshooting

### Rollout Not Working
1. Check feature flag configuration
2. Verify user hash calculation
3. Check canary allowlist
4. Validate rollout percentage

### Performance Issues
1. Monitor system resources
2. Check for bottlenecks
3. Verify fallback behavior
4. Consider gradual rollback

### User Complaints
1. Collect detailed feedback
2. Identify common issues
3. Prioritize fixes
4. Communicate resolution timeline

## Future Improvements

- **Machine Learning**: Predictive rollout optimization
- **A/B Testing**: Integrated experimentation
- **Real-time Control**: Dynamic rollout adjustment
- **Automated Rollback**: AI-driven rollback decisions
