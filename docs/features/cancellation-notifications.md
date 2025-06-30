# Cancellation Notifications Feature

## Overview

The Cancellation Notifications feature automatically sends Telegram alerts when an order status changes to "cancelled" from any status **except** "processing" (обробляється). This helps the team track customer cancellations and avoid preparing orders that have already been cancelled.

## Business Requirements

**Problem Statement**: 
- Customers sometimes cancel orders after they've been accepted
- The team continues preparing orders without knowing they've been cancelled
- This leads to wasted time and resources

**Solution**:
- Automatic Telegram notifications when orders are cancelled
- Excludes notifications from "processing" status (where admin cancellations are intentional)
- Real-time alerts to prevent unnecessary order preparation

## Technical Architecture

### Core Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Cancellation Notification Flow           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Order Status Change (UI/API)                              │
│           │                                                 │
│           ▼                                                 │
│  ┌─────────────────────┐                                    │
│  │ Status Change       │                                    │
│  │ Detection          │                                    │
│  │ (Dashboard/Sync)   │                                    │
│  └─────────────────────┘                                    │
│           │                                                 │
│           ▼                                                 │
│  ┌─────────────────────┐                                    │
│  │ Cancellation        │                                    │
│  │ Notification        │                                    │
│  │ Service             │                                    │
│  └─────────────────────┘                                    │
│           │                                                 │
│           ▼                                                 │
│  ┌─────────────────────┐     ┌─────────────────────┐        │
│  │ Status Analysis     │────▶│ Skip if Previous    │        │
│  │ (Is Cancelled?)     │     │ Status = Processing │        │
│  └─────────────────────┘     └─────────────────────┘        │
│           │                                                 │
│           ▼                                                 │
│  ┌─────────────────────┐                                    │
│  │ Telegram Service    │                                    │
│  │ Send Notification   │                                    │
│  └─────────────────────┘                                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### File Structure

```
app/
├── lib/services/
│   ├── cancellation-notifications.ts  # Core cancellation logic
│   └── telegram.ts                   # Enhanced with cancellation messages
├── components/features/orders/
│   └── dashboard/orders-dashboard.tsx # UI integration
└── actions/
    └── marketplace-status-sync.ts     # API integration
```

## Implementation Details

### 1. Cancellation Detection Service

**File**: `app/lib/services/cancellation-notifications.ts`

**Key Features**:
- Status ID to name resolution
- Smart cancellation detection (multiple language support)
- Processing status exclusion logic
- Order data formatting for notifications

**Status Detection Logic**:
```typescript
// Cancelled status detection
statusName.includes('скасовано') ||
statusName.includes('cancelled') ||
statusName.includes('canceled')

// Processing status detection (exclusion)
statusName.includes('обробляється') ||
statusName.includes('обробка') ||
statusName.includes('processing')
```

### 2. Telegram Message Enhancement

**File**: `app/lib/services/telegram.ts`

**New Interface**:
```typescript
interface CancellationData {
  orderNumber: string;
  previousStatusName: string;
  newStatusName: string;
  fullName: string;
  phoneNumber: string;
  totalAmount: number;
  currency?: string;
  sourceName?: string;
  products: Array<{
    title: string;
    quantity: number;
    price?: number;
  }>;
}
```

**Message Format**:
```
🚫 СКАСУВАННЯ ЗАМОВЛЕННЯ

№{orderNumber}
Джерело: {sourceName}
Попередній статус: {previousStatus}
Клієнт: {fullName}
Телефон: {phoneNumber}

{productsList}

{totalItems} позиції
Сума: {amount} ₴

⚠️ Замовлення скасовано: {newStatus}
```

### 3. Integration Points

#### Orders Dashboard Integration
**File**: `app/components/features/orders/components/dashboard/orders-dashboard.tsx`

- Integrated into `handleStatusChange()` function
- Captures previous status before update
- Non-blocking notification processing
- Error handling that doesn't affect main operation

#### Marketplace Sync Integration
**File**: `app/actions/marketplace-status-sync.ts`

- Integrated into `updateOrderStatusWithSync()` function
- Handles both manual and automated status changes
- Ensures notifications for marketplace-initiated cancellations

## Configuration

### Environment Variables

The feature uses existing automation configuration:

```bash
# Required for cancellation notifications
ENABLE_STATUS_AUTOMATION=true
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id
```

### Status Configuration

**Supported Cancellation Status Names**:
- Ukrainian: "скасовано"
- English: "cancelled", "canceled"
- Case-insensitive matching

**Processing Status Names (Excluded)**:
- Ukrainian: "обробляється", "обробка", "в роботі"
- English: "processing"
- Case-insensitive matching

## Usage Examples

### Manual Status Change (Dashboard)

1. User selects order in dashboard
2. Changes status from "Нове замовлення" to "Скасовано"
3. System detects cancellation
4. Telegram notification sent automatically

### Marketplace-Initiated Cancellation

1. Customer cancels order on marketplace (Rozetka/Prom/Epicentr)
2. Marketplace webhook triggers status sync
3. Local status updated to cancelled
4. Cancellation notification triggered

### Processing Status Exclusion

1. Admin changes status from "Обробляється" to "Скасовано"
2. System detects processing → cancelled transition
3. Notification skipped (as requested)
4. Log entry created explaining why notification was skipped

## Error Handling

### Graceful Degradation

```typescript
// Non-blocking notification processing
try {
  const cancellationResult = await processCancellationNotification(/*...*/);
  // Handle result...
} catch (cancellationError) {
  console.warn('⚠️ Error processing cancellation notification:', cancellationError);
  // Main operation continues normally
}
```

### Error Scenarios

1. **Telegram API Failure**: Order update succeeds, notification logged as failed
2. **Status Resolution Failure**: Fallback to status ID comparison
3. **Network Issues**: Retry logic with timeout handling
4. **Configuration Missing**: Graceful skip with appropriate logging

## Monitoring and Logging

### Log Levels

**Success Cases**:
```
🚫 Order 12345 cancelled: Нове замовлення → Скасовано
📱 Cancellation notification sent for order 12345
```

**Skipped Cases**:
```
🚫 Skipping cancellation notification for order 12345: previous status was processing (Обробляється)
🚫 Cancellation notification skipped for order 12345: New status is not cancelled
```

**Error Cases**:
```
⚠️ Cancellation notification failed for order 12345: Telegram request timeout
❌ Cancellation notification processing failed for order 12345: Failed to fetch status information
```

### Metrics to Monitor

- Cancellation notification success rate
- Response time for notification processing
- Telegram API error frequency
- Status detection accuracy

## Testing Scenarios

### Manual Testing

1. **Standard Cancellation**:
   - Create order with "Нове замовлення" status
   - Change to "Скасовано"
   - Verify notification received

2. **Processing Exclusion**:
   - Create order with "Обробляється" status
   - Change to "Скасовано"
   - Verify NO notification sent

3. **Multiple Cancellation Types**:
   - Test with "Скасовано", "Cancelled", "Canceled"
   - Verify all variants trigger notifications

4. **Error Handling**:
   - Disable Telegram temporarily
   - Verify order updates still work
   - Check error logging

### Automated Testing

```typescript
// Test cancellation detection
expect(isCancelledStatus({ name: 'Скасовано' })).toBe(true);
expect(isCancelledStatus({ name: 'Cancelled' })).toBe(true);
expect(isCancelledStatus({ name: 'В роботі' })).toBe(false);

// Test processing exclusion
expect(isProcessingStatus({ name: 'Обробляється' })).toBe(true);
expect(isProcessingStatus({ name: 'Processing' })).toBe(true);
```

## Performance Considerations

### Non-Blocking Operations

- Cancellation notifications processed asynchronously
- Main order update operations not affected by notification delays
- Timeout handling prevents hanging operations

### Resource Usage

- Minimal additional database queries (2 status lookups)
- Single Telegram API call per cancellation
- No impact on existing notification system

## Security Considerations

### Data Privacy

- Phone numbers formatted for display (380XX → 0XX XXX XX XX)
- No sensitive payment information in notifications
- Customer data limited to essential order details

### API Security

- Uses existing Telegram bot configuration
- No additional API keys required
- Rate limiting handled by Telegram service

## Troubleshooting

### Common Issues

1. **No Notifications Received**:
   - Check `ENABLE_STATUS_AUTOMATION=true`
   - Verify Telegram bot token and chat ID
   - Confirm status names match detection patterns

2. **Notifications for Processing Cancellations**:
   - Verify processing status names in database
   - Check status detection logic
   - Review console logs for exclusion reasons

3. **Incomplete Order Data**:
   - Check source name resolution
   - Verify product data structure
   - Review database field mappings

### Debug Commands

```bash
# Check automation status
grep "ENABLE_STATUS_AUTOMATION" .env

# Test Telegram configuration
curl -X POST "https://api.telegram.org/bot${BOT_TOKEN}/getMe"

# Monitor logs
tail -f logs/app.log | grep "🚫\|📱"
```

## Future Enhancements

### Potential Improvements

1. **Configurable Message Templates**: Allow customization of notification format
2. **Multiple Notification Channels**: Support for email, SMS, or other services
3. **Cancellation Analytics**: Track cancellation patterns and reasons
4. **Batch Notifications**: Group multiple cancellations in busy periods
5. **Customer-Specific Rules**: Different notification logic per customer type

### Integration Opportunities

1. **Inventory Management**: Automatic stock restoration on cancellation
2. **Financial Reporting**: Integration with revenue tracking
3. **Customer Service**: Automatic ticket creation for cancelled orders
4. **Analytics Dashboard**: Real-time cancellation monitoring

## Conclusion

The Cancellation Notifications feature provides essential real-time awareness of order cancellations while maintaining system reliability and performance. The implementation follows existing architecture patterns and integrates seamlessly with current workflows.

Key benefits:
- ✅ Prevents wasted preparation time
- ✅ Real-time team awareness
- ✅ Non-disruptive integration
- ✅ Configurable exclusion rules
- ✅ Comprehensive error handling