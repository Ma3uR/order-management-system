#!/usr/bin/env tsx

/**
 * Test script to debug environment variable loading
 */

import { config } from 'dotenv';
console.log('Loading .env file...');
const result = config();

console.log('Environment variable test:');
console.log('==========================');
console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`POSTHOG_API_KEY exists: ${!!process.env.POSTHOG_API_KEY}`);
console.log(`POSTHOG_API_KEY value: ${process.env.POSTHOG_API_KEY ? process.env.POSTHOG_API_KEY.substring(0, 10) + '...' : 'undefined'}`);
console.log(`POSTHOG_HOST: ${process.env.POSTHOG_HOST || 'not set'}`);

console.log('\nDotenv result:', result);
console.log('\nAll POSTHOG env vars:');
Object.keys(process.env)
  .filter(key => key.includes('POSTHOG'))
  .forEach(key => {
    console.log(`${key}: ${process.env[key]}`);
  });

// Test PostHog service initialization
async function testPostHogService() {
  console.log('\nTesting PostHog service...');
  try {
    const { postHogFiscal } = await import('../app/lib/services/posthog-fiscal');
    console.log('PostHog service imported successfully');
    
    // Test a simple event
    await postHogFiscal.trackEvent('env_test_event', {
      order_id: 'env-test-001',
      event_timestamp: new Date().toISOString(),
      test_message: 'Environment variable test'
    });
    console.log('Test event tracked successfully');
  } catch (error) {
    console.error('Error testing PostHog service:', error);
  }
}

testPostHogService();
