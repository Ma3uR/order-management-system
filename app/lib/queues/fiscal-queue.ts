/**
 * Fiscal Queue Manager for handling automated fiscal receipt generation
 */

import { Queue } from 'bullmq';
import { redis } from '../redis';

export interface FiscalJobData {
  orderId: string;
  orderNumber: string;
  cashierName?: string;
  priority?: number;
  businessHours?: boolean;
}

export interface QueueStats {
  total: number;
  waiting: number;
  delayed: number;
  active: number;
  completed: number;
  failed: number;
}

// Create the fiscal queue
export const fiscalQueue = new Queue('fiscal-automation', {
  connection: redis
});

export const FiscalQueueManager = {
  async getQueueStats(): Promise<QueueStats> {
    const waiting = await fiscalQueue.getWaiting();
    const delayed = await fiscalQueue.getDelayed();
    const active = await fiscalQueue.getActive();
    const completed = await fiscalQueue.getCompleted();
    const failed = await fiscalQueue.getFailed();

    return {
      total: waiting.length + delayed.length + active.length + completed.length + failed.length,
      waiting: waiting.length,
      delayed: delayed.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length
    };
  },

  async addFiscalJob(
    orderId: string,
    orderNumber: string,
    options: {
      cashierName?: string;
      priority?: number;
      businessHours?: boolean;
    } = {}
  ) {
    const jobData: FiscalJobData = {
      orderId,
      orderNumber,
      cashierName: options.cashierName || 'AUTO',
      priority: options.priority || 0,
      businessHours: options.businessHours || false
    };

    return await fiscalQueue.add('generate-fiscal-receipt', jobData, {
      priority: options.priority || 0,
      removeOnComplete: 100,
      removeOnFail: 50,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      }
    });
  },

  async getJob(jobId: string) {
    return await fiscalQueue.getJob(jobId);
  },

  async cleanQueue(gracePeriodDays: number = 7) {
    const gracePeriodMs = gracePeriodDays * 24 * 60 * 60 * 1000;
    
    const completedRemoved = await fiscalQueue.clean(gracePeriodMs, 100, 'completed');
    const failedRemoved = await fiscalQueue.clean(gracePeriodMs, 100, 'failed');
    
    return {
      removed: completedRemoved.length + failedRemoved.length
    };
  }
};