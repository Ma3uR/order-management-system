# Auto-Fiscal Feature Deployment Guide

## Overview

This guide covers the deployment of the auto-fiscal feature, which automatically generates fiscal receipts when orders reach completed status.

## Prerequisites

1. Casa Vchasno account and API access
2. Valid Casa Vchasno API token
3. PocketBase database with fiscal collections
4. Proper environment configuration

## Deployment Process

### Phase 1: Staging Deployment

#### 1. Environment Configuration

Set the following environment variables in your staging environment:

```bash
# Enable auto-fiscal feature
ENABLE_AUTO_FISCAL=true

# Casa Vchasno API token (staging/test token)
CASA_VCHASNO_TOKEN=your_staging_casa_vchasno_token

# Default cashier name for auto-generated receipts
AUTO_CASHIER_NAME=STAGING_AUTO

# Optional: Enable debug logging
DEBUG=casa-vchasno
```

#### 2. Database Setup

Ensure the following PocketBase collections exist in staging:

**fiscal_receipts collection:**
```javascript
{
  "id": "string",
  "created": "datetime",
  "updated": "datetime",
  "order_id": "relation(orders)", // Optional
  "receipt_type": "select(sale,return,z_report)",
  "fiscal_data": "json", // Optional
  "casa_response": "json", // Optional
  "qr_code": "url", // Optional
  "document_code": "text", // Optional
  "shift_id": "relation(fiscal_shifts)", // Optional
  "status": "select(pending,success,failed)",
  "error_message": "text" // Optional
}
```

**fiscal_shifts collection:**
```javascript
{
  "id": "string",
  "created": "datetime", 
  "updated": "datetime",
  "cashier": "text",
  "opened_at": "datetime",
  "closed_at": "datetime", // Optional
  "status": "select(open,closed)",
  "z_report_data": "json", // Optional
  "total_sales": "number", // Optional, default: 0
  "total_returns": "number", // Optional, default: 0
  "receipts_count": "number" // Optional, default: 0
}
```

#### 3. Deploy to Staging

1. Deploy application code to staging environment
2. Update environment variables
3. Restart application services
4. Verify environment configuration:

```bash
# Check auto-fiscal configuration
curl "https://your-staging-domain.com/api/health/fiscal-config" \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

#### 4. Staging Testing

**Test Auto-Fiscal Flow:**

1. Create a test order in staging
2. Update order status to completed (marketplace_code: '6')
3. Monitor logs for fiscal automation:
   ```bash
   # Check application logs
   tail -f /var/log/app/stdout.log | grep "AutoFiscal"
   ```
4. Verify receipt creation in PocketBase:
   ```bash
   # Query fiscal_receipts collection
   curl "http://staging-pb:8090/api/collections/fiscal_receipts/records" \
     -H "Authorization: Bearer PB_ADMIN_TOKEN"
   ```

**Test Failure Scenarios:**

1. **Invalid Token Test:**
   - Temporarily set invalid `CASA_VCHASNO_TOKEN`
   - Trigger order completion
   - Verify failed receipt is logged with proper error message

2. **Network Issues:**
   - Block outbound connections to Casa Vchasno API
   - Trigger order completion
   - Verify graceful error handling

3. **Duplicate Receipt Test:**
   - Complete an order twice
   - Verify second attempt is skipped with appropriate log message

#### 5. Monitor Staging

Monitor the following metrics in staging:

- **Receipt Success Rate**: Count of successful vs failed receipts
- **Processing Time**: Average time for receipt generation
- **Error Patterns**: Common failure reasons
- **Database Performance**: Impact on PocketBase performance

**Monitoring Queries:**

```bash
# Check receipt success rate
curl "http://staging-pb:8090/api/collections/fiscal_receipts/records?aggregate=count&groupBy=status" \
  -H "Authorization: Bearer PB_ADMIN_TOKEN"

# Check recent failures
curl "http://staging-pb:8090/api/collections/fiscal_receipts/records?filter=status='failed'&sort=-created&perPage=10" \
  -H "Authorization: Bearer PB_ADMIN_TOKEN"
```

### Phase 2: Production Deployment

#### 1. Production Environment Setup

```bash
# Production environment variables
ENABLE_AUTO_FISCAL=true
CASA_VCHASNO_TOKEN=your_production_casa_vchasno_token
AUTO_CASHIER_NAME=AUTO

# Remove debug logging in production
# DEBUG=  # Comment out or remove
```

#### 2. Pre-Production Checklist

- [ ] Staging testing completed successfully
- [ ] Production Casa Vchasno token validated
- [ ] Database collections created in production PocketBase
- [ ] Backup procedures in place for fiscal data
- [ ] Monitoring and alerting configured
- [ ] Rollback plan prepared

#### 3. Production Deployment

1. **Feature Flag Deployment:**
   ```bash
   # Initially deploy with feature disabled
   ENABLE_AUTO_FISCAL=false
   ```

2. **Gradual Rollout:**
   - Enable for specific order sources first
   - Monitor for 24 hours
   - Gradually enable for all sources

3. **Enable Auto-Fiscal:**
   ```bash
   # Update environment variable
   ENABLE_AUTO_FISCAL=true
   
   # Restart application
   pm2 restart order-management-app
   ```

#### 4. Production Monitoring

**Key Metrics to Monitor:**

1. **Receipt Generation Rate**
   - Track successful vs failed receipts
   - Monitor processing times
   - Alert on high failure rates

2. **System Performance**
   - Database query performance
   - API response times
   - Memory/CPU usage

3. **Business Metrics**
   - Compliance with fiscal regulations
   - Receipt coverage for completed orders
   - Customer receipt verification usage

**Monitoring Setup:**

```bash
# Set up log monitoring for fiscal automation
tail -f /var/log/app/app.log | grep -E "(AutoFiscal|fiscal_receipts)" > /var/log/fiscal-automation.log

# Set up alerts for high failure rates
# (Configure your monitoring system to alert when failed receipts > 5% of total)
```

#### 5. Production Health Checks

**Daily Health Checks:**

1. **Receipt Coverage:**
   ```sql
   -- Check completed orders without receipts
   SELECT COUNT(*) as missing_receipts
   FROM orders o
   LEFT JOIN fiscal_receipts fr ON o.id = fr.order_id AND fr.status = 'success'
   WHERE o.status IN (SELECT id FROM status_options WHERE marketplace_code IN ('6', 'completed', 'delivered'))
   AND fr.id IS NULL
   AND o.created >= DATE('now', '-1 day');
   ```

2. **Error Rate:**
   ```sql
   -- Check error rate for last 24 hours
   SELECT 
     status,
     COUNT(*) as count,
     (COUNT(*) * 100.0 / (SELECT COUNT(*) FROM fiscal_receipts WHERE created >= DATE('now', '-1 day'))) as percentage
   FROM fiscal_receipts 
   WHERE created >= DATE('now', '-1 day')
   GROUP BY status;
   ```

3. **API Performance:**
   ```bash
   # Test Casa Vchasno API connectivity
   curl -w "Time: %{time_total}s\nStatus: %{http_code}\n" \
     -H "Authorization: $CASA_VCHASNO_TOKEN" \
     "https://kasa.vchasno.ua/api/v3/fiscal/execute" \
     -d '{"fiscal":{"task":18}}' \
     -H "Content-Type: application/json"
   ```

## Rollback Procedures

### Emergency Rollback

If critical issues are detected:

```bash
# 1. Immediately disable auto-fiscal
ENABLE_AUTO_FISCAL=false

# 2. Restart application
pm2 restart order-management-app

# 3. Verify feature is disabled
curl "https://your-domain.com/api/health/fiscal-config"
```

### Partial Rollback

For non-critical issues:

1. Keep feature enabled but monitor closely
2. Use manual receipt generation for failed cases
3. Fix issues and re-deploy

## Post-Deployment Tasks

1. **Documentation Updates:**
   - Update user documentation
   - Create fiscal receipt management guides
   - Document troubleshooting procedures

2. **Training:**
   - Train staff on fiscal management features
   - Provide troubleshooting guides
   - Set up support procedures

3. **Compliance:**
   - Verify regulatory compliance
   - Set up audit procedures
   - Configure backup and retention policies

## Support and Maintenance

### Regular Maintenance Tasks

1. **Weekly:**
   - Review failed receipts and resolve issues
   - Check Casa Vchasno API token expiration
   - Monitor receipt generation performance

2. **Monthly:**
   - Review fiscal automation logs
   - Update error handling based on patterns
   - Performance optimization if needed

3. **Quarterly:**
   - Review compliance with fiscal regulations
   - Update Casa Vchasno integration if needed
   - Audit fiscal data integrity

### Emergency Contacts

- **Casa Vchasno Support**: [Contact information]
- **System Administrator**: [Contact information]
- **Development Team**: [Contact information]

## Troubleshooting Guide

See main README.md troubleshooting section for detailed issue resolution steps.

### Quick Issue Resolution

1. **High Failure Rate:**
   - Check Casa Vchasno API status
   - Verify token validity
   - Review recent error messages

2. **Performance Issues:**
   - Check database performance
   - Monitor API response times
   - Review system resources

3. **Compliance Issues:**
   - Ensure all completed orders have receipts
   - Verify QR code accessibility
   - Check fiscal data integrity

---

This deployment guide ensures a safe, monitored rollout of the auto-fiscal feature with proper fallback procedures and ongoing maintenance practices.
