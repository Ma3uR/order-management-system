import pb from "@/app/lib/pocketbase";
import { syncOrders } from "@/app/[locale]/orders/actions/sync";

export async function handleSync() {
  try {
    await syncOrders();
    
    // Create a sync record
    await pb.collection('sync_records').create({
      status: 'completed',
      // Add any additional fields you want to track
    });

    return { success: true };
  } catch (error) {
    console.error('Sync failed:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
} 