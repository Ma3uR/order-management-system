#!/usr/bin/env tsx

/**
 * Test script to verify Rozetka receipt creation API
 * This script tests the complete flow of creating a receipt on Rozetka side
 */

import { createRozetkaReceipt, getOrders } from '../app/actions/rozetka';
import pb, { authenticatedCall } from '../app/lib/pocketbase';
import * as dotenv from 'dotenv';

dotenv.config();

interface TestResult {
  orderId: string;
  orderNumber: string;
  beforeStatus?: number | boolean;
  afterStatus?: number | boolean;
  apiSuccess: boolean;
  apiError?: string;
}

async function testRozetkaReceiptCreation() {
  console.log('🧪 Testing Rozetka Receipt Creation API\n');
  
  try {
    // Authenticate with PocketBase
    console.log('🔑 Authenticating with PocketBase...');
    await authenticatedCall(() => pb.collection('users').getList(1, 1));
    console.log('✅ PocketBase authentication successful\n');

    // Get recent Rozetka orders
    console.log('📋 Fetching recent Rozetka orders...');
    const rozetkaOrders = await getOrders({ page: 1, types: 1 });
    
    if (!rozetkaOrders || rozetkaOrders.length === 0) {
      console.log('❌ No Rozetka orders found for testing');
      return;
    }

    console.log(`✅ Found ${rozetkaOrders.length} Rozetka orders\n`);

    // Find a suitable test order (preferably one without a receipt already)
    let testOrder = rozetkaOrders.find(order => 
      order.prro_receipt_status === 0 || order.prro_receipt_status === false
    );

    if (!testOrder) {
      console.log('⚠️  No orders without receipts found, using first available order');
      testOrder = rozetkaOrders[0];
    }

    console.log(`🎯 Selected test order: ${testOrder.id}`);
    console.log(`   Status: ${testOrder.status}`);
    console.log(`   Amount: ${testOrder.amount_with_discount}`);
    console.log(`   Customer: ${testOrder.user_title?.full_name || 'Unknown'}`);
    console.log(`   Current receipt status: ${testOrder.prro_receipt_status}\n`);

    const testResult: TestResult = {
      orderId: testOrder.id.toString(),
      orderNumber: testOrder.id.toString(),
      beforeStatus: testOrder.prro_receipt_status,
      apiSuccess: false
    };

    // Test 1: Create receipt without QR code
    console.log('🧪 Test 1: Creating Rozetka receipt without QR code...');
    const result1 = await createRozetkaReceipt(testOrder.id.toString());
    
    if (result1.error) {
      console.log(`❌ Test 1 failed: ${result1.error}`);
      testResult.apiError = result1.error;
    } else {
      console.log('✅ Test 1 successful: Receipt created without QR code');
      testResult.apiSuccess = true;
    }

    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 2: Create receipt again
    console.log('\n🧪 Test 2: Creating Rozetka receipt again...');
    const result2 = await createRozetkaReceipt(testOrder.id.toString());
    
    if (result2.error) {
      console.log(`❌ Test 2 failed: ${result2.error}`);
      if (!testResult.apiError) {
        testResult.apiError = result2.error;
      }
    } else {
      console.log('✅ Test 2 successful: Receipt created with QR code');
      testResult.apiSuccess = true;
    }

    // Wait a moment before checking status
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Verify: Check if receipt status changed on Rozetka side
    console.log('\n🔍 Verifying receipt status on Rozetka side...');
    const updatedOrders = await getOrders({ page: 1, types: 1 });
    const updatedOrder = updatedOrders.find(order => order.id === testOrder.id);

    if (updatedOrder) {
      testResult.afterStatus = updatedOrder.prro_receipt_status;
      console.log(`📊 Receipt status before: ${testResult.beforeStatus}`);
      console.log(`📊 Receipt status after:  ${testResult.afterStatus}`);
      
      if (testResult.beforeStatus !== testResult.afterStatus) {
        console.log('✅ SUCCESS: Receipt status changed on Rozetka side!');
      } else {
        console.log('⚠️  Status unchanged - this might be expected if receipt was already created');
      }
    } else {
      console.log('❌ Could not find updated order to verify status');
    }

    // Summary
    console.log('\n📈 Test Summary:');
    console.log('================');
    console.log(`Order ID: ${testResult.orderId}`);
    console.log(`API Calls Successful: ${testResult.apiSuccess}`);
    console.log(`Before Status: ${testResult.beforeStatus}`);
    console.log(`After Status: ${testResult.afterStatus}`);
    if (testResult.apiError) {
      console.log(`Last Error: ${testResult.apiError}`);
    }

    // Recommendations
    console.log('\n💡 Recommendations:');
    console.log('===================');
    if (testResult.apiSuccess) {
      console.log('✅ Rozetka API is working correctly');
      if (testResult.beforeStatus !== testResult.afterStatus) {
        console.log('✅ Receipt status is being updated on Rozetka side');
        console.log('🎉 Integration is working perfectly!');
      } else {
        console.log('⚠️  Receipt status not changed - check if order already had a receipt');
      }
    } else {
      console.log('❌ Rozetka API calls failed - check API credentials and endpoint');
      console.log('🔧 Debug steps:');
      console.log('   1. Verify ROZETKA_USERNAME and ROZETKA_PASSWORD in .env');
      console.log('   2. Check if API endpoint is correct');
      console.log('   3. Verify order ID format (should be numeric)');
      console.log('   4. Check Rozetka API documentation for any changes');
    }

  } catch (error) {
    console.error('💥 Test script failed:', error);
    process.exit(1);
  }
}

// Run the test
testRozetkaReceiptCreation()
  .then(() => {
    console.log('\n🏁 Test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Test failed:', error);
    process.exit(1);
  });

export { testRozetkaReceiptCreation };