#!/usr/bin/env tsx

/**
 * Test script for BullMQ Redis connection and fiscal queue functionality
 * 
 * This script tests:
 * 1. Redis connection
 * 2. BullMQ queue creation
 * 3. Job addition and processing
 * 4. Queue statistics
 */

import { config } from 'dotenv';

// Load environment variables
console.log('🔧 Loading environment variables...');
const envResult = config();
console.log('Environment loaded:', envResult.parsed ? 'Success' : 'Failed');

// Show Redis configuration
console.log('\n📋 Redis Configuration:');
console.log('REDIS_HOST:', process.env.REDIS_HOST || 'not set');
console.log('REDIS_PORT:', process.env.REDIS_PORT || 'not set');
console.log('REDIS_URL:', process.env.REDIS_URL ? 'set' : 'not set');
console.log('REDIS_PASSWORD:', process.env.REDIS_PASSWORD ? 'set' : 'not set');

async function testBullMQRedis() {
  console.log('\n🧪 Starting BullMQ Redis Integration Tests...\n');

  let testsPassed = 0;
  let testsTotal = 0;

  // Test 1: Redis Connection
  testsTotal++;
  try {
    console.log('📝 Test 1: Redis Connection');
    const { testRedisConnection } = await import('../app/lib/redis');
    const connected = await testRedisConnection();
    
    if (connected) {
      console.log('✅ Redis connection successful\n');
      testsPassed++;
    } else {
      console.log('❌ Redis connection failed\n');
    }
  } catch (error) {
    console.error('❌ Redis connection test failed:', error);
    console.log();
  }

  // Test 2: Queue Initialization
  testsTotal++;
  try {
    console.log('📝 Test 2: BullMQ Queue Initialization');
    const { fiscalQueue, FiscalQueueProcessor } = await import('../app/lib/queues/fiscal-queue');
    
    // Try to get queue stats
    const stats = await fiscalQueue.getWaiting();
    console.log('✅ BullMQ queue initialized successfully');
    console.log(`Queue has ${stats.length} waiting jobs\n`);
    testsPassed++;
  } catch (error) {
    console.error('❌ Queue initialization failed:', error);
    console.log();
  }

  // Test 3: Worker Startup
  testsTotal++;
  try {
    console.log('📝 Test 3: Worker Startup');
    const { FiscalQueueProcessor } = await import('../app/lib/queues/fiscal-queue');
    
    FiscalQueueProcessor.startWorker();
    
    // Wait a moment for worker to start
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    if (FiscalQueueProcessor.isWorkerProcessing()) {
      console.log('✅ Worker started successfully\n');
      testsPassed++;
    } else {
      console.log('⚠️  Worker may not have started correctly\n');
    }
  } catch (error) {
    console.error('❌ Worker startup failed:', error);
    console.log();
  }

  // Test 4: Add Test Job
  testsTotal++;
  try {
    console.log('📝 Test 4: Add Test Job');
    const { FiscalQueueManager } = await import('../app/lib/queues/fiscal-queue');
    
    const job = await FiscalQueueManager.addFiscalJob(
      'test-order-001',
      'TEST-ORDER-2024-001',
      {
        cashierName: 'TEST-CASHIER',
        priority: 1,
        businessHours: true
      }
    );
    
    console.log(`✅ Test job added with ID: ${job.id}\n`);
    testsPassed++;
  } catch (error) {
    console.error('❌ Adding test job failed:', error);
    console.log();
  }

  // Test 5: Queue Statistics
  testsTotal++;
  try {
    console.log('📝 Test 5: Queue Statistics');
    const { FiscalQueueManager } = await import('../app/lib/queues/fiscal-queue');
    
    const stats = await FiscalQueueManager.getQueueStats();
    console.log('✅ Queue statistics retrieved:');
    console.log('  Waiting:', stats.waiting);
    console.log('  Active:', stats.active);
    console.log('  Completed:', stats.completed);
    console.log('  Failed:', stats.failed);
    console.log('  Delayed:', stats.delayed);
    console.log('  Total:', stats.total);
    console.log();
    testsPassed++;
  } catch (error) {
    console.error('❌ Getting queue statistics failed:', error);
    console.log();
  }

  // Test 6: Queue Management
  testsTotal++;
  try {
    console.log('📝 Test 6: Queue Management');
    const { FiscalQueueManager } = await import('../app/lib/queues/fiscal-queue');
    
    // Test pause/resume
    await FiscalQueueManager.pauseQueue();
    console.log('Queue paused successfully');
    
    await FiscalQueueManager.resumeQueue();
    console.log('Queue resumed successfully');
    
    console.log('✅ Queue management operations successful\n');
    testsPassed++;
  } catch (error) {
    console.error('❌ Queue management failed:', error);
    console.log();
  }

  // Test 7: Cleanup Test Job
  testsTotal++;
  try {
    console.log('📝 Test 7: Queue Cleanup');
    const { FiscalQueueManager } = await import('../app/lib/queues/fiscal-queue');
    
    await FiscalQueueManager.cleanQueue();
    console.log('✅ Queue cleanup successful\n');
    testsPassed++;
  } catch (error) {
    console.error('❌ Queue cleanup failed:', error);
    console.log();
  }

  // Final Results
  console.log('📊 TEST RESULTS');
  console.log('================');
  console.log(`✅ Tests Passed: ${testsPassed}/${testsTotal}`);
  console.log(`❌ Tests Failed: ${testsTotal - testsPassed}/${testsTotal}`);
  console.log(`📈 Success Rate: ${Math.round((testsPassed / testsTotal) * 100)}%`);
  
  if (testsPassed === testsTotal) {
    console.log('🎉 All tests passed! BullMQ Redis integration is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Please check your Redis configuration.');
  }

  console.log('\n📋 Configuration Summary:');
  console.log('Redis Host:', process.env.REDIS_HOST || 'localhost');
  console.log('Redis Port:', process.env.REDIS_PORT || '6379');
  console.log('Redis URL:', process.env.REDIS_URL ? 'configured' : 'not configured');
  console.log('Fiscal Automation:', process.env.ENABLE_AUTO_FISCAL === 'true' ? 'enabled' : 'disabled');

  // Cleanup
  try {
    console.log('\n🔄 Cleaning up...');
    const { shutdownFiscalQueue } = await import('../app/lib/queues/fiscal-queue');
    await shutdownFiscalQueue();
    
    const { closeRedisConnection } = await import('../app/lib/redis');
    await closeRedisConnection();
    
    console.log('✅ Cleanup completed');
  } catch (error) {
    console.warn('⚠️  Cleanup warning:', error);
  }
}

// Run the tests
testBullMQRedis()
  .then(() => {
    console.log('\n🏁 BullMQ Redis test completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Test execution failed:', error);
    process.exit(1);
  });
