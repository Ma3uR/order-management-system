import pb, { authenticatedCall } from '../app/lib/pocketbase';
import { OrdersResponse } from '../app/types/pocketbase-types';
import { appendFileSync } from 'fs';

const LOG_FILE = 'product-counts-validation.log';

function logMessage(message: string, type: 'INFO' | 'ERROR' | 'SUCCESS' | 'WARNING' = 'INFO') {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${type}: ${message}\n`;
  
  console.log(`${type === 'ERROR' ? '❌' : type === 'SUCCESS' ? '✅' : type === 'WARNING' ? '⚠️' : 'ℹ️'} ${message}`);
  appendFileSync(LOG_FILE, logEntry);
}

async function validateAllOrders() {
  logMessage('🔍 Validating all Rozetka orders for product count consistency...');
  
  try {
    const orders = await authenticatedCall(async () => {
      return await pb.collection('orders').getFullList<OrdersResponse>({
        filter: 'source = "4tvf116a5aitwmb"',
        sort: 'created'
      });
    });

    logMessage(`📊 Found ${orders.length} Rozetka orders to validate`);

    let consistentOrders = 0;
    let inconsistentOrders = 0;
    const remainingMismatches: Array<{
      orderNumber: string;
      stored: number;
      actual: number;
      customer: string;
      created: string;
    }> = [];

    for (const order of orders) {
      try {
        // Calculate actual item count from products
        let actualCount = 0;
        if (Array.isArray(order.products)) {
          actualCount = order.products.reduce((sum: number, product: any) => {
            const quantity = parseInt(product.quantity) || 0;
            return sum + quantity;
          }, 0);
        }

        if (order.numberOfItems === actualCount) {
          consistentOrders++;
        } else {
          inconsistentOrders++;
          remainingMismatches.push({
            orderNumber: order.orderNumber,
            stored: order.numberOfItems,
            actual: actualCount,
            customer: order.fullName,
            created: order.created
          });
        }
      } catch (error) {
        logMessage(`Error validating order ${order.orderNumber}: ${error}`, 'ERROR');
        inconsistentOrders++;
      }
    }

    // Generate validation report
    logMessage('\n📋 VALIDATION RESULTS:');
    logMessage(`Total orders checked: ${orders.length}`);
    logMessage(`Consistent orders: ${consistentOrders}`, consistentOrders === orders.length ? 'SUCCESS' : 'INFO');
    logMessage(`Inconsistent orders: ${inconsistentOrders}`, inconsistentOrders > 0 ? 'WARNING' : 'SUCCESS');
    
    const consistencyPercentage = ((consistentOrders / orders.length) * 100).toFixed(2);
    logMessage(`Consistency rate: ${consistencyPercentage}%`, inconsistentOrders === 0 ? 'SUCCESS' : 'WARNING');

    if (inconsistentOrders === 0) {
      logMessage('\n🎉 PERFECT! All orders have consistent product counts!', 'SUCCESS');
      logMessage('✅ Receipt generation will show correct quantities for all orders', 'SUCCESS');
    } else {
      logMessage(`\n⚠️ REMAINING MISMATCHES (${inconsistentOrders}):`, 'WARNING');
      
      if (remainingMismatches.length <= 20) {
        remainingMismatches.forEach((mismatch, index) => {
          logMessage(`  ${index + 1}. Order ${mismatch.orderNumber}: stored=${mismatch.stored}, actual=${mismatch.actual} (${mismatch.customer})`);
        });
      } else {
        remainingMismatches.slice(0, 15).forEach((mismatch, index) => {
          logMessage(`  ${index + 1}. Order ${mismatch.orderNumber}: stored=${mismatch.stored}, actual=${mismatch.actual} (${mismatch.customer})`);
        });
        logMessage(`  ... and ${remainingMismatches.length - 15} more mismatches`);
      }
      
      logMessage('\n💡 To fix remaining mismatches, run:', 'INFO');
      logMessage('node --import=tsx/esm scripts/fix-product-counts.ts --dry-run', 'INFO');
    }

    // Date range analysis
    if (orders.length > 0) {
      const oldestOrder = orders[0];
      const newestOrder = orders[orders.length - 1];
      
      logMessage('\n📅 Order Date Range:');
      logMessage(`Oldest: ${new Date(oldestOrder.created).toLocaleString()} (Order ${oldestOrder.orderNumber})`);
      logMessage(`Newest: ${new Date(newestOrder.created).toLocaleString()} (Order ${newestOrder.orderNumber})`);
    }

    // Summary for client
    if (inconsistentOrders === 0) {
      logMessage('\n✅ STATUS FOR CLIENT:', 'SUCCESS');
      logMessage('All order product counts are now correct. Receipt generation is ready to use with accurate quantities.', 'SUCCESS');
    } else {
      logMessage(`\n⚠️ STATUS FOR CLIENT:`, 'WARNING');
      logMessage(`${consistentOrders} orders (${consistencyPercentage}%) have correct counts.`, 'INFO');
      logMessage(`${inconsistentOrders} orders still need fixing.`, 'WARNING');
      logMessage('Receipt generation will work, but some quantities may be incorrect for older orders.', 'WARNING');
    }

    return {
      total: orders.length,
      consistent: consistentOrders,
      inconsistent: inconsistentOrders,
      percentage: parseFloat(consistencyPercentage)
    };

  } catch (error) {
    logMessage(`Validation failed: ${error}`, 'ERROR');
    throw error;
  }
}

async function main() {
  logMessage('🚀 Starting product count validation...');
  
  try {
    const results = await validateAllOrders();
    
    if (results.inconsistent === 0) {
      logMessage('🎯 VALIDATION PASSED: All orders are consistent!', 'SUCCESS');
    } else {
      logMessage(`⚠️ VALIDATION INCOMPLETE: ${results.inconsistent} orders need fixing`, 'WARNING');
    }
    
  } catch (error) {
    logMessage(`Validation script failed: ${error}`, 'ERROR');
    process.exit(1);
  }
}

// Run the validation
main().then(() => {
  logMessage('✅ Validation completed', 'SUCCESS');
  process.exit(0);
}).catch((error) => {
  logMessage(`Validation failed: ${error}`, 'ERROR');
  process.exit(1);
});