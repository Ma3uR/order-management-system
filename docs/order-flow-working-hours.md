# Complete Order Flow: From Creation to Bill Generation with Working Hours

## Overview

This document describes the complete flow of how orders are processed in the Order Management System, specifically focusing on the working hours queue mechanism where orders received after 22:00 are queued and processed starting at 8:00 the next day with automatic bill creation.

## System Architecture Components

### 1. Core Components
- **Redis**: Message broker for BullMQ job queues
- **BullMQ**: Job queue system for order processing
- **PostHog**: Analytics and event tracking
- **PocketBase**: Database for orders, queues, and fiscal receipts
- **Casa.vchasno**: Fiscal receipt service for bill generation
- **Telegram**: Notifications for processed orders

### 2. Key Services
- **FiscalScheduler**: Manages working hours and order queuing
- **FiscalQueue**: BullMQ-based processing queue
- **StatusAutomation**: Marketplace order automation
- **FiscalAutomation**: Bill creation and receipt management

## Complete Order Flow

### Phase 1: Order Creation (Marketplace → System)

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Marketplace   │ => │  Order Created  │ => │ Status Detected │
│ (Rozetka/Prom)  │    │   (New Status)  │    │   as "New"      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

**Step 1: Order Detection**
- Marketplace APIs sync orders every few minutes
- System detects new orders with "New" status
- Order data is stored in PocketBase database

**Step 2: Status Automation Trigger**
```typescript
// app/lib/services/status-automation.ts
async processOrderAutomation(order: AutomationOrder, orderDbId: string, sourceId: string)
```

**Step 3: Status Update (No Fiscal Trigger Yet)**
- Order status changes from "New" → "Processing" in marketplace
- Local database status updated
- **No fiscal automation triggered** - receipts only created for completed orders

### Phase 2: Order Completion & Fiscal Processing Decision

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Order Status    │ => │ Fiscal Trigger  │ => │ Working Hours   │
│ Changed to      │    │ (Completed/     │    │ Check (8-22)    │
│ "COMPLETED"     │    │  Delivered)     │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                 │                      │
                                 │                      │
                          ┌──────▼──────┐      ┌────────▼────────┐
                          │ 8:00-22:00  │      │ 22:00-8:00     │
                          │ IMMEDIATE   │      │ QUEUE FOR      │
                          │ PROCESSING  │      │ NEXT DAY       │
                          └─────────────┘      └─────────────────┘
```

**Important Note**: Fiscal automation is only triggered when orders reach **completed/delivered** status (marketplace codes: '6', 'completed', 'delivered'), not when they change to "processing" status.

**Working Hours Configuration:**
- **Start Hour**: 8:00 (configurable via `FISCAL_START_HOUR`)
- **End Hour**: 22:00 (configurable via `FISCAL_END_HOUR`)
- **Timezone**: Europe/Kiev (configurable via `FISCAL_TIMEZONE`)

### Phase 3A: Immediate Processing (During Working Hours 8:00-22:00)

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Fiscal Process  │ => │ Receipt Created │ => │ Telegram Sent  │
│ (Casa.vchasno)  │    │ (Bill/Invoice)  │    │ (Notification)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

**Code Flow:**
```typescript
// app/lib/services/fiscal-scheduler.ts
if (this.shouldProcessImmediately()) {
  // Process immediately using fiscal automation
  const { processFiscalAutomation } = await import('./fiscal-automation');
  await processFiscalAutomation(orderId, statusRecord.id);
}
```

**Immediate Processing Steps:**
1. **Receipt Creation**: Casa.vchasno API creates fiscal receipt (bill)
2. **Database Update**: Receipt stored in `fiscal_receipts` table
3. **PostHog Tracking**: Success/failure events tracked
4. **Telegram Notification**: Receipt details sent to configured chat

### Phase 3B: Queue Processing (After Working Hours 22:00-8:00)

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Order Received  │ => │ Added to Queue  │ => │ Scheduled for   │
│ After 22:00     │    │ (Database +     │    │ Next 8:00 AM   │
│                 │    │  PostHog)       │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

**Queue Addition Process:**
```typescript
// app/lib/services/fiscal-scheduler.ts
async queueOrder(orderId: string, priority: number = 1) {
  const scheduledFor = this.getNextBusinessStart(); // Next day at 8:00
  
  // Add to database queue
  await pb.collection('fiscal_automation_queue').create({
    order_id: orderId,
    priority,
    attempts: 0,
    status: 'pending',
    scheduled_for: scheduledFor.toISOString()
  });
  
  // Track in PostHog
  await enqueueOrderForProcessing(order, scheduledFor, priority, false);
}
```

### Phase 4: Queue Processing (Starting at 8:00 AM)

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ 8:00 AM Starts  │ => │ Queue Processor │ => │ Batch Processing│
│ Business Hours  │    │ Activates       │    │ (10 orders/batch)│
└─────────────────┘    └─────────────────┘    └─────────────────┘
          │                                            │
          │              ┌─────────────────┐           │
          └──────────────▶│ Shift Management│◄──────────┘
                         │ (Auto Open)     │
                         └─────────────────┘
```

**Queue Processing Flow:**
```typescript
// app/lib/services/fiscal-scheduler.ts
async processQueuedOrders(): Promise<ProcessingResult> {
  if (!this.isBusinessHours()) return; // Only process during 8-22
  
  // Auto-open fiscal shift if needed
  await this.autoOpenShift();
  
  // Process in batches of 10
  while (hasMore && this.isBusinessHours()) {
    const batch = await this.processBatch(10);
    // Small delay between batches
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}
```

### Phase 5: Individual Order Processing (Bill Creation)

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Get Queued      │ => │ Verify Order    │ => │ Create Fiscal   │
│ Order from DB   │    │ Still Needs     │    │ Receipt (Bill)  │
│                 │    │ Processing      │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
          │                      │                      │
          │                      │                      │
┌─────────▼─────────┐  ┌─────────▼─────────┐  ┌─────────▼─────────┐
│ PostHog Tracking  │  │ Status Check      │  │ Casa.vchasno API  │
│ (Dequeue Event)   │  │ (Still Completed?)│  │ (Receipt/Invoice) │
└───────────────────┘  └───────────────────┘  └───────────────────┘
```

**Processing Logic:**
```typescript
// app/lib/services/fiscal-scheduler.ts
private async processBatch(batchSize: number) {
  const queuedOrders = await pb.collection('fiscal_automation_queue')
    .getList(1, batchSize, {
      filter: 'status = "pending"',
      sort: 'priority,-created'
    });

  for (const queueItem of queuedOrders.items) {
    // Track dequeue in PostHog
    await dequeueOrderForProcessing(orderId, orderNumber, attempts);
    
    // Get order details
    const order = await pb.collection('orders').getOne(orderId);
    
    // Create fiscal receipt (bill)
    const receiptResult = await createSaleReceipt(orderId, cashierName);
    
    if (receiptResult.success) {
      // Mark completed & send notification
      await this.markCompleted(queueItem.id);
      await sendFiscalNotification(order, receiptResult.data);
    }
  }
}
```

### Phase 6: Bill Creation & Notification

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Casa.vchasno    │ => │ Receipt Data    │ => │ Database        │
│ API Call        │    │ (Bill Details)  │    │ Storage         │
│ (Sale Receipt)  │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
          │                      │                      │
          │                      │                      │
┌─────────▼─────────┐  ┌─────────▼─────────┐  ┌─────────▼─────────┐
│ PostHog Analytics │  │ Telegram Bot      │  │ Queue Cleanup     │
│ (Success/Failure) │  │ (Receipt Details) │  │ (Mark Completed)  │
└───────────────────┘  └───────────────────┘  └───────────────────┘
```

**Bill Creation Process:**
```typescript
// app/[locale]/orders/actions/fiscal-receipts.ts
export async function createSaleReceipt(orderId: string, cashierName: string) {
  // Get order details
  const order = await pb.collection('orders').getOne(orderId);
  
  // Create receipt via Casa.vchasno
  const casaResponse = await casaVchasnoService.createSaleReceipt(order, cashierName);
  
  // Save to database
  await pb.collection('fiscal_receipts').create({
    order_id: orderId,
    receipt_type: 'sale',
    status: casaResponse.res === 0 ? 'success' : 'failed',
    casa_response: casaResponse,
    created_at: new Date().toISOString()
  });
  
  return { success: casaResponse.res === 0, data: casaResponse };
}
```

## Detailed Time-Based Flow Example

### Scenario: Order Received at 23:30

**23:30 - Order Creation:**
```
[Marketplace] Rozetka order #12345 created
[System] Status: "New" → "Processing" (no fiscal trigger)
[Later] Status: "Processing" → "Completed" (fiscal trigger)
[FiscalScheduler] isBusinessHours(23:30) = false
[Action] Queue order for next business day (8:00 AM)
```

**23:31 - Queue Addition:**
```
[BullMQ] Redis job created:
  - job_id: "fiscal-automation-123"
  - order_id: "order123"
  - scheduled_for: "2025-07-07T08:00:00.000Z"
  - priority: 1
  - delay: calculated until 8:00 AM

[PostHog] Event: order_queued
  - order_id: "order123"
  - scheduled_for: "tomorrow 8:00"
  - business_hours: false
```

**08:00 Next Day - Processing Starts:**
```
[BullMQ] Delayed jobs become active
[Worker] FiscalQueueProcessor picks up job
[Check] isBusinessHours(08:00) = true
[Shift] Auto-open fiscal shift with cashier "AUTO-SYSTEM"
[Queue] Processing job for order #12345
```

**08:01 - Order Processing:**
```
[Process] Order #12345 dequeued
[PostHog] Event: order_dequeued
[Verify] Order still has "completed" status ✓
[Check] No existing fiscal receipt ✓
[API] Casa.vchasno createSaleReceipt() called
```

**08:02 - Bill Creation:**
```
[Casa.vchasno] Response:
  - res: 0 (success)
  - check_number: "001234"
  - fiscal_number: "FN12345"
  - receipt_url: "https://casa.vchasno/receipt/..."

[Database] fiscal_receipts created:
  - order_id: "order123"
  - receipt_type: "sale"
  - status: "success"
  - casa_response: {...}
```

**08:03 - Notifications:**
```
[PostHog] Event: receipt_created_success
[Telegram] Fiscal notification sent:
  "📄 Fiscal receipt created for order #12345
   Receipt: 001234
   Amount: 1,250.00 ₴
   Link: https://casa.vchasno/receipt/..."

[BullMQ] Job marked as completed and removed from queue
```

## Error Handling & Retry Logic

### Failed Processing
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Processing      │ => │ Casa.vchasno    │ => │ Retry Logic     │
│ Fails           │    │ API Error       │    │ (Max 3 attempts)│
└─────────────────┘    └─────────────────┘    └─────────────────┘
          │                                            │
          │              ┌─────────────────┐           │
          └──────────────▶│ Exponential     │◄──────────┘
                         │ Backoff Delay   │
                         └─────────────────┘
```

**Retry Configuration:**
- **Max Attempts**: 3
- **Backoff**: Exponential (15min, 30min, 45min)
- **Final Status**: "failed" after 3 attempts

## PostHog Analytics Events

### Order Queue Events
```typescript
// Events tracked throughout the process
{
  "order_queued": {
    order_id: string,
    scheduled_for: string,
    business_hours: boolean,
    priority: number
  },
  
  "order_dequeued": {
    order_id: string,
    attempt_number: number,
    processing_time: Date
  },
  
  "receipt_created_success": {
    order_id: string,
    order_number: string,
    receipt_number: string,
    amount: number,
    processing_time_ms: number
  },
  
  "batch_processing_completed": {
    total_processed: number,
    total_failed: number,
    processing_time_ms: number,
    batch_start_time: string
  }
}
```

## Configuration Variables

### Environment Settings
```bash
# Working Hours
FISCAL_START_HOUR=8          # Start processing at 8:00 AM
FISCAL_END_HOUR=22           # Stop processing at 22:00 (10 PM)
FISCAL_TIMEZONE=Europe/Kiev   # Timezone for working hours

# Automation
ENABLE_FISCAL_AUTOMATION=true    # Enable/disable automation
FISCAL_AUTO_CASHIER=AUTO-SYSTEM  # Default cashier name

# Redis/Queue
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=testpassword123

# Casa.vchasno
CASA_VCHASNO_API_URL=https://api.casa.vchasno.ua
CASA_VCHASNO_TOKEN=your_token_here
```

## Queue Management Commands

### Manual Queue Operations
```bash
# Check queue status
curl "http://localhost:3000/api/queue?action=status"

# Get queue statistics  
curl "http://localhost:3000/api/queue?action=stats"

# Pause queue processing
curl -X POST "http://localhost:3000/api/queue?action=pause"

# Resume queue processing
curl -X POST "http://localhost:3000/api/queue?action=resume"

# Clean old completed jobs
curl -X POST "http://localhost:3000/api/queue?action=clean"
```

### BullMQ Queue Monitoring
```bash
# Check queue statistics via API
curl "http://localhost:3000/api/queue?action=stats"

# Response example:
# {
#   "waiting": 5,
#   "active": 2, 
#   "completed": 150,
#   "failed": 3,
#   "delayed": 10,
#   "total": 17
# }

# Check detailed queue status
curl "http://localhost:3000/api/queue?action=status"
```

### Redis Queue Inspection
```bash
# Connect to Redis and inspect BullMQ data
redis-cli

# List all fiscal automation jobs
SMEMBERS "bull:fiscal-automation:*"

# Get waiting jobs
LRANGE "bull:fiscal-automation:waiting" 0 -1

# Get delayed jobs
ZRANGE "bull:fiscal-automation:delayed" 0 -1 WITHSCORES
```

## Summary

The Order Management System implements a sophisticated working hours-based processing flow:

1. **Only completed orders trigger fiscal automation** - no bills created for "processing" status
2. **Orders completed during business hours (8:00-22:00)** are processed immediately with bill creation
3. **Orders completed after hours (22:00-8:00)** are queued for next business day processing  
4. **Queue processing starts at 8:00 AM** with automatic shift management
5. **Bills are created via Casa.vchasno API** with fiscal receipt generation
6. **All events are tracked in PostHog** for analytics and monitoring
7. **Telegram notifications** keep operators informed of processing status
8. **Redis/BullMQ provides reliable job queuing** with retry logic and error handling
9. **Database queue collection removed** - Redis/BullMQ handles all queue data

This ensures compliance with Ukrainian fiscal regulations while providing efficient order processing and proper business hour management.

---

*Last updated: 2025-07-06*
*Version: 1.0*
