# P-0001: Enable Bitcoin Mainnet Redemption

**Proposal ID**: P-0001  
**Title**: Enable Bitcoin Mainnet Redemption  
**Status**: Draft  
**Category**: Core Infrastructure  

## Motivation

Enable the Bitcoin mainnet redemption feature to allow BLOOM token holders to redeem their tokens for Bitcoin at the established peg rate of **10 BLOOM = 1 BTC**.

## Current State

- Bitcoin redemption is currently **disabled** via feature flag `btc_mainnet_redemption`
- Testnet redemption has been validated and tested
- PoR attestations are fresh and verified
- Reserve verification mechanisms are operational

## Proposed Changes

1. **Enable Feature Flag**: Set `btc_mainnet_redemption = true`
2. **Activate Redemption Contract**: Deploy mainnet redemption contract
3. **Update Documentation**: Publish redemption procedures
4. **Monitor Peg Stability**: Enhanced monitoring during initial redemption period

## Risk Assessment

### High Risk Factors
- **Peg Stability**: Large redemptions could affect peg maintenance
- **Reserve Management**: Requires careful reserve allocation
- **Market Impact**: Initial redemption volume unknown

### Mitigation Strategies
- **Gradual Rollout**: Start with limited redemption capacity
- **Monitoring**: Real-time peg and reserve monitoring
- **Emergency Stop**: Immediate flag disable capability

## Rollback Plan

If issues arise:
1. **Immediate**: Disable `btc_mainnet_redemption` flag
2. **Contract**: Pause redemption contract
3. **Communication**: Notify community of temporary suspension
4. **Analysis**: Investigate and address root cause

## Flag Delta

```json
{
  "btc_mainnet_redemption": {
    "from": false,
    "to": true,
    "reason": "Enable Bitcoin redemption after community approval"
  }
}
```

## Dry-run Steps

1. **Testnet Validation**: Complete redemption flow on testnet
2. **Reserve Simulation**: Simulate various redemption scenarios
3. **Monitoring Setup**: Verify monitoring and alerting systems
4. **Documentation Review**: Ensure all procedures are documented

## Implementation Timeline

- **Phase 1**: Community vote and approval
- **Phase 2**: Contract deployment and testing
- **Phase 3**: Gradual rollout with monitoring
- **Phase 4**: Full activation

## Community Input Required

- Redemption limits and thresholds
- Monitoring and alerting preferences
- Rollout timeline preferences
- Emergency response procedures

---

**Vote Required**: Yes  
**Quorum**: 60% of voting power  
**Duration**: 7 days  
**Implementation**: After successful vote
