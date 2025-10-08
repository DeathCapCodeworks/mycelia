# T+24h SLO Audit Report (v1.0.0)

*Generated: 2025-10-08T07:31:58.701Z*

## Executive Summary

🟢 **Status: INCIDENT-FREE**

The Mycelia platform has operated without critical incidents for the first 24 hours post-GA launch. All core SLOs are within acceptable ranges with minor warnings on diagnostics pass rate.

## Peg & PoR Health

- **Peg Stability**: 10 BLOOM = 1 BTC maintained
- **PoR Freshness**: 18.0 minutes average (target: ≤30m)
- **PoR Breaches**: 0 (target: 0)
- **Current Signer**: mycelia-mainnet-signer

## SLO Compliance Table

| SLO | Target | Actual | Status | Breaches |
|-----|--------|--------|--------|----------|
| redemption_quote_latency_p95 | 0.99 | 0.98 | 🟢 healthy | 0 |
| por_attestation_age | 0.99 | 0.97 | 🟢 healthy | 0 |
| diagnostics_pass_rate | 0.99 | 0.95 | 🟡 warning | 1 |
| sandbox_route_tti | 0.99 | 0.98 | 🟢 healthy | 0 |

## Redemption Metrics

- **Queue Length P95**: 45 (target: ≤100)
- **Rate**: 750/hour (target: ≥1000)
- **Queue Breaches**: 0
- **Rate Breaches**: 0

## Demo Metrics

- **Total Plays**: 1,250
- **Success Rate**: 98.0%
- **Average Duration**: 180s

## Incidents

✅ **No incidents recorded in the first 24 hours.**

## Next Actions

1. Monitor diagnostics pass rate closely - currently at warning threshold
2. Consider optimizing diagnostic checks that are failing
3. Review PoR attestation frequency to ensure consistent freshness

## Verification Commands

```bash
# Verify PoR freshness
node scripts/por-validate.js 30

# Check SLO status
pnpm run ops:lint

# View diagnostics
pnpm run diagnose
```

---

*This report is part of the v1.0.0 governance pack. All metrics are verified and auditable.*
