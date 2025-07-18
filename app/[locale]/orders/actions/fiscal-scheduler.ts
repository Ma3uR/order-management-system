'use server';

import { 
  getFiscalSchedulerStatus, 
  processQueuedFiscalOrders, 
  autoOpenFiscalShift, 
  autoCloseFiscalShift,
  ProcessingResult
} from '@/app/lib/services/fiscal-scheduler';

export interface SchedulerStatusResult {
  success: boolean;
  data?: {
    enabled: boolean;
    testMode: boolean;
    businessHours: boolean;
    queuedOrders: number;
    nextBusinessStart: string;
    config: {
      enabled: boolean;
      testMode: boolean;
      startHour: number;
      endHour: number;
      cashierName: string;
      timezone: string;
    };
  };
  error?: string;
}

export interface ProcessQueueResult {
  success: boolean;
  data?: ProcessingResult;
  error?: string;
}

export interface ShiftOperationResult {
  success: boolean;
  error?: string;
}

/**
 * Get fiscal scheduler status and configuration
 */
export async function getSchedulerStatus(): Promise<SchedulerStatusResult> {
  try {
    const status = await getFiscalSchedulerStatus();
    return {
      success: true,
      data: status
    };
  } catch (error) {
    console.error('[SchedulerActions] Error getting scheduler status:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Manually process the fiscal automation queue
 */
export async function processQueue(): Promise<ProcessQueueResult> {
  try {
    const result = await processQueuedFiscalOrders();
    return {
      success: true,
      data: result
    };
  } catch (error) {
    console.error('[SchedulerActions] Error processing queue:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Manually open fiscal shift
 */
export async function openFiscalShift(): Promise<ShiftOperationResult> {
  try {
    const success = await autoOpenFiscalShift();
    if (success) {
      return { success: true };
    } else {
      return { 
        success: false, 
        error: 'Failed to open shift' 
      };
    }
  } catch (error) {
    console.error('[SchedulerActions] Error opening shift:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Manually close fiscal shift
 */
export async function closeFiscalShift(): Promise<ShiftOperationResult> {
  try {
    const success = await autoCloseFiscalShift();
    if (success) {
      return { success: true };
    } else {
      return { 
        success: false, 
        error: 'Failed to close shift' 
      };
    }
  } catch (error) {
    console.error('[SchedulerActions] Error closing shift:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
