# Launch Day Checklist

## Overview

This checklist provides step-by-step procedures for executing the Mycelia mainnet launch. Follow this checklist in order and verify each step before proceeding to the next.

## Pre-Launch Verification (T-24 hours)

### 1. Final System Checks
- [ ] **Run release verification**
  ```bash
  pnpm run release:verify
  ```
  - All checks must pass (exit code 0)
  - No critical failures allowed

- [ ] **Verify PoR attestation**
  ```bash
  mycelia-attest verify ./release/mainnet/por.json
  ```
  - Attestation must be valid and fresh (< 24 hours)
  - Signature verification must pass

- [ ] **Check feature flags**
  ```bash
  mycelia-launchctl status
  ```
  - Verify mainnet defaults are set
  - `btc_mainnet_redemption` must be disabled

### 2. Team Readiness
- [ ] **On-call rotation confirmed**
  - Primary on-call available
  - Secondary on-call available
  - Incident commander available

- [ ] **Communication channels ready**
  - Slack #launch channel active
  - Status page updated
  - Community channels monitored

- [ ] **Emergency contacts verified**
  - All emergency contacts reachable
  - Escalation procedures confirmed
  - Rollback procedures reviewed

### 3. Infrastructure Readiness
- [ ] **Monitoring systems active**
  - All dashboards operational
  - Alerting configured and tested
  - SLO monitoring active

- [ ] **Backup systems ready**
  - Database backups current
  - Configuration backups current
  - Rollback procedures tested

## Launch Execution (T-0)

### 1. Final Pre-Launch (T-1 hour)
- [ ] **Run go/no-go gate**
  ```bash
  mycelia-launchctl go
  ```
  - All systems must be green
  - No blocking issues

- [ ] **Final PoR attestation**
  ```bash
  mycelia-attest sign --out ./release/mainnet/por.json
  ```
  - Generate fresh attestation
  - Verify signature and freshness

- [ ] **Team standup**
  - Brief team on launch procedures
  - Confirm all team members ready
  - Review emergency procedures

### 2. Launch Execution (T-0)
- [ ] **Tag release**
  ```bash
  git tag -a v1.0.0 -m "Mycelia Mainnet Launch"
  git push origin v1.0.0
  ```
  - Tag with semantic version
  - Push to remote repository

- [ ] **Publish documentation**
  ```bash
  pnpm run release:publish
  ```
  - Build and deploy docs
  - Update status page
  - Publish attestations

- [ ] **Activate mainnet**
  - Deploy genesis configuration
  - Start validator nodes
  - Enable monitoring

- [ ] **Share status link**
  - Post status page URL to community
  - Update social media
  - Notify partners

### 3. Post-Launch Monitoring (T+1 hour)
- [ ] **System health check**
  - Verify all services operational
  - Check SLO compliance
  - Monitor error rates

- [ ] **User feedback monitoring**
  - Monitor community channels
  - Check support tickets
  - Review user reports

- [ ] **Performance monitoring**
  - Check response times
  - Monitor transaction volume
  - Verify peg stability

## Governance Activation (T+24 hours)

### 1. Governance Proposal P-0001
- [ ] **Open BTC mainnet redemption proposal**
  - Publish proposal P-0001
  - Start 7-day voting period
  - Monitor community discussion

- [ ] **Community communication**
  - Announce proposal to community
  - Provide technical documentation
  - Host Q&A session

### 2. Monitoring and Support
- [ ] **24-hour monitoring**
  - Continuous system monitoring
  - User support coverage
  - Incident response readiness

- [ ] **Performance review**
  - Analyze system performance
  - Review user feedback
  - Document lessons learned

## Success Criteria

### Technical Success
- [ ] All systems operational
- [ ] No critical incidents
- [ ] SLOs met
- [ ] User satisfaction > 95%

### Operational Success
- [ ] Launch completed on schedule
- [ ] All team members available
- [ ] Communication effective
- [ ] Documentation updated

### Community Success
- [ ] Positive community response
- [ ] User adoption metrics
- [ ] Partner engagement
- [ ] Media coverage

## Failure Scenarios

### Scenario 1: System Failure
- **Detection**: System monitoring alerts
- **Response**: Immediate investigation
- **Recovery**: Follow incident response procedures
- **Communication**: Update status page and community

### Scenario 2: PoR Attestation Failure
- **Detection**: Attestation verification fails
- **Response**: Generate new attestation
- **Recovery**: Re-run verification
- **Communication**: Transparent communication about delay

### Scenario 3: Governance Issues
- **Detection**: Governance proposal issues
- **Response**: Address community concerns
- **Recovery**: Revise proposal if needed
- **Communication**: Clear communication about changes

## Emergency Procedures

### Immediate Rollback
If critical issues are detected:
1. **Pause operations**
   ```bash
   mycelia-launchctl pause redemption
   ```

2. **Notify team**
   - Alert incident response team
   - Update status page
   - Notify community

3. **Investigate**
   - Root cause analysis
   - Impact assessment
   - Recovery planning

### Communication Plan
- **Internal**: Slack #launch channel
- **External**: Status page updates
- **Community**: Social media and forums
- **Media**: Press release if needed

## Post-Launch Activities

### Immediate (T+24 hours)
- [ ] **Incident-free report**
  - Document launch success
  - Share with community
  - Update stakeholders

- [ ] **Performance analysis**
  - Analyze system metrics
  - Review user feedback
  - Document lessons learned

### Short-term (T+7 days)
- [ ] **Governance proposal results**
  - Analyze voting results
  - Implement approved changes
  - Update documentation

- [ ] **User feedback review**
  - Collect user feedback
  - Address common issues
  - Update user guides

### Long-term (T+30 days)
- [ ] **Launch retrospective**
  - Conduct post-launch review
  - Identify improvements
  - Update procedures

- [ ] **Success metrics**
  - Measure launch success
  - Track user adoption
  - Report to stakeholders

## Contact Information

### Launch Team
- **Launch Commander**: [Name] - [Phone] - [Email]
- **Technical Lead**: [Name] - [Phone] - [Email]
- **Operations Lead**: [Name] - [Phone] - [Email]
- **Community Lead**: [Name] - [Phone] - [Email]

### Emergency Contacts
- **24/7 Hotline**: [Phone Number]
- **Incident Response**: [Email]
- **Executive Escalation**: [Email]

### External Contacts
- **Infrastructure Provider**: [Contact Info]
- **Security Consultant**: [Contact Info]
- **Legal Counsel**: [Contact Info]

---

**Last Updated**: [Date]
**Version**: 1.0
**Next Review**: [Date]
