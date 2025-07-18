import { OrdersResponse } from '@/app/types/pocketbase-types';
import { postHogFiscal, trackFiscalEvent } from './posthog-fiscal';

export interface QueuedOrderEvent {
  order_id: string;
  order_number: string;
  queue_action: 'enqueue' | 'dequeue' | 'retry' | 'failed' | 'completed';
  priority: number;
  scheduled_for: string;
  business_hours: boolean;
  attempt_number: number;
  error_message?: string;
  processing_duration_ms?: number;
  queue_size_before?: number;
  queue_size_after?: number;
}

export interface QueueProcessingResult {
  processed: number;
  failed: number;
  skipped: number;
  errors: string[];
  processing_time_ms: number;
  queue_size_before: number;
  queue_size_after: number;
}

export class PostHogQueueService {
  private static instance: PostHogQueueService;
  private readonly enabled: boolean;
  private currentQueueSize: number = 0;

  private constructor() {
    this.enabled = !!process.env.POSTHOG_API_KEY;
    console.log(`[PostHogQueue] Queue service ${this.enabled ? 'enabled' : 'disabled'}`);
  }

  static getInstance(): PostHogQueueService {
    if (!PostHogQueueService.instance) {
      PostHogQueueService.instance = new PostHogQueueService();
    }
    return PostHogQueueService.instance;
  }

  /**
   * Add order to PostHog-based queue
   */
  async enqueueOrder(
    order: OrdersResponse,
    scheduledFor: Date,
    priority: number = 1,
    businessHours: boolean = false
  ): Promise<void> {
    if (!this.enabled) {
      console.log(`[PostHogQueue] Skipping enqueue for ${order.orderNumber} - PostHog disabled`);
      return;
    }

    try {
      const queueSizeBefore = this.currentQueueSize;
      this.currentQueueSize++;

      await trackFiscalEvent('fiscal_queue_enqueue', {
        order_id: order.id,
        order_number: order.orderNumber,
        event_timestamp: new Date().toISOString(),
        
        // Order details
        order_total: order.amount,
        order_currency: ((order.expand as Record<string, unknown>)?.currency as { code?: string })?.code,
        order_source: ((order.expand as Record<string, unknown>)?.source as { name?: string })?.name,
        order_status: ((order.expand as Record<string, unknown>)?.status as { name?: string })?.name,
        order_marketplace_code: ((order.expand as Record<string, unknown>)?.status as { marketplace_code?: string })?.marketplace_code,
        
        // Queue details
        queue_action: 'enqueue',
        queue_priority: priority,
        scheduled_for: scheduledFor.toISOString(),
        business_hours: businessHours,
        attempt_number: 1,
        queue_size_before: queueSizeBefore,
        queue_size_after: this.currentQueueSize,
        
        // Processing context
        processing_mode: businessHours ? 'immediate' : 'queued',
        automation_enabled: true,
        test_mode: process.env.FISCAL_AUTOMATION_TEST_MODE === 'true'
      });

      console.log(`[PostHogQueue] Enqueued order ${order.orderNumber} for ${scheduledFor.toISOString()}`);
    } catch (error) {
      console.error(`[PostHogQueue] Failed to enqueue order ${order.orderNumber}:`, error);
      throw error;
    }
  }

  /**
   * Mark order as being processed (dequeue)
   */
  async dequeueOrder(
    orderId: string,
    orderNumber: string,
    attemptNumber: number = 1
  ): Promise<void> {
    if (!this.enabled) return;

    try {
      const queueSizeBefore = this.currentQueueSize;
      this.currentQueueSize = Math.max(0, this.currentQueueSize - 1);

      await trackFiscalEvent('fiscal_queue_dequeue', {
        order_id: orderId,
        order_number: orderNumber,
        event_timestamp: new Date().toISOString(),
        queue_action: 'dequeue',
        attempt_number: attemptNumber,
        queue_size_before: queueSizeBefore,
        queue_size_after: this.currentQueueSize,
        processing_mode: 'immediate',
        business_hours: this.isBusinessHours()
      });

      console.log(`[PostHogQueue] Dequeued order ${orderNumber} (attempt ${attemptNumber})`);
    } catch (error) {
      console.error(`[PostHogQueue] Failed to dequeue order ${orderNumber}:`, error);
    }
  }

  /**
   * Mark order processing as completed
   */
  async completeOrder(
    orderId: string,
    orderNumber: string,
    processingStartTime: Date,
    success: boolean,
    errorMessage?: string
  ): Promise<void> {
    if (!this.enabled) return;

    try {
      const processingDuration = Date.now() - processingStartTime.getTime();

      await trackFiscalEvent('fiscal_queue_complete', {
        order_id: orderId,
        order_number: orderNumber,
        event_timestamp: new Date().toISOString(),
        queue_action: success ? 'completed' : 'failed',
        processing_duration_ms: processingDuration,
        processing_success: success,
        error_message: errorMessage,
        business_hours: this.isBusinessHours(),
        queue_size_after: this.currentQueueSize
      });

      console.log(`[PostHogQueue] Completed order ${orderNumber}: ${success ? 'success' : 'failed'}`);
    } catch (error) {
      console.error(`[PostHogQueue] Failed to complete order ${orderNumber}:`, error);
    }
  }

  /**
   * Mark order for retry
   */
  async retryOrder(
    orderId: string,
    orderNumber: string,
    attemptNumber: number,
    errorMessage: string,
    nextScheduledFor: Date
  ): Promise<void> {
    if (!this.enabled) return;

    try {
      await trackFiscalEvent('fiscal_queue_retry', {
        order_id: orderId,
        order_number: orderNumber,
        event_timestamp: new Date().toISOString(),
        queue_action: 'retry',
        attempt_number: attemptNumber,
        error_message: errorMessage,
        scheduled_for: nextScheduledFor.toISOString(),
        business_hours: this.isBusinessHours(),
        queue_size_after: this.currentQueueSize
      });

      console.log(`[PostHogQueue] Scheduled retry for order ${orderNumber} (attempt ${attemptNumber})`);
    } catch (error) {
      console.error(`[PostHogQueue] Failed to schedule retry for order ${orderNumber}:`, error);
    }
  }

  /**
   * Track batch processing results
   */
  async trackBatchProcessing(
    result: QueueProcessingResult
  ): Promise<void> {
    if (!this.enabled) return;

    try {
      await trackFiscalEvent('fiscal_queue_batch_processed', {
        order_id: `batch-${Date.now()}`,
        event_timestamp: new Date().toISOString(),
        queue_action: 'batch_processed',
        
        // Batch results
        batch_processed: result.processed,
        batch_failed: result.failed,
        batch_skipped: result.skipped,
        batch_error_count: result.errors.length,
        batch_errors: result.errors,
        
        // Performance metrics
        processing_duration_ms: result.processing_time_ms,
        queue_size_before: result.queue_size_before,
        queue_size_after: result.queue_size_after,
        
        // Context
        business_hours: this.isBusinessHours(),
        automation_enabled: true
      });

      console.log(`[PostHogQueue] Tracked batch processing: ${result.processed} processed, ${result.failed} failed`);
    } catch (error) {
      console.error('[PostHogQueue] Failed to track batch processing:', error);
    }
  }

  /**
   * Get current queue status (estimated)
   */
  async getQueueStatus(): Promise<{
    estimated_size: number;
    business_hours: boolean;
    automation_enabled: boolean;
    last_updated: string;
  }> {
    return {
      estimated_size: this.currentQueueSize,
      business_hours: this.isBusinessHours(),
      automation_enabled: this.enabled,
      last_updated: new Date().toISOString()
    };
  }

  /**
   * Track queue health metrics
   */
  async trackQueueHealth(): Promise<void> {
    if (!this.enabled) return;

    try {
      const status = await this.getQueueStatus();
      
      await trackFiscalEvent('fiscal_queue_health', {
        order_id: `queue-health-${Date.now()}`,
        event_timestamp: new Date().toISOString(),
        queue_action: 'health_check',
        queue_size_current: status.estimated_size,
        business_hours: status.business_hours,
        automation_enabled: status.automation_enabled,
        queue_service: 'posthog'
      });

      console.log(`[PostHogQueue] Queue health tracked: ${status.estimated_size} items`);
    } catch (error) {
      console.error('[PostHogQueue] Failed to track queue health:', error);
    }
  }

  /**
   * Reset queue size counter (useful for maintenance)
   */
  resetQueueSize(newSize: number = 0): void {
    const oldSize = this.currentQueueSize;
    this.currentQueueSize = newSize;
    console.log(`[PostHogQueue] Queue size reset from ${oldSize} to ${newSize}`);
  }

  /**
   * Helper method to determine business hours
   */
  private isBusinessHours(): boolean {
    const now = new Date();
    const startHour = parseInt(process.env.FISCAL_START_HOUR || '8', 10);
    const endHour = parseInt(process.env.FISCAL_END_HOUR || '22', 10);
    const currentHour = now.getHours();
    
    return currentHour >= startHour && currentHour < endHour;
  }

  /**
   * Cleanup method
   */
  async shutdown(): Promise<void> {
    if (this.enabled) {
      await postHogFiscal.flush();
      console.log('[PostHogQueue] Queue service shutdown complete');
    }
  }
}

// Export singleton instance
export const postHogQueue = PostHogQueueService.getInstance();

// Export convenience functions
export async function enqueueOrderForProcessing(
  order: OrdersResponse,
  scheduledFor: Date,
  priority?: number,
  businessHours?: boolean
): Promise<void> {
  return postHogQueue.enqueueOrder(order, scheduledFor, priority, businessHours);
}

export async function dequeueOrderForProcessing(
  orderId: string,
  orderNumber: string,
  attemptNumber?: number
): Promise<void> {
  return postHogQueue.dequeueOrder(orderId, orderNumber, attemptNumber);
}

export async function completeOrderProcessing(
  orderId: string,
  orderNumber: string,
  processingStartTime: Date,
  success: boolean,
  errorMessage?: string
): Promise<void> {
  return postHogQueue.completeOrder(orderId, orderNumber, processingStartTime, success, errorMessage);
}

export async function retryOrderProcessing(
  orderId: string,
  orderNumber: string,
  attemptNumber: number,
  errorMessage: string,
  nextScheduledFor: Date
): Promise<void> {
  return postHogQueue.retryOrder(orderId, orderNumber, attemptNumber, errorMessage, nextScheduledFor);
}

export async function trackQueueBatchProcessing(
  result: QueueProcessingResult
): Promise<void> {
  return postHogQueue.trackBatchProcessing(result);
}

export async function getQueueStatus() {
  return postHogQueue.getQueueStatus();
}

export async function trackQueueHealth(): Promise<void> {
  return postHogQueue.trackQueueHealth();
}
