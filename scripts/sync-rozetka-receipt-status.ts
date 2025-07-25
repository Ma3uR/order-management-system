import { getOrders } from '../app/actions/rozetka';
import pb, { authenticatedCall } from '../app/lib/pocketbase';
import { OrdersResponse } from '../app/types/pocketbase-types';
import { RozetkaOrderResponse } from '../app/types/orders';
import { appendFileSync, writeFileSync } from 'fs';

// Configuration
const BATCH_SIZE = parseInt(process.argv.find(arg => arg.startsWith('--batch-size='))?.split('=')[1] || '50');
const DRY_RUN = process.argv.includes('--dry-run');
const LOG_FILE = 'rozetka-receipt-status-sync.log';

interface SyncResult {
  orderId: string;
  orderNumber: string;
  rozetkaId: string;
  success: boolean;
  oldStatus: boolean | null;
  newStatus: boolean | null;
  action: 'updated' | 'no_change' | 'error';
  error?: string;
}

interface SyncSummary {
  totalRozetkaOrders: number;
  totalLocalMatches: number;
  updatedOrders: number;
  noChangeOrders: number;
  errorOrders: number;
  results: SyncResult[];
}

function logMessage(message: string, type: 'INFO' | 'ERROR' | 'SUCCESS' | 'WARNING' = 'INFO') {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${type}: ${message}\n`;
  
  const emoji = type === 'ERROR' ? '❌' : type === 'SUCCESS' ? '✅' : type === 'WARNING' ? '⚠️' : 'ℹ️';
  console.log(`${emoji} ${message}`);
  appendFileSync(LOG_FILE, logEntry);
}

async function fetchRozetkaOrdersForLocalOrders(localOrders: OrdersResponse[]): Promise<RozetkaOrderResponse[]> {
  logMessage(`🔍 Fetching Rozetka orders for ${localOrders.length} local orders...`);
  
  try {
    // Extract unique Rozetka IDs from local orders (orderNumber contains the Rozetka ID)
    const rozetkaIds = localOrders
      .map(order => order.orderNumber)
      .filter(id => id && id.trim() !== '');
    
    if (rozetkaIds.length === 0) {
      logMessage('⚠️ No local orders have orderNumber, cannot fetch from Rozetka', 'WARNING');
      return [];
    }
    
    logMessage(`📋 Found ${rozetkaIds.length} local orders with orderNumber (Rozetka IDs)`);
    
    // Calculate date range based on local orders (to optimize API calls)
    const dates = localOrders
      .map(order => new Date(order.created_at_marketplace || order.created))
      .filter(date => !isNaN(date.getTime()))
      .sort((a, b) => a.getTime() - b.getTime());
    
    const oldestDate = dates[0];
    const newestDate = dates[dates.length - 1];
    
    // Add some buffer to ensure we don't miss any orders
    const from = new Date(oldestDate.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const to = new Date(newestDate.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    logMessage(`📅 Optimized date range: ${from} to ${to} (based on local orders)`);
    
    let allOrders: RozetkaOrderResponse[] = [];
    let page = 1;
    let hasMore = true;
    let consecutiveEmptyPages = 0;
    const MAX_PAGES = 100; // Prevent infinite loops
    
    while (hasMore && page <= MAX_PAGES) {
      const orders = await getOrders({
        page,
        from,
        to,
        types: 1 // Only regular orders
      });
      
      if (orders.length === 0) {
        consecutiveEmptyPages++;
        if (consecutiveEmptyPages >= 3) {
          logMessage(`📭 No more orders returned after ${consecutiveEmptyPages} empty pages, stopping`);
          hasMore = false;
        } else {
          page++;
        }
      } else {
        consecutiveEmptyPages = 0; // Reset counter when we get results
        
        // Filter to only orders we actually have locally (more efficient)
        const relevantOrders = orders.filter(order => 
          rozetkaIds.includes(order.id.toString())
        );
        
        allOrders = allOrders.concat(relevantOrders);
        logMessage(`📦 Page ${page}: ${orders.length} total, ${relevantOrders.length} relevant (total relevant: ${allOrders.length})`);
        page++;
        
        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Early exit if we've found all our local orders
        if (allOrders.length >= rozetkaIds.length) {
          logMessage(`✅ Found all ${rozetkaIds.length} orders, stopping early`);
          hasMore = false;
        }
      }
    }
    
    logMessage(`✅ Fetched ${allOrders.length} relevant Rozetka orders out of ${rozetkaIds.length} local orders`);
    
    if (allOrders.length < rozetkaIds.length) {
      const missing = rozetkaIds.length - allOrders.length;
      logMessage(`⚠️ ${missing} local orders not found in Rozetka (might be older or deleted)`, 'WARNING');
    }
    
    return allOrders;
    
  } catch (error) {
    logMessage(`Failed to fetch Rozetka orders: ${error}`, 'ERROR');
    throw error;
  }
}

async function getLocalRozetkaOrders(): Promise<OrdersResponse[]> {
  logMessage('🔍 Fetching local Rozetka orders from database...');
  
  try {
    const orders = await authenticatedCall(async () => {
      return await pb.collection('orders').getFullList<OrdersResponse>({
        filter: 'source = "4tvf116a5aitwmb" && archived = false && (created_at_marketplace >= "2025-04-25" || (created_at_marketplace = "" && created >= "2025-04-25"))', // Rozetka source ID + date filter
        fields: 'id,orderNumber,prro_receipt_status,updated,created,created_at_marketplace',
        sort: '-created'
      });
    });
    
    logMessage(`📊 Found ${orders.length} local Rozetka orders`);
    return orders;
    
  } catch (error) {
    logMessage(`Failed to fetch local orders: ${error}`, 'ERROR');
    throw error;
  }
}

async function syncReceiptStatus(
  localOrder: OrdersResponse, 
  rozetkaOrder: RozetkaOrderResponse
): Promise<SyncResult> {
  const { id, orderNumber, prro_receipt_status: currentStatus } = localOrder;
  // Convert Rozetka's prro_receipt_status (number|boolean) to boolean
  const newStatus = Boolean(rozetkaOrder.prro_receipt_status);
  
  try {
    // Check if update is needed
    if (currentStatus === newStatus) {
      return {
        orderId: id,
        orderNumber,
        rozetkaId: rozetkaOrder.id.toString(),
        success: true,
        oldStatus: currentStatus || null,
        newStatus: newStatus,
        action: 'no_change'
      };
    }
    
    if (DRY_RUN) {
      logMessage(`[DRY RUN] Would update order ${orderNumber}: prro_receipt_status ${currentStatus} → ${newStatus}`, 'INFO');
      return {
        orderId: id,
        orderNumber,
        rozetkaId: rozetkaOrder.id.toString(),
        success: true,
        oldStatus: currentStatus || null,
        newStatus: newStatus,
        action: 'updated'
      };
    }
    
    // Update the order
    await authenticatedCall(async () => {
      return await pb.collection('orders').update(id, {
        prro_receipt_status: newStatus,
        updated: new Date().toISOString()
      });
    });
    
    logMessage(`Updated order ${orderNumber}: prro_receipt_status ${currentStatus} → ${newStatus}`, 'SUCCESS');
    
    return {
      orderId: id,
      orderNumber,
      rozetkaId: rozetkaOrder.id.toString(),
      success: true,
      oldStatus: currentStatus || null,
      newStatus: newStatus || null,
      action: 'updated'
    };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logMessage(`Failed to update order ${orderNumber}: ${errorMessage}`, 'ERROR');
    
    return {
      orderId: id,
      orderNumber,
      rozetkaId: rozetkaOrder.id.toString(),
      success: false,
      oldStatus: currentStatus || null,
      newStatus: newStatus || null,
      action: 'error',
      error: errorMessage
    };
  }
}

async function processOrdersInBatches(
  localOrders: OrdersResponse[],
  rozetkaOrders: RozetkaOrderResponse[]
): Promise<SyncResult[]> {
  logMessage(`📦 Processing ${localOrders.length} local orders in batches of ${BATCH_SIZE}`);
  
  // Create a map of Rozetka orders by ID for quick lookup
  const rozetkaOrderMap = new Map<string, RozetkaOrderResponse>();
  rozetkaOrders.forEach(order => {
    rozetkaOrderMap.set(order.id.toString(), order);
  });
  
  const results: SyncResult[] = [];
  const totalBatches = Math.ceil(localOrders.length / BATCH_SIZE);
  
  for (let i = 0; i < localOrders.length; i += BATCH_SIZE) {
    const batch = localOrders.slice(i, i + BATCH_SIZE);
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
    
    logMessage(`🔄 Processing batch ${batchNumber}/${totalBatches} (${batch.length} orders)...`);
    
    for (const localOrder of batch) {
      // Find matching Rozetka order (orderNumber contains the Rozetka ID)
      const rozetkaId = localOrder.orderNumber;
      if (!rozetkaId) {
        logMessage(`⚠️ Local order ${localOrder.id} has no orderNumber, skipping`, 'WARNING');
        continue;
      }
      
      const rozetkaOrder = rozetkaOrderMap.get(rozetkaId);
      if (!rozetkaOrder) {
        logMessage(`⚠️ No matching Rozetka order found for ${localOrder.orderNumber} (orderNumber: ${rozetkaId})`, 'WARNING');
        continue;
      }
      
      const result = await syncReceiptStatus(localOrder, rozetkaOrder);
      results.push(result);
      
      // Small delay between updates
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    // Progress update
    const processed = Math.min(i + BATCH_SIZE, localOrders.length);
    logMessage(`📈 Progress: ${processed}/${localOrders.length} orders processed`);
    
    // Brief pause between batches
    if (i + BATCH_SIZE < localOrders.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  return results;
}

function generateSummary(
  rozetkaOrders: RozetkaOrderResponse[],
  localOrders: OrdersResponse[],
  results: SyncResult[]
): SyncSummary {
  const summary: SyncSummary = {
    totalRozetkaOrders: rozetkaOrders.length,
    totalLocalMatches: results.length,
    updatedOrders: results.filter(r => r.action === 'updated').length,
    noChangeOrders: results.filter(r => r.action === 'no_change').length,
    errorOrders: results.filter(r => r.action === 'error').length,
    results
  };
  
  logMessage('\n📊 SYNC SUMMARY REPORT');
  logMessage('=' .repeat(50));
  logMessage(`Total Rozetka orders fetched: ${summary.totalRozetkaOrders}`);
  logMessage(`Total local orders to sync: ${localOrders.length}`);
  logMessage(`Orders with matching Rozetka data: ${summary.totalLocalMatches}`);
  logMessage(`Orders updated: ${summary.updatedOrders}`, summary.updatedOrders > 0 ? 'SUCCESS' : 'INFO');
  logMessage(`Orders unchanged: ${summary.noChangeOrders}`);
  logMessage(`Orders with errors: ${summary.errorOrders}`, summary.errorOrders > 0 ? 'ERROR' : 'INFO');
  
  // Show examples of updates
  const updates = results.filter(r => r.action === 'updated');
  if (updates.length > 0) {
    logMessage('\n✨ RECEIPT STATUS UPDATES:');
    updates.slice(0, 10).forEach((result, index) => {
      logMessage(`  ${index + 1}. ${result.orderNumber}: ${result.oldStatus} → ${result.newStatus}`);
    });
    if (updates.length > 10) {
      logMessage(`  ... and ${updates.length - 10} more updates`);
    }
  }
  
  // Show errors if any
  const errors = results.filter(r => r.action === 'error');
  if (errors.length > 0) {
    logMessage('\n❌ ERRORS:');
    errors.forEach((result, index) => {
      logMessage(`  ${index + 1}. ${result.orderNumber}: ${result.error}`);
    });
  }
  
  return summary;
}

async function main() {
  logMessage(`🚀 ${DRY_RUN ? 'DRY RUN - ' : ''}Starting Rozetka receipt status sync...`);
  logMessage(`⚙️ Configuration: Batch size = ${BATCH_SIZE}, Dry run = ${DRY_RUN}`);
  
  try {
    // First get local orders, then fetch only relevant Rozetka orders
    const localOrders = await getLocalRozetkaOrders();
    
    if (localOrders.length === 0) {
      logMessage('No local Rozetka orders found in database', 'WARNING');
      return;
    }
    
    const rozetkaOrders = await fetchRozetkaOrdersForLocalOrders(localOrders);
    
    if (rozetkaOrders.length === 0) {
      logMessage('No Rozetka orders found in the specified date range', 'WARNING');
      return;
    }
    
    if (localOrders.length === 0) {
      logMessage('No local Rozetka orders found in database', 'WARNING');
      return;
    }
    
    // Process the sync
    const results = await processOrdersInBatches(localOrders, rozetkaOrders);
    
    // Generate summary
    const summary = generateSummary(rozetkaOrders, localOrders, results);
    
    // Save detailed report
    const reportFile = 'rozetka-receipt-status-report.json';
    writeFileSync(reportFile, JSON.stringify(summary, null, 2));
    logMessage(`📄 Detailed report saved to: ${reportFile}`);
    
    if (DRY_RUN && summary.updatedOrders > 0) {
      logMessage('\n✨ To apply these changes, run the script without --dry-run flag', 'INFO');
      logMessage('Command: npx tsx scripts/sync-rozetka-receipt-status.ts', 'INFO');
    } else if (!DRY_RUN && summary.updatedOrders > 0) {
      logMessage('\n🎯 Recommendation: Run fiscal analysis to verify the updates', 'INFO');
      logMessage('Command: npm run fiscal:analyze', 'INFO');
    }
    
  } catch (error) {
    logMessage(`Script failed: ${error}`, 'ERROR');
    process.exit(1);
  }
}

// Handle command line help
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Rozetka Receipt Status Sync Script

Usage:
  npx tsx scripts/sync-rozetka-receipt-status.ts [options]

Options:
  --dry-run           Preview changes without applying them (recommended first)
  --batch-size=N      Process N orders per batch (default: 50)
  --help, -h          Show this help message

Examples:
  # Preview sync (recommended first)
  npx tsx scripts/sync-rozetka-receipt-status.ts --dry-run

  # Apply sync with small batches
  npx tsx scripts/sync-rozetka-receipt-status.ts --batch-size=20

  # Using npm scripts (easier)
  npm run sync:rozetka-receipts:dry
  npm run sync:rozetka-receipts

The script automatically determines the optimal date range based on your local orders,
so it only fetches the Rozetka orders you actually have in your database.
`);
  process.exit(0);
}

// Run the script
main().then(() => {
  logMessage('✅ Script completed successfully', 'SUCCESS');
  process.exit(0);
}).catch((error) => {
  logMessage(`Script failed: ${error}`, 'ERROR');
  process.exit(1);
});