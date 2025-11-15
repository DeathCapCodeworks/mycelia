---
title: Perf Budgets
---

# Performance Budgets

This document describes Mycelia's performance budget system and how to enforce performance constraints in CI/CD pipelines.

## Overview

Performance budgets ensure that Mycelia applications maintain optimal performance characteristics by setting limits on bundle sizes and Time to Interactive (TTI) metrics.

## Budget Configuration

Performance budgets are defined in `release/mainnet/perf-budgets.json`:

```json
{
  "sandbox_bundle_kb_max": 350,
  "docs_bundle_kb_max": 250,
  "tti_p95_ms_max": 1500
}
```text

### Budget Targets

- **Sandbox Bundle:** Maximum 350 KB for the main sandbox application
- **Docs Bundle:** Maximum 250 KB for documentation pages
- **TTI p95:** Maximum 1500ms for 95th percentile Time to Interactive

## CLI Usage

The `@mycelia/perf-budget` CLI enforces these budgets during CI builds:

### Basic Usage

```bash
# Check performance budgets
npx @mycelia/perf-budget check

# Specify custom budget file
npx @mycelia/perf-budget check --budgets custom-budgets.json

# Check with bundle stats
npx @mycelia/perf-budget check --bundle-stats webpack-stats.json

# Check with TTI stats
npx @mycelia/perf-budget check --tti-stats lighthouse-results.json

# Allow failures in quarantine mode
npx @mycelia/perf-budget check --quarantine
```text

### CI Integration

Add to your CI pipeline:

```yaml
# .github/workflows/performance.yml
name: Performance Budget Check
on: [push, pull_request]

jobs:
  perf-budget:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build application
        run: npm run build
      
      - name: Generate bundle stats
        run: npm run build:stats
      
      - name: Run Lighthouse
        run: npm run lighthouse
      
      - name: Check performance budgets
        run: npx @mycelia/perf-budget check --bundle-stats dist/stats.json --tti-stats lighthouse-results.json
```text

## Bundle Analysis

### Webpack Integration

```javascript
// webpack.config.js
module.exports = {
  // ... other config
  plugins: [
    new BundleAnalyzerPlugin({
      analyzerMode: 'json',
      reportFilename: 'dist/stats.json'
    })
  ]
};
```text

### Vite Integration

```javascript
// vite.config.js
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          utils: ['lodash', 'moment']
        }
      }
    }
  }
});
```text

## TTI Measurement

### Lighthouse Configuration

```javascript
// lighthouse.config.js
module.exports = {
  extends: 'lighthouse:default',
  settings: {
    throttlingMethod: 'simulate',
    throttling: {
      rttMs: 40,
      throughputKbps: 10240,
      cpuSlowdownMultiplier: 1
    }
  }
};
```text

### Automated Testing

```bash
# Run Lighthouse with custom config
lighthouse http://localhost:3000 --config-path=lighthouse.config.js --output=json --output-path=lighthouse-results.json
```text

## Budget Enforcement

### Failure Handling

When budgets are exceeded:

1. **CI Failure:** Build fails with detailed error messages
2. **Quarantine Mode:** Use `--quarantine` flag to allow failures during development
3. **Notification:** Teams are notified of performance regressions

### Common Issues

#### Bundle Size Exceeded

**Symptoms:**
- Bundle size exceeds defined limits
- Slow initial page load
- Poor Core Web Vitals scores

**Solutions:**
- Code splitting and lazy loading
- Tree shaking unused code
- Optimize dependencies
- Use dynamic imports

#### TTI Exceeded

**Symptoms:**
- Slow Time to Interactive
- Poor user experience
- Low Lighthouse performance scores

**Solutions:**
- Optimize JavaScript execution
- Reduce main thread blocking
- Implement progressive loading
- Use Web Workers for heavy computations

## Monitoring

### Continuous Monitoring

Set up continuous performance monitoring:

```bash
# Daily performance checks
0 2 * * * cd /path/to/mycelia && npm run perf-check

# Weekly budget reviews
0 9 * * 1 cd /path/to/mycelia && npm run perf-report
```text

### Alerting

Configure alerts for budget violations:

```yaml
# alerting.yml
alerts:
  - name: Bundle Size Exceeded
    condition: bundle_size > budget_limit
    severity: warning
    
  - name: TTI Budget Exceeded
    condition: tti_p95 > tti_limit
    severity: critical
```text

## Best Practices

### Development

1. **Regular Checks:** Run performance budgets locally during development
2. **Incremental Monitoring:** Check budgets after each significant change
3. **Profile Before Optimize:** Use profiling tools to identify bottlenecks

### CI/CD

1. **Fail Fast:** Check budgets early in the pipeline
2. **Parallel Execution:** Run performance checks in parallel with other tests
3. **Caching:** Cache build artifacts to speed up repeated checks

### Optimization

1. **Bundle Analysis:** Regularly analyze bundle composition
2. **Dependency Audit:** Review and update dependencies regularly
3. **Code Splitting:** Implement strategic code splitting
4. **Asset Optimization:** Optimize images, fonts, and other assets

## Troubleshooting

### CLI Issues

```bash
# Debug mode
npx @mycelia/perf-budget check --debug

# Verbose output
npx @mycelia/perf-budget check --verbose

# Help
npx @mycelia/perf-budget --help
```text

### Common Errors

**"Budget file not found"**
- Ensure `perf-budgets.json` exists in the correct location
- Check file permissions

**"Stats file invalid"**
- Verify JSON format of stats files
- Check file paths and permissions

**"Quarantine mode not working"**
- Ensure `QUARANTINE` environment variable is set
- Check CI configuration

## Advanced Configuration

### Custom Budgets

Create custom budget configurations:

```json
{
  "custom_bundle_kb_max": 500,
  "custom_tti_p95_ms_max": 2000,
  "custom_custom_metric_max": 100
}
```text

### Threshold Adjustments

Adjust budgets based on application requirements:

```json
{
  "sandbox_bundle_kb_max": 400,
  "docs_bundle_kb_max": 300,
  "tti_p95_ms_max": 1800
}
```text

## Support

For performance budget issues:
- Check logs for detailed error messages
- Review CI configuration
- Contact the performance team
- Submit issues to the Mycelia repository
