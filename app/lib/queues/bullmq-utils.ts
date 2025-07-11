/**
 * BullMQ utilities for queue management
 */

import type { Job } from 'bullmq';

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

interface JobData {
  orderId?: string;
  [key: string]: unknown;
}

export function mapJobToQueuedOrder(job: Job): QueuedOrder {
  const jobData = job.data as JobData;
  return {
    id: job.id!,
    order_id: jobData.orderId || '',
    created: new Date(job.timestamp).toISOString(),
    priority: job.opts.priority || 0,
    attempts: job.attemptsMade || 0,
    last_attempt: job.processedOn ? new Date(job.processedOn).toISOString() : undefined,
    status: job.finishedOn 
      ? (job.failedReason ? 'failed' : 'completed')
      : job.processedOn 
        ? 'processing' 
        : 'pending',
    error_message: job.failedReason,
    scheduled_for: job.opts.delay ? new Date(job.timestamp + job.opts.delay).toISOString() : undefined
  };
}