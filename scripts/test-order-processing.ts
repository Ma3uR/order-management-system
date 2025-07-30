import pb, { authenticatedCall } from '@/app/lib/pocketbase';

const ROZETKA_SOURCE_ID = '4tvf116a5aitwmb';

async function testOrderStatusMapping(statusCode: number) {
  try {
    console.log(`🔍 Testing status mapping for Rozetka status ${statusCode}...`);
    
    // Try to find the status mapping (same logic as in rozetka.ts)
    const statusResult = await authenticatedCall(() =>
      pb.collection('status_options').getList(1, 50, {
        filter: `marketplace_code = "${statusCode}" && source = "${ROZETKA_SOURCE_ID}"`,
        sort: '+priority'
      })
    );
    
    if (statusResult.items.length === 0) {
      console.log(`❌ No status mapping found for Rozetka status ${statusCode}`);
      return { found: false, mapping: null };
    }
    
    console.log(`✅ Found status mapping for Rozetka status ${statusCode}:`);
    console.log('  ID:', statusResult.items[0].id);
    console.log('  Name:', statusResult.items[0].name);
    console.log('  Priority:', statusResult.items[0].priority);
    console.log('  Color:', statusResult.items[0].color);
    
    return { found: true, mapping: statusResult.items[0] };
    
  } catch (error) {
    console.error(`❌ Failed to test status mapping for ${statusCode}:`, error);
    return { found: false, mapping: null, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

async function testMultipleStatuses() {
  console.log('🚀 Testing status mappings for various Rozetka statuses...');
  console.log('═'.repeat(60));
  
  // Test the status from our debug order
  await testOrderStatusMapping(61);
  
  console.log('\n' + '-'.repeat(40));
  
  // Test a few common statuses for comparison
  await testOrderStatusMapping(1); // New order
  await testOrderStatusMapping(3); // Passed to delivery service
  await testOrderStatusMapping(6); // Order completed
  
  console.log('\n' + '═'.repeat(60));
  console.log('✅ Status mapping test completed');
}

// Execute when script is run directly
testMultipleStatuses().then(() => {
  console.log('✅ Script completed successfully');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});