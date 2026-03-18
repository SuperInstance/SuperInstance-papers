# SuperInstance Monitoring and Analytics

Comprehensive monitoring and analytics solution for the SuperInstance ecosystem.

## Overview

This monitoring stack provides real-time visibility into all SuperInstance repositories:

- **claw/** - Cellular agent engine metrics
- **constrainttheory/** - Geometric operations and FPS vs RTS metrics
- **spreadsheet-moment/** - Cell updates, formula execution, WebSocket metrics

## Quick Start

### Prerequisites

- Docker and Docker Compose
- 4GB RAM minimum
- 10GB disk space

### Installation

1. Navigate to monitoring directory:
```bash
cd /c/Users/casey/polln/monitoring
```

2. Start the monitoring stack:
```bash
docker-compose up -d
```

3. Access the dashboards:
- **Grafana**: http://localhost:3001 (admin/superinstance)
- **Prometheus**: http://localhost:9090
- **AlertManager**: http://localhost:9093

## Architecture

```
Applications
    ↓
Node Exporter + Custom Exporters
    ↓
Prometheus (Metrics Storage)
    ↓
Grafana (Visualization) + Alertmanager (Alerting)
    ↓
Loki + Promtail (Logging)
```

## Quick Start

### Prerequisites

- Docker and Docker Compose
- 4GB RAM minimum (8GB recommended)
- 20GB disk space

### Installation

1. Clone the repository:
```bash
git clone https://github.com/SuperInstance/polln.git
cd polln/monitoring
```

2. Configure environment variables:
```bash
# Edit docker-compose.yml to update credentials
# Set Grafana admin password
# Configure Slack/PagerDuty webhooks in alertmanager.yml
```

3. Start the monitoring stack:
```bash
cd docker
docker-compose up -d
```

4. Access the dashboards:
- **Grafana**: http://localhost:3000 (admin/changeme)
- **Prometheus**: http://localhost:9090
- **Alertmanager**: http://localhost:9093
- **Loki**: http://localhost:3100

## Dashboards

### 1. System Overview Dashboard
- CPU, Memory, Disk usage
- Network traffic
- Request rate and error rates
- Active connections
- System load average
- Service health status

**Access**: Grafana → Spreadsheet Moment → System Overview

### 2. Application Performance Dashboard
- Response times (P50, P95, P99)
- Throughput metrics
- API endpoint performance
- Database performance
- Cache hit rates
- Active requests

**Access**: Grafana → Spreadsheet Moment → Application Performance

### 3. Database Performance Dashboard
- Query performance
- Connection pool usage
- Replication lag
- Table sizes
- Index efficiency
- Lock statistics
- Deadlock detection

**Access**: Grafana → Spreadsheet Moment → Database Performance

### 4. Security Events Dashboard
- Failed authentication attempts
- SQL injection attempts
- XSS attacks
- Rate limit violations
- Blocked requests
- Threat level score
- GeoIP distribution

**Access**: Grafana → Spreadsheet Moment → Security Events

### 5. Business Metrics Dashboard
- Daily/Monthly Active Users (DAU/MAU)
- Revenue metrics
- Conversion rates
- Feature usage
- Cart abandonment
- User retention
- Customer Lifetime Value (CLV)

**Access**: Grafana → Spreadsheet Moment → Business Metrics

### 6. Error Analysis Dashboard
- Error rates by type
- Error frequency
- Stack trace analysis
- Impact assessment
- MTTR tracking
- Error budget burn rate
- SLO status

**Access**: Grafana → Spreadsheet Moment → Error Analysis

## Configuration

### Prometheus Configuration

**Location**: `prometheus/prometheus.yml`

Key configurations:
- Scrape intervals (default: 15s)
- Data retention (30 days)
- Alert manager integration
- Custom metrics endpoints

### Alert Rules

**Location**: `prometheus/rules/alerts.yml`

Pre-configured alerts for:
- System resources (CPU, Memory, Disk)
- Application performance
- Database operations
- Security events
- Business metrics

### Grafana Provisioning

**Location**: `grafana/provisioning/`

- `datasources/datasource.yml`: Prometheus, Loki, Alertmanager
- `dashboards/dashboard.yml`: Dashboard provisioning
- `alerting/rule.yml`: Alert rule configuration

## Custom Metrics

### Node Exporter Textfile Collector

Use the provided script to export custom business metrics:

```bash
chmod +x exporters/prometheus_textfile_example.sh
# Add to crontab
*/5 * * * * /path/to/prometheus_textfile_example.sh
```

### Python Custom Exporter

Run the custom Python exporter for application-specific metrics:

```bash
pip install prometheus_client
python exporters/custom_exporter.py
```

Metrics available at: `http://localhost:8001/metrics`

## Alerting

### Alertmanager Integration

Configure notification channels in `alertmanager/alertmanager.yml`:

1. **Slack Notifications**:
```yaml
slack_api_url: 'YOUR_SLACK_WEBHOOK_URL'
```

2. **PagerDuty Integration**:
```yaml
pagerduty_url: 'YOUR_PAGERDUTY_URL'
```

3. **Email Notifications**:
```yaml
email_configs:
  - to: 'team@spreadsheetmoment.com'
```

### Alert Severity Levels

- **Critical**: Immediate paging (Service down, security breach)
- **Warning**: Slack notification (High latency, resource usage)
- **Info**: Email only (Business metrics, trends)

## Logging with Loki

### Log Forwarding

Configure Promtail in `loki/promtail-config.yml`:

- Application logs (JSON format)
- Nginx access/error logs
- System logs
- Docker container logs

### Log Query Examples

**View application errors**:
```loglvl
{job="spreadsheet-moment-app", level="error"} |= "error"
```

**Trace requests by ID**:
```loglvl
{job="spreadsheet-moment-app"} |= "<trace-id>"
```

**Filter by service**:
```loglvl
{service="api"} |= "timeout"
```

## Performance Tuning

### Prometheus Optimization

1. **Increase retention**:
```yaml
command:
  - '--storage.tsdb.retention.time=90d'
```

2. **Optimize scrape intervals**:
```yaml
scrape_interval: 30s  # For high-traffic services
```

3. **Configure recording rules**:
```yaml
# Pre-compute expensive queries
record: service:latency:p95
expr: histogram_quantile(0.95, ...)
```

### Grafana Optimization

1. **Reduce query load**:
   - Increase refresh intervals for heavy dashboards
   - Use recording rules for complex queries
   - Implement query caching

2. **Dashboard performance**:
   - Limit time range for real-time dashboards
   - Use panel min/max intervals
   - Optimize PromQL queries

## Monitoring Best Practices

### 1. Set Up Alerts Gradually

Start with critical alerts:
- Service down
- High error rate
- Security events

Add performance alerts:
- High latency
- Resource exhaustion
- Database issues

### 2. Tune Alert Thresholds

- Start with conservative thresholds
- Monitor false positive rates
- Adjust based on baseline metrics
- Use recording rules for baselines

### 3. Document Runbooks

Create runbooks for each alert:
- Investigation steps
- Common solutions
- Escalation procedures
- Prevention strategies

### 4. Review Dashboard Coverage

Ensure coverage for:
- Business metrics
- Technical performance
- User experience
- Security posture
- Cost optimization

## Maintenance

### Backup Configurations

```bash
# Backup Grafana dashboards
docker exec grafana grafana-cli admin export-dashboard > backup.json

# Backup Prometheus data
docker exec prometheus tar czf - /prometheus > prometheus_backup.tar.gz
```

### Update Monitoring Stack

```bash
cd docker
docker-compose pull
docker-compose up -d
```

### Clean Up Old Data

```bash
# Access Prometheus container
docker exec -it prometheus sh

# Clean up old time series (example: older than 30 days)
curl -X POST http://localhost:9090/api/v1/admin/tsdb/delete_series?match[]={__name__=~".+"}
```

## Troubleshooting

### Prometheus Not Scraping

Check target status:
```bash
curl http://localhost:9090/api/v1/targets
```

Verify scrape configuration:
```bash
docker exec prometheus promtool check config /etc/prometheus/prometheus.yml
```

### Grafana Dashboard Not Loading

Check datasource connection:
1. Go to Configuration → Data Sources
2. Test Prometheus connection
3. Verify metrics are available: `up{job="prometheus"}`

### Alerts Not Firing

Check Alertmanager status:
```bash
curl http://localhost:9093/api/v2/status
```

Verify alert rules:
```bash
curl http://localhost:9090/api/v1/rules
```

## Cost Optimization

### Reduce Monitoring Costs

1. **Optimize metric cardinality**:
   - Remove high-cardinality labels
   - Use appropriate metric types
   - Implement metric filtering

2. **Tune data retention**:
   - Keep detailed data for 30 days
   - Downsample older data
   - Archive historical data

3. **Efficient querying**:
   - Use recording rules
   - Optimize PromQL queries
   - Implement query caching

## Security Considerations

1. **Secure Prometheus endpoints**:
   - Use basic authentication
   - Enable TLS
   - Restrict network access

2. **Protect Grafana**:
   - Change default credentials
   - Enable anonymous read-only access (optional)
   - Implement role-based access control

3. **Secure Alertmanager**:
   - Use webhook authentication
   - Validate alert sources
   - Implement rate limiting

## Support and Documentation

- **Grafana Docs**: https://grafana.com/docs/
- **Prometheus Docs**: https://prometheus.io/docs/
- **Loki Docs**: https://grafana.com/docs/loki/latest/
- **Alertmanager Docs**: https://prometheus.io/docs/alerting/latest/alertmanager/

## Contributing

To add new metrics or dashboards:

1. Update Prometheus configuration
2. Create Grafana dashboard JSON
3. Add recording rules for performance
4. Document new metrics and alerts
5. Test in development environment

## License

This monitoring configuration is part of the Spreadsheet Moment project.

## Version History

- **v1.0.0** (2025-03-15): Initial production monitoring stack
  - 6 comprehensive dashboards
  - 40+ alert rules
  - Custom metrics exporters
  - Complete logging infrastructure
  - Security event monitoring

---

**Monitoring Stack Version**: 1.0.0
**Last Updated**: 2025-03-15
**Maintained By**: Spreadsheet Moment DevOps Team
