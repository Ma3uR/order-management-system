'use server'

import pb, { authenticatedCall } from '@/app/lib/pocketbase';
import { getHardcodedStatuses as getEpicentrStatuses } from '@/app/actions/epicentr';
import { getOrderStatuses as getPromStatuses } from '@/app/actions/prom-ua';
import { getOrderStatuses as getRozetkaStatuses } from '@/app/actions/rozetka';

// Source IDs from the marketplaces
const MARKETPLACE_SOURCES = {
  EPICENTR: 'pj9sejm9vqtu8xq',
  PROM_UA: 'gfzk8nxfokgu9ku',
  ROZETKA: '4tvf116a5aitwmb'
};

// Default colors for statuses
const DEFAULT_COLORS = [
  '#10B981', // Green
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#06B6D4', // Cyan
  '#F97316', // Orange
  '#84CC16', // Lime
  '#EC4899', // Pink
  '#6B7280'  // Gray
];

function getColorForStatus(index: number): string {
  return DEFAULT_COLORS[index % DEFAULT_COLORS.length];
}

async function syncEpicentrStatuses(): Promise<{ synced: number; failed: number }> {
  try {
    console.log('🏪 Syncing Epicentr statuses...');
    
    const statusResponse = await getEpicentrStatuses();
    if (statusResponse.error || !statusResponse.data) {
      console.error('Failed to fetch Epicentr statuses:', statusResponse.error);
      return { synced: 0, failed: 1 };
    }

    let synced = 0;
    let failed = 0;

    for (let i = 0; i < statusResponse.data.length; i++) {
      const status = statusResponse.data[i];
      try {
        // Check if status already exists
        const existingStatus = await authenticatedCall(() =>
          pb.collection('status_options').getList(1, 1, {
            filter: `source = "${MARKETPLACE_SOURCES.EPICENTR}" && marketplace_code = "${status.id}"`
          })
        );

        if (existingStatus.items.length === 0) {
          // Create new status
          await authenticatedCall(() =>
            pb.collection('status_options').create({
              name: status.title,
              color: getColorForStatus(i),
              priority: i + 1,
              marketplace_code: status.id,
              source: MARKETPLACE_SOURCES.EPICENTR
            })
          );
          console.log(`✅ Created Epicentr status: ${status.title}`);
          synced++;
        } else {
          // Update existing status
          await authenticatedCall(() =>
            pb.collection('status_options').update(existingStatus.items[0].id, {
              name: status.title,
              marketplace_code: status.id
            })
          );
          console.log(`🔄 Updated Epicentr status: ${status.title}`);
          synced++;
        }
      } catch (error) {
        console.error(`❌ Failed to sync Epicentr status ${status.id}:`, error);
        failed++;
      }
    }

    return { synced, failed };
  } catch (error) {
    console.error('❌ Failed to sync Epicentr statuses:', error);
    return { synced: 0, failed: 1 };
  }
}

async function syncPromStatuses(): Promise<{ synced: number; failed: number }> {
  try {
    console.log('🛒 Syncing Prom.ua statuses...');
    
    const statusResponse = await getPromStatuses();
    if (statusResponse.error || !statusResponse.data) {
      console.error('Failed to fetch Prom.ua statuses:', statusResponse.error);
      return { synced: 0, failed: 1 };
    }

    let synced = 0;
    let failed = 0;

    for (let i = 0; i < statusResponse.data.length; i++) {
      const status = statusResponse.data[i];
      try {
        // Check if status already exists
        const existingStatus = await authenticatedCall(() =>
          pb.collection('status_options').getList(1, 1, {
            filter: `source = "${MARKETPLACE_SOURCES.PROM_UA}" && marketplace_code = ${status.id}`
          })
        );

        if (existingStatus.items.length === 0) {
          // Create new status
          await authenticatedCall(() =>
            pb.collection('status_options').create({
              name: status.name,
              color: getColorForStatus(i),
              priority: i + 1,
              marketplace_code: status.id,
              source: MARKETPLACE_SOURCES.PROM_UA
            })
          );
          console.log(`✅ Created Prom.ua status: ${status.name}`);
          synced++;
        } else {
          // Update existing status
          await authenticatedCall(() =>
            pb.collection('status_options').update(existingStatus.items[0].id, {
              name: status.name,
              marketplace_code: status.id
            })
          );
          console.log(`🔄 Updated Prom.ua status: ${status.name}`);
          synced++;
        }
      } catch (error) {
        console.error(`❌ Failed to sync Prom.ua status ${status.id}:`, error);
        failed++;
      }
    }

    return { synced, failed };
  } catch (error) {
    console.error('❌ Failed to sync Prom.ua statuses:', error);
    return { synced: 0, failed: 1 };
  }
}

async function syncRozetkaStatuses(): Promise<{ synced: number; failed: number }> {
  try {
    console.log('🌹 Syncing Rozetka statuses...');
    
    const statusResponse = await getRozetkaStatuses();
    if (statusResponse.error || !statusResponse.data) {
      console.error('Failed to fetch Rozetka statuses:', statusResponse.error);
      return { synced: 0, failed: 1 };
    }

    let synced = 0;
    let failed = 0;

    for (let i = 0; i < statusResponse.data.length; i++) {
      const status = statusResponse.data[i];
      try {
        // Check if status already exists
        const existingStatus = await authenticatedCall(() =>
          pb.collection('status_options').getList(1, 1, {
            filter: `source = "${MARKETPLACE_SOURCES.ROZETKA}" && marketplace_code = ${status.id}`
          })
        );

        if (existingStatus.items.length === 0) {
          // Create new status
          await authenticatedCall(() =>
            pb.collection('status_options').create({
              name: status.name || status.name_uk || `Status ${status.id}`,
              color: getColorForStatus(i),
              priority: i + 1,
              marketplace_code: status.id,
              source: MARKETPLACE_SOURCES.ROZETKA
            })
          );
          console.log(`✅ Created Rozetka status: ${status.name || status.name_uk}`);
          synced++;
        } else {
          // Update existing status
          await authenticatedCall(() =>
            pb.collection('status_options').update(existingStatus.items[0].id, {
              name: status.name || status.name_uk || `Status ${status.id}`,
              marketplace_code: status.id
            })
          );
          console.log(`🔄 Updated Rozetka status: ${status.name || status.name_uk}`);
          synced++;
        }
      } catch (error) {
        console.error(`❌ Failed to sync Rozetka status ${status.id}:`, error);
        failed++;
      }
    }

    return { synced, failed };
  } catch (error) {
    console.error('❌ Failed to sync Rozetka statuses:', error);
    return { synced: 0, failed: 1 };
  }
}

export async function syncAllMarketplaceStatuses(): Promise<{
  success: boolean;
  results: {
    epicentr: { synced: number; failed: number };
    promUa: { synced: number; failed: number };
    rozetka: { synced: number; failed: number };
  };
  totalSynced: number;
  totalFailed: number;
  error?: string;
}> {
  try {
    console.log('🚀 Starting marketplace statuses sync...');

    // First ensure we have proper authentication
    console.log('🔐 Authenticating with PocketBase...');
    
    // Sync marketplaces sequentially to avoid auto-cancellation issues
    console.log('📝 Syncing marketplaces sequentially to avoid conflicts...');
    const epicentrResult = await syncEpicentrStatuses();
    await new Promise(resolve => setTimeout(resolve, 1000)); // Brief pause between syncs
    
    const promResult = await syncPromStatuses();
    await new Promise(resolve => setTimeout(resolve, 1000)); // Brief pause between syncs
    
    const rozetkaResult = await syncRozetkaStatuses();

    const totalSynced = epicentrResult.synced + promResult.synced + rozetkaResult.synced;
    const totalFailed = epicentrResult.failed + promResult.failed + rozetkaResult.failed;

    // Log sync record
    try {
      await authenticatedCall(() =>
        pb.collection('sync_records').create({
          source: 'status_sync',
          orders_processed: totalSynced,
          orders_failures: totalFailed
        })
      );
    } catch (syncRecordError) {
      console.warn('Failed to create sync record:', syncRecordError);
    }

    console.log(`✅ Sync completed! Total synced: ${totalSynced}, Total failed: ${totalFailed}`);

    return {
      success: totalFailed === 0,
      results: {
        epicentr: epicentrResult,
        promUa: promResult,
        rozetka: rozetkaResult
      },
      totalSynced,
      totalFailed
    };
  } catch (error) {
    console.error('❌ Failed to sync marketplace statuses:', error);
    return {
      success: false,
      results: {
        epicentr: { synced: 0, failed: 0 },
        promUa: { synced: 0, failed: 0 },
        rozetka: { synced: 0, failed: 0 }
      },
      totalSynced: 0,
      totalFailed: 1,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Export individual sync functions for selective use
export {
  syncEpicentrStatuses,
  syncPromStatuses,
  syncRozetkaStatuses
};

// Main function to run the sync
export async function main() {
  const result = await syncAllMarketplaceStatuses();
  
  if (result.success) {
    console.log('🎉 All marketplace statuses synced successfully!');
  } else {
    console.error('❌ Some statuses failed to sync. Check logs above.');
  }
  
  return result;
}

// Auto-run if this file is executed directly
// Note: Run with `npx tsx scripts/marketplaces-status-sync.ts` or call main() programmatically

// Execute the sync when script is run directly
main().then(() => {
  console.log('✅ Script completed successfully');
}).catch((error) => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});
