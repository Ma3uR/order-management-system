import pb, { authenticatedCall } from '../app/lib/pocketbase';
import { OrdersResponse } from '../app/types/pocketbase-types';

async function findOldestMismatch() {
  console.log('🔍 Finding the oldest order with item count mismatch...\n');
  
  try {
    // Get all Rozetka orders from the database, sorted by creation date (oldest first)
    const orders = await authenticatedCall(async () => {
      return await pb.collection('orders').getFullList<OrdersResponse>({
        filter: 'source = "4tvf116a5aitwmb"',
        sort: 'created' // Sort by oldest first
      });
    });

    console.log(`📊 Found ${orders.length} total Rozetka orders in database`);

    let oldestMismatch: OrdersResponse | null = null;
    let totalMismatches = 0;

    for (const order of orders) {
      try {
        // Calculate actual item count from products
        let actualItems = 0;
        if (Array.isArray(order.products)) {
          actualItems = order.products.reduce((sum: number, product: any) => {
            const quantity = parseInt(product.quantity) || 0;
            return sum + quantity;
          }, 0);
        }

        // Check if stored count matches actual count
        if (order.numberOfItems !== actualItems) {
          totalMismatches++;
          
          if (!oldestMismatch) {
            oldestMismatch = order;
          }
          
          // Show first 10 mismatches for reference
          if (totalMismatches <= 10) {
            console.log(`${totalMismatches}. Order ${order.orderNumber}:`);
            console.log(`   Created: ${new Date(order.created).toLocaleString()}`);
            console.log(`   Stored items: ${order.numberOfItems}`);
            console.log(`   Actual items: ${actualItems}`);
            console.log(`   Customer: ${order.fullName}`);
            console.log('');
          }
        }
      } catch (error) {
        console.error(`Error processing order ${order.orderNumber}: ${error}`);
      }
    }

    if (oldestMismatch) {
      console.log('🎯 OLDEST ORDER WITH MISMATCH:');
      console.log(`   Order Number: ${oldestMismatch.orderNumber}`);
      console.log(`   Created: ${new Date(oldestMismatch.created).toLocaleString()}`);
      console.log(`   Database ID: ${oldestMismatch.id}`);
      console.log(`   Stored items: ${oldestMismatch.numberOfItems}`);
      
      // Calculate actual items
      let actualItems = 0;
      if (Array.isArray(oldestMismatch.products)) {
        actualItems = oldestMismatch.products.reduce((sum: number, product: any) => {
          return sum + (parseInt(product.quantity) || 0);
        }, 0);
      }
      
      console.log(`   Actual items: ${actualItems}`);
      console.log(`   Customer: ${oldestMismatch.fullName}`);
      console.log(`   Phone: ${oldestMismatch.phoneNumber}`);
      console.log(`   Amount: ${oldestMismatch.amount}`);
      console.log(`   Status: ${oldestMismatch.status}`);
      
      // Show products if available
      if (Array.isArray(oldestMismatch.products) && oldestMismatch.products.length > 0) {
        console.log(`   Products (${oldestMismatch.products.length}):`);
        oldestMismatch.products.forEach((product: any, index: number) => {
          console.log(`     ${index + 1}. ${product.title || product.name || 'Unknown'}`);
          console.log(`        Quantity: ${product.quantity || 'Unknown'}`);
          console.log(`        Price: ${product.price || product.pricePerItem || 'Unknown'}`);
        });
      }
      
      console.log(`\n📈 Summary:`);
      console.log(`   Total orders in database: ${orders.length}`);
      console.log(`   Total mismatched orders: ${totalMismatches}`);
      console.log(`   Percentage with mismatches: ${((totalMismatches / orders.length) * 100).toFixed(2)}%`);
      
      // Show date range of all orders
      const newestOrder = orders[orders.length - 1];
      console.log(`\n📅 Date Range:`);
      console.log(`   Oldest order: ${new Date(oldestMismatch.created).toLocaleString()}`);
      console.log(`   Newest order: ${new Date(newestOrder.created).toLocaleString()}`);
      
    } else {
      console.log('✅ No mismatched orders found! All orders are consistent.');
    }

  } catch (error) {
    console.error('❌ Error finding oldest mismatch:', error);
  }
}

findOldestMismatch().then(() => {
  console.log('\n🎉 Search completed');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Search failed:', error);
  process.exit(1);
});