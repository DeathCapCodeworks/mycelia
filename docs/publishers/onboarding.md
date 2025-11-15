---
title: Onboarding
---

# Publisher Onboarding Guide

This guide walks publishers through integrating Mycelia into their websites using our onboarding wizard.

## Overview

The Publisher Onboarding Wizard provides a step-by-step process to integrate Mycelia features into your website. The wizard guides you through domain verification, snippet installation, live testing, and feature configuration.

## Prerequisites

- A website with administrative access
- Ability to modify HTML head section
- Domain ownership verification capability

## Step-by-Step Process

### Step 1: Add Your Domain

1. Enter your website domain (e.g., `example.com`)
2. Click "Verify Domain" to confirm ownership
3. The system will validate your domain format and availability

### Step 2: Paste Mycelia Snippet

1. Copy the provided Mycelia embed snippet
2. Paste it into the `<head>` section of your website
3. Confirm the snippet has been added

**Snippet Format:**
```html
<script src="https://cdn.mycelia.xyz/mycelia-embed.js" async></script>
<meta name="mycelia-domain-owner" content="your-did-here">
```text

### Step 3: Run Live Check

1. Click "Run Live Check" to verify the snippet installation
2. The system will scan your website for the Mycelia snippet
3. Ensure the check passes before proceeding

### Step 4: Enable Features

Choose which Mycelia features to enable:

#### BLOOM Rewards
- **Description:** Reward your audience for engagement with BLOOM tokens
- **Benefits:** Increased user engagement, token distribution
- **Requirements:** None

#### Live Captions (Optional)
- **Description:** Provide real-time captions for your live streams
- **Benefits:** Accessibility, broader audience reach
- **Requirements:** Live streaming capability

## Signed Site Receipt

Upon completion, you'll receive a signed site receipt containing:

- **Domain:** Your verified domain
- **Owner DID:** Your decentralized identifier
- **Timestamp:** Receipt generation time
- **Signature:** Cryptographic proof of integration

## Privacy Considerations

- The Mycelia snippet respects user privacy settings
- No personal data is collected without explicit consent
- All interactions are encrypted and decentralized

## Troubleshooting

### Domain Verification Fails
- Ensure domain is accessible and properly configured
- Check DNS settings and domain registration
- Verify domain format (no protocols or paths)

### Live Check Fails
- Confirm snippet is in the `<head>` section
- Check for JavaScript errors in browser console
- Ensure snippet is not blocked by ad blockers

### Features Not Working
- Verify feature flags are enabled
- Check browser compatibility
- Review network connectivity

## Support

For additional help:
- Check our documentation at docs.mycelia.xyz
- Contact support at support@mycelia.xyz
- Join our community Discord

## Next Steps

After onboarding:
1. Test features on your website
2. Monitor user engagement metrics
3. Configure additional settings as needed
4. Explore advanced Mycelia features
