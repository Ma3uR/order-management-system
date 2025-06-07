'use server'

import { syncAllMarketplaceStatuses } from '../../../../scripts/marketplaces-status-sync';

export async function syncMarketplaceStatuses() {
  try {
    const result = await syncAllMarketplaceStatuses();
    
    if (result.success) {
      return {
        error: undefined,
        data: {
          message: `Successfully synced ${result.totalSynced} statuses across all marketplaces.`,
          details: result.results
        }
      };
    } else {
      return {
        error: `Sync completed with ${result.totalFailed} failures. ${result.error || ''}`,
        data: {
          message: `Partially synced ${result.totalSynced} statuses. ${result.totalFailed} failed.`,
          details: result.results
        }
      };
    }
  } catch (error) {
    console.error('Failed to sync marketplace statuses:', error);
    return {
      error: error instanceof Error ? error.message : 'Unknown error occurred during sync',
      data: undefined
    };
  }
} 