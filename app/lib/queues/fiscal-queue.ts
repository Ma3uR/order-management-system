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
      delay?: number;
      scheduledFor?: Date;
    } = {}
  ) {
    const jobData: FiscalJobData = {
      orderId,
      orderNumber,
      cashierName: options.cashierName || 'AUTO',
      priority: options.priority || 0,
      businessHours: options.businessHours || false
    };

    const jobOptions: {
      priority: number;
      removeOnComplete: number;
      removeOnFail: number;
      attempts: number;
      backoff: {
        type: string;
        delay: number;
      };
      delay?: number;
    } = {
      priority: options.priority || 0,
      removeOnComplete: 100,
      removeOnFail: 50,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      }
    };

    // Add delay if specified
    if (options.delay && options.delay > 0) {
      jobOptions.delay = options.delay;
    }

    return await fiscalQueue.add('generate-fiscal-receipt', jobData, jobOptions);
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
  },

  async pauseQueue() {
    return await fiscalQueue.pause();
  },

  async resumeQueue() {
    return await fiscalQueue.resume();
  },

  async removeJob(jobId: string) {
    const job = await fiscalQueue.getJob(jobId);
    if (job) {
      await job.remove();
    }
  }
};

export const FiscalQueueProcessor = {
  isWorkerProcessing(): boolean {
    // This is a placeholder implementation
    // In a real implementation, this would track worker state
    return false;
  },

  async startWorker() {
    // Placeholder for worker start logic
    console.log('Starting fiscal queue worker...');
  },

  async stopWorker() {
    // Placeholder for worker stop logic
    console.log('Stopping fiscal queue worker...');
  }
};

export function initializeFiscalQueue(): void {
  console.log('Initializing fiscal queue...');
  // Queue initialization logic would go here
}

export async function shutdownFiscalQueue(): Promise<void> {
  console.log('Shutting down fiscal queue...');
  // Queue shutdown logic would go here
  await fiscalQueue.close();
}