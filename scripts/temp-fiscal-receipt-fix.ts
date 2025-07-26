import pb, { authenticatedCall } from '../app/lib/pocketbase';
import { createSaleReceipt } from '../app/[locale]/orders/actions/fiscal-receipts';
import { isCompletedMarketplaceCode } from '../app/lib/utils/order-status';
import { appendFileSync } from 'fs';
import { format } from 'date-fns';

// Configuration
const DRY_RUN = process.argv.includes('--dry-run');
const LIVE_MODE = process.argv.includes('--live');
const WITH_RECEIPTS = process.argv.includes('--with-receipts');
const BATCH_SIZE = parseInt(process.argv.find(arg => arg.startsWith('--batch-size='))?.split('=')[1] || '5');
const LOG_FILE = `fiscal-receipt-fix-${format(new Date(), 'yyyy-MM-dd-HH-mm-ss')}.log`;

interface ProductItem {
  title?: string;
  name?: string;
  price?: number;
  quantity?: number;
  [key: string]: unknown;
}

interface OrderMismatch {
  id: string;
  orderNumber: string;
  customer: string;
  storedAmount: number;
  calculatedAmount: number;
  mismatchAmount: number;
  products: ProductItem[];
  needsAdjustment: boolean;
}

interface FixResult {
  orderId: string;
  orderNumber: string;
  success: boolean;
  originalAmount: number;
  adjustedAmount: number;
  receiptCreated?: boolean;
  error?: string;
  adjustedProducts?: ProductItem[];
}

function logMessage(message: string, type: 'INFO' | 'ERROR' | 'SUCCESS' | 'WARNING' = 'INFO') {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${type}: ${message}\n`;
  
  const emoji = type === 'ERROR' ? '❌' : type === 'SUCCESS' ? '✅' : type === 'WARNING' ? '⚠️' : 'ℹ️';
  console.log(`${emoji} ${message}`);
  appendFileSync(LOG_FILE, logEntry);
}

/**
 * Get completed orders without fiscal receipts that have amount mismatches
 */
async function getOrdersWithAmountMismatches(): Promise<OrderMismatch[]> {
  logMessage('🔍 Scanning for completed orders without receipts...');
  
  try {
    // Get completed orders without receipts (using same logic as UI)
    const completedCodes = ['6', 'completed', 'delivered'];
    const statusFilter = completedCodes.map(code => `status.marketplace_code = "${code}"`).join(' || ');
    
    const orders = await authenticatedCall(() =>
      pb.collection('orders').getList(1, 1000, {
        filter: `archived = false && (${statusFilter})`,
        expand: 'status,source',
        sort: '-created_at_marketplace,-created'
      })
    );

    logMessage(`📊 Found ${orders.items.length} completed orders`);

    // Get orders that already have successful fiscal receipts
    const existingReceipts = await authenticatedCall(() =>
      pb.collection('fiscal_receipts').getFullList({
        filter: `receipt_type = "sale" && status = "success"`,
        fields: 'order_id'
      })
    );
    
    const receiptOrderIds = new Set(existingReceipts.map(r => r.order_id));
    logMessage(`📋 Found ${existingReceipts.length} existing successful receipts`);

    // Filter to orders without receipts and check for amount mismatches
    const mismatches: OrderMismatch[] = [];

    for (const order of orders.items) {
      // Skip if order has receipt
      if (receiptOrderIds.has(order.id)) {
        continue;
      }

      // Check if order is truly completed
      const statusFromExpand = (order.expand as Record<string, unknown>)?.status as { 
        marketplace_code?: string | number 
      } | undefined;
      
      const marketplaceCode = statusFromExpand?.marketplace_code?.toString();
      if (!isCompletedMarketplaceCode(marketplaceCode)) {
        continue;
      }

      // Calculate amount from products
      let calculatedAmount = 0;
      const products = Array.isArray(order.products) ? order.products as ProductItem[] : [];
      
      if (products.length > 0) {
        calculatedAmount = products.reduce((sum, product) => {
          const price = parseFloat(String(product.price || 0));
          const quantity = parseInt(String(product.quantity || 0));
          return sum + (price * quantity);
        }, 0);
      }

      const storedAmount = order.amount || 0;
      const mismatchAmount = Math.abs(storedAmount - calculatedAmount);
      
      // Only include orders with significant mismatches (> 0.01 to handle floating point)
      if (mismatchAmount > 0.01) {
        mismatches.push({
          id: order.id,
          orderNumber: order.orderNumber,
          customer: order.fullName,
          storedAmount,
          calculatedAmount,
          mismatchAmount,
          products,
          needsAdjustment: true
        });
      }
    }

    logMessage(`⚠️ Found ${mismatches.length} orders with amount mismatches that need fiscal receipts`);
    return mismatches;

  } catch (error) {
    logMessage(`Failed to scan orders: ${error}`, 'ERROR');
    throw error;
  }
}

/**
 * Adjust product prices proportionally to match the order total
 */
function adjustProductPrices(products: ProductItem[], targetAmount: number): ProductItem[] {
  if (products.length === 0) {
    return products;
  }

  // Calculate current total
  const currentTotal = products.reduce((sum, product) => {
    const price = parseFloat(String(product.price || 0));
    const quantity = parseInt(String(product.quantity || 0));
    return sum + (price * quantity);
  }, 0);

  if (currentTotal === 0 || targetAmount === 0) {
    return products;
  }

  // Calculate adjustment ratio
  const adjustmentRatio = targetAmount / currentTotal;

  // Apply proportional adjustment to each product
  const adjustedProducts = products.map(product => ({
    ...product,
    price: Math.round((parseFloat(String(product.price || 0)) * adjustmentRatio) * 100) / 100
  }));

  return adjustedProducts;
}

/**
 * Fix a single order's product prices and optionally create fiscal receipt
 */
async function fixOrder(orderMismatch: OrderMismatch): Promise<FixResult> {
  const { id, orderNumber, storedAmount, products } = orderMismatch;
  
  try {
    if (DRY_RUN) {
      // In dry run, just calculate what would be adjusted
      const adjustedProducts = adjustProductPrices(products, storedAmount);
      
      logMessage(`[DRY RUN] Would adjust order ${orderNumber}: ${orderMismatch.calculatedAmount.toFixed(2)} → ${storedAmount.toFixed(2)}`, 'INFO');
      
      return {
        orderId: id,
        orderNumber,
        success: true,
        originalAmount: orderMismatch.calculatedAmount,
        adjustedAmount: storedAmount,
        adjustedProducts
      };
    }

    // Calculate adjusted product prices
    const adjustedProducts = adjustProductPrices(products, storedAmount);
    
    // Update the order with adjusted product prices
    await authenticatedCall(() =>
      pb.collection('orders').update(id, {
        products: adjustedProducts
      })
    );

    logMessage(`Fixed product prices for order ${orderNumber}: ${orderMismatch.calculatedAmount.toFixed(2)} → ${storedAmount.toFixed(2)}`, 'SUCCESS');

    let receiptCreated = false;
    
    // Create fiscal receipt if requested
    if (LIVE_MODE && WITH_RECEIPTS) {
      try {
        const receiptResult = await createSaleReceipt(id, 'Bulk Fix System');
        
        if (receiptResult.success) {
          receiptCreated = true;
          logMessage(`✅ Created fiscal receipt for order ${orderNumber}`, 'SUCCESS');
        } else {
          logMessage(`❌ Failed to create fiscal receipt for order ${orderNumber}: ${receiptResult.error}`, 'ERROR');
        }
      } catch (receiptError) {
        logMessage(`❌ Error creating fiscal receipt for order ${orderNumber}: ${receiptError}`, 'ERROR');
      }
    }
    
    return {
      orderId: id,
      orderNumber,
      success: true,
      originalAmount: orderMismatch.calculatedAmount,
      adjustedAmount: storedAmount,
      receiptCreated,
      adjustedProducts
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logMessage(`Failed to fix order ${orderNumber}: ${errorMessage}`, 'ERROR');
    
    return {
      orderId: id,
      orderNumber,
      success: false,
      originalAmount: orderMismatch.calculatedAmount,
      adjustedAmount: storedAmount,
      error: errorMessage
    };
  }
}

/**
 * Process orders in batches
 */
async function processOrdersInBatches(orders: OrderMismatch[]): Promise<FixResult[]> {
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
      
      // Small delay to avoid overwhelming the database/API
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Progress update
    const processed = Math.min(i + BATCH_SIZE, orders.length);
    logMessage(`📈 Progress: ${processed}/${orders.length} orders processed`);
    
    // Brief pause between batches
    if (i + BATCH_SIZE < orders.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  return results;
}

async function main() {
  const mode = DRY_RUN ? 'DRY RUN' : LIVE_MODE ? 'LIVE MODE' : 'PREVIEW MODE';
  const withReceipts = WITH_RECEIPTS ? ' + RECEIPT GENERATION' : '';
  
  logMessage(`🚀 ${mode}${withReceipts} - Starting fiscal receipt fix...`);
  logMessage(`⚙️ Configuration: Batch size = ${BATCH_SIZE}, Mode = ${mode}`);
  
  try {
    // Find all orders with amount mismatches
    const ordersWithMismatches = await getOrdersWithAmountMismatches();
    
    if (ordersWithMismatches.length === 0) {
      logMessage('🎉 No orders with amount mismatches found!', 'SUCCESS');
      return;
    }

    // Show summary before processing
    logMessage('\n📋 MISMATCH SUMMARY:');
    logMessage(`Total orders with mismatches: ${ordersWithMismatches.length}`);
    
    const totalMismatchAmount = ordersWithMismatches.reduce((sum, order) => sum + order.mismatchAmount, 0);
    logMessage(`Total mismatch amount: ₴${totalMismatchAmount.toFixed(2)}`);
    
    logMessage('Examples:');
    ordersWithMismatches.slice(0, 10).forEach((order, index) => {
      logMessage(`  ${index + 1}. Order ${order.orderNumber}: ₴${order.calculatedAmount.toFixed(2)} → ₴${order.storedAmount.toFixed(2)} (diff: ₴${order.mismatchAmount.toFixed(2)}) - ${order.customer}`);
    });
    
    if (ordersWithMismatches.length > 10) {
      logMessage(`  ... and ${ordersWithMismatches.length - 10} more orders`);
    }

    if (DRY_RUN) {
      logMessage('\n🔍 DRY RUN MODE: No changes will be made to the database', 'WARNING');
    } else {
      logMessage('\n⚡ LIVE MODE: Orders will be updated in the database', 'WARNING');
    }

    if (WITH_RECEIPTS && LIVE_MODE) {
      logMessage('📋 Fiscal receipts will be generated for fixed orders', 'INFO');
    }

    // Process all orders with mismatches
    const results = await processOrdersInBatches(ordersWithMismatches);
    
    // Generate final summary
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const receiptsCreated = results.filter(r => r.receiptCreated).length;
    const totalAdjustmentAmount = results
      .filter(r => r.success)
      .reduce((sum, r) => sum + Math.abs(r.originalAmount - r.adjustedAmount), 0);
    
    logMessage('\n📊 FINAL SUMMARY:');
    logMessage(`Total orders processed: ${results.length}`);
    logMessage(`Successfully ${DRY_RUN ? 'would be ' : ''}fixed: ${successful}`, successful > 0 ? 'SUCCESS' : 'INFO');
    logMessage(`Failed to fix: ${failed}`, failed > 0 ? 'ERROR' : 'INFO');
    logMessage(`Total adjustment amount: ₴${totalAdjustmentAmount.toFixed(2)}`);
    
    if (WITH_RECEIPTS && LIVE_MODE) {
      logMessage(`Fiscal receipts created: ${receiptsCreated}`, receiptsCreated > 0 ? 'SUCCESS' : 'INFO');
    }
    
    if (failed > 0) {
      logMessage('\n❌ FAILED ORDERS:');
      results.filter(r => !r.success).forEach(result => {
        logMessage(`  Order ${result.orderNumber}: ${result.error}`);
      });
    }

    if (DRY_RUN && successful > 0) {
      logMessage('\n✨ To apply these fixes, run the script with --live flag', 'INFO');
      logMessage('Command: tsx scripts/temp-fiscal-receipt-fix.ts --live --with-receipts', 'INFO');
    } else if (LIVE_MODE && successful > 0 && !WITH_RECEIPTS) {
      logMessage('\n🧾 To generate fiscal receipts, add --with-receipts flag', 'INFO');
      logMessage('Command: tsx scripts/temp-fiscal-receipt-fix.ts --live --with-receipts', 'INFO');
    }

  } catch (error) {
    logMessage(`Script failed: ${error}`, 'ERROR');
    process.exit(1);
  }
}

// Validate arguments
if (!DRY_RUN && !LIVE_MODE) {
  console.error('❌ Please specify either --dry-run or --live mode');
  console.log('Examples:');
  console.log('  tsx scripts/temp-fiscal-receipt-fix.ts --dry-run');
  console.log('  tsx scripts/temp-fiscal-receipt-fix.ts --live');
  console.log('  tsx scripts/temp-fiscal-receipt-fix.ts --live --with-receipts');
  process.exit(1);
}

if (DRY_RUN && LIVE_MODE) {
  console.error('❌ Cannot use both --dry-run and --live modes');
  process.exit(1);
}

// Run the script
main().then(() => {
  logMessage('✅ Script completed successfully', 'SUCCESS');
  process.exit(0);
}).catch((error) => {
  logMessage(`Script failed: ${error}`, 'ERROR');
  process.exit(1);
});