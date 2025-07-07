/**
 * Test script for fiscal automation scheduler
 * This script tests the fiscal automation system in test mode
 */

import * as dotenv from 'dotenv';
import { format } from 'date-fns';

// Load environment variables
dotenv.config();

// Import our fiscal scheduler
import { 
  fiscalScheduler, 
  getFiscalSchedulerStatus,
  processQueuedFiscalOrders,
  autoOpenFiscalShift,
  autoCloseFiscalShift
} from '../app/lib/services/fiscal-scheduler.js';

import {
  getFiscalQueueStats,
  getFiscalQueueItems,
  processFiscalQueueManually
} from '../app/[locale]/orders/actions/fiscal-queue.js';

async function testFiscalScheduler() {
  console.log('🧪 Testing Fiscal Automation Scheduler...\n');
  
  try {
    // Test 1: Get scheduler status
    console.log('📊 Step 1: Checking scheduler status');
    const status = await getFiscalSchedulerStatus();
    console.log('  ✅ Scheduler Status:');
    console.log(`    Enabled: ${status.enabled}`);
    console.log(`    Test Mode: ${status.testMode}`);
    console.log(`    Business Hours: ${status.businessHours}`);
    console.log(`    Queued Orders: ${status.queuedOrders}`);
    console.log(`    Next Business Start: ${format(new Date(status.nextBusinessStart), 'yyyy-MM-dd HH:mm')}`);
    console.log(`    Business Hours: ${status.config.startHour}:00 - ${status.config.endHour}:00`);
    
    // Test 2: Check queue statistics
    console.log('\n📈 Step 2: Checking queue statistics');
    const queueStats = await getFiscalQueueStats();
    if (queueStats.success && queueStats.data) {
      console.log('  ✅ Queue Statistics:');
      console.log(`    Total Items: ${queueStats.data.total}`);
      console.log(`    Pending: ${queueStats.data.pending}`);
      console.log(`    Processing: ${queueStats.data.processing}`);
      console.log(`    Completed: ${queueStats.data.completed}`);
      console.log(`    Failed: ${queueStats.data.failed}`);
      if (queueStats.data.nextScheduled) {
        console.log(`    Next Scheduled: ${format(new Date(queueStats.data.nextScheduled), 'yyyy-MM-dd HH:mm')}`);
      }
    } else {
      console.log(`  ❌ Failed to get queue stats: ${queueStats.error}`);
    }
    
    // Test 3: List queue items
    console.log('\n📋 Step 3: Listing queue items');
    const queueItems = await getFiscalQueueItems(1, 5);
    if (queueItems.success && queueItems.data) {
      console.log(`  ✅ Found ${queueItems.data.totalItems} total queue items`);
      if (queueItems.data.items.length > 0) {
        console.log('  📝 Recent queue items:');
        queueItems.data.items.forEach((item, index) => {
          console.log(`    ${index + 1}. Order: ${item.order_id}`);
          console.log(`       Status: ${item.status}`);
          console.log(`       Priority: ${item.priority}`);
          console.log(`       Attempts: ${item.attempts}`);
          if (item.scheduled_for) {
            console.log(`       Scheduled: ${format(new Date(item.scheduled_for), 'yyyy-MM-dd HH:mm')}`);
          }
          if (item.error_message) {
            console.log(`       Error: ${item.error_message}`);
          }
        });
      } else {
        console.log('  📝 Queue is empty');
      }
    } else {
      console.log(`  ❌ Failed to get queue items: ${queueItems.error}`);
    }
    
    // Test 4: Check business hours logic
    console.log('\n⏰ Step 4: Testing business hours logic');
    const now = new Date();
    const isBusinessHours = fiscalScheduler.isBusinessHours(now);
    const nextStart = fiscalScheduler.getNextBusinessStart(now);
    const todayEnd = fiscalScheduler.getTodayBusinessEnd(now);
    
    console.log(`  ✅ Current time: ${format(now, 'yyyy-MM-dd HH:mm')}`);
    console.log(`  ✅ Is business hours: ${isBusinessHours}`);
    console.log(`  ✅ Next business start: ${format(nextStart, 'yyyy-MM-dd HH:mm')}`);
    console.log(`  ✅ Today business end: ${format(todayEnd, 'yyyy-MM-dd HH:mm')}`);
    
    // Test 5: Test with different times
    console.log('\n🕐 Step 5: Testing with different times');
    const testTimes = [
      new Date(now.getFullYear(), now.getMonth(), now.getDate(), 7, 0), // 7:00 AM
      new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 0), // 8:00 AM
      new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0), // 12:00 PM
      new Date(now.getFullYear(), now.getMonth(), now.getDate(), 22, 0), // 10:00 PM
      new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 0), // 11:00 PM
    ];
    
    testTimes.forEach((testTime, index) => {
      const inHours = fiscalScheduler.isBusinessHours(testTime);
      console.log(`  ${inHours ? '✅' : '❌'} ${format(testTime, 'HH:mm')} - Business hours: ${inHours}`);
    });
    
    // Test 6: Configuration validation
    console.log('\n🔧 Step 6: Configuration validation');
    const envVars = {
      'ENABLE_FISCAL_AUTOMATION': process.env.ENABLE_FISCAL_AUTOMATION || 'Not set',
      'FISCAL_AUTOMATION_TEST_MODE': process.env.FISCAL_AUTOMATION_TEST_MODE || 'Not set',
      'FISCAL_START_HOUR': process.env.FISCAL_START_HOUR || 'Not set (default: 8)',
      'FISCAL_END_HOUR': process.env.FISCAL_END_HOUR || 'Not set (default: 22)',
      'FISCAL_AUTO_CASHIER': process.env.FISCAL_AUTO_CASHIER || 'Not set (default: AUTO-SYSTEM)',
      'FISCAL_TIMEZONE': process.env.FISCAL_TIMEZONE || 'Not set (default: Europe/Kiev)',
      'CASA_VCHASNO_TOKEN': process.env.CASA_VCHASNO_TOKEN ? 'Set' : 'Not set'
    };
    
    Object.entries(envVars).forEach(([key, value]) => {
      const status = value === 'Set' || (value !== 'Not set' && !value.includes('Not set')) ? '✅' : '❌';
      console.log(`  ${status} ${key}: ${value}`);
    });
    
    // Analysis and recommendations
    console.log('\n📋 Analysis & Recommendations:');
    const issues = [];
    const recommendations = [];
    
    if (!status.enabled) {
      issues.push('Fiscal automation is disabled');
      recommendations.push('Set ENABLE_FISCAL_AUTOMATION=true to enable automation');
    }
    
    if (!status.testMode) {
      recommendations.push('Consider enabling test mode (FISCAL_AUTOMATION_TEST_MODE=true) for initial testing');
    }
    
    if (!process.env.CASA_VCHASNO_TOKEN) {
      issues.push('Casa.vchasno token not configured');
      recommendations.push('Set CASA_VCHASNO_TOKEN with your API token');
    }
    
    if (queueStats.success && queueStats.data?.failed > 0) {
      issues.push(`${queueStats.data.failed} failed items in queue`);
      recommendations.push('Review failed queue items and consider retrying them');
    }
    
    if (issues.length === 0) {
      console.log('  🎉 Configuration looks good!');
    } else {
      console.log('  ⚠️  Issues found:');
      issues.forEach(issue => console.log(`    • ${issue}`));
    }
    
    if (recommendations.length > 0) {
      console.log('  💡 Recommendations:');
      recommendations.forEach(rec => console.log(`    • ${rec}`));
    }
    
    // Next steps
    console.log('\n🚀 Next Steps:');
    if (status.enabled) {
      console.log('  1. ✅ Automation is enabled');
      if (status.businessHours) {
        console.log('  2. ✅ Currently in business hours - orders will be processed immediately');
        console.log('  3. 💡 To test queue functionality, wait until after business hours or modify hours');
      } else {
        console.log('  2. ⏰ Currently outside business hours - orders will be queued');
        console.log('  3. 💡 Orders will be processed automatically at next business start');
      }
      console.log('  4. 📱 Monitor queue with: npm run test:fiscal-automation');
      console.log('  5. 🔄 Test with actual orders by syncing: npm run sync:orders');
    } else {
      console.log('  1. 🔧 Enable automation: Set ENABLE_FISCAL_AUTOMATION=true');
      console.log('  2. 🧪 Enable test mode: Set FISCAL_AUTOMATION_TEST_MODE=true');
      console.log('  3. 🔑 Configure Casa.vchasno token: Set CASA_VCHASNO_TOKEN');
      console.log('  4. 🔄 Re-run this test: npm run test:fiscal-automation');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('\n🔧 Troubleshooting:');
    console.error('  • Ensure PocketBase is running and accessible');
    console.error('  • Check that fiscal_automation_queue collection exists');
    console.error('  • Verify environment variables are loaded correctly');
    console.error('  • Check network connectivity if testing Casa.vchasno integration');
  }
}

// Add graceful shutdown handlers
process.on('SIGINT', () => {
  console.log('\n⏹️  Test interrupted by user');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n⏹️  Test terminated');
  process.exit(0);
});

// Run the test
console.log('🤖 Fiscal Automation Scheduler - Test Suite');
console.log('=' .repeat(50));
testFiscalScheduler();
