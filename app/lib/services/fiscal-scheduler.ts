import { format, setHours, setMinutes, setSeconds, addDays } from 'date-fns';
import pb from '@/app/lib/pocketbase';
import { openShift, createZReport, getCurrentShift } from '@/app/[locale]/orders/actions/fiscal-receipts';
import { ShiftStatus, ShiftStatusInfo } from '@/app/types/casa-vchasno';
import { OrdersResponse } from '@/app/types/pocketbase-types';
import { FiscalQueueManager } from '@/app/lib/queues/fiscal-queue';
import {
  trackOrderQueued,
  trackOrderProcessedImmediately,
  trackShiftOperation,
  trackBatchProcessing,
  trackSchedulerStatus,
} from '@/app/lib/services/posthog-fiscal';

export interface FiscalSchedulerConfig {
  enabled: boolean;
  testMode: boolean;
  startHour: number;
  endHour: number;
  cashierName: string;
  timezone: string;
}

export interface QueuedOrder {
  id: string;
  order_id: string;
  created: string;
  priority: number;
  attempts: number;
  last_attempt?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message?: string;
  scheduled_for?: string;
}

export interface ProcessingResult {
  processed: number;
  failed: number;
  skipped: number;
  errors: string[];
}

export class FiscalScheduler {
  private config: FiscalSchedulerConfig;
  private static instance: FiscalScheduler;

  private constructor() {
    this.config = {
      enabled: process.env.ENABLE_FISCAL_AUTOMATION === 'true',
      testMode: process.env.FISCAL_AUTOMATION_TEST_MODE === 'true',
      startHour: parseInt(process.env.FISCAL_START_HOUR || '8', 10),
      endHour: parseInt(process.env.FISCAL_END_HOUR || '22', 10),
      cashierName: process.env.FISCAL_AUTO_CASHIER || 'AUTO-SYSTEM',
      timezone: process.env.FISCAL_TIMEZONE || 'Europe/Kiev'
    };

    console.log('[FiscalScheduler] Configuration:');
    console.log(`  Enabled: ${this.config.enabled}`);
    console.log(`  Test Mode: ${this.config.testMode}`);
    console.log(`  Business Hours: ${this.config.startHour}:00 - ${this.config.endHour}:00`);
    console.log(`  Timezone: ${this.config.timezone}`);
    console.log(`  Auto Cashier: ${this.config.cashierName}`);
  }

  static getInstance(): FiscalScheduler {
    if (!FiscalScheduler.instance) {
      FiscalScheduler.instance = new FiscalScheduler();
    }
    return FiscalScheduler.instance;
  }

  /**
   * Check if current time is within business hours
   * Note: Using local timezone for simplicity. For production, consider proper timezone handling.
   */
  isBusinessHours(date: Date = new Date()): boolean {
    const currentHour = date.getHours();
    return currentHour >= this.config.startHour && currentHour < this.config.endHour;
  }

  /**
   * Get next business day start time
   */
  getNextBusinessStart(date: Date = new Date()): Date {
    let nextStart = setHours(setMinutes(setSeconds(date, 0), 0), this.config.startHour);
    
    // If we're past business hours today, schedule for tomorrow
    if (date.getHours() >= this.config.endHour) {
      nextStart = addDays(nextStart, 1);
    }
    
    return nextStart;
  }

  /**
   * Get today's business end time
   */
  getTodayBusinessEnd(date: Date = new Date()): Date {
    return setHours(setMinutes(setSeconds(date, 0), 0), this.config.endHour);
  }

  /**
   * Check if an order should be processed immediately or queued
   */
  shouldProcessImmediately(date: Date = new Date()): boolean {
    if (!this.config.enabled) {
      console.log('[FiscalScheduler] Automation disabled');
      return false;
    }

    const inBusinessHours = this.isBusinessHours(date);
    console.log(`[FiscalScheduler] Business hours check: ${inBusinessHours} (current time: ${format(date, 'HH:mm')})`);
    
    return inBusinessHours;
  }

  /**
   * Add order to database queue with PostHog tracking
   */
  async queueOrder(orderId: string, priority: number = 1): Promise<void> {
    try {
      console.log(`[FiscalScheduler] Queueing order ${orderId} for later processing`);

      const scheduledFor = this.getNextBusinessStart();
      
      // Get order details for tracking
      const order = await pb.collection('orders').getOne<OrdersResponse>(orderId, {
        expand: 'status,source,currency,paymentMethod,deliveryMethod'
      });

      // Add directly to Redis/BullMQ queue with delay until next business start
      const delay = Math.max(0, scheduledFor.getTime() - Date.now());
      await FiscalQueueManager.addFiscalJob(orderId, order.orderNumber, {
        priority: priority,
        delay: delay,
        scheduledFor: scheduledFor,
        businessHours: false
      });

      // Track in PostHog for analytics
      try {
        await trackOrderQueued(orderId, order, scheduledFor, priority);
      } catch (trackingError) {
        console.warn(`[FiscalScheduler] PostHog tracking failed for queued order ${orderId}:`, trackingError);
      }

      console.log(`[FiscalScheduler] Order ${orderId} queued for processing at ${format(scheduledFor, 'yyyy-MM-dd HH:mm')}`);
    } catch (error) {
      console.error(`[FiscalScheduler] Failed to queue order ${orderId}:`, error);
      throw error;
    }
  }

  /**
   * Get count of orders in queue from BullMQ
   */
  async getQueuedOrdersCount(): Promise<number> {
    try {
      const stats = await FiscalQueueManager.getQueueStats();
      return stats.waiting + stats.delayed;
    } catch (error) {
      console.error('[FiscalScheduler] Failed to get queue count:', error);
      return 0;
    }
  }

  /**
   * Get queued orders ready for processing (deprecated - BullMQ manages this internally)
   */
  async getQueuedOrders(): Promise<QueuedOrder[]> {
    try {
      console.warn('[FiscalScheduler] getQueuedOrders is deprecated with BullMQ queue - use processQueuedOrders instead');
      return [];
    } catch (error) {
      console.error('[FiscalScheduler] Failed to get queued orders:', error);
      return [];
    }
  }

  // Legacy database queue processing methods removed - BullMQ handles all job processing

  /**
   * Process all queued orders using BullMQ
   */
  async processQueuedOrders(): Promise<ProcessingResult> {
    if (!this.isBusinessHours()) {
      console.log('[FiscalScheduler] Not in business hours, skipping queue processing');
      return { processed: 0, failed: 0, skipped: 0, errors: [] };
    }

    const processingStartTime = new Date();
    const result: ProcessingResult = {
      processed: 0,
      failed: 0,
      skipped: 0,
      errors: []
    };

    try {
      console.log('[FiscalScheduler] Starting to process queued orders via BullMQ');
      
      // Get queue status from BullMQ
      const queuedCount = await this.getQueuedOrdersCount();
      console.log(`[FiscalScheduler] Queue status: ${queuedCount} pending orders in BullMQ`);

      if (queuedCount === 0) {
        // Track empty batch processing
        try {
          await trackBatchProcessing(result, 0, processingStartTime);
        } catch (trackingError) {
          console.warn('[FiscalScheduler] PostHog tracking failed for empty batch:', trackingError);
        }
        return result;
      }

      // Ensure shift is open before processing
      const shiftResult = await getCurrentShift();
      if (!shiftResult.success || !shiftResult.data?.items?.[0] || 
          (shiftResult.data.items[0] as ShiftStatusInfo).shift_status !== ShiftStatus.OPEN) {
        console.log('[FiscalScheduler] No open shift found, attempting to open shift');
        const openResult = await this.autoOpenShift();
        if (!openResult) {
          result.errors.push('Failed to open shift for processing');
          
          // Track batch processing failure
          try {
            await trackBatchProcessing(result, queuedCount, processingStartTime);
          } catch (trackingError) {
            console.warn('[FiscalScheduler] PostHog tracking failed for shift failure:', trackingError);
          }
          
          return result;
        }
      }

      // BullMQ handles job processing automatically via workers
      // This method is now mainly for shift management and tracking
      console.log('[FiscalScheduler] BullMQ workers are processing jobs automatically');
      
      // Track batch processing completion
      try {
        await trackBatchProcessing(result, queuedCount, processingStartTime);
      } catch (trackingError) {
        console.warn('[FiscalScheduler] PostHog tracking failed for batch completion:', trackingError);
      }
    } catch (error) {
      console.error('[FiscalScheduler] Error processing queue:', error);
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
      
      // Track batch processing error
      try {
        await trackBatchProcessing(result, 0, processingStartTime);
      } catch (trackingError) {
        console.warn('[FiscalScheduler] PostHog tracking failed for batch error:', trackingError);
      }
    }

    return result;
  }

  // Note: Database batch processing removed - BullMQ handles job processing automatically

  /**
   * Automatically open shift if needed
   */
  async autoOpenShift(): Promise<boolean> {
    try {
      console.log('[FiscalScheduler] Auto-opening fiscal shift');
      
      const result = await openShift(this.config.cashierName);
      if (result.success) {
        console.log(`[FiscalScheduler] Successfully opened shift with cashier: ${this.config.cashierName}`);
        
        // Track successful shift opening
        try {
          await trackShiftOperation('open', true, this.config.cashierName, result.data as unknown as Record<string, unknown>);
        } catch (trackingError) {
          console.warn('[FiscalScheduler] PostHog tracking failed for shift open:', trackingError);
        }
        
        return true;
      } else {
        console.error(`[FiscalScheduler] Failed to open shift: ${result.error}`);
        
        // Track failed shift opening
        try {
          await trackShiftOperation('open', false, this.config.cashierName, undefined, result.error);
        } catch (trackingError) {
          console.warn('[FiscalScheduler] PostHog tracking failed for shift open error:', trackingError);
        }
        
        return false;
      }
    } catch (error) {
      console.error('[FiscalScheduler] Error auto-opening shift:', error);
      
      // Track shift opening exception
      try {
        await trackShiftOperation(
          'open',
          false,
          this.config.cashierName,
          undefined,
          error instanceof Error ? error.message : 'Unknown error'
        );
      } catch (trackingError) {
        console.warn('[FiscalScheduler] PostHog tracking failed for shift open exception:', trackingError);
      }
      
      return false;
    }
  }

  /**
   * Automatically close shift and generate Z-report
   */
  async autoCloseShift(): Promise<boolean> {
    try {
      console.log('[FiscalScheduler] Auto-closing fiscal shift');
      
      const result = await createZReport(this.config.cashierName);
      if (result.success) {
        console.log('[FiscalScheduler] Successfully closed shift and generated Z-report');
        
        // Track successful shift closing
        try {
          await trackShiftOperation('close', true, this.config.cashierName, result.data as unknown as Record<string, unknown>);
        } catch (trackingError) {
          console.warn('[FiscalScheduler] PostHog tracking failed for shift close:', trackingError);
        }
        
        return true;
      } else {
        console.error(`[FiscalScheduler] Failed to close shift: ${result.error}`);
        
        // Track failed shift closing
        try {
          await trackShiftOperation('close', false, this.config.cashierName, undefined, result.error);
        } catch (trackingError) {
          console.warn('[FiscalScheduler] PostHog tracking failed for shift close error:', trackingError);
        }
        
        return false;
      }
    } catch (error) {
      console.error('[FiscalScheduler] Error auto-closing shift:', error);
      
      // Track shift closing exception
      try {
        await trackShiftOperation(
          'close',
          false,
          this.config.cashierName,
          undefined,
          error instanceof Error ? error.message : 'Unknown error'
        );
      } catch (trackingError) {
        console.warn('[FiscalScheduler] PostHog tracking failed for shift close exception:', trackingError);
      }
      
      return false;
    }
  }

  // Database queue helper methods removed - BullMQ handles job state management

  /**
   * Main entry point for processing an order
   * Decides whether to process immediately or queue for later
   */
  async processOrder(orderId: string): Promise<void> {
    const processingStartTime = new Date();
    
    try {
      if (!this.config.enabled) {
        console.log(`[FiscalScheduler] Automation disabled, skipping order ${orderId}`);
        return;
      }

      console.log(`[FiscalScheduler] Processing order ${orderId}`);

      // Get order details early for tracking
      const order = await pb.collection('orders').getOne<OrdersResponse>(orderId, {
        expand: 'status,source,currency,paymentMethod,deliveryMethod'
      });

      if (this.shouldProcessImmediately()) {
        console.log(`[FiscalScheduler] Processing order ${orderId} immediately`);
        
        // Track immediate processing
        try {
          await trackOrderProcessedImmediately(orderId, order, processingStartTime);
        } catch (trackingError) {
          console.warn(`[FiscalScheduler] PostHog tracking failed for immediate processing ${orderId}:`, trackingError);
        }
        
        // Process immediately using existing fiscal automation service
        const { processFiscalAutomation } = await import('./fiscal-automation');
        
        const statusRecord = (order.expand as Record<string, unknown>)?.status as { id: string } | undefined;
        if (statusRecord?.id) {
          await processFiscalAutomation(orderId, statusRecord.id);
        }
      } else {
        console.log(`[FiscalScheduler] Queueing order ${orderId} for next business day`);
        await this.queueOrder(orderId);
      }
    } catch (error) {
      console.error(`[FiscalScheduler] Error processing order ${orderId}:`, error);
    }
  }

  /**
   * Get scheduler status and statistics
   */
  async getStatus(): Promise<{
    enabled: boolean;
    testMode: boolean;
    businessHours: boolean;
    queuedOrders: number;
    nextBusinessStart: string;
    config: FiscalSchedulerConfig;
  }> {
    const queuedOrders = await this.getQueuedOrdersCount();
    const nextBusinessStart = this.getNextBusinessStart();
    const businessHours = this.isBusinessHours();
    
    // Track scheduler status
    try {
      await trackSchedulerStatus(
        this.config.enabled,
        this.config.testMode,
        businessHours,
        queuedOrders,
        nextBusinessStart.toISOString()
      );
    } catch (trackingError) {
      console.warn('[FiscalScheduler] PostHog tracking failed for scheduler status:', trackingError);
    }
    
    return {
      enabled: this.config.enabled,
      testMode: this.config.testMode,
      businessHours,
      queuedOrders,
      nextBusinessStart: nextBusinessStart.toISOString(),
      config: this.config
    };
  }
}

// Export singleton instance
export const fiscalScheduler = FiscalScheduler.getInstance();

// Export main functions
export async function processFiscalOrder(orderId: string): Promise<void> {
  return fiscalScheduler.processOrder(orderId);
}

export async function processQueuedFiscalOrders(): Promise<ProcessingResult> {
  return fiscalScheduler.processQueuedOrders();
}

export async function autoOpenFiscalShift(): Promise<boolean> {
  return fiscalScheduler.autoOpenShift();
}

export async function autoCloseFiscalShift(): Promise<boolean> {
  return fiscalScheduler.autoCloseShift();
}

export async function getFiscalSchedulerStatus() {
  return fiscalScheduler.getStatus();
}
