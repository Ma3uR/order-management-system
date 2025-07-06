#!/usr/bin/env node

/**
 * Test script for fiscal shift opening and closing in test mode
 * This script tests the complete fiscal shift lifecycle using the Casa.vchasno API
 */

import { config } from 'dotenv';
config({ path: '.env' });

import fetch from 'node-fetch';

const CASA_VCHASNO_BASE_URL = 'https://kasa.vchasno.ua/api/v3';
const CASA_VCHASNO_TOKEN = process.env.CASA_VCHASNO_TOKEN;

if (!CASA_VCHASNO_TOKEN) {
  console.error('❌ CASA_VCHASNO_TOKEN environment variable is required');
  process.exit(1);
}

/**
 * Make request to Casa.vchasno API
 */
async function makeRequest(endpoint, data) {
  try {
    console.log(`\n🔄 Making request to: ${CASA_VCHASNO_BASE_URL}${endpoint}`);
    console.log('📤 Request data:', JSON.stringify(data, null, 2));

    const response = await fetch(`${CASA_VCHASNO_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': CASA_VCHASNO_TOKEN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('📥 Response:', JSON.stringify(result, null, 2));

    // Check if the API returned an error
    if (result.res !== 0) {
      console.error(`❌ API Error: ${result.errortxt || 'Unknown API error'}`);
      return { success: false, error: result.errortxt || 'Unknown API error', data: result };
    }

    console.log('✅ Request successful');
    return { success: true, data: result };
  } catch (error) {
    console.error('❌ Request failed:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Check current shift status
 */
async function checkShiftStatus() {
  console.log('\n📊 === CHECKING SHIFT STATUS ===');
  
  const request = {
    source: 'TEST_SCRIPT',
    fiscal: {
      task: 18, // SHIFT_STATUS
      dtype: 0  // Test mode
    }
  };

  return await makeRequest('/fiscal/execute', request);
}

/**
 * Create Z-report (close shift)
 */
async function createZReport(cashierName) {
  console.log('\n📋 === CREATING Z-REPORT (CLOSING SHIFT) ===');
  
  const request = {
    source: 'TEST_SCRIPT',
    fiscal: {
      task: 11, // Z_REPORT
      cashier: cashierName,
      dtype: 0  // Test mode
    }
  };

  return await makeRequest('/fiscal/execute', request);
}

/**
 * Create a test sale receipt
 */
async function createTestSale(cashierName) {
  console.log('\n🛒 === CREATING TEST SALE RECEIPT ===');
  
  const request = {
    source: 'TEST_SCRIPT',
    fiscal: {
      task: 1, // SALE
      cashier: cashierName,
      dtype: 0, // Test mode
      receipt: {
        sum: 100.00,
        round: 0,
        comment_up: 'Test Sale - Shift Testing',
        comment_down: 'Test Mode - No real transaction',
        disc: 0,
        disc_type: 0,
        rows: [
          {
            code: 'TEST001',
            name: 'Test Product for Shift Testing',
            cnt: 1,
            price: 100.00,
            disc: 0,
            taxgrp: 2,
            comment: 'Test item for shift testing'
          }
        ],
        pays: [
          {
            type: 1, // CARD
            sum: 100.00,
            change: 0
          }
        ]
      }
    }
  };

  return await makeRequest('/fiscal/execute', request);
}

/**
 * Main test function
 */
async function testFiscalShifts() {
  console.log('🚀 Starting Fiscal Shift Testing in TEST MODE');
  console.log('🔧 Using Casa.vchasno API with dtype=0 (test mode)');
  
  const cashierName = 'Test Cashier';
  
  try {
    // Step 1: Check initial shift status
    console.log('\n📍 Step 1: Check initial shift status');
    const initialStatus = await checkShiftStatus();
    
    if (!initialStatus.success) {
      console.error('❌ Failed to check initial shift status');
      return;
    }
    
    const shiftStatus = initialStatus.data.info.shift_status;
    console.log(`📊 Current shift status: ${getShiftStatusText(shiftStatus)}`);
    
    // Step 2: If shift is open, close it first
    if (shiftStatus === 1) { // OPEN
      console.log('\n📍 Step 2: Closing existing open shift');
      const closeResult = await createZReport(cashierName);
      
      if (closeResult.success) {
        console.log('✅ Successfully closed existing shift');
        // Wait a moment before checking status again
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        console.log('⚠️ Could not close existing shift, continuing anyway...');
      }
    } else {
      console.log('\n📍 Step 2: No open shift found, ready to proceed');
    }
    
    // Step 3: Check shift status after closing (if we closed one)
    console.log('\n📍 Step 3: Check shift status before testing');
    const preTestStatus = await checkShiftStatus();
    
    if (preTestStatus.success) {
      const currentStatus = preTestStatus.data.info.shift_status;
      console.log(`📊 Shift status: ${getShiftStatusText(currentStatus)}`);
    }
    
    // Step 4: Create a test sale (this should work regardless of shift status in test mode)
    console.log('\n📍 Step 4: Create test sale receipt');
    const saleResult = await createTestSale(cashierName);
    
    if (saleResult.success) {
      console.log('✅ Successfully created test sale receipt');
      console.log(`📄 Document code: ${saleResult.data.info.doccode}`);
      console.log(`🔗 QR Code: ${saleResult.data.info.qr}`);
    } else {
      console.log('❌ Failed to create test sale receipt');
    }
    
    // Step 5: Create Z-report (this should work in test mode)
    console.log('\n📍 Step 5: Create Z-report (test mode)');
    const zReportResult = await createZReport(cashierName);
    
    if (zReportResult.success) {
      console.log('✅ Successfully created Z-report');
      console.log(`📄 Document code: ${zReportResult.data.info.doccode}`);
      
      // Display Z-report statistics
      const info = zReportResult.data.info;
      if (info.summary) {
        console.log('📊 Z-Report Summary:');
        console.log(`   Sales: ₴${info.summary.base_p || 0}`);
        console.log(`   Returns: ₴${info.summary.base_m || 0}`);
      }
      if (info.receipt) {
        console.log('📋 Receipt Counts:');
        console.log(`   Sale receipts: ${info.receipt.count_p || 0}`);
        console.log(`   Return receipts: ${info.receipt.count_m || 0}`);
      }
    } else {
      console.log('❌ Failed to create Z-report');
    }
    
    // Step 6: Final status check
    console.log('\n📍 Step 6: Final shift status check');
    const finalStatus = await checkShiftStatus();
    
    if (finalStatus.success) {
      const finalShiftStatus = finalStatus.data.info.shift_status;
      console.log(`📊 Final shift status: ${getShiftStatusText(finalShiftStatus)}`);
    }
    
    console.log('\n🎉 === FISCAL SHIFT TESTING COMPLETED ===');
    console.log('✅ All test operations completed in TEST MODE');
    console.log('ℹ️  Note: Test mode operations do not affect real fiscal data');
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

/**
 * Get human-readable shift status text
 */
function getShiftStatusText(status) {
  switch (status) {
    case -1: return 'Unknown';
    case 0: return 'Closed';
    case 1: return 'Open';
    case 2: return 'Blocked';
    default: return `Unknown (${status})`;
  }
}

// Run the test
testFiscalShifts().catch(console.error);
