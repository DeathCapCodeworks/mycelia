---
title: P 0001 Enable Btc Mainnet Redemption
---

# Governance Proposal P-0001: Enable Bitcoin Mainnet Redemption

## Proposal Summary

**Proposal ID**: P-0001  
**Title**: Enable Bitcoin Mainnet Redemption  
**Type**: Feature Flag Change  
**Risk Level**: High  
**Status**: Draft  

## Motivation

Enable Bitcoin mainnet redemption functionality to allow BLOOM token holders to redeem their tokens for Bitcoin at the fixed peg rate of 10 BLOOM = 1 BTC.

## Current State

- **Feature Flag**: `btc_mainnet_redemption` is currently **disabled**
- **Testnet Status**: Bitcoin testnet redemption is fully functional
- **Infrastructure**: HTLC infrastructure is ready for mainnet deployment
- **Security**: All security audits completed and passed

## Proposed Changes

### Feature Flag Delta
```json
{
  "btc_mainnet_redemption": {
    "from": false,
    "to": true,
    "requires_governance": true
  }
}
```text

### Technical Implementation
1. **HTLC Deployment**: Deploy Hash Time Locked Contracts to Bitcoin mainnet
2. **Operator Keys**: Activate mainnet operator keys for redemption signing
3. **Monitoring**: Enable mainnet-specific monitoring and alerting
4. **Rate Limits**: Implement mainnet rate limiting (10 redemptions per hour per address)

### Risk Assessment

#### High Risk Factors
- **Bitcoin Network**: Exposure to Bitcoin mainnet network risks
- **HTLC Complexity**: Hash Time Locked Contract implementation risks
- **Key Management**: Mainnet operator key security risks
- **Liquidity**: Potential liquidity constraints during high redemption periods

#### Mitigation Strategies
- **Gradual Rollout**: Start with small redemption limits
- **Monitoring**: Real-time monitoring of redemption patterns
- **Emergency Procedures**: Immediate pause capability via governance
- **Audit Trail**: Complete audit trail of all redemption operations

## Rollback Plan

### Immediate Rollback
If critical issues are detected:
1. **Emergency Pause**: Disable `btc_mainnet_redemption` flag immediately
2. **Communication**: Notify users of temporary suspension
3. **Investigation**: Investigate root cause of issues
4. **Resolution**: Implement fixes before re-enabling

### Rollback Procedure
```bash
# Emergency rollback command
mycelia-launchctl pause redemption
```text

## Implementation Timeline

### Phase 1: Preparation (T-7 days)
- [ ] Final security review
- [ ] Operator key ceremony
- [ ] HTLC contract deployment
- [ ] Monitoring setup

### Phase 2: Activation (T-0)
- [ ] Governance vote passes
- [ ] Feature flag enabled
- [ ] Mainnet redemption live
- [ ] Monitoring active

### Phase 3: Monitoring (T+24 hours)
- [ ] 24-hour monitoring period
- [ ] Performance review
- [ ] User feedback collection
- [ ] Stability assessment

## Success Criteria

### Technical Success
- [ ] HTLC contracts deployed successfully
- [ ] Redemption flow working without errors
- [ ] Monitoring systems operational
- [ ] No critical security incidents

### Operational Success
- [ ] Redemption processing within SLA (24 hours)
- [ ] User satisfaction > 95%
- [ ] No system downtime
- [ ] All SLOs met

## Failure Scenarios

### Scenario 1: HTLC Failure
- **Detection**: HTLC creation/claim failures
- **Response**: Immediate pause and investigation
- **Recovery**: Fix HTLC implementation and redeploy

### Scenario 2: Key Compromise
- **Detection**: Unauthorized redemption signatures
- **Response**: Emergency key rotation and pause
- **Recovery**: New key ceremony and system restart

### Scenario 3: Liquidity Crisis
- **Detection**: Insufficient Bitcoin reserves
- **Response**: Pause redemptions and emergency funding
- **Recovery**: Secure additional reserves and resume

## Voting Parameters

- **Voting Period**: 7 days
- **Quorum**: 10% of total BLOOM supply
- **Threshold**: Simple majority (50% + 1)
- **Voting Power**: Proportional to BLOOM holdings

## Communication Plan

### Pre-Vote
- [ ] Community announcement
- [ ] Technical documentation update
- [ ] Risk disclosure
- [ ] Q&A session

### Post-Vote
- [ ] Implementation announcement
- [ ] User guide publication
- [ ] Support channel setup
- [ ] Monitoring dashboard

## References

- [Bitcoin Testnet Redemption Documentation](/tokenomics/redemption-bitcoin-testnet)
- [Proof of Reserves Documentation](/tokenomics/proof-of-reserves)
- [Security Overview](/security-overview)
- [Incident Playbook](/runbooks/incident-playbook)

## Contact Information

- **Proposal Author**: Technical Committee
- **Technical Lead**: [Name] - [Email]
- **Security Lead**: [Name] - [Email]
- **Operations Lead**: [Name] - [Email]

---

**Last Updated**: [Date]  
**Version**: 1.0  
**Next Review**: [Date]
