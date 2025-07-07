#!/usr/bin/env tsx

/**
 * Direct PostHog connection test
 * This script tests PostHog connectivity directly without our wrapper
 */

import { PostHog } from 'posthog-node';

const POSTHOG_API_KEY = 'phc_pntTjbo4fk31MU9qAkiNdi1ENoGBadnp9doasOrNxXo';
const POSTHOG_HOST = 'https://app.posthog.com';

async function testDirectPostHog() {
  console.log('🧪 Testing Direct PostHog Connection...\n');
  
  console.log(`API Key: ${POSTHOG_API_KEY.substring(0, 15)}...`);
  console.log(`Host: ${POSTHOG_HOST}`);
  console.log('');

  try {
    // Initialize PostHog client
    console.log('📡 Initializing PostHog client...');
    const posthog = new PostHog(POSTHOG_API_KEY, {
      host: POSTHOG_HOST,
      flushAt: 1, // Send immediately
      flushInterval: 0, // No batching
    });
    console.log('✅ PostHog client initialized');

    // Test 1: Simple event
    console.log('\n📝 Test 1: Sending simple test event...');
    posthog.capture({
      distinctId: 'test-user-direct',
      event: 'direct_test_event',
      properties: {
        test_message: 'Direct PostHog test from Node.js',
        timestamp: new Date().toISOString(),
        environment: 'test',
        source: 'direct-test-script'
      }
    });
    console.log('✅ Simple event sent');

    // Test 2: Fiscal automation event
    console.log('\n📝 Test 2: Sending fiscal automation test event...');
    posthog.capture({
      distinctId: 'fiscal-test-user',
      event: 'fiscal_test_direct',
      properties: {
        order_id: 'direct-test-order-001',
        order_number: 'DIRECT-ORDER-2024-001',
        event_timestamp: new Date().toISOString(),
        order_total: 2500.00,
        order_currency: 'UAH',
        processing_mode: 'test',
        test_run: true,
        service: 'fiscal-automation'
      }
    });
    console.log('✅ Fiscal test event sent');

    // Test 3: Multiple events
    console.log('\n📝 Test 3: Sending multiple test events...');
    for (let i = 1; i <= 3; i++) {
      posthog.capture({
        distinctId: `test-user-${i}`,
        event: 'bulk_test_event',
        properties: {
          event_number: i,
          batch_test: true,
          timestamp: new Date().toISOString()
        }
      });
    }
    console.log('✅ Multiple events sent');

    // Flush to ensure events are sent
    console.log('\n🚀 Flushing events to PostHog...');
    await posthog.flush();
    console.log('✅ Events flushed');

    // Wait a moment for processing
    console.log('\n⏳ Waiting 3 seconds for PostHog processing...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Shutdown client
    console.log('\n🔄 Shutting down PostHog client...');
    await posthog.shutdown();
    console.log('✅ PostHog client shutdown complete');

    console.log('\n🎉 Direct PostHog test completed successfully!');
    console.log('\n📊 What to check in your PostHog dashboard:');
    console.log('   1. Go to PostHog Activity tab');
    console.log('   2. Look for events with these names:');
    console.log('      - direct_test_event');
    console.log('      - fiscal_test_direct');
    console.log('      - bulk_test_event');
    console.log('   3. Check the timestamp matches current time');
    console.log('   4. Verify distinct IDs: test-user-direct, fiscal-test-user, test-user-1,2,3');
    
    console.log('\n⚠️  If you don\'t see events:');
    console.log('   1. Check if the API key belongs to the correct PostHog project');
    console.log('   2. Verify you\'re looking at the right project in PostHog');
    console.log('   3. Check PostHog project settings for ingestion');
    console.log('   4. Events might take a few minutes to appear in the dashboard');

  } catch (error) {
    console.error('❌ Direct PostHog test failed:', error);
    
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      console.error('Stack trace:', error.stack);
    }
    
    console.log('\n🔍 Troubleshooting steps:');
    console.log('   1. Verify the API key is correct');
    console.log('   2. Check network connectivity');
    console.log('   3. Ensure PostHog host URL is correct');
    console.log('   4. Check if there are any firewall restrictions');
  }
}

// Run the test
testDirectPostHog()
  .then(() => {
    console.log('\n🏁 Direct PostHog test script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Test script failed:', error);
    process.exit(1);
  });
