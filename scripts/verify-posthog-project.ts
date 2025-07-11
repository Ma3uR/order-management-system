#!/usr/bin/env tsx

/**
 * Verify which PostHog project the API key belongs to
 */

import { PostHog } from 'posthog-node';

const POSTHOG_API_KEY = 'phc_pntTjbo4fk31MU9qAkiNdi1ENoGBadnp9doasOrNxXo';

async function verifyPostHogProject() {
  console.log('🔍 Verifying PostHog Project...\n');
  
  // The API key format can tell us about the project
  console.log(`📋 API Key Analysis:`);
  console.log(`   Full Key: ${POSTHOG_API_KEY}`);
  console.log(`   Key Prefix: ${POSTHOG_API_KEY.substring(0, 4)}`);
  console.log(`   Key Length: ${POSTHOG_API_KEY.length} characters`);
  
  // Check if it's a valid PostHog key format
  if (POSTHOG_API_KEY.startsWith('phc_')) {
    console.log('   ✅ Valid PostHog key format');
  } else {
    console.log('   ❌ Invalid PostHog key format');
    return;
  }
  
  console.log('\n🧪 Testing key with simple event...');
  
  try {
    const posthog = new PostHog(POSTHOG_API_KEY, {
      host: 'https://app.posthog.com',
      flushAt: 1,
      flushInterval: 0,
    });
    
    // Send a very simple test event
    const testId = `verification-${Date.now()}`;
    posthog.capture({
      distinctId: testId,
      event: 'posthog_verification_test',
      properties: {
        verification_time: new Date().toISOString(),
        test_id: testId,
        message: 'PostHog project verification test'
      }
    });
    
    console.log(`📨 Sent verification event with ID: ${testId}`);
    
    await posthog.flush();
    console.log('✅ Event flushed to PostHog');
    
    await posthog.shutdown();
    console.log('✅ PostHog client closed');
    
    console.log('\n📍 Where to find this event in PostHog:');
    console.log('   1. Go to https://app.posthog.com');
    console.log('   2. Make sure you\'re in the correct project');
    console.log('   3. Go to Activity → Live events');
    console.log('   4. Look for event "posthog_verification_test"');
    console.log(`   5. Check for distinct ID: ${testId}`);
    console.log('   6. Event should appear within 1-2 minutes');
    
    console.log('\n🔧 If you still don\'t see events:');
    console.log('   1. Your API key might belong to a different PostHog project');
    console.log('   2. Check all your PostHog projects/organizations');
    console.log('   3. Verify the API key in PostHog Settings → Project API Keys');
    console.log('   4. Make sure event ingestion is enabled');
    
    console.log('\n💡 To find the correct project:');
    console.log('   1. Go to PostHog Settings → Project API Keys');
    console.log('   2. Look for this key: phc_pntTjbo4fk3...');
    console.log('   3. Note which project it belongs to');
    console.log('   4. Switch to that project to see events');
    
  } catch (error) {
    console.error('❌ PostHog verification failed:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('401') || error.message.includes('403')) {
        console.log('\n🚨 Authentication Error:');
        console.log('   - API key is invalid or expired');
        console.log('   - Check the key in PostHog settings');
      } else if (error.message.includes('network') || error.message.includes('ENOTFOUND')) {
        console.log('\n🌐 Network Error:');
        console.log('   - Check internet connection');
        console.log('   - Verify PostHog host URL');
      } else {
        console.log('\n❓ Unknown Error:');
        console.log(`   - ${error.message}`);
      }
    }
  }
}

// Run the verification
verifyPostHogProject()
  .then(() => {
    console.log('\n🏁 PostHog project verification completed');
  })
  .catch((error) => {
    console.error('💥 Verification script failed:', error);
  });
