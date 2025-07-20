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
import { redis, testRedisConnection } from '../app/lib/redis';

async function testBullMQRedis() {
  console.log('🚀 Starting BullMQ Redis Test');
  
  let initialized = false;
  
  try {
    // Test Redis connection
    console.log('\n📡 Testing Redis connection...');
    const isConnected = await testRedisConnection();
    if (isConnected) {
      console.log('✅ Redis connection successful');
    } else {
      throw new Error('Redis connection failed');
    }
    
    // Initialize queue manager
    console.log('\n🔧 Initializing Fiscal Queue Manager...');
    // FiscalQueueManager is already initialized as an object
    initialized = true;
    console.log('✅ Queue manager initialized');
    
    // Test queue statistics (initial state)
    console.log('\n📊 Getting initial queue statistics...');
    const initialStats = await FiscalQueueManager.getQueueStats();
    console.log('Initial Queue Stats:', {
      waiting: initialStats.waiting,
      active: initialStats.active,
      completed: initialStats.completed,
      failed: initialStats.failed
    });
    
    // Test adding a simple job
    console.log('\n➕ Adding test fiscal receipt job...');
    const job1 = await FiscalQueueManager.addFiscalJob(
      'test-order-001',
      'TEST-ORDER-001',
      {
        cashierName: 'Test Cashier',
        priority: 1
      }
    );
    console.log(`✅ Job added with ID: ${job1.id}`);
    
    // Test adding a high priority job
    console.log('\n⚡ Adding high priority job...');
    const highPriorityJob = await FiscalQueueManager.addFiscalJob(
      'urgent-order-001',
      'URGENT-ORDER-001',
      {
        cashierName: 'Priority Cashier',
        priority: 10
      }
    );
    console.log(`✅ High priority job added with ID: ${highPriorityJob.id}`);
    
    // Test adding a delayed job
    console.log('\n⏰ Adding delayed job (10 seconds)...');
    const delayedJob = await FiscalQueueManager.addFiscalJob(
      'delayed-order-001',
      'DELAYED-ORDER-001',
      {
        cashierName: 'Delayed Cashier',
        delay: 10000 // 10 seconds
      }
    );
    console.log(`✅ Delayed job added with ID: ${delayedJob.id}`);
    
    // Wait a moment for jobs to be processed
    console.log('\n⏳ Waiting 3 seconds to see job processing...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check updated statistics
    console.log('\n📊 Getting updated queue statistics...');
    const updatedStats = await FiscalQueueManager.getQueueStats();
    console.log('Updated Queue Stats:', {
      waiting: updatedStats.waiting,
      active: updatedStats.active,
      completed: updatedStats.completed,
      failed: updatedStats.failed
    });
    
    // Test job retrieval
    console.log('\n🔍 Testing job retrieval...');
    const retrievedJob = await FiscalQueueManager.getJob(job1.id!);
    if (retrievedJob) {
      console.log(`✅ Retrieved job: ${retrievedJob.id} (${retrievedJob.name})`);
      console.log(`   Status: ${await retrievedJob.getState()}`);
    }
    
    // Test business hours functionality
    console.log('\n🕒 Testing business hours job scheduling...');
    const businessHoursJob = await FiscalQueueManager.addFiscalJob(
      'business-hours-order-001',
      'BUSINESS-HOURS-001',
      {
        cashierName: 'Business Hours Cashier',
        businessHours: true
      }
    );
    console.log(`✅ Business hours job added with ID: ${businessHoursJob.id}`);
    
    // Test queue management operations
    console.log('\n⏸️ Testing queue pause/resume...');
    await FiscalQueueManager.pauseQueue();
    console.log('✅ Queue paused');
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await FiscalQueueManager.resumeQueue();
    console.log('✅ Queue resumed');
    
    // Test multiple job operations
    console.log('\n📦 Testing multiple job addition...');
    const bulkJobs = [];
    for (let i = 0; i < 3; i++) {
      const job = await FiscalQueueManager.addFiscalJob(
        `bulk-order-${i}`,
        `BULK-ORDER-${i}`,
        {
          cashierName: `Bulk Cashier ${i}`,
          priority: Math.floor(Math.random() * 5)
        }
      );
      bulkJobs.push(job);
    }
    console.log(`✅ Added ${bulkJobs.length} bulk jobs`);
    
    // Final statistics
    console.log('\n📊 Final queue statistics...');
    const finalStats = await FiscalQueueManager.getQueueStats();
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
      await FiscalQueueManager.addFiscalJob('', '', {});
    } catch (error) {
      console.log('✅ Error handling works:', error instanceof Error ? error.message : 'Unknown error');
    }
    
    console.log('\n🎉 All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  } finally {
    // Cleanup
    if (initialized) {
      console.log('\n🧹 Cleaning up...');
      // Clean old jobs from queue
      const cleanupResult = await FiscalQueueManager.cleanQueue(0); // Clean all completed/failed jobs
      console.log(`✅ Cleanup completed - removed ${cleanupResult.removed} jobs`);
    }
  }
}

// Additional utility functions for manual testing
export async function addCustomTestJob(
  orderId: string,
  orderNumber: string,
  priority: number = 1,
  delay: number = 0
) {
  console.log(`\n➕ Adding custom test job for order: ${orderNumber}`);
  
  try {
    const job = await FiscalQueueManager.addFiscalJob(orderId, orderNumber, {
      cashierName: 'Custom Test Cashier',
      priority,
      delay
    });
    
    console.log(`✅ Custom job added with ID: ${job.id}`);
    return job.id;
  } catch (error) {
    console.error('❌ Failed to add custom job:', error);
    throw error;
  }
}

export async function getQueueStatus() {
  console.log('\n📊 Getting current queue status...');
  
  try {
    const stats = await FiscalQueueManager.getQueueStats();
    console.log('Current Queue Status:', {
      total: stats.total,
      waiting: stats.waiting,
      active: stats.active,
      completed: stats.completed,
      failed: stats.failed,
      delayed: stats.delayed
    });
    return stats;
  } catch (error) {
    console.error('❌ Failed to get queue status:', error);
    throw error;
  }
}

export async function clearQueue() {
  console.log('\n🧹 Clearing all jobs from queue...');
  
  try {
    const result = await FiscalQueueManager.cleanQueue(0); // Clean all jobs immediately
    console.log(`✅ Queue cleared - removed ${result.removed} jobs`);
    return result;
  } catch (error) {
    console.error('❌ Failed to clear queue:', error);
    throw error;
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  testBullMQRedis().catch(console.error);
}