#!/usr/bin/env tsx

/**
 * Sync successful fiscal receipts to Rozetka
 * This script finds all successful fiscal receipts for Rozetka orders
 * and creates corresponding receipts on Rozetka side via API
 */

import { createRozetkaReceipt } from '../app/actions/rozetka';
import pb, { authenticatedCall } from '../app/lib/pocketbase';
import type { FiscalReceiptsResponse, OrdersResponse } from '../app/types/pocketbase-types';
import * as dotenv from 'dotenv';

dotenv.config();

interface SyncStats {
  totalFiscalReceipts: number;
  rozetkaOrders: number;
  successful: number;
  skipped: number;
  failed: number;
  errors: string[];
}

interface OrderWithReceipt {
  order: OrdersResponse;
  fiscalReceipt: FiscalReceiptsResponse;
}

async function getSuccessfulFiscalReceipts(): Promise<OrderWithReceipt[]> {
  console.log('🔍 Fetching successful fiscal receipts...');
  
  const fiscalReceipts = await authenticatedCall(async () => {
    return await pb.collection('fiscal_receipts').getFullList({
      filter: 'status = "success"',
      expand: 'order_id',
      sort: '-created'
    });
  });

  console.log(`✅ Found ${fiscalReceipts.length} successful fiscal receipts`);

  const ordersWithReceipts: OrderWithReceipt[] = [];

  for (const receipt of fiscalReceipts) {
    if (receipt.expand?.order_id) {
      ordersWithReceipts.push({
        order: receipt.expand.order_id as OrdersResponse,
        fiscalReceipt: receipt as FiscalReceiptsResponse
      });
    }
  }

  return ordersWithReceipts;
}

function filterRozetkaOrders(ordersWithReceipts: OrderWithReceipt[]): OrderWithReceipt[] {
  console.log('🎯 Filtering for Rozetka orders...');
  
  const rozetkaOrders = ordersWithReceipts.filter(({ order }) => {
    return order.source === '4tvf116a5aitwmb';
  });

  console.log(`✅ Found ${rozetkaOrders.length} Rozetka orders with successful fiscal receipts`);
  return rozetkaOrders;
}

async function syncReceiptToRozetka(
  orderWithReceipt: OrderWithReceipt,
  index: number,
  total: number
): Promise<{ success: boolean; skipped?: boolean; error?: string }> {
  const { order } = orderWithReceipt;
  
  console.log(`📄 [${index + 1}/${total}] Syncing receipt for order ${order.orderNumber}...`);
  
  try {
    const result = await createRozetkaReceipt(order.orderNumber);
    
    if (result.error) {
      // Check if this is a "receipt already exists" type error
      if (result.error.includes('непередбачуваної помилки') || result.error.includes('server_error')) {
        console.log(`⚠️  Order ${order.orderNumber}: Receipt likely already exists on Rozetka`);
        return { success: true, skipped: true };
      }
      
      console.log(`❌ Failed to sync order ${order.orderNumber}: ${result.error}`);
      return { success: false, error: result.error };
    }
    
    console.log(`✅ Successfully created new receipt for order ${order.orderNumber}`);
    return { success: true };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.log(`❌ Error syncing order ${order.orderNumber}: ${errorMessage}`);
    return { success: false, error: errorMessage };
  }
}

async function main() {
  console.log('🚀 Starting Rozetka Receipt Sync Script\n');
  
  const stats: SyncStats = {
    totalFiscalReceipts: 0,
    rozetkaOrders: 0,
    successful: 0,
    skipped: 0,
    failed: 0,
    errors: []
  };

  try {
    // Authenticate with PocketBase
    console.log('🔑 Authenticating with PocketBase...');
    await authenticatedCall(() => pb.collection('users').getList(1, 1));
    console.log('✅ PocketBase authentication successful\n');

    // Get all successful fiscal receipts
    const ordersWithReceipts = await getSuccessfulFiscalReceipts();
    stats.totalFiscalReceipts = ordersWithReceipts.length;

    if (ordersWithReceipts.length === 0) {
      console.log('ℹ️  No successful fiscal receipts found. Nothing to sync.');
      return;
    }

    // Filter for Rozetka orders only
    const rozetkaOrders = filterRozetkaOrders(ordersWithReceipts);
    stats.rozetkaOrders = rozetkaOrders.length;

    if (rozetkaOrders.length === 0) {
      console.log('ℹ️  No Rozetka orders with successful fiscal receipts found.');
      return;
    }

    console.log(`\n🎯 Processing ${rozetkaOrders.length} Rozetka orders...\n`);

    // Process each order
    for (let i = 0; i < rozetkaOrders.length; i++) {
      const result = await syncReceiptToRozetka(rozetkaOrders[i], i, rozetkaOrders.length);
      
      if (result.success) {
        if (result.skipped) {
          stats.skipped++;
        } else {
          stats.successful++;
        }
      } else {
        stats.failed++;
        if (result.error) {
          stats.errors.push(`Order ${rozetkaOrders[i].order.orderNumber}: ${result.error}`);
        }
      }

      // Add a small delay to avoid overwhelming the API
      if (i < rozetkaOrders.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Print final summary
    console.log('\n📊 Sync Summary:');
    console.log('================');
    console.log(`Total fiscal receipts found: ${stats.totalFiscalReceipts}`);
    console.log(`Rozetka orders to sync: ${stats.rozetkaOrders}`);
    console.log(`Successfully created new receipts: ${stats.successful}`);
    console.log(`Already existed (skipped): ${stats.skipped}`);
    console.log(`Failed to sync: ${stats.failed}`);

    if (stats.errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      stats.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    }

    if (stats.successful > 0) {
      console.log(`\n🎉 Successfully created ${stats.successful} new receipts on Rozetka!`);
    }
    
    if (stats.skipped > 0) {
      console.log(`\n✅ ${stats.skipped} receipts were already present on Rozetka`);
    }

  } catch (error) {
    console.error('💥 Script failed:', error);
    process.exit(1);
  }
}

// Run the script
main()
  .then(() => {
    console.log('\n🏁 Sync script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Sync script failed:', error);
    process.exit(1);
  });

export { main as syncRozetkaReceipts };