import { RecordModel } from 'pocketbase';
import { syncOrders as syncEpicentrOrders } from '../app/actions/epicentr.js';
import { syncOrders as syncPromOrders } from '../app/actions/prom-ua.js';
import { syncOrders as syncRozetkaOrders } from '../app/actions/rozetka.js';
import pb, { authenticatedCall } from '../app/lib/pocketbase.js';
import { OrdersResponse } from '../app/types/pocketbase-types.js';

interface SyncResults {
  marketplace: string;
  success: boolean;
  syncedOrders?: number;
  failedOrders?: number;
  automatedStatusChanges?: number;
  telegramNotifications?: number;
  automationErrors?: number;
  error?: string;
}

async function testStatusUpdates() {
  console.log('\n🔍 Testing Status Update Logic...\n');
  
  try {
    // Get some existing orders from each marketplace to check current statuses
    const epicentrOrders = await authenticatedCall(async () => {
      return await pb.collection('orders').getList(1, 5, {
        filter: 'source = "pj9sejm9vqtu8xq"',
        sort: '-updated'
      });
    });

    const promOrders = await authenticatedCall(async () => {
      return await pb.collection('orders').getList(1, 5, {
        filter: 'source = "gfzk8nxfokgu9ku"',
        sort: '-updated'
      });
    });

    const rozetkaOrders = await authenticatedCall(async () => {
      return await pb.collection('orders').getList(1, 5, {
        filter: 'source = "4tvf116a5aitwmb"',
        sort: '-updated'
      });
    });

    console.log('📊 Current Order Status Summary:');
    console.log(`  🟣 Epicentr: ${epicentrOrders.items.length} orders found`);
    console.log(`  🟢 Prom.ua: ${promOrders.items.length} orders found`);
    console.log(`  🔵 Rozetka: ${rozetkaOrders.items.length} orders found`);

    // Log current statuses before sync
    if (epicentrOrders.items.length > 0) {
      console.log('\n📝 Epicentr Orders Before Sync:');
      epicentrOrders.items.forEach(order => {
        console.log(`  Order #${order.orderNumber}: Status ${order.status} (Updated: ${new Date(order.updated).toLocaleString()})`);
      });
    }

    if (promOrders.items.length > 0) {
      console.log('\n📝 Prom.ua Orders Before Sync:');
      promOrders.items.forEach(order => {
        console.log(`  Order #${order.orderNumber}: Status ${order.status} (Updated: ${new Date(order.updated).toLocaleString()})`);
      });
    }

    if (rozetkaOrders.items.length > 0) {
      console.log('\n📝 Rozetka Orders Before Sync:');
      rozetkaOrders.items.forEach(order => {
        console.log(`  Order #${order.orderNumber}: Status ${order.status} (Updated: ${new Date(order.updated).toLocaleString()})`);
      });
    }

    return {
      epicentrBefore: epicentrOrders.items as OrdersResponse[],
      promBefore: promOrders.items as OrdersResponse[],
      rozetkaBefore: rozetkaOrders.items as OrdersResponse[]
    };

  } catch (error) {
    console.error('❌ Error during status testing:', error);
    return null;
  }
}

async function compareStatusesAfterSync(beforeData: {
  epicentrBefore: OrdersResponse[];
  promBefore: OrdersResponse[];
  rozetkaBefore: OrdersResponse[];
}) {
  console.log('\n🔄 Checking Status Changes After Sync...\n');
  
  try {
    // Get the same orders after sync
    const epicentrAfter = await authenticatedCall(async () => {
      return await pb.collection('orders').getList(1, 10, {
        filter: 'source = "pj9sejm9vqtu8xq"',
        sort: '-updated'
      });
    });

    const promAfter = await authenticatedCall(async () => {
      return await pb.collection('orders').getList(1, 10, {
        filter: 'source = "gfzk8nxfokgu9ku"',
        sort: '-updated'
      });
    });

    const rozetkaAfter = await authenticatedCall(async () => {
      return await pb.collection('orders').getList(1, 10, {
        filter: 'source = "4tvf116a5aitwmb"',
        sort: '-updated'
      });
    });

    let changesDetected = 0;

    // Compare Epicentr orders
    console.log('🟣 Epicentr Status Changes:');
    beforeData.epicentrBefore.forEach((beforeOrder: OrdersResponse) => {
      const afterOrder = epicentrAfter.items.find((o: RecordModel) => o.id === beforeOrder.id);
      if (afterOrder) {
        if (beforeOrder.status !== afterOrder.status || beforeOrder.updated !== afterOrder.updated) {
          console.log(`  ✅ Order #${beforeOrder.orderNumber}:`);
          console.log(`    Status: ${beforeOrder.status} → ${afterOrder.status}`);
          console.log(`    Updated: ${new Date(beforeOrder.updated).toLocaleString()} → ${new Date(afterOrder.updated).toLocaleString()}`);
          changesDetected++;
        } else {
          console.log(`  ⚪ Order #${beforeOrder.orderNumber}: No changes`);
        }
      }
    });

    // Compare Prom.ua orders
    console.log('\n🟢 Prom.ua Status Changes:');
    beforeData.promBefore.forEach((beforeOrder: OrdersResponse) => {
      const afterOrder = promAfter.items.find((o: RecordModel) => o.id === beforeOrder.id);
      if (afterOrder) {
        if (beforeOrder.status !== afterOrder.status || beforeOrder.updated !== afterOrder.updated) {
          console.log(`  ✅ Order #${beforeOrder.orderNumber}:`);
          console.log(`    Status: ${beforeOrder.status} → ${afterOrder.status}`);
          console.log(`    Updated: ${new Date(beforeOrder.updated).toLocaleString()} → ${new Date(afterOrder.updated).toLocaleString()}`);
          changesDetected++;
        } else {
          console.log(`  ⚪ Order #${beforeOrder.orderNumber}: No changes`);
        }
      }
    });

    // Compare Rozetka orders
    console.log('\n🔵 Rozetka Status Changes:');
    beforeData.rozetkaBefore.forEach((beforeOrder: OrdersResponse) => {
      const afterOrder = rozetkaAfter.items.find((o: RecordModel) => o.id === beforeOrder.id);
      if (afterOrder) {
        if (beforeOrder.status !== afterOrder.status || beforeOrder.updated !== afterOrder.updated) {
          console.log(`  ✅ Order #${beforeOrder.orderNumber}:`);
          console.log(`    Status: ${beforeOrder.status} → ${afterOrder.status}`);
          console.log(`    Updated: ${new Date(beforeOrder.updated).toLocaleString()} → ${new Date(afterOrder.updated).toLocaleString()}`);
          changesDetected++;
        } else {
          console.log(`  ⚪ Order #${beforeOrder.orderNumber}: No changes`);
        }
      }
    });

    console.log(`\n📈 Summary: ${changesDetected} status changes detected`);
    
    return changesDetected;

  } catch (error) {
    console.error('❌ Error during status comparison:', error);
    return 0;
  }
}

async function syncMarketplace(name: string, syncFunction: () => Promise<{ success: boolean; syncedOrders?: number; failedOrders?: number; automatedStatusChanges?: number; telegramNotifications?: number; automationErrors?: number; error?: string }>): Promise<SyncResults> {
  console.log(`\n🔄 Syncing ${name} orders...`);
  
  try {
    const startTime = Date.now();
    const result = await syncFunction();
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    if (result.success) {
      console.log(`✅ ${name} sync completed in ${duration}s:`);
      console.log(`   📥 Synced: ${result.syncedOrders || 0} orders`);
      console.log(`   ❌ Failed: ${result.failedOrders || 0} orders`);
      
      // Show automation results if available
      if (result.automatedStatusChanges !== undefined || result.telegramNotifications !== undefined || result.automationErrors !== undefined) {
        console.log(`   🤖 Automation Results:`);
        console.log(`      🔄 Status Changes: ${result.automatedStatusChanges || 0}`);
        console.log(`      📱 Telegram Sent: ${result.telegramNotifications || 0}`);
        console.log(`      ⚠️  Automation Errors: ${result.automationErrors || 0}`);
      }
      
      return {
        marketplace: name,
        success: true,
        syncedOrders: result.syncedOrders || 0,
        failedOrders: result.failedOrders || 0,
        automatedStatusChanges: result.automatedStatusChanges || 0,
        telegramNotifications: result.telegramNotifications || 0,
        automationErrors: result.automationErrors || 0
      };
    } else {
      console.log(`❌ ${name} sync failed: ${result.error}`);
      return {
        marketplace: name,
        success: false,
        error: result.error
      };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.log(`❌ ${name} sync failed: ${errorMessage}`);
    return {
      marketplace: name,
      success: false,
      error: errorMessage
    };
  }
}

async function main() {
  console.log('🚀 Starting Enhanced Order Sync with Status Update Testing...\n');
  console.log(`📅 Sync started at: ${new Date().toLocaleString()}\n`);
  
  try {
    // Test status updates before sync
    const beforeData = await testStatusUpdates();
    
    if (!beforeData) {
      console.log('⚠️  Could not retrieve before-sync data, continuing with sync...');
    }

    // Perform sync operations
    const results: SyncResults[] = [];
    
    // Sync each marketplace
    results.push(await syncMarketplace('Epicentr', syncEpicentrOrders));
    results.push(await syncMarketplace('Prom.ua', syncPromOrders));
    results.push(await syncMarketplace('Rozetka', syncRozetkaOrders));
    
    // Compare statuses after sync if we have before data
    let statusChanges = 0;
    if (beforeData) {
      statusChanges = await compareStatusesAfterSync(beforeData);
    }
    
    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 SYNC SUMMARY');
    console.log('='.repeat(60));
    
    let totalSynced = 0;
    let totalFailed = 0;
    let totalAutomatedStatusChanges = 0;
    let totalTelegramNotifications = 0;
    let totalAutomationErrors = 0;
    let successfulMarketplaces = 0;
    
    results.forEach(result => {
      console.log(`\n${result.marketplace}:`);
      if (result.success) {
        console.log(`  ✅ Success - Synced: ${result.syncedOrders}, Failed: ${result.failedOrders}`);
        if (result.automatedStatusChanges !== undefined || result.telegramNotifications !== undefined || result.automationErrors !== undefined) {
          console.log(`  🤖 Automation - Status Changes: ${result.automatedStatusChanges || 0}, Telegram: ${result.telegramNotifications || 0}, Errors: ${result.automationErrors || 0}`);
        }
        totalSynced += result.syncedOrders || 0;
        totalFailed += result.failedOrders || 0;
        totalAutomatedStatusChanges += result.automatedStatusChanges || 0;
        totalTelegramNotifications += result.telegramNotifications || 0;
        totalAutomationErrors += result.automationErrors || 0;
        successfulMarketplaces++;
      } else {
        console.log(`  ❌ Failed - ${result.error}`);
      }
    });
    
    console.log(`\n🎯 Overall Results:`);
    console.log(`   📈 Total Orders Synced: ${totalSynced}`);
    console.log(`   📉 Total Orders Failed: ${totalFailed}`);
    console.log(`   🔄 Status Updates: ${statusChanges}`);
    console.log(`   🤖 Automated Status Changes: ${totalAutomatedStatusChanges}`);
    console.log(`   📱 Telegram Notifications: ${totalTelegramNotifications}`);
    console.log(`   ⚠️  Automation Errors: ${totalAutomationErrors}`);
    console.log(`   ✅ Successful Marketplaces: ${successfulMarketplaces}/3`);
    console.log(`   📅 Completed at: ${new Date().toLocaleString()}`);
    
    if (successfulMarketplaces === 3) {
      console.log('\n🎉 All marketplaces synced successfully!');
      process.exit(0);
    } else {
      console.log('\n⚠️  Some marketplaces failed to sync');
      process.exit(1);
    }
    
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('❌ Order sync failed:', error.message);
      console.error('Stack trace:', error.stack);
    } else {
      console.error('❌ Order sync failed:', error);
    }
    process.exit(1);
  }
}

// Add process event handlers for graceful shutdown
process.on('SIGINT', () => {
  console.log('\n⏹️  Sync interrupted by user');
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('\n⏹️  Sync terminated');
  process.exit(1);
});

main();