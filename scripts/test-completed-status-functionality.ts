#!/usr/bin/env tsx

import pb, { authenticatedCall } from '@/app/lib/pocketbase';
import { 
  isCompletedStatus, 
  isCompletedMarketplaceCode, 
  getCompletedMarketplaceCodes,
  createCompletedOrdersFilter 
} from '@/app/lib/utils/order-status';

interface StatusRecord {
  id: string;
  name: string;
  marketplace_code?: string;
  color: string;
  priority: number;
  source?: string;
}

async function testCompletedStatusFunctionality() {
  console.log('🧪 Testing completed status functionality...');
  
  try {
    // Test 1: Check utility functions
    console.log('\n📋 **TEST 1: Utility Functions**');
    console.log('═'.repeat(50));
    
    const testCodes = ['6', 'completed', 'delivered', 'pending', '1', ''];
    console.log('Testing marketplace codes:');
    testCodes.forEach(code => {
      const result = isCompletedMarketplaceCode(code);
      console.log(`  "${code}" → ${result ? '✅ COMPLETED' : '❌ NOT COMPLETED'}`);
    });
    
    console.log('\nCompleted marketplace codes:', getCompletedMarketplaceCodes());
    console.log('Filter for completed orders:', createCompletedOrdersFilter());

    // Test 2: Check database statuses
    console.log('\n📋 **TEST 2: Database Status Records**');
    console.log('═'.repeat(50));
    
    const statuses = await authenticatedCall(async () => {
      return await pb.collection('status_options').getFullList<StatusRecord>({
        sort: 'name'
      });
    });

    console.log(`Found ${statuses.length} status records in database`);
    
    const completedStatuses = statuses.filter(status => 
      isCompletedMarketplaceCode(status.marketplace_code)
    );
    
    console.log(`\n🎯 **COMPLETED STATUSES (${completedStatuses.length} found):**`);
    completedStatuses.forEach((status, index) => {
      console.log(`  ${index + 1}. "${status.name}"`);
      console.log(`     ID: ${status.id}`);
      console.log(`     Marketplace Code: "${status.marketplace_code}"`);
      console.log(`     Source: ${status.source || 'N/A'}`);
      console.log('');
    });

    // Test 3: Check orders with completed statuses
    console.log('\n📋 **TEST 3: Orders with Completed Statuses**');
    console.log('═'.repeat(50));
    
    const completedOrders = await authenticatedCall(async () => {
      return await pb.collection('orders').getList(1, 10, {
        filter: createCompletedOrdersFilter(),
        expand: 'status,source',
        sort: '-created'
      });
    });

    console.log(`Found ${completedOrders.totalItems} total completed orders in database`);
    console.log(`Showing first ${completedOrders.items.length} orders:`);
    
    completedOrders.items.forEach((order, index) => {
      const status = (order.expand as any)?.status;
      console.log(`  ${index + 1}. Order ${(order as any).orderNumber}`);
      console.log(`     Status: "${status?.name || 'Unknown'}"`);
      console.log(`     Marketplace Code: "${status?.marketplace_code || 'N/A'}"`);
      console.log(`     Amount: ₴${(order as any).amount}`);
      console.log('');
    });

    // Test 4: Test fiscal automation logic
    console.log('\n📋 **TEST 4: Fiscal Automation Logic**');
    console.log('═'.repeat(50));
    
    // Import and test fiscal automation
    const { shouldCreateFiscalReceipt } = await import('@/app/lib/services/fiscal-automation');
    
    const mockOrder = {} as any; // Order not needed for this test
    
    console.log('Testing fiscal automation shouldCreateReceipt logic:');
    completedStatuses.forEach(status => {
      const shouldCreate = shouldCreateFiscalReceipt(mockOrder, {
        marketplace_code: status.marketplace_code,
        name: status.name
      });
      
      console.log(`  "${status.name}" (${status.marketplace_code}) → ${shouldCreate ? '✅ CREATE RECEIPT' : '❌ NO RECEIPT'}`);
    });

    console.log('\n✅ All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

// Main function
async function main() {
  try {
    await testCompletedStatusFunctionality();
    console.log('\n🎉 Testing completed successfully!');
  } catch (error) {
    console.error('❌ Testing failed:', error);
    process.exit(1);
  }
}

// Execute when run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { testCompletedStatusFunctionality };
export default main;
