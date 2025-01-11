import { useState } from 'react';
import { Button } from '@/app/components/shared/ui/button';
import { useToast } from '@/app/components/shared/ui/use-toast';
import { syncRozetkaOrders } from '@/app/[locale]/orders/actions/orders';

export function RozetkaSync({ onSyncComplete }: { onSyncComplete?: () => void }) {
  const [isSyncing, setIsSyncing] = useState(false);
  const { toast } = useToast();

  const syncOrders = async () => {
    setIsSyncing(true);
    try {
      const result = await syncRozetkaOrders();
      if (result.error) {
        throw new Error(result.error);
      }

      toast({
        title: 'Orders Synced',
        description: `Successfully synced ${result.data?.syncedOrders ?? 0} orders (${result.data?.failedOrders ?? 0} failed)`,
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
      className="mb-2"
    >
      {isSyncing ? 'Syncing...' : 'Sync Rozetka'}
    </Button>
  );
} 