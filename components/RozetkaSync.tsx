import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { OrderSyncService } from '@/services/orderSync';

export function RozetkaSync({ onSyncComplete }: { onSyncComplete?: () => void }) {
  const [isSyncing, setIsSyncing] = useState(false);
  const { toast } = useToast();

  const syncOrders = async () => {
    setIsSyncing(true);
    try {
      const syncService = OrderSyncService.getInstance();
      const result = await syncService.syncOrders();

      toast({
        title: 'Orders Synced',
        description: `Successfully synced ${result.syncedOrders} orders (${result.failedOrders} failed)`,
      });

      if (onSyncComplete) {
        onSyncComplete();
      }
    } catch (error) {
      console.error('Failed to sync orders:', error);
      toast({
        title: 'Sync Failed',
        description: 'Failed to sync orders from Rozetka',
        variant: 'destructive',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Button 
      onClick={syncOrders} 
      disabled={isSyncing}
      variant="ghost"
      size="sm"
    >
      {isSyncing ? 'Syncing...' : 'Sync Rozetka'}
    </Button>
  );
} 