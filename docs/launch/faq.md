---
title: Frequently Asked Questions
---

# Frequently Asked Questions

## General Questions

### What is Mycelia?
Mycelia is a decentralized blockchain ecosystem that combines a hard-pegged token (BLOOM), decentralized applications, and community governance. The system is built on a foundation of transparency, security, and user empowerment.

### What makes Mycelia different?
Mycelia features a hard protocol-level peg of 10 BLOOM = 1 BTC, backed by locked Bitcoin reserves. This peg is enforced programmatically and cannot be changed without creating a new chain. The system also includes comprehensive governance, transparent operations, and a complete ecosystem of decentralized applications.

### Is Mycelia open source?
Yes, all Mycelia code is open source and available for public review and audit. This ensures complete transparency and allows the community to verify the system's security and functionality.

## Peg and Tokenomics

### How does the 10 BLOOM = 1 BTC peg work?
The peg is enforced at the protocol level through smart contracts and system logic. Each BLOOM token is backed by exactly 0.1 BTC worth of Bitcoin reserves. The system automatically prevents minting if it would break the peg and ensures all redemptions are honored at the exact rate.

### Can the peg ratio change?
No, the peg ratio is immutable and hardcoded into the protocol. Changing the peg would require creating a new chain with a new chain ID. This ensures long-term stability and predictability.

### How are Bitcoin reserves managed?
Bitcoin reserves are managed through a multi-signature system with regular audits and attestations. The reserves are continuously monitored and verified through SPV (Simplified Payment Verification) technology.

### What happens if Bitcoin reserves are insufficient?
The system includes automatic safeguards that prevent minting if it would break the peg. If reserves become insufficient, minting is automatically halted until reserves are restored.

## Redemption

### Can I redeem BLOOM for Bitcoin?
Bitcoin mainnet redemption is currently disabled and requires governance approval through [Proposal P-0001](/governance/proposals/P-0001-enable-btc-mainnet-redemption). Testnet redemption is fully functional for testing purposes.

### How does redemption work?
When enabled, redemption works through Hash Time Locked Contracts (HTLCs) on the Bitcoin network. Users can redeem BLOOM tokens for Bitcoin at the exact peg rate of 10 BLOOM = 1 BTC.

### What are the redemption limits?
Redemption limits are set to prevent abuse and ensure system stability. The exact limits will be determined through governance and may be adjusted based on system capacity and security considerations.

### How long does redemption take?
Redemption processing time depends on Bitcoin network conditions and system load. The target is to process redemptions within 24 hours under normal conditions.

## Staking and Validation

### How does staking work?
Staking allows users to delegate BLOOM tokens to validators in exchange for rewards. Validators are responsible for network consensus and receive rewards for their participation.

### What are the staking rewards?
Staking rewards are distributed based on the amount staked and validator performance. The exact reward rates are determined by the protocol and may be adjusted through governance.

### What is slashing?
Slashing is a penalty mechanism that reduces a validator's stake for malicious behavior or extended downtime. This ensures network security and validator accountability.

### How do I become a validator?
Becoming a validator requires meeting technical requirements, staking a minimum amount of BLOOM tokens, and following the validator guidelines. See our [staking documentation](/tokenomics/staking-preview) for details.

## Governance

### How does governance work?
Mycelia uses a multi-layered governance system with community councils, technical committees, and treasury oversight. Decisions are made through transparent voting processes with BLOOM token holders having proportional voting power.

### Who can participate in governance?
Any BLOOM token holder can participate in governance by voting on proposals. Token holders can also delegate their voting power to representatives.

### How are proposals created?
Proposals can be created by any community member who meets the requirements, including community support thresholds and technical review processes.

### What types of decisions can be made through governance?
Governance can make decisions about protocol parameters, feature flags, treasury allocations, and other system-wide changes. Some changes, like the peg ratio, are immutable and cannot be changed through governance.

## Privacy and Security

### Is Mycelia private?
Mycelia prioritizes user privacy while maintaining transparency for system operations. User transactions are pseudonymous, and personal data is not collected or stored.

### How is Mycelia secured?
Mycelia uses multiple layers of security including cryptographic signatures, multi-signature systems, regular audits, and comprehensive threat modeling. The system is designed with security-first principles.

### What is the bug bounty program?
Mycelia operates a bug bounty program to encourage responsible disclosure of security vulnerabilities. See our [bug bounty page](/security/bug-bounty) for details on scope, rewards, and reporting procedures.

### How are funds secured?
Funds are secured through multiple mechanisms including hardware security modules, multi-signature systems, regular audits, and comprehensive monitoring. The system is designed to prevent single points of failure.

## Technical Questions

### What blockchains does Mycelia support?
Mycelia supports multiple blockchains including Ethereum (EVM), Solana, and Bitcoin. The system is designed to be extensible to support additional blockchains in the future.

### How does SPV verification work?
SPV (Simplified Payment Verification) allows the system to verify Bitcoin transactions without running a full Bitcoin node. This enables efficient and secure verification of Bitcoin reserves.

### What is the block time?
Mycelia has a 1-second block time, providing fast transaction confirmation and high throughput.

### How does the Oracle Agent work?
The Oracle Agent uses AI and machine learning to process and analyze data from various sources. It provides reliable data feeds for decentralized applications while maintaining privacy and security.

## Rollback and Emergency Procedures

### What is the rollback policy?
Mycelia has comprehensive rollback procedures for emergency situations. These procedures are designed to minimize user impact while ensuring system security and stability.

### How are emergencies handled?
The system includes multiple emergency controls including feature flags, kill switches, and automated monitoring. Emergency procedures are documented and regularly tested.

### What happens if there's a security incident?
Security incidents are handled through a comprehensive incident response plan that includes immediate containment, investigation, and recovery procedures. The community is kept informed throughout the process.

## Development and Integration

### How do I integrate with Mycelia?
Mycelia provides a comprehensive Developer SDK that supports multiple programming languages and frameworks. See our [developer documentation](/developer-guide) for integration guides and examples.

### What programming languages are supported?
The Mycelia SDK supports TypeScript/JavaScript, Python, and other popular programming languages. The system is designed to be language-agnostic.

### Are there any fees?
Mycelia uses a gas-based fee system similar to other blockchain networks. Fees are used to prevent spam and ensure network security.

### How do I get support?
Support is available through multiple channels including documentation, community forums, and direct support. See our [support page](/support) for contact information.

## Future Development

### What's coming next?
Mycelia has a comprehensive roadmap that includes additional blockchain integrations, enhanced governance mechanisms, and expanded application ecosystem. See our [roadmap](/roadmap) for details.

### How can I contribute?
Contributions are welcome through multiple channels including code contributions, governance participation, and community building. See our [contribution guidelines](/contribute) for details.

### Is there a token sale?
Mycelia does not have a token sale. BLOOM tokens are distributed through mining, staking rewards, and other ecosystem activities.

### How is the project funded?
The project is funded through a treasury of $20,000,000,000 backed by cash donations. The treasury is managed transparently through governance and regular audits.

---

**Last Updated**: [Date]  
**Version**: 1.0  
**Next Review**: [Date]
