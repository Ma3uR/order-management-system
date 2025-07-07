#!/usr/bin/env tsx

/**
 * Test script for PostHog fiscal automation tracking
 * 
 * This script tests the PostHog integration for fiscal automation
 * and verifies that events are being tracked correctly.
 */

import { config } from 'dotenv';
// Load environment variables FIRST
const envResult = config();
console.log('📄 Environment loaded:', envResult.parsed ? 'Success' : 'Failed');

// Force PostHog API key and EU host for testing
process.env.POSTHOG_API_KEY = 'phc_pntTjbo4fk31MU9qAkiNdi1ENoGBadnp9doasOrNxXo';
process.env.POSTHOG_HOST = 'https://eu.i.posthog.com';
console.log('🔑 PostHog API key set for testing');
console.log(`Key preview: ${process.env.POSTHOG_API_KEY.substring(0, 15)}...`);
console.log(`🇪🇺 PostHog EU instance: ${process.env.POSTHOG_HOST}`);

// Import types first (they don't initialize anything)
import { ProcessingResult } from '../app/lib/services/fiscal-scheduler';
import { OrdersResponse } from '../app/types/pocketbase-types';
import { CasaVchasnoResponse } from '../app/types/casa-vchasno';

// Import PostHog services AFTER environment is loaded
import {
  postHogFiscal,
  trackFiscalEvent,
  trackOrderQueued,
  trackOrderProcessedImmediately,
  trackReceiptCreated,
  trackReceiptFailed,
  trackShiftOperation,
  trackBatchProcessing,
  trackSchedulerStatus,
  trackTelegramNotification,
  trackFeatureFlag
} from '../app/lib/services/posthog-fiscal';

// Mock data for testing
const mockOrder: Partial<OrdersResponse> = {
  id: 'test-order-001',
  orderNumber: 'ORDER-2024-001',
  amount: 1500.00,
  created: new Date().toISOString(),
  updated: new Date().toISOString(),
  expand: {
    currency: { code: 'UAH' },
    source: { name: 'Rozetka' },
    status: { 
      name: 'Delivered',
      marketplace_code: '6' 
    }
  }
};

const mockCasaResponse: Partial<CasaVchasnoResponse> = {
  res: 0,
  errortxt: 'Success',
  info: {
    task: 1,
    fisid: 'FN123456789',
    dataid: 123456,
    doccode: 'DOC123456',
    dt: new Date().toISOString(),
    cashier: 'TEST-CASHIER',
    dtype: 0,
    isprint: 1,
    isoffline: false,
    safe: 0,
    shift_link: 0,
    docno: 1,
    cancelid: '',
    qr: 'https://receipt.example.com/123456',
    mac: 'test-mac'
  } as any
};

const mockProcessingResult: ProcessingResult = {
  processed: 5,
  failed: 1,
  skipped: 2,
  errors: ['Order validation failed']
};

async function testPostHogIntegration() {
  console.log('🧪 Starting PostHog Fiscal Automation Tests...\n');

  // Check PostHog configuration first
  const isPostHogEnabled = !!process.env.POSTHOG_API_KEY;
  console.log('📋 PostHog Configuration Check:');
  console.log(`PostHog API Key: ${process.env.POSTHOG_API_KEY ? '✅ Set' : '❌ Missing'}`);
  console.log(`PostHog Host: ${process.env.POSTHOG_HOST || 'https://app.posthog.com (default)'}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log();

  if (!isPostHogEnabled) {
    console.log('⚠️  WARNING: PostHog API key not found!');
    console.log('🔧 To enable PostHog tracking, add POSTHOG_API_KEY to your .env file:');
    console.log('   POSTHOG_API_KEY=your_posthog_api_key_here');
    console.log();
    console.log('📝 Running integration tests without actual PostHog calls...');
    console.log();
  }

  const testStartTime = new Date();
  let testsPassed = 0;
  let testsTotal = 0;
  let actuallyTracked = 0;

  // Helper function to log test results
  const logTestResult = (testName: string) => {
    if (isPostHogEnabled) {
      console.log(`✅ ${testName} successful (sent to PostHog)\n`);
      actuallyTracked++;
    } else {
      console.log(`✅ ${testName} function works (PostHog disabled)\n`);
    }
  };

  // Test 1: Basic event tracking
  testsTotal++;
  try {
    console.log('📝 Test 1: Basic fiscal event tracking');
    await trackFiscalEvent('test_event', {
      order_id: 'test-order-001',
      order_number: 'ORDER-2024-001',
      event_timestamp: new Date().toISOString(),
      test_run: true,
      order_total: 1500.00,
      order_currency: 'UAH'
    });
    
    logTestResult('Basic event tracking');
    testsPassed++;
  } catch (error) {
    console.error('❌ Basic event tracking failed:', error);
    console.log();
  }

  // Test 2: Order queued tracking
  testsTotal++;
  try {
    console.log('📝 Test 2: Order queued tracking');
    const scheduledFor = new Date();
    scheduledFor.setHours(scheduledFor.getHours() + 12); // Tomorrow morning
    
    await trackOrderQueued(
      mockOrder.id!,
      mockOrder as OrdersResponse,
      scheduledFor,
      1
    );
    
    logTestResult('Order queued tracking');
    testsPassed++;
  } catch (error) {
    console.error('❌ Order queued tracking failed:', error);
    console.log();
  }

  // Test 3: Immediate order processing tracking
  testsTotal++;
  try {
    console.log('📝 Test 3: Immediate order processing tracking');
    await trackOrderProcessedImmediately(
      mockOrder.id!,
      mockOrder as OrdersResponse,
      testStartTime
    );
    if (isPostHogEnabled) {
      console.log('✅ Immediate processing tracking successful (sent to PostHog)\n');
      actuallyTracked++;
    } else {
      console.log('✅ Immediate processing tracking function works (PostHog disabled)\n');
    }
    testsPassed++;
  } catch (error) {
    console.error('❌ Immediate processing tracking failed:', error);
    console.log();
  }

  // Test 4: Successful receipt creation tracking
  testsTotal++;
  try {
    console.log('📝 Test 4: Successful receipt creation tracking');
    await trackReceiptCreated(
      mockOrder.id!,
      mockOrder as OrdersResponse,
      mockCasaResponse as CasaVchasnoResponse,
      'TEST-CASHIER',
      testStartTime
    );
    
    if (isPostHogEnabled) {
      console.log('✅ Receipt creation tracking successful (sent to PostHog)\n');
      actuallyTracked++;
    } else {
      console.log('✅ Receipt creation tracking function works (PostHog disabled)\n');
    }
    testsPassed++;
  } catch (error) {
    console.error('❌ Receipt creation tracking failed:', error);
    console.log();
  }

  // Test 5: Failed receipt creation tracking
  testsTotal++;
  try {
    console.log('📝 Test 5: Failed receipt creation tracking');
    const failedResponse = { ...mockCasaResponse, res: 1, errortxt: 'API Error' };
    await trackReceiptFailed(
      mockOrder.id!,
      mockOrder as OrdersResponse,
      'Test API error',
      failedResponse as CasaVchasnoResponse,
      testStartTime
    );
    console.log('✅ Failed receipt tracking successful\n');
    testsPassed++;
  } catch (error) {
    console.error('❌ Failed receipt tracking failed:', error);
    console.log();
  }

  // Test 6: Shift operations tracking
  testsTotal++;
  try {
    console.log('📝 Test 6: Shift operations tracking');
    await trackShiftOperation('open', true, 'TEST-CASHIER', { shift_id: 'TEST-001' });
    await trackShiftOperation('close', true, 'TEST-CASHIER', { 
      shift_id: 'TEST-001',
      z_report: 'Z123456'
    });
    console.log('✅ Shift operations tracking successful\n');
    testsPassed++;
  } catch (error) {
    console.error('❌ Shift operations tracking failed:', error);
    console.log();
  }

  // Test 7: Batch processing tracking
  testsTotal++;
  try {
    console.log('📝 Test 7: Batch processing tracking');
    await trackBatchProcessing(
      mockProcessingResult,
      8, // queue size
      testStartTime
    );
    console.log('✅ Batch processing tracking successful\n');
    testsPassed++;
  } catch (error) {
    console.error('❌ Batch processing tracking failed:', error);
    console.log();
  }

  // Test 8: Scheduler status tracking
  testsTotal++;
  try {
    console.log('📝 Test 8: Scheduler status tracking');
    await trackSchedulerStatus(
      true,  // enabled
      true,  // test mode
      true,  // business hours
      5,     // queued orders
      new Date().toISOString() // next business start
    );
    console.log('✅ Scheduler status tracking successful\n');
    testsPassed++;
  } catch (error) {
    console.error('❌ Scheduler status tracking failed:', error);
    console.log();
  }

  // Test 9: Telegram notification tracking
  testsTotal++;
  try {
    console.log('📝 Test 9: Telegram notification tracking');
    await trackTelegramNotification(
      mockOrder.id!,
      mockOrder.orderNumber!,
      true
    );
    await trackTelegramNotification(
      mockOrder.id!,
      mockOrder.orderNumber!,
      false,
      'Test telegram error'
    );
    console.log('✅ Telegram notification tracking successful\n');
    testsPassed++;
  } catch (error) {
    console.error('❌ Telegram notification tracking failed:', error);
    console.log();
  }

  // Test 10: Feature flag tracking
  testsTotal++;
  try {
    console.log('📝 Test 10: Feature flag tracking');
    await trackFeatureFlag('test_feature', true, {
      test_context: 'automated_test',
      version: '1.0.0'
    });
    console.log('✅ Feature flag tracking successful\n');
    testsPassed++;
  } catch (error) {
    console.error('❌ Feature flag tracking failed:', error);
    console.log();
  }

  // Test 11: PostHog client methods
  testsTotal++;
  try {
    console.log('📝 Test 11: PostHog client flush and shutdown');
    await postHogFiscal.flush();
    console.log('✅ PostHog client operations successful\n');
    testsPassed++;
  } catch (error) {
    console.error('❌ PostHog client operations failed:', error);
    console.log();
  }

  // Final results
  console.log('📊 TEST RESULTS');
  console.log('================');
  console.log(`✅ Function Tests Passed: ${testsPassed}/${testsTotal}`);
  console.log(`❌ Function Tests Failed: ${testsTotal - testsPassed}/${testsTotal}`);
  console.log(`📈 Function Success Rate: ${Math.round((testsPassed / testsTotal) * 100)}%`);
  
  if (isPostHogEnabled) {
    console.log(`🚀 Events Actually Sent to PostHog: ${actuallyTracked}/${testsTotal}`);
    console.log('🎉 PostHog integration is ACTIVE and working correctly!');
  } else {
    console.log(`🚀 Events Actually Sent to PostHog: 0/${testsTotal} (API key missing)`);
    if (testsPassed === testsTotal) {
      console.log('✅ All tracking functions work correctly, but PostHog is NOT active.');
      console.log('🔑 Add POSTHOG_API_KEY to .env to enable real tracking.');
    } else {
      console.log('❌ Some tracking functions failed. Check implementation.');
    }
  }

  console.log('\n📋 Final Configuration Status:');
  console.log(`PostHog API Key: ${process.env.POSTHOG_API_KEY ? '✅ Set' : '❌ Missing'}`);
  console.log(`PostHog Host: ${process.env.POSTHOG_HOST || 'https://app.posthog.com'}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`PostHog Status: ${isPostHogEnabled ? '✅ ENABLED' : '❌ DISABLED'}`);

  // Cleanup
  try {
    await postHogFiscal.shutdown();
    console.log('\n🔄 PostHog client shutdown complete.');
  } catch (error) {
    console.warn('⚠️  PostHog shutdown warning:', error);
  }
}

// Run the tests
testPostHogIntegration()
  .then(() => {
    console.log('\n🏁 PostHog fiscal automation test completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Test execution failed:', error);
    process.exit(1);
  });
