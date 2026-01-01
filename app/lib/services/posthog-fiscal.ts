import { PostHog } from 'posthog-node';
import { OrdersResponse } from '@/app/types/pocketbase-types';
import { CasaVchasnoResponse, ReceiptInfo } from '@/app/types/casa-vchasno';
import { ProcessingResult } from './fiscal-scheduler';

export interface FiscalEventProperties {
  order_id: string;
  order_number?: string;
  event_timestamp: string;
  
  // Order-related properties
  order_total?: number;
  order_currency?: string;
  order_source?: string;
  order_status?: string;
  order_marketplace_code?: string;
  
  // Fiscal automation properties
  cashier_name?: string;
  receipt_type?: string;
  receipt_amount?: number;
  receipt_fiscal_number?: string;
  receipt_url?: string;
  
  // Processing properties
  processing_mode?: 'immediate' | 'queued' | 'scheduled';
  business_hours?: boolean;
  queue_size?: number;
  attempt_number?: number;
  
  // Error properties
  error_message?: string;
  error_code?: string;
  error_details?: string;
  
  // Performance properties
  processing_duration_ms?: number;
  api_response_time_ms?: number;
  
  // Automation properties
  automation_enabled?: boolean;
  test_mode?: boolean;
  shift_status?: string;
  
  // Batch processing properties
  batch_size?: number;
  batch_processed?: number;
  batch_failed?: number;
  batch_skipped?: number;
  
  // Additional context
  user_agent?: string;
  session_id?: string;
  [key: string]: unknown;
}

export class PostHogFiscalService {
  private static instance: PostHogFiscalService;
  private posthog: PostHog | null = null;
  private isEnabled: boolean;
  private projectApiKey: string;
  private host: string;

  private constructor() {
    // Initialize without checking environment variables yet
    this.projectApiKey = '';
    this.host = 'https://eu.i.posthog.com';
    this.isEnabled = false;
    this.posthog = null;
    
    // Initialize PostHog when first accessed
    this.initializePostHog();
  }
  
  private initializePostHog(): void {
    // PostHog completely disabled to prevent excessive outbound connections
    this.isEnabled = false;
    this.posthog = null;
    console.log('[PostHogFiscal] PostHog disabled');
  }

  static getInstance(): PostHogFiscalService {
    if (!PostHogFiscalService.instance) {
      PostHogFiscalService.instance = new PostHogFiscalService();
    }
    return PostHogFiscalService.instance;
  }

  /**
   * Track a fiscal automation event
   */
  async trackEvent(
    eventName: string,
    properties: FiscalEventProperties,
    distinctId?: string
  ): Promise<void> {
    // Reinitialize if environment variables have changed
    if (!this.isEnabled) {
      this.initializePostHog();
    }
    
    if (!this.isEnabled || !this.posthog) {
      console.log(`[PostHogFiscal] Skipping event ${eventName} - PostHog not enabled`);
      return;
    }

    try {
      const enhancedProperties = {
        ...properties,
        environment: process.env.NODE_ENV || 'development',
        service: 'fiscal-automation',
        version: process.env.npm_package_version || '1.0.0',
        server_timestamp: new Date().toISOString(),
      };

      const eventDistinctId = distinctId || `fiscal-automation-${properties.order_id}`;
      
      this.posthog.capture({
        distinctId: eventDistinctId,
        event: eventName,
        properties: enhancedProperties,
      });

      console.log(`[PostHogFiscal] Tracked event: ${eventName} for order ${properties.order_id}`);
    } catch (error) {
      console.error(`[PostHogFiscal] Failed to track event ${eventName}:`, error);
    }
  }

  /**
   * Track order queued for fiscal processing
   */
  async trackOrderQueued(
    orderId: string,
    order: OrdersResponse,
    scheduledFor: Date,
    priority: number = 1
  ): Promise<void> {
    await this.trackEvent('fiscal_order_queued', {
      order_id: orderId,
      order_number: order.orderNumber,
      event_timestamp: new Date().toISOString(),
      order_total: order.amount,
      order_currency: ((order.expand as Record<string, unknown>)?.currency as { code?: string })?.code,
      order_source: ((order.expand as Record<string, unknown>)?.source as { name?: string })?.name,
      order_status: ((order.expand as Record<string, unknown>)?.status as { name?: string })?.name,
      order_marketplace_code: ((order.expand as Record<string, unknown>)?.status as { marketplace_code?: string })?.marketplace_code,
      processing_mode: 'queued',
      business_hours: this.isBusinessHours(),
      scheduled_for: scheduledFor.toISOString(),
      queue_priority: priority,
    });
  }

  /**
   * Track order processed immediately
   */
  async trackOrderProcessedImmediately(
    orderId: string,
    order: OrdersResponse,
    processingStartTime: Date
  ): Promise<void> {
    const processingDuration = Date.now() - processingStartTime.getTime();
    
    await this.trackEvent('fiscal_order_processed_immediately', {
      order_id: orderId,
      order_number: order.orderNumber,
      event_timestamp: new Date().toISOString(),
      order_total: order.amount,
      order_currency: ((order.expand as Record<string, unknown>)?.currency as { code?: string })?.code,
      order_source: ((order.expand as Record<string, unknown>)?.source as { name?: string })?.name,
      order_status: ((order.expand as Record<string, unknown>)?.status as { name?: string })?.name,
      order_marketplace_code: ((order.expand as Record<string, unknown>)?.status as { marketplace_code?: string })?.marketplace_code,
      processing_mode: 'immediate',
      business_hours: this.isBusinessHours(),
      processing_duration_ms: processingDuration,
    });
  }

  /**
   * Track successful fiscal receipt creation
   */
  async trackReceiptCreated(
    orderId: string,
    order: OrdersResponse,
    casaResponse: CasaVchasnoResponse,
    cashierName: string,
    processingStartTime: Date
  ): Promise<void> {
    const processingDuration = Date.now() - processingStartTime.getTime();
    
    await this.trackEvent('fiscal_receipt_created', {
      order_id: orderId,
      order_number: order.orderNumber,
      event_timestamp: new Date().toISOString(),
      order_total: order.amount,
      order_currency: ((order.expand as Record<string, unknown>)?.currency as { code?: string })?.code,
      order_source: ((order.expand as Record<string, unknown>)?.source as { name?: string })?.name,
      order_status: ((order.expand as Record<string, unknown>)?.status as { name?: string })?.name,
      order_marketplace_code: ((order.expand as Record<string, unknown>)?.status as { marketplace_code?: string })?.marketplace_code,
      cashier_name: cashierName,
      receipt_type: 'sale',
      receipt_amount: order.amount,
      receipt_fiscal_number: (casaResponse.info as ReceiptInfo).fisid,
      receipt_url: (casaResponse.info as ReceiptInfo).qr,
      processing_duration_ms: processingDuration,
      casa_response_code: casaResponse.res,
      casa_response_message: casaResponse.errortxt,
    });
  }

  /**
   * Track failed fiscal receipt creation
   */
  async trackReceiptFailed(
    orderId: string,
    order: OrdersResponse,
    error: string,
    casaResponse?: CasaVchasnoResponse,
    processingStartTime?: Date
  ): Promise<void> {
    const processingDuration = processingStartTime ? Date.now() - processingStartTime.getTime() : undefined;
    
    await this.trackEvent('fiscal_receipt_failed', {
      order_id: orderId,
      order_number: order.orderNumber,
      event_timestamp: new Date().toISOString(),
      order_total: order.amount,
      order_currency: ((order.expand as Record<string, unknown>)?.currency as { code?: string })?.code,
      order_source: ((order.expand as Record<string, unknown>)?.source as { name?: string })?.name,
      order_status: ((order.expand as Record<string, unknown>)?.status as { name?: string })?.name,
      order_marketplace_code: ((order.expand as Record<string, unknown>)?.status as { marketplace_code?: string })?.marketplace_code,
      error_message: error,
      error_code: casaResponse?.res?.toString(),
      error_details: casaResponse?.errortxt,
      processing_duration_ms: processingDuration,
      casa_response_code: casaResponse?.res,
      casa_response_message: casaResponse?.errortxt,
    });
  }

  /**
   * Track fiscal shift operations
   */
  async trackShiftOperation(
    operation: 'open' | 'close',
    success: boolean,
    cashierName: string,
    shiftData?: Record<string, unknown>,
    error?: string
  ): Promise<void> {
    await this.trackEvent(`fiscal_shift_${operation}`, {
      order_id: `shift-${operation}-${Date.now()}`,
      event_timestamp: new Date().toISOString(),
      cashier_name: cashierName,
      operation_success: success,
      shift_data: shiftData,
      error_message: error,
      business_hours: this.isBusinessHours(),
    });
  }

  /**
   * Track batch processing results
   */
  async trackBatchProcessing(
    result: ProcessingResult,
    queueSize: number,
    processingStartTime: Date
  ): Promise<void> {
    const processingDuration = Date.now() - processingStartTime.getTime();
    
    await this.trackEvent('fiscal_batch_processed', {
      order_id: `batch-${Date.now()}`,
      event_timestamp: new Date().toISOString(),
      batch_size: queueSize,
      batch_processed: result.processed,
      batch_failed: result.failed,
      batch_skipped: result.skipped,
      batch_error_count: result.errors.length,
      batch_errors: result.errors,
      processing_duration_ms: processingDuration,
      business_hours: this.isBusinessHours(),
    });
  }

  /**
   * Track scheduler status and configuration
   */
  async trackSchedulerStatus(
    enabled: boolean,
    testMode: boolean,
    businessHours: boolean,
    queuedOrders: number,
    nextBusinessStart: string
  ): Promise<void> {
    await this.trackEvent('fiscal_scheduler_status', {
      order_id: `scheduler-status-${Date.now()}`,
      event_timestamp: new Date().toISOString(),
      automation_enabled: enabled,
      test_mode: testMode,
      business_hours: businessHours,
      queue_size: queuedOrders,
      next_business_start: nextBusinessStart,
    });
  }

  /**
   * Track telegram notifications
   */
  async trackTelegramNotification(
    orderId: string,
    orderNumber: string,
    success: boolean,
    error?: string
  ): Promise<void> {
    await this.trackEvent('fiscal_telegram_notification', {
      order_id: orderId,
      order_number: orderNumber,
      event_timestamp: new Date().toISOString(),
      notification_success: success,
      error_message: error,
      notification_channel: 'telegram',
    });
  }

  /**
   * Track feature flag usage
   */
  async trackFeatureFlag(
    flagName: string,
    flagValue: boolean | string,
    context: Record<string, unknown> = {}
  ): Promise<void> {
    await this.trackEvent('fiscal_feature_flag', {
      order_id: `feature-flag-${Date.now()}`,
      event_timestamp: new Date().toISOString(),
      flag_name: flagName,
      flag_value: flagValue,
      flag_context: context,
    });
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
   * Flush all pending events (useful for server environments)
   */
  async flush(): Promise<void> {
    if (this.posthog) {
      await this.posthog.flush();
    }
  }

  /**
   * Shutdown PostHog client
   */
  async shutdown(): Promise<void> {
    if (this.posthog) {
      await this.posthog.shutdown();
    }
  }
}

// Export singleton instance
export const postHogFiscal = PostHogFiscalService.getInstance();

// Export convenience functions
export async function trackFiscalEvent(
  eventName: string,
  properties: FiscalEventProperties,
  distinctId?: string
): Promise<void> {
  return postHogFiscal.trackEvent(eventName, properties, distinctId);
}

export async function trackOrderQueued(
  orderId: string,
  order: OrdersResponse,
  scheduledFor: Date,
  priority?: number
): Promise<void> {
  return postHogFiscal.trackOrderQueued(orderId, order, scheduledFor, priority);
}

export async function trackOrderProcessedImmediately(
  orderId: string,
  order: OrdersResponse,
  processingStartTime: Date
): Promise<void> {
  return postHogFiscal.trackOrderProcessedImmediately(orderId, order, processingStartTime);
}

export async function trackReceiptCreated(
  orderId: string,
  order: OrdersResponse,
  casaResponse: CasaVchasnoResponse,
  cashierName: string,
  processingStartTime: Date
): Promise<void> {
  return postHogFiscal.trackReceiptCreated(orderId, order, casaResponse, cashierName, processingStartTime);
}

export async function trackReceiptFailed(
  orderId: string,
  order: OrdersResponse,
  error: string,
  casaResponse?: CasaVchasnoResponse,
  processingStartTime?: Date
): Promise<void> {
  return postHogFiscal.trackReceiptFailed(orderId, order, error, casaResponse, processingStartTime);
}

export async function trackShiftOperation(
  operation: 'open' | 'close',
  success: boolean,
  cashierName: string,
  shiftData?: Record<string, unknown>,
  error?: string
): Promise<void> {
  return postHogFiscal.trackShiftOperation(operation, success, cashierName, shiftData, error);
}

export async function trackBatchProcessing(
  result: ProcessingResult,
  queueSize: number,
  processingStartTime: Date
): Promise<void> {
  return postHogFiscal.trackBatchProcessing(result, queueSize, processingStartTime);
}

export async function trackSchedulerStatus(
  enabled: boolean,
  testMode: boolean,
  businessHours: boolean,
  queuedOrders: number,
  nextBusinessStart: string
): Promise<void> {
  return postHogFiscal.trackSchedulerStatus(enabled, testMode, businessHours, queuedOrders, nextBusinessStart);
}

export async function trackTelegramNotification(
  orderId: string,
  orderNumber: string,
  success: boolean,
  error?: string
): Promise<void> {
  return postHogFiscal.trackTelegramNotification(orderId, orderNumber, success, error);
}

export async function trackFeatureFlag(
  flagName: string,
  flagValue: boolean | string,
  context?: Record<string, unknown>
): Promise<void> {
  return postHogFiscal.trackFeatureFlag(flagName, flagValue, context);
}
