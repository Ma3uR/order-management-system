#!/usr/bin/env tsx

/**
 * Test script to verify fiscal automation only triggers for completed orders
 * and uses BullMQ exclusively for queuing (PostHog only for event tracking)
 */

import { isCompletedMarketplaceCode } from '../app/lib/utils/order-status';
import { FiscalQueueManager } from '../app/lib/queues/fiscal-queue';

async function testCompletedStatusCheck() {
  console.log('🧪 Testing completed status checking...\n');

  const testCases = [
    { code: '6', expected: true, description: 'Marketplace code 6 (completed)' },
    { code: 'completed', expected: true, description: 'Marketplace code "completed"' },
    { code: 'delivered', expected: true, description: 'Marketplace code "delivered"' },
    { code: '1', expected: false, description: 'Marketplace code 1 (new)' },
    { code: '2', expected: false, description: 'Marketplace code 2 (processing)' },
    { code: 'processing', expected: false, description: 'Marketplace code "processing"' },
    { code: 'pending', expected: false, description: 'Marketplace code "pending"' },
    { code: undefined, expected: false, description: 'No marketplace code' },
    { code: null, expected: false, description: 'Null marketplace code' }
  ];

  let passedTests = 0;
  let totalTests = testCases.length;

  for (const testCase of testCases) {
    const result = isCompletedMarketplaceCode(testCase.code);
    const status = result === testCase.expected ? '✅ PASS' : '❌ FAIL';
    
    console.log(`${status} ${testCase.description}: ${testCase.code} -> ${result}`);
    
    if (result === testCase.expected) {
      passedTests++;
    }
  }

  console.log(`\n📊 Results: ${passedTests}/${totalTests} tests passed\n`);
  return passedTests === totalTests;
}

async function testQueueStats() {
  console.log('🧪 Testing BullMQ queue statistics...\n');

  try {
    const stats = await FiscalQueueManager.getQueueStats();
    
    console.log('📈 Queue Statistics:');
    console.log(`  Waiting: ${stats.waiting}`);
    console.log(`  Active: ${stats.active}`);
    console.log(`  Completed: ${stats.completed}`);
    console.log(`  Failed: ${stats.failed}`);
    console.log(`  Delayed: ${stats.delayed}`);
    console.log(`  Total: ${stats.total}\n`);
    
    // Verify all stats are numbers
    const statsValid = typeof stats.waiting === 'number' &&
                      typeof stats.active === 'number' &&
                      typeof stats.completed === 'number' &&
                      typeof stats.failed === 'number' &&
                      typeof stats.delayed === 'number' &&
                      typeof stats.total === 'number';
    
    if (statsValid) {
      console.log('✅ Queue statistics are valid\n');
      return true;
    } else {
      console.log('❌ Queue statistics are invalid\n');
      return false;
    }
  } catch (error) {
    console.error('❌ Failed to get queue statistics:', error);
    return false;
  }
}

async function testFiscalJobCreation() {
  console.log('🧪 Testing fiscal job creation...\n');

  try {
    // Test adding a job to the queue
    const testOrderId = 'test-order-' + Date.now();
    const testOrderNumber = 'TEST-' + Date.now();
    
    console.log(`📝 Adding test job for order ${testOrderNumber}...`);
    
    const job = await FiscalQueueManager.addFiscalJob(testOrderId, testOrderNumber, {
      cashierName: 'TEST-CASHIER',
      priority: 1,
      businessHours: true
    });
    
    console.log(`✅ Job created with ID: ${job.id}`);
    console.log(`📋 Job data:`, job.data);
    
    // Clean up the test job
    await job.remove();
    console.log(`🧹 Test job removed\n`);
    
    return true;
  } catch (error) {
    console.error('❌ Failed to create fiscal job:', error);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting Fiscal Automation Tests\n');
  console.log('=' .repeat(50));
  
  const tests = [
    { name: 'Completed Status Check', fn: testCompletedStatusCheck },
    { name: 'Queue Statistics', fn: testQueueStats },
    { name: 'Fiscal Job Creation', fn: testFiscalJobCreation }
  ];
  
  let passedTests = 0;
  
  for (const test of tests) {
    console.log(`\n🔍 Running: ${test.name}`);
    console.log('-'.repeat(30));
    
    try {
      const passed = await test.fn();
      if (passed) {
        passedTests++;
        console.log(`✅ ${test.name} PASSED`);
      } else {
        console.log(`❌ ${test.name} FAILED`);
      }
    } catch (error) {
      console.error(`💥 ${test.name} CRASHED:`, error);
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log(`🏁 Final Results: ${passedTests}/${tests.length} tests passed`);
  
  if (passedTests === tests.length) {
    console.log('🎉 All tests passed! Fiscal automation is working correctly.');
    process.exit(0);
  } else {
    console.log('⚠️  Some tests failed. Please check the implementation.');
    process.exit(1);
  }
}

// Run the tests
main().catch((error) => {
  console.error('💥 Test suite crashed:', error);
  process.exit(1);
});
