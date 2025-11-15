---
title: Payouts
---

# Radio Payouts

Radio Payouts is a proof-of-distribution system that calculates provisional BLOOM token distributions based on content contribution and bandwidth sharing. It provides a fair and transparent mechanism for rewarding users who contribute to the Radio v0 ecosystem.

## Overview

The Radio Payouts system tracks content distribution and calculates rewards based on:

- **Uploader Contributions**: Content creators earn for their uploads
- **Seeder Contributions**: Users earn for sharing bandwidth
- **Distribution Volume**: Amount of content distributed
- **Time Factors**: Duration and consistency of contribution

## Architecture

### Core Components

#### Distribution Receipts
Cryptographic proof of content distribution:
```typescript
interface DistributionReceipt {
  roomId: string;
  trackId: string;
  contributors: {
    did: string;
    bytesOut: number;
  }[];
  timestamp: number;
}
```text

#### Provisional Payouts
Calculated BLOOM distributions:
```typescript
interface ProvisionalPayout {
  did: string;
  bloomAmount: number;
}
```text

#### Payouts Calculator
Off-chain calculator that processes receipts and generates payout calculations.

### Proof of Distribution

The system implements a proof-of-distribution mechanism that:

1. **Tracks Distribution**: Monitors content sharing and bandwidth usage
2. **Generates Receipts**: Creates cryptographic proof of distribution
3. **Calculates Rewards**: Determines BLOOM distribution based on contributions
4. **Provides Transparency**: All calculations are visible and verifiable

## Distribution Tracking

### Content Distribution Metrics
- **Bytes Transferred**: Amount of data distributed
- **Number of Recipients**: How many users received content
- **Duration**: How long content was distributed
- **Quality**: Quality of content distributed

### Bandwidth Sharing
- **Upload Bandwidth**: Bandwidth used for uploading content
- **Download Bandwidth**: Bandwidth used for downloading content
- **Relay Bandwidth**: Bandwidth used for relaying content to others
- **Storage Bandwidth**: Bandwidth used for storing content

### Time-based Factors
- **Consistency**: Regular contribution over time
- **Peak Hours**: Contribution during high-demand periods
- **Duration**: Long-term commitment to the network
- **Availability**: Uptime and reliability

## Payout Calculation

### Base Formula
The payout calculation uses a weighted formula:

```text
BLOOM = (BytesOut × BaseRate × TimeFactor × QualityFactor) / TotalContributions
```text

Where:
- **BytesOut**: Amount of data distributed
- **BaseRate**: Base BLOOM per byte rate
- **TimeFactor**: Multiplier for time-based contributions
- **QualityFactor**: Multiplier for content quality
- **TotalContributions**: Total contributions across all users

### Contribution Types

#### Uploader Contributions
Content creators earn for:
- **Initial Upload**: First-time content upload
- **Re-uploads**: Subsequent uploads of the same content
- **Quality Maintenance**: Maintaining high-quality content
- **Metadata**: Providing rich metadata and descriptions

#### Seeder Contributions
Users earn for:
- **Bandwidth Sharing**: Sharing unused bandwidth
- **Content Relay**: Relaying content to other users
- **Storage**: Providing storage for content
- **Availability**: Keeping content available

### Payout Factors

#### Base Rate
- **Current Rate**: 0.000001 BLOOM per byte (demo rate)
- **Adjustment**: Rate can be adjusted based on network conditions
- **Governance**: Rate changes require governance approval

#### Time Factors
- **Consistency Bonus**: 1.2x multiplier for consistent contributors
- **Peak Hours**: 1.5x multiplier during high-demand periods
- **Long-term**: 1.1x multiplier for long-term contributors

#### Quality Factors
- **High Quality**: 1.3x multiplier for high-quality content
- **Metadata Rich**: 1.1x multiplier for rich metadata
- **Popular Content**: 1.2x multiplier for popular content

## Implementation

### Receipt Generation
Distribution receipts are generated automatically by the SFU server:

```typescript
// Mock receipt generation
const receipt: DistributionReceipt = {
  roomId: room.roomId,
  trackId: track.trackId,
  contributors: [
    { did: track.contributorDid, bytesOut: bytesTransferred }
  ],
  timestamp: Date.now()
};
```text

### Payout Calculation
The calculator processes receipts and generates payouts:

```typescript
import { RadioPayoutsCalculator } from '@mycelia/radio-payouts';

const calculator = new RadioPayoutsCalculator();
const payouts = calculator.calculateProvisionalShares(receipts);
```text

### Demo Mode
The system includes a demo mode for testing:

- **Feature Flag**: `radio_payouts_demo` enables demo calculations
- **Mock Data**: Uses simulated distribution data
- **Provisional Only**: Calculations are provisional and not final
- **Governance Note**: Mainnet payouts require governance approval

## API Integration

### SFU Integration
The SFU server emits distribution receipts:

```typescript
// Emit receipts every 10 seconds
setInterval(() => {
  rooms.forEach(room => {
    room.activeTracks.forEach(track => {
      const receipt = generateDistributionReceipt(room, track);
      distributionReceipts.push(receipt);
    });
  });
}, 10000);
```text

### Payouts Calculator
The calculator processes receipts and generates payouts:

```typescript
const calculator = new RadioPayoutsCalculator();
const payouts = calculator.calculateProvisionalShares(receipts);
```text

### UI Integration
The Radio UX displays provisional payouts:

```typescript
// Update payouts every 5 seconds
setInterval(() => {
  const payouts = calculator.calculateProvisionalShares(mockReceipts);
  setProvisionalPayouts(payouts);
}, 5000);
```text

## Transparency and Verification

### Public Calculations
All payout calculations are:
- **Transparent**: Calculations are visible to all users
- **Verifiable**: Users can verify their own calculations
- **Auditable**: All calculations are logged and auditable
- **Open Source**: Calculation logic is open source

### Receipt Verification
Users can verify their distribution receipts:
- **Cryptographic Proof**: Receipts are cryptographically signed
- **Timestamp Verification**: Timestamps are verifiable
- **Contribution Proof**: Proof of actual contribution
- **Audit Trail**: Complete audit trail of all activities

### Payout History
Users can view their payout history:
- **Historical Data**: Complete history of all payouts
- **Contribution Tracking**: Track contributions over time
- **Payout Trends**: See payout trends and patterns
- **Export Data**: Export payout data for external analysis

## Governance and Policy

### Demo Limitations
The current implementation is for demo purposes only:

- **Provisional Calculations**: All calculations are provisional
- **No Mainnet Payouts**: No actual BLOOM tokens are distributed
- **Governance Required**: Mainnet payouts require governance approval
- **Policy Development**: Policies are still being developed

### Future Governance
Mainnet payouts will require:

- **Governance Approval**: Community approval of payout policies
- **Rate Setting**: Community setting of payout rates
- **Policy Updates**: Community updates to payout policies
- **Dispute Resolution**: Community resolution of disputes

### Policy Considerations
Payout policies must consider:

- **Fairness**: Fair distribution of rewards
- **Sustainability**: Long-term sustainability of the system
- **Incentives**: Proper incentives for contribution
- **Abuse Prevention**: Prevention of gaming and abuse

## Monitoring and Analytics

### Metrics Tracking
The system tracks various metrics:

- **Distribution Volume**: Total content distributed
- **Contributor Count**: Number of active contributors
- **Payout Amounts**: Total BLOOM distributed
- **System Health**: Overall system health metrics

### Analytics Dashboard
Users can view analytics:

- **Personal Stats**: Individual contribution statistics
- **Network Stats**: Overall network statistics
- **Payout Projections**: Projected future payouts
- **Trend Analysis**: Analysis of trends over time

### Reporting
Comprehensive reporting capabilities:

- **Contribution Reports**: Detailed contribution reports
- **Payout Reports**: Detailed payout reports
- **Audit Reports**: Audit and compliance reports
- **Performance Reports**: System performance reports

## Best Practices

### For Contributors
- **Consistent Contribution**: Maintain consistent contribution over time
- **Quality Content**: Provide high-quality content
- **Reliable Service**: Maintain reliable service availability
- **Community Engagement**: Engage with the community

### For Developers
- **Accurate Tracking**: Ensure accurate distribution tracking
- **Fair Calculations**: Implement fair payout calculations
- **Transparent Reporting**: Provide transparent reporting
- **Security**: Implement proper security measures

### For Governance
- **Fair Policies**: Develop fair and sustainable policies
- **Community Input**: Seek community input on policies
- **Regular Review**: Regularly review and update policies
- **Transparency**: Maintain transparency in decision-making

## Troubleshooting

### Common Issues

**Missing Receipts**
- Check SFU server connectivity
- Verify receipt generation logic
- Monitor distribution tracking
- Review error logs

**Calculation Errors**
- Verify receipt data integrity
- Check calculation logic
- Monitor for edge cases
- Review error handling

**Payout Discrepancies**
- Verify contribution data
- Check calculation parameters
- Review payout history
- Contact support if needed

### Debug Mode
Enable debug logging for troubleshooting:

```bash
DEBUG=radio-payouts:* npm start
```text

## Future Enhancements

### Advanced Features
- **Dynamic Rates**: Dynamic payout rates based on network conditions
- **Quality Metrics**: Advanced quality metrics for content
- **Reputation System**: User reputation system for payouts
- **Cross-Chain**: Cross-chain payout distribution

### Integration
- **Blockchain Integration**: On-chain payout distribution
- **DeFi Integration**: Integration with DeFi protocols
- **NFT Integration**: Integration with NFT systems
- **DAO Integration**: Integration with DAO governance

### Analytics
- **Advanced Analytics**: Advanced analytics and reporting
- **Machine Learning**: ML-based payout optimization
- **Predictive Modeling**: Predictive modeling for payouts
- **Real-time Dashboards**: Real-time analytics dashboards
