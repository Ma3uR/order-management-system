'use server'

import pb, { authenticatedCall } from '@/app/lib/pocketbase';
import { setOrderStatus as setEpicentrOrderStatus } from './epicentr';
import { setOrderStatus as setPromOrderStatus } from './prom-ua';
import { setOrderStatus as setRozetkaOrderStatus } from './rozetka';
import type { OrdersResponse, StatusResponse } from '@/app/types/pocketbase-types';

interface MarketplaceSyncResult {
  success: boolean;
  error?: string;
}

/**
 * Syncs status change from application to marketplace
 */
export async function syncStatusToMarketplace(
  order: OrdersResponse,
  newStatusId: string
): Promise<MarketplaceSyncResult> {
  try {
    // Get the status record with marketplace_code
    const statusRecord = await authenticatedCall(async () => {
      return await pb.collection('status_options').getOne(newStatusId) as StatusResponse;
    });

    if (!statusRecord.marketplace_code) {
      console.warn(`Status ${newStatusId} does not have marketplace_code, skipping marketplace sync`);
      return { success: true }; // Consider this successful - not all statuses need marketplace sync
    }

    if (!order.marketplaceIds) {
      throw new Error('Order does not have marketplace ID');
    }

    // Call appropriate marketplace API based on source
    switch (order.source) {
      case 'pj9sejm9vqtu8xq': // Epicentr
        console.log(`🔄 Syncing Epicentr order ${order.marketplaceIds} to status ${statusRecord.marketplace_code}`);
        const epicentrResult = await setEpicentrOrderStatus(order.marketplaceIds, statusRecord.marketplace_code);
        if (epicentrResult.error) {
          throw new Error(`Epicentr sync failed: ${epicentrResult.error}`);
        }
        break;

      case 'gfzk8nxfokgu9ku': // Prom.ua
        console.log(`🔄 Syncing Prom.ua order ${order.marketplaceIds} to status ${statusRecord.marketplace_code}`);
        const promResult = await setPromOrderStatus(order.marketplaceIds, statusRecord.marketplace_code);
        if (promResult.error) {
          throw new Error(`Prom.ua sync failed: ${promResult.error}`);
        }
        break;

      case '4tvf116a5aitwmb': // Rozetka
        console.log(`🔄 Syncing Rozetka order ${order.marketplaceIds} to status ${statusRecord.marketplace_code}`);
        const rozetkaResult = await setRozetkaOrderStatus(order.marketplaceIds, statusRecord.marketplace_code);
        if (rozetkaResult.error) {
          throw new Error(`Rozetka sync failed: ${rozetkaResult.error}`);
        }
        break;

      default:
        console.warn(`Unknown marketplace source: ${order.source}, skipping marketplace sync`);
        return { success: true };
    }

    console.log(`✅ Successfully synced status to marketplace for order ${order.orderNumber}`);
    return { success: true };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`❌ Failed to sync status to marketplace for order ${order.orderNumber}:`, errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * Updates order status in local database and syncs to marketplace
 */
export async function updateOrderStatusWithSync(
  orderId: string,
  newStatusId: string,
  updatePayload: Record<string, unknown>
): Promise<{ success: boolean; error?: string; data?: OrdersResponse }> {
  try {
    // First, get the current order
    const currentOrder = await authenticatedCall(async () => {
      return await pb.collection('orders').getOne(orderId) as OrdersResponse;
    });

    // Update local database first
    console.log(`🔄 Updating local database for order ${orderId}`);
    const updatedOrder = await authenticatedCall(async () => {
      return await pb.collection('orders').update(orderId, {
        ...updatePayload,
        status: newStatusId,
        updated: new Date().toISOString()
      }) as OrdersResponse;
    });

    // Sync to marketplace
    console.log(`🔄 Syncing to marketplace for order ${orderId}`);
    const syncResult = await syncStatusToMarketplace(currentOrder, newStatusId);

    if (!syncResult.success) {
      // Marketplace sync failed, but local update succeeded
      // We could implement rollback here if needed
      console.warn(`⚠️ Marketplace sync failed for order ${orderId}, but local update succeeded`);
      return { 
        success: true, 
        data: updatedOrder,
        error: `Status updated locally, but marketplace sync failed: ${syncResult.error}`
      };
    }

    console.log(`✅ Successfully updated and synced status for order ${orderId}`);
    return { success: true, data: updatedOrder };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`❌ Failed to update order status for ${orderId}:`, errorMessage);
    return { success: false, error: errorMessage };
  }
}