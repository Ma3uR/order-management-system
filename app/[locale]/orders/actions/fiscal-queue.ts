/**
 * Server actions for fiscal queue management
 */

'use server';

import { FiscalQueueManager, fiscalQueue } from '@/app/lib/queues/fiscal-queue';
import { mapJobToQueuedOrder, type QueuedOrder } from '@/app/lib/queues/bullmq-utils';
import { authenticatedCall } from '@/app/lib/pocketbase';
import pb from '@/app/lib/pocketbase';
import type { Job } from 'bullmq';

export interface FiscalQueueStatsResponse {
  success: boolean;
  data?: {
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    nextScheduled?: string;
  };
  error?: string;
}

export interface FiscalQueueItemsResponse {
  success: boolean;
  data?: {
    items: QueuedOrder[];
    page: number;
    perPage: number;
    totalItems: number;
  };
  error?: string;
}

export interface FiscalQueueActionResponse {
  success: boolean;
  data?: unknown;
  error?: string;
}

interface RetryJobData {
  orderId: string;
  orderNumber: string;
  cashierName?: string;
  priority?: number;
  businessHours?: boolean;
}

export async function getFiscalQueueStats(): Promise<FiscalQueueStatsResponse> {
  try {
    const stats = await FiscalQueueManager.getQueueStats();
    
    // Get next scheduled job
    const delayedJobs = await fiscalQueue.getDelayed();
    const nextScheduled = delayedJobs.length > 0 ? 
      new Date(delayedJobs[0].timestamp + (delayedJobs[0].opts.delay || 0)).toISOString() : 
      undefined;

    return {
      success: true,
      data: {
        total: stats.total,
        pending: stats.waiting + stats.delayed,
        processing: stats.active,
        completed: stats.completed,
        failed: stats.failed,
        nextScheduled
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function getFiscalQueueItems(
  page: number = 1,
  perPage: number = 20,
  status?: 'pending' | 'processing' | 'completed' | 'failed',
  expand?: string
): Promise<FiscalQueueItemsResponse> {
  try {
    const stats = await FiscalQueueManager.getQueueStats();
    const start = (page - 1) * perPage;

    let jobs: Job[] = [];
    
    if (status) {
      switch (status) {
        case 'pending':
          const waitingJobs = await fiscalQueue.getJobs(['waiting'], 0, 99);
          const delayedJobs = await fiscalQueue.getJobs(['delayed'], 0, 99);
          jobs = [...waitingJobs, ...delayedJobs];
          break;
        case 'processing':
          jobs = await fiscalQueue.getJobs(['active'], 0, 99);
          break;
        case 'completed':
          jobs = await fiscalQueue.getJobs(['completed'], 0, 99);
          break;
        case 'failed':
          jobs = await fiscalQueue.getJobs(['failed'], 0, 99);
          break;
      }
    } else {
      jobs = await fiscalQueue.getJobs(['waiting', 'delayed', 'active', 'completed', 'failed'], 0, 99);
    }

    // Apply manual pagination
    const paginatedJobs = jobs.slice(start, start + perPage);
    const items = paginatedJobs.map(mapJobToQueuedOrder);

    // Expand order data if requested
    if (expand === 'order_id' && items.length > 0) {
      for (const item of items) {
        try {
          const order = await authenticatedCall(() => {
            return pb.collection('orders').getOne(item.order_id);
          });
          (item as QueuedOrder & { expand?: { order_id: unknown } }).expand = { order_id: order };
        } catch {
          // Skip failed expansions
        }
      }
    }

    return {
      success: true,
      data: {
        items,
        page,
        perPage,
        totalItems: stats.total
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function retryFiscalQueueItem(jobId: string): Promise<FiscalQueueActionResponse> {
  try {
    const job = await FiscalQueueManager.getJob(jobId);
    
    if (!job) {
      return {
        success: false,
        error: 'Job not found'
      };
    }

    if (job.failedReason) {
      await job.retry();
    } else {
      // Create new job with same data
      const jobData = job.data as RetryJobData;
      await FiscalQueueManager.addFiscalJob(
        jobData.orderId,
        jobData.orderNumber,
        {
          cashierName: jobData.cashierName,
          priority: jobData.priority,
          businessHours: jobData.businessHours
        }
      );
    }

    return {
      success: true
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function removeFiscalQueueItem(jobId: string): Promise<FiscalQueueActionResponse> {
  try {
    const job = await FiscalQueueManager.getJob(jobId);
    
    if (!job) {
      return {
        success: false,
        error: 'Job not found'
      };
    }

    await job.remove();

    return {
      success: true
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function cleanupFiscalQueue(gracePeriodDays: number = 7): Promise<FiscalQueueActionResponse> {
  try {
    const result = await FiscalQueueManager.cleanQueue(gracePeriodDays);
    
    return {
      success: true,
      data: result
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}