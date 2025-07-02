import { syncOrders } from '../app/actions/rozetka.js';

async function testRozetkaSync() {
  console.log('🚀 Testing Rozetka Sync Only...\n');
  console.log(`📅 Test started at: ${new Date().toLocaleString()}\n`);
  
  try {
    const result = await syncOrders();
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 ROZETKA SYNC RESULTS');
    console.log('='.repeat(60));
    
    if (result.success) {
      console.log('✅ Sync Status: SUCCESS');
      console.log(`📥 Orders Synced: ${result.syncedOrders}`);
      console.log(`❌ Orders Failed: ${result.failedOrders}`);
      console.log(`📄 Total Orders Fetched: ${result.totalOrdersFetched || 'N/A'}`);
      console.log(`📚 Pages Processed: ${result.pagesProcessed || 'N/A'}`);
      console.log(`🤖 Automated Status Changes: ${result.automatedStatusChanges || 0}`);
      console.log(`📱 Telegram Notifications: ${result.telegramNotifications || 0}`);
      console.log(`⚠️  Automation Errors: ${result.automationErrors || 0}`);
    } else {
      console.log('❌ Sync Status: FAILED');
      console.log(`Error: ${result.error}`);
    }
    
    console.log(`\n📅 Test completed at: ${new Date().toLocaleString()}`);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testRozetkaSync();