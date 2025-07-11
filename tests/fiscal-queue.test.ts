/**
 * Unit tests for fiscal queue actions
 */

import { MockQueue, MockJob } from './mocks/bullmq';
import { mockPb, authenticatedCall, mockOrderData } from './mocks/pocketbase';

// Mock the dependencies before importing the functions to test
jest.mock('@/app/lib/pocketbase', () => ({
  __esModule: true,
  default: mockPb,
  authenticatedCall: authenticatedCall
}));

jest.mock('@/app/lib/queues/fiscal-queue', () => {
  const mockQueue = new MockQueue('fiscal-automation');
  
  const MockFiscalQueueManager = {
    getQueueStats: jest.fn(),
    addFiscalJob: jest.fn(),
    getJob: jest.fn(),
    cleanQueue: jest.fn()
  };

  return {
    fiscalQueue: mockQueue,
    FiscalQueueManager: MockFiscalQueueManager
  };
});

jest.mock('@/app/lib/queues/bullmq-utils', () => ({
  mapJobToQueuedOrder: jest.fn().mockImplementation((job: MockJob) => ({
    id: job.id,
    order_id: job.data.orderId,
    created: new Date(job.timestamp).toISOString(),
    priority: job.opts.priority || 0,
    attempts: job.attemptsMade || 0,
    last_attempt: job.processedOn ? new Date(job.processedOn).toISOString() : undefined,
    status: job.isCompleted() ? 'completed' : job.isFailed() ? 'failed' : job.isActive() ? 'processing' : 'pending',
    error_message: job.failedReason,
    scheduled_for: job.opts.delay ? new Date(job.timestamp + job.opts.delay).toISOString() : undefined
  }))
}));

// Import functions to test after mocking
import {
  getFiscalQueueStats,
  getFiscalQueueItems,
  retryFiscalQueueItem,
  removeFiscalQueueItem,
  cleanupFiscalQueue
} from '@/app/[locale]/orders/actions/fiscal-queue';

import { FiscalQueueManager, fiscalQueue } from '@/app/lib/queues/fiscal-queue';
import { mapJobToQueuedOrder } from '@/app/lib/queues/bullmq-utils';

describe('Fiscal Queue Actions', () => {
  let mockQueue: MockQueue;
  let mockFiscalQueueManager: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Get mock instances
    mockQueue = fiscalQueue as unknown as MockQueue;
    mockFiscalQueueManager = FiscalQueueManager as any;
    
    // Clear the mock queue
    if (mockQueue._clear) {
      mockQueue._clear();
    }
    
    // Reset PocketBase collections
    (mockPb as any)._clearCollection('orders');
    (mockPb as any)._clearCollection('fiscal_receipts');
    (mockPb as any)._addToCollection('orders', mockOrderData);
  });

  describe('getFiscalQueueStats', () => {
    it('should return correct queue statistics', async () => {
      // Setup mock queue stats
      mockFiscalQueueManager.getQueueStats.mockResolvedValue({
        total: 10,
        waiting: 3,
        delayed: 2,
        active: 1,
        completed: 3,
        failed: 1
      });

      // Mock delayed jobs for next scheduled
      const mockDelayedJob = new MockJob('1', { orderId: 'test' }, { delay: 5000 });
      mockDelayedJob.opts.timestamp = Date.now() + 5000;
      jest.spyOn(mockQueue, 'getDelayed').mockResolvedValue([mockDelayedJob]);

      const result = await getFiscalQueueStats();

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        total: 10,
        pending: 5, // waiting + delayed
        processing: 1,
        completed: 3,
        failed: 1,
        nextScheduled: expect.any(String)
      });
    });

    it('should handle errors gracefully', async () => {
      mockFiscalQueueManager.getQueueStats.mockRejectedValue(new Error('Queue error'));

      const result = await getFiscalQueueStats();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Queue error');
    });

    it('should handle missing next scheduled job', async () => {
      mockFiscalQueueManager.getQueueStats.mockResolvedValue({
        total: 5,
        waiting: 2,
        delayed: 0,
        active: 1,
        completed: 2,
        failed: 0
      });

      jest.spyOn(mockQueue, 'getDelayed').mockResolvedValue([]);

      const result = await getFiscalQueueStats();

      expect(result.success).toBe(true);
      expect(result.data?.nextScheduled).toBeUndefined();
    });
  });

  describe('getFiscalQueueItems', () => {
    beforeEach(() => {
      // Setup mock queue stats for totalItems calculation
      mockFiscalQueueManager.getQueueStats.mockResolvedValue({
        total: 10,
        waiting: 3,
        delayed: 2,
        active: 1,
        completed: 3,
        failed: 1
      });
    });

    it('should return paginated queue items with correct mapping', async () => {
      // Create mock jobs
      const jobs = [
        new MockJob('1', { orderId: 'order-1', orderNumber: 'ORD-001' }, { priority: 1 }),
        new MockJob('2', { orderId: 'order-2', orderNumber: 'ORD-002' }, { priority: 2 }),
        new MockJob('3', { orderId: 'order-3', orderNumber: 'ORD-003' }, { priority: 1 })
      ];

      jest.spyOn(mockQueue, 'getJobs').mockResolvedValue(jobs);

      const result = await getFiscalQueueItems(1, 2);

      expect(result.success).toBe(true);
      expect(result.data?.items).toHaveLength(2);
      expect(result.data?.page).toBe(1);
      expect(result.data?.perPage).toBe(2);
      expect(result.data?.totalItems).toBe(10);
      expect(mapJobToQueuedOrder).toHaveBeenCalledTimes(2);
    });

    it('should filter by status correctly', async () => {
      const waitingJob = new MockJob('1', { orderId: 'order-1' });
      const failedJob = new MockJob('2', { orderId: 'order-2' });
      failedJob._setFailedReason('Test error');

      jest.spyOn(mockQueue, 'getJobs').mockResolvedValue([failedJob]);

      const result = await getFiscalQueueItems(1, 10, 'failed');

      expect(result.success).toBe(true);
      expect(mockQueue.getJobs).toHaveBeenCalledWith(['failed'], 0, 99);
    });

    it('should handle status filtering for pending jobs', async () => {
      const jobs = [new MockJob('1', { orderId: 'order-1' })];
      jest.spyOn(mockQueue, 'getJobs').mockResolvedValue(jobs);

      const result = await getFiscalQueueItems(1, 10, 'pending');

      expect(result.success).toBe(true);
      // Verify the function called getJobs for each type separately
      expect(mockQueue.getJobs).toHaveBeenCalledWith(['waiting'], 0, 99);
      expect(mockQueue.getJobs).toHaveBeenCalledWith(['delayed'], 0, 99);
    });

    it('should handle status filtering for processing jobs', async () => {
      const jobs = [new MockJob('1', { orderId: 'order-1' })];
      jest.spyOn(mockQueue, 'getJobs').mockResolvedValue(jobs);

      const result = await getFiscalQueueItems(1, 10, 'processing');

      expect(result.success).toBe(true);
      expect(mockQueue.getJobs).toHaveBeenCalledWith(['active'], 0, 99);
    });

    it('should expand order data when requested', async () => {
      const job = new MockJob('1', { orderId: 'test-order-1', orderNumber: 'ORD-001' });
      jest.spyOn(mockQueue, 'getJobs').mockResolvedValue([job]);

      const result = await getFiscalQueueItems(1, 10, undefined, 'order_id');

      expect(result.success).toBe(true);
      expect(authenticatedCall).toHaveBeenCalled();
      expect(result.data?.items[0]).toHaveProperty('expand');
    });

    it('should handle expand errors gracefully', async () => {
      const job = new MockJob('1', { orderId: 'non-existent-order', orderNumber: 'ORD-404' });
      jest.spyOn(mockQueue, 'getJobs').mockResolvedValue([job]);

      // Mock PocketBase to throw error for non-existent order
      authenticatedCall.mockRejectedValueOnce(new Error('Order not found'));

      const result = await getFiscalQueueItems(1, 10, undefined, 'order_id');

      expect(result.success).toBe(true);
      expect(result.data?.items[0]).not.toHaveProperty('expand');
    });

    it('should handle pagination correctly', async () => {
      const jobs = Array.from({ length: 5 }, (_, i) => 
        new MockJob(`${i + 1}`, { orderId: `order-${i + 1}`, orderNumber: `ORD-${i + 1}` })
      );
      jest.spyOn(mockQueue, 'getJobs').mockResolvedValue(jobs);

      const result = await getFiscalQueueItems(2, 2);

      expect(result.success).toBe(true);
      expect(result.data?.items).toHaveLength(2);
      expect(result.data?.page).toBe(2);
    });

    it('should handle errors gracefully', async () => {
      // Mock FiscalQueueManager.getQueueStats to also fail
      mockFiscalQueueManager.getQueueStats.mockRejectedValue(new Error('Queue error'));
      jest.spyOn(mockQueue, 'getJobs').mockRejectedValue(new Error('Queue error'));

      const result = await getFiscalQueueItems();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Queue error');
    });
  });

  describe('retryFiscalQueueItem', () => {
    it('should retry a failed job successfully', async () => {
      const failedJob = new MockJob('1', { 
        orderId: 'order-1', 
        orderNumber: 'ORD-001',
        cashierName: 'Test Cashier',
        priority: 1,
        businessHours: true
      });
      failedJob._setFailedReason('Network error');

      mockFiscalQueueManager.getJob.mockResolvedValue(failedJob);
      jest.spyOn(failedJob, 'retry').mockResolvedValue(undefined);

      const result = await retryFiscalQueueItem('1');

      expect(result.success).toBe(true);
      expect(failedJob.retry).toHaveBeenCalled();
    });

    it('should create new job when no failed reason exists', async () => {
      const job = new MockJob('1', { 
        orderId: 'order-1', 
        orderNumber: 'ORD-001',
        cashierName: 'Test Cashier',
        priority: 1,
        businessHours: true
      });

      mockFiscalQueueManager.getJob.mockResolvedValue(job);
      mockFiscalQueueManager.addFiscalJob.mockResolvedValue(new MockJob('2', job.data));

      const result = await retryFiscalQueueItem('1');

      expect(result.success).toBe(true);
      expect(mockFiscalQueueManager.addFiscalJob).toHaveBeenCalledWith(
        'order-1',
        'ORD-001',
        {
          cashierName: 'Test Cashier',
          priority: 1,
          businessHours: true
        }
      );
    });

    it('should return error when job not found', async () => {
      mockFiscalQueueManager.getJob.mockResolvedValue(undefined);

      const result = await retryFiscalQueueItem('non-existent');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Job not found');
    });

    it('should handle retry errors gracefully', async () => {
      const failedJob = new MockJob('1', { orderId: 'order-1', orderNumber: 'ORD-001' });
      failedJob._setFailedReason('Network error');

      mockFiscalQueueManager.getJob.mockResolvedValue(failedJob);
      jest.spyOn(failedJob, 'retry').mockRejectedValue(new Error('Retry failed'));

      const result = await retryFiscalQueueItem('1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Retry failed');
    });
  });

  describe('removeFiscalQueueItem', () => {
    it('should remove a job successfully', async () => {
      const job = new MockJob('1', { orderId: 'order-1', orderNumber: 'ORD-001' });
      
      mockFiscalQueueManager.getJob.mockResolvedValue(job);
      jest.spyOn(job, 'remove').mockResolvedValue(undefined);

      const result = await removeFiscalQueueItem('1');

      expect(result.success).toBe(true);
      expect(job.remove).toHaveBeenCalled();
    });

    it('should return error when job not found', async () => {
      mockFiscalQueueManager.getJob.mockResolvedValue(undefined);

      const result = await removeFiscalQueueItem('non-existent');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Job not found');
    });

    it('should handle removal errors gracefully', async () => {
      const job = new MockJob('1', { orderId: 'order-1', orderNumber: 'ORD-001' });
      
      mockFiscalQueueManager.getJob.mockResolvedValue(job);
      jest.spyOn(job, 'remove').mockRejectedValue(new Error('Removal failed'));

      const result = await removeFiscalQueueItem('1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Removal failed');
    });
  });

  describe('cleanupFiscalQueue', () => {
    it('should cleanup old completed and failed jobs', async () => {
      const cleanupResult = { removed: 5 };
      mockFiscalQueueManager.cleanQueue.mockResolvedValue(cleanupResult);

      const result = await cleanupFiscalQueue(7);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(cleanupResult);
      expect(mockFiscalQueueManager.cleanQueue).toHaveBeenCalledWith(7);
    });

    it('should use default cleanup period when not specified', async () => {
      const cleanupResult = { removed: 3 };
      mockFiscalQueueManager.cleanQueue.mockResolvedValue(cleanupResult);

      const result = await cleanupFiscalQueue();

      expect(result.success).toBe(true);
      expect(mockFiscalQueueManager.cleanQueue).toHaveBeenCalledWith(7);
    });

    it('should handle cleanup errors gracefully', async () => {
      mockFiscalQueueManager.cleanQueue.mockRejectedValue(new Error('Cleanup failed'));

      const result = await cleanupFiscalQueue(7);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Cleanup failed');
    });

    it('should handle custom cleanup periods', async () => {
      const cleanupResult = { removed: 10 };
      mockFiscalQueueManager.cleanQueue.mockResolvedValue(cleanupResult);

      const result = await cleanupFiscalQueue(30);

      expect(result.success).toBe(true);
      expect(mockFiscalQueueManager.cleanQueue).toHaveBeenCalledWith(30);
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle empty queue gracefully', async () => {
      mockFiscalQueueManager.getQueueStats.mockResolvedValue({
        total: 0,
        waiting: 0,
        delayed: 0,
        active: 0,
        completed: 0,
        failed: 0
      });

      jest.spyOn(mockQueue, 'getJobs').mockResolvedValue([]);
      jest.spyOn(mockQueue, 'getDelayed').mockResolvedValue([]);

      const statsResult = await getFiscalQueueStats();
      const itemsResult = await getFiscalQueueItems();

      expect(statsResult.success).toBe(true);
      expect(statsResult.data?.total).toBe(0);
      expect(itemsResult.success).toBe(true);
      expect(itemsResult.data?.items).toHaveLength(0);
    });

    it('should handle large page numbers gracefully', async () => {
      mockFiscalQueueManager.getQueueStats.mockResolvedValue({
        total: 5,
        waiting: 2,
        delayed: 1,
        active: 1,
        completed: 1,
        failed: 0
      });

      jest.spyOn(mockQueue, 'getJobs').mockResolvedValue([]);

      const result = await getFiscalQueueItems(100, 20);

      expect(result.success).toBe(true);
      expect(result.data?.items).toHaveLength(0);
      expect(result.data?.page).toBe(100);
    });

    it('should handle job state transitions correctly', async () => {
      const job = new MockJob('1', { orderId: 'order-1', orderNumber: 'ORD-001' });
      
      // Test initial state
      expect(job.isWaiting()).toBe(true);
      
      // Test state transitions
      job._setState('active');
      expect(job.isActive()).toBe(true);
      expect(job.processedOn).toBeDefined();
      
      job._setState('completed');
      expect(job.isCompleted()).toBe(true);
      expect(job.finishedOn).toBeDefined();
      
      // Test failed state
      job._setFailedReason('Test error');
      expect(job.isFailed()).toBe(true);
      expect(job.failedReason).toBe('Test error');
      expect(job.attemptsMade).toBe(1);
    });
  });
});
