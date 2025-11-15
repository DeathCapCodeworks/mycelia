---
title: Bug Bounty Program
---

# Bug Bounty Program

## Overview

Mycelia operates a comprehensive bug bounty program to encourage responsible disclosure of security vulnerabilities. We value the security research community and are committed to working with researchers to improve the security of our platform.

## Program Scope

### In Scope
- **Core Protocol**: BLOOM token, peg mechanism, redemption system
- **Smart Contracts**: All deployed smart contracts on supported networks
- **Web Applications**: Official websites and web applications
- **API Endpoints**: Public API endpoints and services
- **Mobile Applications**: Official mobile applications
- **Infrastructure**: Public-facing infrastructure components

### Out of Scope
- **Social Engineering**: Phishing, social engineering attacks
- **Physical Security**: Physical access to facilities or hardware
- **Third-Party Services**: Services not directly controlled by Mycelia
- **Denial of Service**: DoS attacks that don't lead to data exposure
- **Spam**: Spam or unsolicited messages
- **Low-Impact Issues**: Issues with minimal security impact

## Vulnerability Categories

### Critical (P0)
- **Remote Code Execution**: Ability to execute arbitrary code
- **Privilege Escalation**: Gaining unauthorized elevated privileges
- **Data Breach**: Unauthorized access to sensitive data
- **Financial Impact**: Direct financial loss or theft

### High (P1)
- **Authentication Bypass**: Circumventing authentication mechanisms
- **Authorization Issues**: Unauthorized access to resources
- **Data Manipulation**: Unauthorized modification of data
- **System Compromise**: Compromising system integrity

### Medium (P2)
- **Information Disclosure**: Leakage of sensitive information
- **Cross-Site Scripting**: XSS vulnerabilities
- **Cross-Site Request Forgery**: CSRF vulnerabilities
- **Injection Attacks**: SQL injection, command injection

### Low (P3)
- **Information Leakage**: Minor information disclosure
- **Configuration Issues**: Misconfigurations with limited impact
- **UI/UX Issues**: Security-related user interface issues

## Rewards Table

| Severity | Reward Range | Response Time | Resolution Time |
|----------|-------------|---------------|-----------------|
| **Critical** | $10,000 - $50,000 | 24 hours | 7 days |
| **High** | $5,000 - $25,000 | 48 hours | 14 days |
| **Medium** | $1,000 - $10,000 | 72 hours | 30 days |
| **Low** | $100 - $1,000 | 7 days | 90 days |

### Bonus Factors
- **Quality of Report**: Detailed, well-written reports
- **Reproducibility**: Clear steps to reproduce
- **Impact Assessment**: Accurate impact assessment
- **Fix Suggestions**: Helpful suggestions for fixes

## Reporting Process

### 1. Initial Report
Submit your vulnerability report through one of the following channels:

- **Email**: [security@mycelia.com](mailto:security@mycelia.com)
- **PGP Encrypted**: Use our PGP key for sensitive reports
- **Disclosure CLI**: Use our signed receipt system

### 2. Receipt Generation
For formal tracking, generate a signed receipt:

```bash
# Generate receipt for vulnerability report
mycelia-disclosure receipt --severity high --hash <sha256-of-report>

# Verify receipt
mycelia-disclosure verify ./receipts/receipt-001.json
```

### 3. Report Requirements
Your report should include:

- **Summary**: Brief description of the vulnerability
- **Steps to Reproduce**: Detailed steps to reproduce the issue
- **Impact**: Potential impact and risk assessment
- **Proof of Concept**: Code or screenshots demonstrating the issue
- **Suggested Fix**: Recommendations for addressing the issue

### 4. Response Timeline
- **Acknowledgment**: Within 24 hours of receipt
- **Initial Assessment**: Within 48 hours
- **Status Updates**: Weekly updates on progress
- **Resolution**: Within specified timeline based on severity

## PGP Key for Secure Communication

```
-----BEGIN PGP PUBLIC KEY BLOCK-----
Version: Mycelia Security

mQENBF4ABCABCADK...
-----END PGP PUBLIC KEY BLOCK-----
```

**Fingerprint**: `ABCD 1234 EFGH 5678 IJKL 9012 MNOP 3456`

## Receipt System

### Generating Receipts
Use our CLI tool to generate signed receipts for vulnerability reports:

```bash
# Install the disclosure CLI
npm install -g @mycelia/disclosure

# Generate receipt
mycelia-disclosure receipt --severity high --hash abc123def456

# List all receipts
mycelia-disclosure list

# Export receipts
mycelia-disclosure export --out ./receipts.jsonl
```

### Receipt Verification
All receipts are cryptographically signed and can be verified:

```bash
# Verify receipt signature
mycelia-disclosure verify ./receipts/receipt-001.json
```

### Receipt Benefits
- **Proof of Submission**: Cryptographic proof of report submission
- **Timestamp**: Accurate timestamp of when report was received
- **Severity Tracking**: Track severity classification
- **Audit Trail**: Complete audit trail for compliance

## CVE Credit

### Requesting CVE Credit
To request CVE credit for your vulnerability:

1. **Submit Report**: Submit your vulnerability report through normal channels
2. **Request CVE**: Request CVE assignment in your initial report
3. **Provide Details**: Include all necessary details for CVE assignment
4. **Coordinate**: Work with our team to coordinate CVE assignment

### CVE Requirements
- **Public Disclosure**: Vulnerability must be publicly disclosed
- **Technical Details**: Sufficient technical details for CVE assignment
- **Impact Assessment**: Clear impact assessment
- **Fix Availability**: Fix must be available at time of disclosure

## Responsible Disclosure

### Our Commitment
- **No Legal Action**: We will not pursue legal action against researchers
- **Recognition**: Public recognition for responsible disclosure
- **Fair Assessment**: Fair and timely assessment of reports
- **Transparent Process**: Transparent and open communication

### Your Commitment
- **Responsible Disclosure**: Allow us time to fix issues before disclosure
- **No Data Access**: Do not access or modify data beyond what's necessary
- **No Disruption**: Do not disrupt our services or users
- **Confidentiality**: Keep vulnerability details confidential until fixed

## Hall of Fame

We recognize researchers who have contributed to our security:

### 2024
- **Researcher Name** - Critical vulnerability in redemption system
- **Researcher Name** - High severity issue in governance mechanism
- **Researcher Name** - Medium severity issue in API endpoints

### 2023
- **Researcher Name** - Critical vulnerability in smart contracts
- **Researcher Name** - High severity issue in web application

## Legal and Compliance

### Legal Protection
- **Safe Harbor**: Researchers acting in good faith are protected
- **No Legal Action**: We will not pursue legal action for responsible disclosure
- **Compliance**: Program complies with applicable laws and regulations

### Terms and Conditions
- **Program Rules**: All participants must follow program rules
- **Scope Limitations**: Only test within the defined scope
- **Responsible Disclosure**: Follow responsible disclosure practices
- **No Compensation**: Participation does not guarantee compensation

## Contact Information

### Security Team
- **Email**: [security@mycelia.com](mailto:security@mycelia.com)
- **PGP**: Use provided PGP key for encrypted communication
- **Emergency**: [emergency@mycelia.com](mailto:emergency@mycelia.com)

### Program Management
- **Program Lead**: [Name] - [Email]
- **Technical Lead**: [Name] - [Email]
- **Legal Counsel**: [Name] - [Email]

### External Contacts
- **CVE Assignment**: [CVE.org](https://cve.org)
- **Security Advisors**: [Security Consultant] - [Email]

## Resources

### Documentation
- [Security Overview](/security-overview)
- [Threat Model](/docs/threat-model)
- [Incident Response](/runbooks/incident-playbook)

### Tools
- [Disclosure CLI](/tools/disclosure-cli)
- [PGP Key Generator](/tools/pgp-key)
- [Receipt Verifier](/tools/receipt-verifier)

### Community
- [Security Forum](https://security.mycelia.com)
- [Discord Channel](https://discord.gg/mycelia-security)
- [Twitter](https://twitter.com/MyceliaSecurity)

---

**Last Updated**: [Date]
**Version**: 1.0
**Next Review**: [Date]
