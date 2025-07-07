# Fiscal Automation Scheduler

## Overview

The Fiscal Automation Scheduler provides time-based automation for fiscal receipt generation, ensuring that all completed orders are processed with proper fiscal receipts while respecting business hours and fiscal device operational requirements.

## Key Features

### ⏰ Time-Based Processing
- **Business Hours**: Configurable working hours (default: 8:00 AM - 22:00 PM)
- **Immediate Processing**: Orders completed during business hours are processed instantly
- **Queue Management**: Orders completed outside business hours are queued for next business day
- **Automatic Scheduling**: Queued orders are processed automatically at business start

### 🔄 Shift Management
- **Auto-Open Shifts**: Automatically opens fiscal shifts at business start (8:00 AM)
- **Auto-Close Shifts**: Automatically closes shifts and generates Z-reports at business end (22:00 PM)
- **Smart Detection**: Checks current shift status before operations
- **Fallback Handling**: Manual override capabilities for edge cases

### 📊 Queue Management
- **Priority System**: Orders can be assigned different priorities
- **Retry Logic**: Failed orders can be retried with exponential backoff
- **Status Tracking**: Complete audit trail of queue operations
- **Cleanup**: Automatic cleanup of old completed/failed items

## Environment Configuration

### Required Environment Variables

```bash
# Enable fiscal automation
ENABLE_FISCAL_AUTOMATION=true

# Test mode (disable for production)
FISCAL_AUTOMATION_TEST_MODE=true

# Business hours (24-hour format)
FISCAL_START_HOUR=8
FISCAL_END_HOUR=22

# Cashier for automated operations
FISCAL_AUTO_CASHIER=AUTO-SYSTEM

# Timezone (for proper time calculations)
FISCAL_TIMEZONE=Europe/Kiev

# Casa.vchasno API token (required for fiscal operations)
CASA_VCHASNO_TOKEN=your_api_token_here
```

### Optional Environment Variables

```bash
# Override existing fiscal automation
ENABLE_AUTO_FISCAL=false  # Legacy - will be deprecated
AUTO_CASHIER_NAME=LEGACY-AUTO  # Legacy - will be deprecated
```

## Database Schema

### New Collection: `fiscal_automation_queue`

```javascript
{
  "id": "string",
  "created": "datetime",
  "updated": "datetime",
  "order_id": "relation(orders)",  // Required
  "priority": "number",            // Default: 1
  "attempts": "number",            // Default: 0
  "last_attempt": "datetime",      // Optional
  "status": "select(pending,processing,completed,failed)",
  "error_message": "text",         // Optional
  "scheduled_for": "datetime"      // Optional - when to process
}
```

## API Reference

### Core Functions

#### `processFiscalOrder(orderId: string)`
Main entry point for processing an order. Automatically decides whether to process immediately or queue based on current time.

#### `processQueuedFiscalOrders()`
Processes all pending orders in the queue. Called automatically at business start or manually via UI.

#### `autoOpenFiscalShift()` / `autoCloseFiscalShift()`
Automatically manage fiscal shifts. Called at business start/end times.

#### `getFiscalSchedulerStatus()`
Get current scheduler configuration and status.

### Queue Management Functions

#### `getFiscalQueueStats()`
Get queue statistics (total, pending, processing, completed, failed).

#### `getFiscalQueueItems(page, perPage, status?)`
Get paginated list of queue items with optional status filter.

#### `retryFiscalQueueItem(queueId)`
Retry a failed queue item.

#### `removeFiscalQueueItem(queueId)`
Remove a queue item from the database.

## User Interface

### Fiscal Management Page
- **Dashboard Tab**: Overview of fiscal activity and shift status
- **Receipt Management Tab**: Completed orders without receipts
- **Automation Queue Tab**: Queue management and monitoring ⭐ NEW

### Automation Queue Features
- **Real-time Status**: Current automation configuration and business hours
- **Queue Statistics**: Visual overview of queue status
- **Queue Items**: List of pending/failed items with retry/remove actions
- **Manual Processing**: Force process queue outside business hours

## Testing

### Test Script
```bash
npm run test:fiscal-automation
```

The test script validates:
- ✅ Scheduler configuration
- ✅ Queue statistics
- ✅ Business hours logic
- ✅ Environment variables
- ✅ Database connectivity

### Test Mode Features
- **Safe Testing**: Test mode prevents actual fiscal API calls
- **Accelerated Timeline**: Test full day cycle in minutes
- **Mock Receipts**: Generate test receipts for validation
- **Detailed Logging**: Enhanced logging for debugging

## Integration

### Existing Automation
The scheduler integrates seamlessly with existing fiscal automation:
- **Fallback**: If scheduler fails, falls back to immediate processing
- **Compatibility**: Works with existing `ENABLE_AUTO_FISCAL` setting
- **Migration**: Gradually replace legacy automation

### Order Status Changes
Automatically triggered when order status changes to completed:
- **Rozetka**: Marketplace code "6" (delivered)
- **Prom.ua**: Marketplace code "completed"
- **Epicentr**: Marketplace code "delivered"

### Notification Integration
- **Telegram**: Fiscal receipt notifications via existing Telegram service
- **Queue Summaries**: Daily reports of queue processing results

## Production Deployment

### Phase 1: Test Mode (Week 1)
```bash
ENABLE_FISCAL_AUTOMATION=true
FISCAL_AUTOMATION_TEST_MODE=true
FISCAL_START_HOUR=10
FISCAL_END_HOUR=20
```

### Phase 2: Limited Hours (Week 2)
```bash
ENABLE_FISCAL_AUTOMATION=true
FISCAL_AUTOMATION_TEST_MODE=false
FISCAL_START_HOUR=10
FISCAL_END_HOUR=20
```

### Phase 3: Full Production (Week 3+)
```bash
ENABLE_FISCAL_AUTOMATION=true
FISCAL_AUTOMATION_TEST_MODE=false
FISCAL_START_HOUR=8
FISCAL_END_HOUR=22
```

## Monitoring

### Logs
- **Scheduler Operations**: `[FiscalScheduler]` prefix
- **Queue Processing**: `[FiscalQueue]` prefix
- **Integration**: `[AutoFiscal]` prefix for legacy compatibility

### Queue Dashboard
- **Real-time Metrics**: Live queue statistics
- **Failed Items**: Immediate visibility of processing failures
- **Retry Actions**: One-click retry for failed items

### Alerts
- **Failed Processing**: Monitor failed queue items
- **Shift Issues**: Automatic shift open/close failures
- **Configuration**: Missing environment variables

## Troubleshooting

### Common Issues

#### Automation Not Working
1. Check `ENABLE_FISCAL_AUTOMATION=true`
2. Verify `CASA_VCHASNO_TOKEN` is set
3. Ensure business hours are configured correctly
4. Check fiscal_automation_queue collection exists

#### Queue Items Not Processing
1. Verify fiscal shift is open
2. Check business hours configuration
3. Review error messages in queue items
4. Try manual queue processing

#### Shift Management Issues
1. Verify Casa.vchasno API connectivity
2. Check cashier permissions
3. Review fiscal device status
4. Use manual shift operations as fallback

### Debug Commands

```bash
# Test scheduler configuration
npm run test:fiscal-automation

# Check queue status
# (Use UI: Fiscal → Automation Queue tab)

# Manual queue processing
# (Use UI: Automation Queue → Process Queue button)
```

## Future Enhancements

### Planned Features
- **Webhooks**: HTTP callbacks for queue events
- **Advanced Scheduling**: Custom schedules for different order types
- **Batch Processing**: Bulk operations for large queues
- **Analytics**: Detailed reports on automation performance

### API Extensions
- **REST Endpoints**: HTTP API for external integrations
- **GraphQL**: Flexible query interface for queue data
- **Webhooks**: Real-time notifications for external systems

---

## Quick Start

1. **Enable automation**: Set `ENABLE_FISCAL_AUTOMATION=true`
2. **Configure hours**: Set `FISCAL_START_HOUR` and `FISCAL_END_HOUR`
3. **Set cashier**: Set `FISCAL_AUTO_CASHIER`
4. **Test configuration**: Run `npm run test:fiscal-automation`
5. **Monitor queue**: Visit Fiscal → Automation Queue tab

The system will automatically:
- ✅ Open shifts at business start
- ✅ Process completed orders during business hours
- ✅ Queue orders outside business hours
- ✅ Close shifts and generate Z-reports at business end
- ✅ Provide complete audit trail and monitoring

**Ready for fiscal automation! 🚀**
