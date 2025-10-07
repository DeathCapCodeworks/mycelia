---
title: System Status Overview
---

# System Status Overview

## Current Status

<div className="alert alert--success">
  <strong>System Status:</strong> <span id="system-status">Loading...</span>
</div>

## Service Level Objectives (SLOs)

### Redemption Performance
<div className="margin-bottom--md">
  <strong>Redemption Quote Latency (P95):</strong> 
  <span id="redemption-latency-badge" className="badge badge--success">Loading...</span>
  <span id="redemption-latency-value">Loading...</span>
</div>

### Proof of Reserves
<div className="margin-bottom--md">
  <strong>PoR Attestation Age:</strong> 
  <span id="por-age-badge" className="badge badge--success">Loading...</span>
  <span id="por-age-value">Loading...</span>
</div>

### System Health
<div className="margin-bottom--md">
  <strong>Diagnostics Pass Rate:</strong> 
  <span id="diagnostics-badge" className="badge badge--warning">Loading...</span>
  <span id="diagnostics-value">Loading...</span>
</div>

### User Experience
<div className="margin-bottom--md">
  <strong>Sandbox Route TTI (P95):</strong> 
  <span id="sandbox-tti-badge" className="badge badge--success">Loading...</span>
  <span id="sandbox-tti-value">Loading...</span>
</div>

## Operational Metrics

### Redemption Queue
<div className="margin-bottom--md">
  <strong>Queue Length:</strong> <span id="queue-length">Loading...</span> requests
</div>

### Redemption Throughput
<div className="margin-bottom--md">
  <strong>Redemptions per Hour:</strong> <span id="redemptions-hour">Loading...</span>
</div>

### Attestation Freshness
<div className="margin-bottom--md">
  <strong>Last Attestation:</strong> <span id="attestation-age">Loading...</span> minutes ago
</div>

## System Information

### Build Information
<div className="margin-bottom--md">
  <strong>Build SHA:</strong> <span id="build-sha">Loading...</span>
</div>

### Chain Information
<div className="margin-bottom--md">
  <strong>Chain ID:</strong> <span id="chain-id">Loading...</span>
</div>

### Version Information
<div className="margin-bottom--md">
  <strong>Version:</strong> <span id="version">Loading...</span>
</div>

## Recent Events

<div id="recent-events">
  <p>Loading recent events...</p>
</div>

## Status History

<div id="status-history">
  <p>Loading status history...</p>
</div>

## API Endpoints

### Status API
```
GET /status.json
```

### Health Check
```
GET /health
```

### Metrics API
```
GET /metrics
```

## Monitoring

### Real-time Monitoring
- **System Dashboard**: [Live Dashboard](https://monitoring.mycelia.com)
- **Alert Status**: [Alert Dashboard](https://alerts.mycelia.com)
- **Performance Metrics**: [Performance Dashboard](https://performance.mycelia.com)

### Historical Data
- **Status History**: [Status History](https://status.mycelia.com/history)
- **Incident History**: [Incident History](https://status.mycelia.com/incidents)
- **Performance Trends**: [Performance Trends](https://status.mycelia.com/trends)

## Incident Response

### Current Incidents
<div id="current-incidents">
  <p>No current incidents</p>
</div>

### Incident History
<div id="incident-history">
  <p>Loading incident history...</p>
</div>

## Contact Information

### Status Updates
- **Status Page**: [status.mycelia.com](https://status.mycelia.com)
- **Twitter**: [@MyceliaStatus](https://twitter.com/MyceliaStatus)
- **RSS Feed**: [RSS Feed](https://status.mycelia.com/rss)

### Support
- **Technical Support**: [support@mycelia.com](mailto:support@mycelia.com)
- **Emergency Contact**: [emergency@mycelia.com](mailto:emergency@mycelia.com)
- **Status Inquiries**: [status@mycelia.com](mailto:status@mycelia.com)

---

<script>
// Load status data from status.json
fetch('/status.json')
  .then(response => response.json())
  .then(data => {
    // Update system status
    document.getElementById('system-status').textContent = data.status || 'operational';
    
    // Update SLO badges and values
    updateSLOBadge('redemption-latency', data.slos?.redemption_quote_latency_p95);
    updateSLOBadge('por-age', data.slos?.por_attestation_age);
    updateSLOBadge('diagnostics', data.slos?.diagnostics_pass_rate);
    updateSLOBadge('sandbox-tti', data.slos?.sandbox_route_tti);
    
    // Update operational metrics
    document.getElementById('queue-length').textContent = data.redemptionQueueLength || 'N/A';
    document.getElementById('redemptions-hour').textContent = data.redemptionsPerHour || 'N/A';
    document.getElementById('attestation-age').textContent = data.attestationAgeMinutes || 'N/A';
    
    // Update system information
    document.getElementById('build-sha').textContent = data.buildSha || 'unknown';
    document.getElementById('chain-id').textContent = data.chainId || 'unknown';
    document.getElementById('version').textContent = data.version || 'unknown';
    
    // Update recent events
    if (data.recentEvents && data.recentEvents.length > 0) {
      const eventsHtml = data.recentEvents.map(event => `
        <div class="margin-bottom--sm">
          <strong>${event.name}:</strong> ${event.message}
          <br><small>${new Date(event.timestamp).toLocaleString()}</small>
        </div>
      `).join('');
      document.getElementById('recent-events').innerHTML = eventsHtml;
    }
  })
  .catch(error => {
    console.error('Failed to load status data:', error);
    document.getElementById('system-status').textContent = 'error';
  });

function updateSLOBadge(prefix, sloData) {
  if (!sloData) return;
  
  const badgeElement = document.getElementById(`${prefix}-badge`);
  const valueElement = document.getElementById(`${prefix}-value`);
  
  if (badgeElement && valueElement) {
    const status = sloData.status || 'unknown';
    const value = sloData.value || 0;
    const target = sloData.target || 0;
    
    // Update badge class based on status
    badgeElement.className = `badge badge--${status === 'healthy' ? 'success' : status === 'warning' ? 'warning' : 'danger'}`;
    badgeElement.textContent = status.toUpperCase();
    
    // Update value
    valueElement.textContent = `${(value * 100).toFixed(1)}% (target: ${(target * 100).toFixed(1)}%)`;
  }
}
</script>
