#!/usr/bin/env tsx

/**
 * Test BullMQ Redis Integration
 * 
 * This script tests the BullMQ queue system with Redis to ensure:
 * - Redis connection works properly
 * - Queue jobs can be added and processed
 * - Queue management operations function correctly
 * - Fiscal automation queue integration works
 */

import { FiscalQueueManager } from '../app/lib/queues/fiscal-queue';
import { createRedisConnection } from '../app/lib/redis';

async function testBullMQRedis() {
  console.log('🚀 Starting BullMQ Redis Test');
  
  let queueManager: FiscalQueueManager | null = null;
  
  try {
    // Test Redis connection
    console.log('\n📡 Testing Redis connection...');
    const redis = createRedisConnection();
    await redis.ping();
    console.log('✅ Redis connection successful');
    await redis.quit();
    
    // Initialize queue manager
    console.log('\n🔧 Initializing Fiscal Queue Manager...');
    queueManager = new FiscalQueueManager();
    await queueManager.initialize();
    console.log('✅ Queue manager initialized');
    
    // Test queue statistics (initial state)
    console.log('\n📊 Getting initial queue statistics...');
    const initialStats = await queueManager.getQueueStats();
    console.log('Initial Queue Stats:', {
      waiting: initialStats.waiting,
      active: initialStats.active,
      completed: initialStats.completed,
      failed: initialStats.failed
    });
    
    // Test adding a simple job
    console.log('\n➕ Adding test fiscal receipt job...');
    const testJobData = {
      receiptId: 'test-receipt-001',
      orderId: 'test-order-001',
      action: 'create_receipt' as const,
      data: {
        total: 1000,
        items: [
          {
            name: 'Test Product',
            price: 1000,
            quantity: 1
          }
        ]
      },
      priority: 1
    };
    
    const job1 = await queueManager.addJob('test-receipt-job', testJobData);
    console.log(`✅ Job added with ID: ${job1.id}`);
    
    // Test adding a high priority job
    console.log('\n⚡ Adding high priority job...');
    const highPriorityJob = await queueManager.addJob('urgent-receipt', {
      ...testJobData,
      receiptId: 'urgent-receipt-001',
      priority: 10
    }, {
      priority: 10,
      delay: 0
    });
    console.log(`✅ High priority job added with ID: ${highPriorityJob.id}`);
    
    // Test adding a delayed job
    console.log('\n⏰ Adding delayed job (10 seconds)...');
    const delayedJob = await queueManager.addJob('delayed-receipt', {
      ...testJobData,
      receiptId: 'delayed-receipt-001'
    }, {
      delay: 10000 // 10 seconds
    });
    console.log(`✅ Delayed job added with ID: ${delayedJob.id}`);
    
    // Wait a moment for jobs to be processed
    console.log('\n⏳ Waiting 3 seconds to see job processing...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check updated statistics
    console.log('\n📊 Getting updated queue statistics...');
    const updatedStats = await queueManager.getQueueStats();
    console.log('Updated Queue Stats:', {
      waiting: updatedStats.waiting,
      active: updatedStats.active,
      completed: updatedStats.completed,
      failed: updatedStats.failed
    });
    
    // Test job retrieval
    console.log('\n🔍 Testing job retrieval...');
    const retrievedJob = await queueManager.getJob(job1.id!);
    if (retrievedJob) {
      console.log(`✅ Retrieved job: ${retrievedJob.id} (${retrievedJob.name})`);
      console.log(`   Status: ${await retrievedJob.getState()}`);
    }
    
    // Test business hours functionality
    console.log('\n🕒 Testing business hours job scheduling...');
    const businessHoursJob = await queueManager.addJobForBusinessHours('business-hours-receipt', {
      ...testJobData,
      receiptId: 'business-hours-001'
    });
    console.log(`✅ Business hours job added with ID: ${businessHoursJob.id}`);
    
    // Test queue management operations
    console.log('\n⏸️ Testing queue pause/resume...');
    await queueManager.pauseQueue();
    console.log('✅ Queue paused');
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await queueManager.resumeQueue();
    console.log('✅ Queue resumed');
    
    // Test bulk job operations
    console.log('\n📦 Testing bulk job addition...');
    const bulkJobs = [];
    for (let i = 0; i < 5; i++) {
      bulkJobs.push({
        name: `bulk-job-${i}`,
        data: {
          ...testJobData,
          receiptId: `bulk-receipt-${i}`
        }
      });
    }
    
    const addedBulkJobs = await queueManager.addBulkJobs(bulkJobs);
    console.log(`✅ Added ${addedBulkJobs.length} bulk jobs`);
    
    // Final statistics
    console.log('\n📊 Final queue statistics...');
    const finalStats = await queueManager.getQueueStats();
    console.log('Final Queue Stats:', {
      waiting: finalStats.waiting,
      active: finalStats.active,
      completed: finalStats.completed,
      failed: finalStats.failed,
      delayed: finalStats.delayed
    });
    
    // Test error scenario
    console.log('\n❌ Testing error handling with invalid job...');
    try {
      await queueManager.addJob('invalid-job', null as any);
    } catch (error) {
      console.log('✅ Error handling works:', error instanceof Error ? error.message : 'Unknown error');
    }
    
    console.log('\n🎉 All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  } finally {
    // Cleanup
    if (queueManager) {
      console.log('\n🧹 Cleaning up...');
      await queueManager.cleanup();
      console.log('✅ Cleanup completed');
    }
  }
}

// Additional utility functions for manual testing
export async function addCustomTestJob(
  name: string,
  receiptId: string,
  orderId: string,
  priority: number = 1,
  delay: number = 0
) {
  console.log(`\n➕ Adding custom test job: ${name}`);
  
  const queueManager = new FiscalQueueManager();
  await queueManager.initialize();
  
  try {
    const job = await queueManager.addJob(name, {
      receiptId,
      orderId,
      action: 'create_receipt' as const,
      data: {
        total: Math.floor(Math.random() * 10000) + 100,
        items: [{
          name: 'Custom Test Product',
          price: Math.floor(Math.random() * 1000) + 50,
          quantity: Math.floor(Math.random() * 5) + 1
        }]
      },
      priority
    }, {
      priority,
      delay
    });
    
    console.log(`✅ Custom job added with ID: ${job.id}`);
    return job.id;
  } finally {
    await queueManager.cleanup();
  }
}

export async function getQueueStatus() {
  console.log('\n📊 Getting current queue status...');
  
  const queueManager = new FiscalQueueManager();
  await queueManager.initialize();
  
  try {
    const stats = await queueManager.getQueueStats();
    console.log('Current Queue Status:', {
      waiting: stats.waiting,
      active: stats.active,
      completed: stats.completed,
      failed: stats.failed,
      delayed: stats.delayed,
      paused: stats.paused
    });
    return stats;
  } finally {
    await queueManager.cleanup();
  }
}

export async function clearQueue() {
  console.log('\n🧹 Clearing all jobs from queue...');
  
  const queueManager = new FiscalQueueManager();
  await queueManager.initialize();
  
  try {
    await queueManager.clearQueue();
    console.log('✅ Queue cleared');
  } finally {
    await queueManager.cleanup();
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  testBullMQRedis().catch(console.error);
}