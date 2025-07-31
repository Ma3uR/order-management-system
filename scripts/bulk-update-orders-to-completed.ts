import pb, { authenticatedCall } from '@/app/lib/pocketbase';

const ROZETKA_SOURCE_ID = '4tvf116a5aitwmb';

interface OrderRecord {
  id: string;
  orderNumber: string;
  status: string;
  created: string;
  created_at_marketplace?: string;
}

interface StatusRecord {
  id: string;
  name: string;
  marketplace_code: string;
  source: string;
}

async function bulkUpdateOrdersToCompleted() {
  try {
    console.log('🚀 Starting bulk order status update to completed...');
    console.log('🔍 Target: Orders with marketplace_code = 2 (processing) → marketplace_code = 6 (completed)');
    console.log('📅 Cutoff: Before July 30, 2025 (excluding July 30 orders)');
    console.log('═'.repeat(70));

    // Step 1: Get status IDs for marketplace codes 2 and 6
    console.log('\n📋 Step 1: Finding status mappings...');
    
    // Get processing status (marketplace_code = 2)
    const processingStatusResult = await authenticatedCall(() =>
      pb.collection('status_options').getList(1, 10, {
        filter: `source = "${ROZETKA_SOURCE_ID}" && marketplace_code = "2"`
      })
    );
    
    // Get completed status (marketplace_code = 6)  
    const completedStatusResult = await authenticatedCall(() =>
      pb.collection('status_options').getList(1, 10, {
        filter: `source = "${ROZETKA_SOURCE_ID}" && marketplace_code = "6"`
      })
    );

    if (processingStatusResult.items.length === 0) {
      throw new Error('❌ No status found with marketplace_code = 2');
    }
    
    if (completedStatusResult.items.length === 0) {
      throw new Error('❌ No status found with marketplace_code = 6');
    }

    const processingStatus = processingStatusResult.items[0] as unknown as StatusRecord;
    const completedStatus = completedStatusResult.items[0] as unknown as StatusRecord;

    console.log(`✅ Processing status found: "${processingStatus.name}" (ID: ${processingStatus.id})`);
    console.log(`✅ Completed status found: "${completedStatus.name}" (ID: ${completedStatus.id})`);

    // Step 2: Find orders with processing status before July 30
    console.log('\n📋 Step 2: Finding orders to update...');
    
    const cutoffDate = '2025-07-30';
    console.log(`📅 Cutoff date: ${cutoffDate} (orders before this date will be updated)`);
    
    // Get orders with processing status
    const ordersResult = await authenticatedCall(() =>
      pb.collection('orders').getList(1, 500, {
        filter: `source = "${ROZETKA_SOURCE_ID}" && status = "${processingStatus.id}"`,
        sort: '+created'
      })
    );

    console.log(`📊 Found ${ordersResult.items.length} orders with processing status`);
    
    if (ordersResult.items.length === 0) {
      console.log('ℹ️ No orders found with processing status. Exiting.');
      return { success: true, updated: 0, skipped: 0 };
    }

    // Filter orders by date (before July 30)
    const ordersToUpdate = ordersResult.items.filter((order: any) => {
      // Use created_at_marketplace if available, otherwise use created
      const orderDate = order.created_at_marketplace || order.created;
      const orderDateOnly = orderDate.split('T')[0]; // Get just the date part
      
      return orderDateOnly < cutoffDate;
    });

    const ordersToSkip = ordersResult.items.length - ordersToUpdate.length;

    console.log(`📊 Orders analysis:`);
    console.log(`   - Total orders with processing status: ${ordersResult.items.length}`);
    console.log(`   - Orders to update (before ${cutoffDate}): ${ordersToUpdate.length}`);
    console.log(`   - Orders to skip (${cutoffDate} and after): ${ordersToSkip}`);

    if (ordersToUpdate.length === 0) {
      console.log('ℹ️ No orders found before the cutoff date. Exiting.');
      return { success: true, updated: 0, skipped: ordersToSkip };
    }

    // Step 3: Show sample of orders to be updated
    console.log('\n📋 Step 3: Sample of orders to be updated:');
    const sampleOrders = ordersToUpdate.slice(0, 5);
    sampleOrders.forEach((order: any, index) => {
      const orderDate = order.created_at_marketplace || order.created;
      console.log(`   ${index + 1}. Order ${order.orderNumber} (${orderDate.split('T')[0]})`);
    });
    
    if (ordersToUpdate.length > 5) {
      console.log(`   ... and ${ordersToUpdate.length - 5} more orders`);
    }

    // Step 4: Confirm before proceeding (in production, you might want user confirmation)
    console.log('\n⚠️ CONFIRMATION REQUIRED:');
    console.log(`This will update ${ordersToUpdate.length} orders from processing to completed status.`);
    console.log('Proceeding in 3 seconds...\n');
    
    // Brief pause to allow manual cancellation if needed
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Step 5: Update orders in batches
    console.log('📋 Step 4: Updating orders...');
    
    let updatedCount = 0;
    let failedCount = 0;
    const batchSize = 10; // Process in small batches to avoid overwhelming the database

    for (let i = 0; i < ordersToUpdate.length; i += batchSize) {
      const batch = ordersToUpdate.slice(i, Math.min(i + batchSize, ordersToUpdate.length));
      
      console.log(`🔄 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(ordersToUpdate.length / batchSize)} (${batch.length} orders)...`);
      
      for (const order of batch) {
        try {
          await authenticatedCall(() =>
            pb.collection('orders').update(order.id, {
              status: completedStatus.id,
              updated: new Date().toISOString()
            })
          );
          
          updatedCount++;
          console.log(`   ✅ Updated order ${order.orderNumber} (${(order.created_at_marketplace || order.created).split('T')[0]})`);
          
        } catch (error) {
          failedCount++;
          console.error(`   ❌ Failed to update order ${order.orderNumber}:`, error instanceof Error ? error.message : error);
        }
      }
      
      // Brief pause between batches
      if (i + batchSize < ordersToUpdate.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // Step 6: Summary
    console.log('\n═'.repeat(70));
    console.log('📊 BULK UPDATE SUMMARY:');
    console.log(`   ✅ Successfully updated: ${updatedCount} orders`);
    console.log(`   ❌ Failed to update: ${failedCount} orders`);
    console.log(`   ⏭️ Skipped (after cutoff): ${ordersToSkip} orders`);
    console.log(`   📅 Cutoff date used: ${cutoffDate}`);
    console.log(`   🏷️ Status changed: "${processingStatus.name}" → "${completedStatus.name}"`);
    
    if (updatedCount > 0) {
      console.log('\n🎉 Bulk update completed successfully!');
      console.log('💡 All updated orders are now marked as completed.');
    }

    return {
      success: failedCount === 0,
      updated: updatedCount,
      failed: failedCount,
      skipped: ordersToSkip,
      processingStatusName: processingStatus.name,
      completedStatusName: completedStatus.name
    };

  } catch (error) {
    console.error('❌ Bulk update failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      updated: 0,
      failed: 0,
      skipped: 0
    };
  }
}

// Execute when script is run directly
bulkUpdateOrdersToCompleted().then((result) => {
  if (result.success) {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  } else {
    console.error('\n❌ Script failed:', result.error);
    process.exit(1);
  }
}).catch((error) => {
  console.error('❌ Script execution failed:', error);
  process.exit(1);
});