import pb, { authenticatedCall } from '../app/lib/pocketbase.js';
import { OrdersResponse } from '../app/types/pocketbase-types.js';

interface RecountResult {
  orderId: string;
  orderNumber: string;
  currentAmount: number;
  calculatedAmount: number;
  currentItems: number;
  calculatedItems: number;
  discrepancies: string[];
  canAutoFix: boolean;
  products: Array<{
    title: string;
    quantity: number;
    price: number;
  }>;
}

interface RecountSummary {
  totalOrders: number;
  ordersWithDiscrepancies: number;
  totalDiscrepancyAmount: number;
  fixableOrders: number;
  results: RecountResult[];
}

async function fetchRozetkaOrders(): Promise<OrdersResponse[]> {
  console.log('📋 Fetching Rozetka orders from database...');
  
  try {
    const result = await authenticatedCall(async () => {
      return await pb.collection('orders').getList(1, 1000, {
        filter: 'source = "4tvf116a5aitwmb"',
        sort: '-created',
        expand: 'status,currency'
      });
    });
    
    console.log(`✅ Found ${result.items.length} Rozetka orders`);
    return result.items as OrdersResponse[];
  } catch (error) {
    console.error('❌ Failed to fetch Rozetka orders:', error);
    throw error;
  }
}

function recalculateOrderTotal(products: Array<{title: string, quantity: number, price: number}>): { total: number, itemCount: number } {
  if (!products || products.length === 0) {
    return { total: 0, itemCount: 0 };
  }
  
  let total = 0;
  let itemCount = 0;
  
  products.forEach(product => {
    if (product.price && product.quantity) {
      const productTotal = product.price * product.quantity;
      total += productTotal;
      itemCount += product.quantity;
    }
  });
  
  // Round to 2 decimal places to handle floating point precision
  total = Math.round(total * 100) / 100;
  
  return { total, itemCount };
}

function compareCalculations(order: OrdersResponse, calculated: { total: number, itemCount: number }): RecountResult {
  const discrepancies: string[] = [];
  const currentAmount = order.amount || 0;
  const currentItems = order.numberOfItems || 0;
  const products = order.products || [];
  
  // Compare amounts
  const amountDiff = Math.abs(currentAmount - calculated.total);
  const amountDiscrepancy = amountDiff > 0.01; // Allow for small floating point differences
  
  if (amountDiscrepancy) {
    discrepancies.push(`Amount: stored ${currentAmount} vs calculated ${calculated.total} (diff: ${amountDiff.toFixed(2)})`);
  }
  
  // Compare item counts
  const itemDiscrepancy = currentItems !== calculated.itemCount;
  if (itemDiscrepancy) {
    discrepancies.push(`Items: stored ${currentItems} vs calculated ${calculated.itemCount} (diff: ${calculated.itemCount - currentItems})`);
  }
  
  // Determine if can auto-fix
  const canAutoFix = calculated.total > 0 && calculated.itemCount > 0 && (products as Array<{title: string, quantity: number, price: number}>).length > 0;
  
  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    currentAmount,
    calculatedAmount: calculated.total,
    currentItems,
    calculatedItems: calculated.itemCount,
    discrepancies,
    canAutoFix,
    products: products as Array<{title: string, quantity: number, price: number}>
  };
}

function generateReport(summary: RecountSummary): void {
  console.log('\n' + '='.repeat(80));
  console.log('📊 ROZETKA ORDER RECOUNT REPORT');
  console.log('='.repeat(80));
  
  console.log(`\n📋 Summary:`);
  console.log(`  Total Orders Analyzed: ${summary.totalOrders}`);
  console.log(`  Orders with Discrepancies: ${summary.ordersWithDiscrepancies}`);
  console.log(`  Total Amount Discrepancy: ₴${summary.totalDiscrepancyAmount.toFixed(2)}`);
  console.log(`  Fixable Orders: ${summary.fixableOrders}`);
  console.log(`  Accuracy Rate: ${((summary.totalOrders - summary.ordersWithDiscrepancies) / summary.totalOrders * 100).toFixed(1)}%`);
  
  if (summary.ordersWithDiscrepancies > 0) {
    console.log(`\n⚠️  Orders with Discrepancies:`);
    
    summary.results
      .filter(result => result.discrepancies.length > 0)
      .forEach((result, index) => {
        console.log(`\n${index + 1}. Order #${result.orderNumber} (ID: ${result.orderId})`);
        console.log(`   Current: ₴${result.currentAmount} (${result.currentItems} items)`);
        console.log(`   Calculated: ₴${result.calculatedAmount} (${result.calculatedItems} items)`);
        console.log(`   Can Auto-fix: ${result.canAutoFix ? '✅ Yes' : '❌ No'}`);
        console.log(`   Products: ${result.products.length} items`);
        
        result.discrepancies.forEach(discrepancy => {
          console.log(`   🔍 ${discrepancy}`);
        });
      });
  }
  
  if (summary.fixableOrders > 0) {
    console.log(`\n💡 Recommendations:`);
    console.log(`  • ${summary.fixableOrders} orders can be automatically fixed`);
    console.log(`  • Run with --fix flag to apply corrections`);
    console.log(`  • Run with --dry-run=false to actually update the database`);
  }
  
  console.log('\n' + '='.repeat(80));
}

async function applyFixes(results: RecountResult[], dryRun: boolean = true): Promise<void> {
  const fixableResults = results.filter(result => result.canAutoFix && result.discrepancies.length > 0);
  
  if (fixableResults.length === 0) {
    console.log('📝 No fixable orders found.');
    return;
  }
  
  console.log(`\n🔧 ${dryRun ? 'DRY RUN:' : 'APPLYING FIXES:'} ${fixableResults.length} orders`);
  
  let fixedCount = 0;
  let failedCount = 0;
  
  for (const result of fixableResults) {
    try {
      console.log(`\n📝 ${dryRun ? 'Would fix' : 'Fixing'} Order #${result.orderNumber}`);
      console.log(`   Amount: ₴${result.currentAmount} → ₴${result.calculatedAmount}`);
      console.log(`   Items: ${result.currentItems} → ${result.calculatedItems}`);
      
      if (!dryRun) {
        await authenticatedCall(async () => {
          return await pb.collection('orders').update(result.orderId, {
            amount: result.calculatedAmount,
            numberOfItems: result.calculatedItems,
            updated: new Date().toISOString()
          });
        });
        
        console.log(`   ✅ Fixed Order #${result.orderNumber}`);
      } else {
        console.log(`   🔍 DRY RUN: Would update Order #${result.orderNumber}`);
      }
      
      fixedCount++;
    } catch (error) {
      console.error(`   ❌ Failed to fix Order #${result.orderNumber}:`, error);
      failedCount++;
    }
  }
  
  console.log(`\n📊 Fix Summary:`);
  console.log(`   ${dryRun ? 'Would fix' : 'Fixed'}: ${fixedCount} orders`);
  if (failedCount > 0) {
    console.log(`   Failed: ${failedCount} orders`);
  }
}

async function main() {
  console.log('🔄 Starting Rozetka Order Recount Script...');
  console.log(`📅 Started at: ${new Date().toLocaleString()}\n`);
  
  // Parse command line arguments
  const args = process.argv.slice(2);
  const shouldFix = args.includes('--fix');
  const dryRun = !args.includes('--dry-run=false');
  
  if (shouldFix) {
    console.log(`🔧 Fix mode: ${dryRun ? 'DRY RUN' : 'ACTUAL UPDATES'}`);
  }
  
  try {
    // Step 1: Fetch all Rozetka orders
    const orders = await fetchRozetkaOrders();
    
    if (orders.length === 0) {
      console.log('📝 No Rozetka orders found in database.');
      return;
    }
    
    // Step 2: Analyze each order
    console.log('\n🔍 Analyzing orders...');
    const results: RecountResult[] = [];
    let totalDiscrepancyAmount = 0;
    
    for (const order of orders) {
      const calculated = recalculateOrderTotal(order.products as Array<{title: string, quantity: number, price: number}>);
      const comparison = compareCalculations(order, calculated);
      
      results.push(comparison);
      
      // Calculate total discrepancy amount
      if (comparison.discrepancies.length > 0) {
        totalDiscrepancyAmount += Math.abs(comparison.currentAmount - comparison.calculatedAmount);
      }
    }
    
    // Step 3: Create summary
    const summary: RecountSummary = {
      totalOrders: orders.length,
      ordersWithDiscrepancies: results.filter(r => r.discrepancies.length > 0).length,
      totalDiscrepancyAmount,
      fixableOrders: results.filter(r => r.canAutoFix && r.discrepancies.length > 0).length,
      results
    };
    
    // Step 4: Generate report
    generateReport(summary);
    
    // Step 5: Apply fixes if requested
    if (shouldFix) {
      await applyFixes(results, dryRun);
    }
    
    console.log(`\n✅ Recount completed at: ${new Date().toLocaleString()}`);
    console.log(`📊 Processed ${orders.length} orders, found ${summary.ordersWithDiscrepancies} with discrepancies`);
    
  } catch (error) {
    console.error('❌ Recount failed:', error);
    process.exit(1);
  }
}

// Handle process termination gracefully
process.on('SIGINT', () => {
  console.log('\n⏹️  Recount interrupted by user');
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('\n⏹️  Recount terminated');
  process.exit(1);
});

main();