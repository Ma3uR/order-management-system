import pb, { authenticatedCall } from '../app/lib/pocketbase';
import { OrdersResponse } from '../app/types/pocketbase-types';
import { appendFileSync } from 'fs';

// Configuration
const BATCH_SIZE = parseInt(process.argv.find(arg => arg.startsWith('--batch-size='))?.split('=')[1] || '10');
const DRY_RUN = process.argv.includes('--dry-run');
const LOG_FILE = 'product-counts-fix.log';

interface MismatchedOrder {
  id: string;
  orderNumber: string;
  currentCount: number;
  correctCount: number;
  customer: string;
  created: string;
  products: OrdersResponse['products'];
}

interface FixResult {
  orderId: string;
  orderNumber: string;
  success: boolean;
  oldCount: number;
  newCount: number;
  error?: string;
}

function logMessage(message: string, type: 'INFO' | 'ERROR' | 'SUCCESS' | 'WARNING' = 'INFO') {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${type}: ${message}\n`;
  
  console.log(`${type === 'ERROR' ? '❌' : type === 'SUCCESS' ? '✅' : type === 'WARNING' ? '⚠️' : 'ℹ️'} ${message}`);
  appendFileSync(LOG_FILE, logEntry);
}

async function findMismatchedOrders(): Promise<MismatchedOrder[]> {
  logMessage('🔍 Scanning for orders with product count mismatches...');
  
  try {
    const orders = await authenticatedCall(async () => {
      return await pb.collection('orders').getFullList<OrdersResponse>({
        filter: 'source = "4tvf116a5aitwmb"',
        sort: 'created'
      });
    });

    logMessage(`📊 Found ${orders.length} Rozetka orders in database`);

    const mismatched: MismatchedOrder[] = [];

    for (const order of orders) {
      try {
        // Calculate correct item count from products array
        let correctCount = 0;
        if (Array.isArray(order.products)) {
            correctCount = order.products.reduce((sum: number, product: unknown) => {
            const quantity = parseInt((product as { quantity: string }).quantity) || 0;
            return sum + quantity;
          }, 0);
        }

        // Check if stored count matches calculated count
        if (order.numberOfItems !== correctCount) {
          mismatched.push({
            id: order.id,
            orderNumber: order.orderNumber,
            currentCount: order.numberOfItems,
            correctCount: correctCount,
            customer: order.fullName,
            created: order.created,
            products: Array.isArray(order.products) ? order.products : []
          });
        }
      } catch (error) {
        logMessage(`Error processing order ${order.orderNumber}: ${error}`, 'ERROR');
      }
    }

    logMessage(`⚠️ Found ${mismatched.length} orders with mismatched counts`, 'WARNING');
    return mismatched;

  } catch (error) {
    logMessage(`Failed to scan orders: ${error}`, 'ERROR');
    throw error;
  }
}

async function fixOrder(mismatchedOrder: MismatchedOrder): Promise<FixResult> {
  const { id, orderNumber, currentCount, correctCount } = mismatchedOrder;
  
  try {
    if (DRY_RUN) {
      logMessage(`[DRY RUN] Would fix order ${orderNumber}: ${currentCount} → ${correctCount}`, 'INFO');
      return {
        orderId: id,
        orderNumber: orderNumber,
        success: true,
        oldCount: currentCount,
        newCount: correctCount
      };
    }

    // Update the order with correct count
    await authenticatedCall(async () => {
      return await pb.collection('orders').update(id, {
        numberOfItems: correctCount
      });
    });

    logMessage(`Fixed order ${orderNumber}: ${currentCount} → ${correctCount}`, 'SUCCESS');
    
    return {
      orderId: id,
      orderNumber: orderNumber,
      success: true,
      oldCount: currentCount,
      newCount: correctCount
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logMessage(`Failed to fix order ${orderNumber}: ${errorMessage}`, 'ERROR');
    
    return {
      orderId: id,
      orderNumber: orderNumber,
      success: false,
      oldCount: currentCount,
      newCount: correctCount,
      error: errorMessage
    };
  }
}

async function processOrdersInBatches(orders: MismatchedOrder[]): Promise<FixResult[]> {
  const results: FixResult[] = [];
  const totalBatches = Math.ceil(orders.length / BATCH_SIZE);
  
  logMessage(`📦 Processing ${orders.length} orders in batches of ${BATCH_SIZE} (${totalBatches} batches total)`);
  
  for (let i = 0; i < orders.length; i += BATCH_SIZE) {
    const batch = orders.slice(i, i + BATCH_SIZE);
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
    
    logMessage(`🔄 Processing batch ${batchNumber}/${totalBatches} (${batch.length} orders)...`);
    
    for (const order of batch) {
      const result = await fixOrder(order);
      results.push(result);
      
      // Small delay to avoid overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    // Progress update
    const processed = Math.min(i + BATCH_SIZE, orders.length);
    logMessage(`📈 Progress: ${processed}/${orders.length} orders processed`);
    
    // Brief pause between batches
    if (i + BATCH_SIZE < orders.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  return results;
}

async function main() {
  logMessage(`🚀 ${DRY_RUN ? 'DRY RUN - ' : ''}Starting product count fix...`);
  logMessage(`⚙️ Configuration: Batch size = ${BATCH_SIZE}, Dry run = ${DRY_RUN}`);
  
  try {
    // Find all mismatched orders
    const mismatchedOrders = await findMismatchedOrders();
    
    if (mismatchedOrders.length === 0) {
      logMessage('🎉 No mismatched orders found! All product counts are correct.', 'SUCCESS');
      return;
    }

    // Show summary before processing
    logMessage('\n📋 MISMATCH SUMMARY:');
    logMessage(`Total mismatched orders: ${mismatchedOrders.length}`);
    logMessage('Examples:');
    
    mismatchedOrders.slice(0, 10).forEach((order, index) => {
      logMessage(`  ${index + 1}. Order ${order.orderNumber}: ${order.currentCount} → ${order.correctCount} (${order.customer})`);
    });
    
    if (mismatchedOrders.length > 10) {
      logMessage(`  ... and ${mismatchedOrders.length - 10} more orders`);
    }

    if (DRY_RUN) {
      logMessage('\n🔍 DRY RUN MODE: No changes will be made to the database', 'WARNING');
    } else {
      logMessage('\n⚡ LIVE MODE: Orders will be updated in the database', 'WARNING');
    }

    // Process all mismatched orders
    const results = await processOrdersInBatches(mismatchedOrders);
    
    // Generate final summary
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const totalItemsFixed = results
      .filter(r => r.success)
      .reduce((sum, r) => sum + Math.abs(r.oldCount - r.newCount), 0);
    
    logMessage('\n📊 FINAL SUMMARY:');
    logMessage(`Total orders processed: ${results.length}`);
    logMessage(`Successfully ${DRY_RUN ? 'would be ' : ''}fixed: ${successful}`, successful > 0 ? 'SUCCESS' : 'INFO');
    logMessage(`Failed to fix: ${failed}`, failed > 0 ? 'ERROR' : 'INFO');
    logMessage(`Total item count corrections: ${totalItemsFixed}`);
    
    if (failed > 0) {
      logMessage('\n❌ FAILED ORDERS:');
      results.filter(r => !r.success).forEach(result => {
        logMessage(`  Order ${result.orderNumber}: ${result.error}`);
      });
    }

    if (DRY_RUN && successful > 0) {
      logMessage('\n✨ To apply these fixes, run the script without --dry-run flag', 'INFO');
      logMessage('Command: node --import=tsx/esm scripts/fix-product-counts.ts', 'INFO');
    } else if (!DRY_RUN && successful > 0) {
      logMessage('\n🎯 Recommendation: Run validation script to verify fixes', 'INFO');
      logMessage('Command: node --import=tsx/esm scripts/validate-product-counts.ts', 'INFO');
    }

  } catch (error) {
    logMessage(`Script failed: ${error}`, 'ERROR');
    process.exit(1);
  }
}

// Run the script
main().then(() => {
  logMessage('✅ Script completed successfully', 'SUCCESS');
  process.exit(0);
}).catch((error) => {
  logMessage(`Script failed: ${error}`, 'ERROR');
  process.exit(1);
});