# PostHog Fiscal Automation Integration

This document describes the PostHog integration for tracking and monitoring fiscal automation events in the order management system.

## Overview

The PostHog integration provides comprehensive tracking and analytics for the fiscal automation system, enabling real-time monitoring, performance analysis, and alerting capabilities without requiring a separate database queue.

## Features

- **Real-time Event Tracking**: Track all fiscal automation events as they happen
- **Order Processing Analytics**: Monitor order queuing, processing, and completion
- **Receipt Creation Metrics**: Track success/failure rates and performance
- **Shift Management Monitoring**: Monitor automatic shift opening and closing
- **Telegram Notification Tracking**: Track notification delivery success/failure
- **Feature Flag Management**: Dynamic configuration via PostHog feature flags
- **Performance Monitoring**: Track processing times and API response times
- **Error Tracking**: Comprehensive error logging and categorization

## Configuration

### Environment Variables

Add the following environment variables to your `.env` file:

```bash
# Analytics and Monitoring
POSTHOG_API_KEY=your_posthog_api_key_here
POSTHOG_HOST=https://app.posthog.com
```

### PostHog Project Setup

1. Create a PostHog account at https://app.posthog.com
2. Create a new project for your fiscal automation system
3. Copy the API key from your project settings
4. Add the API key to your environment variables

## Event Types

### Core Events

#### `fiscal_order_queued`
Tracks when an order is queued for future fiscal processing.

**Properties:**
- `order_id`, `order_number`, `order_total`, `order_currency`
- `order_source`, `order_status`, `order_marketplace_code`
- `processing_mode: 'queued'`
- `scheduled_for`, `queue_priority`
- `business_hours: boolean`

#### `fiscal_order_processed_immediately`
Tracks when an order is processed immediately during business hours.

**Properties:**
- Order details (same as above)
- `processing_mode: 'immediate'`
- `processing_duration_ms`
- `business_hours: true`

#### `fiscal_receipt_created`
Tracks successful fiscal receipt creation.

**Properties:**
- Order details
- `receipt_type: 'sale'`
- `receipt_amount`, `receipt_fiscal_number`, `receipt_url`
- `cashier_name`
- `processing_duration_ms`, `api_response_time_ms`
- `casa_response_code`, `casa_response_message`

#### `fiscal_receipt_failed`
Tracks failed fiscal receipt creation attempts.

**Properties:**
- Order details
- `error_message`, `error_code`, `error_details`
- `processing_duration_ms`, `api_response_time_ms`
- `casa_response_code`, `casa_response_message`

### Shift Management Events

#### `fiscal_shift_open` / `fiscal_shift_close`
Tracks automatic shift operations.

**Properties:**
- `cashier_name`
- `operation_success: boolean`
- `shift_data` (shift details)
- `error_message` (if failed)
- `business_hours: boolean`

### Batch Processing Events

#### `fiscal_batch_processed`
Tracks batch processing results.

**Properties:**
- `batch_size`, `batch_processed`, `batch_failed`, `batch_skipped`
- `batch_error_count`, `batch_errors`
- `processing_duration_ms`
- `business_hours: boolean`

### Status and Configuration Events

#### `fiscal_scheduler_status`
Tracks scheduler status and configuration.

**Properties:**
- `automation_enabled`, `test_mode`
- `business_hours`, `queue_size`
- `next_business_start`

#### `fiscal_telegram_notification`
Tracks Telegram notification delivery.

**Properties:**
- `order_id`, `order_number`
- `notification_success: boolean`
- `error_message` (if failed)
- `notification_channel: 'telegram'`

#### `fiscal_feature_flag`
Tracks feature flag usage and configuration.

**Properties:**
- `flag_name`, `flag_value`
- `flag_context` (additional context)

## Usage Examples

### Basic Event Tracking

```typescript
import { trackFiscalEvent } from '@/app/lib/services/posthog-fiscal';

await trackFiscalEvent('custom_event', {
  order_id: 'order-123',
  order_number: 'ORDER-2024-001',
  event_timestamp: new Date().toISOString(),
  custom_property: 'value'
});
```

### Order Processing Tracking

```typescript
import { 
  trackOrderQueued,
  trackOrderProcessedImmediately 
} from '@/app/lib/services/posthog-fiscal';

// Track queued order
await trackOrderQueued(orderId, order, scheduledFor, priority);

// Track immediate processing
await trackOrderProcessedImmediately(orderId, order, processingStartTime);
```

### Receipt Creation Tracking

```typescript
import { 
  trackReceiptCreated,
  trackReceiptFailed 
} from '@/app/lib/services/posthog-fiscal';

// Track successful receipt
await trackReceiptCreated(orderId, order, casaResponse, cashierName, startTime);

// Track failed receipt
await trackReceiptFailed(orderId, order, errorMessage, casaResponse, startTime);
```

## Analytics and Dashboards

### Key Metrics to Monitor

1. **Processing Success Rate**: `fiscal_receipt_created` vs `fiscal_receipt_failed`
2. **Average Processing Time**: `processing_duration_ms` across events
3. **Queue Size Trends**: Track `queue_size` over time
4. **Business Hours Efficiency**: Compare processing during/outside business hours
5. **Error Rates**: Monitor `fiscal_receipt_failed` events and error patterns
6. **Telegram Notification Success**: Track `fiscal_telegram_notification` success rate

### Recommended PostHog Dashboards

#### Fiscal Automation Overview
- Total orders processed today
- Success rate percentage
- Average processing time
- Current queue size
- Error count and types

#### Performance Monitoring
- Processing time trends
- API response time trends
- Batch processing efficiency
- Peak processing hours

#### Error Analysis
- Error rates by type
- Failed receipt reasons
- Telegram notification failures
- Shift operation failures

## Testing

### Run PostHog Integration Tests

```bash
npm run test:posthog-fiscal
```

This will run comprehensive tests for all PostHog tracking functions and verify the integration is working correctly.

### Test Events

The test script creates mock events for all tracking functions:
- Basic event tracking
- Order queuing and processing
- Receipt creation (success/failure)
- Shift operations
- Batch processing
- Scheduler status
- Telegram notifications
- Feature flags

## Best Practices

### Error Handling
- All PostHog tracking calls are wrapped in try-catch blocks
- Tracking failures are logged as warnings but don't break the main workflow
- Failed tracking never affects fiscal automation functionality

### Performance
- Events are sent immediately (no batching) for real-time monitoring
- PostHog client is configured for server-side usage
- Minimal performance impact on fiscal operations

### Data Privacy
- No sensitive data (payment details, personal info) is tracked
- Only operational metrics and order IDs are included
- All tracking follows data privacy best practices

## Feature Flags

PostHog feature flags can be used to:
- Enable/disable specific tracking events
- Control fiscal automation behavior dynamically
- A/B test different processing strategies
- Emergency shutdown of automation features

### Example Feature Flag Usage

```typescript
import { trackFeatureFlag } from '@/app/lib/services/posthog-fiscal';

// Track feature flag usage
await trackFeatureFlag('fiscal_automation_v2', true, {
  experiment: 'processing_optimization',
  user_segment: 'premium'
});
```

## Troubleshooting

### Common Issues

1. **Missing PostHog API Key**
   - Ensure `POSTHOG_API_KEY` is set in your `.env` file
   - Verify the API key is correct in your PostHog project settings

2. **Events Not Appearing**
   - Check PostHog project ingestion settings
   - Verify network connectivity to PostHog servers
   - Review console logs for tracking errors

3. **Performance Issues**
   - PostHog tracking is asynchronous and shouldn't impact performance
   - If issues persist, temporarily disable tracking to isolate problems

### Debug Mode

Enable debug logging by setting:
```bash
NODE_ENV=development
```

This will provide detailed logging of all PostHog operations.

## Support

For PostHog-specific issues:
- PostHog Documentation: https://posthog.com/docs
- PostHog Community: https://posthog.com/slack

For fiscal automation integration issues:
- Check the console logs for detailed error messages
- Run the test suite to verify integration health
- Review the fiscal automation service logs
