import { useState } from 'react';
import { Button } from '@/app/components/shared/ui/button';
import { Progress } from '@/app/components/shared/ui/progress';
import { toast } from 'sonner';
import { syncOrders as syncRozetkaOrders } from '@/app/[locale]/orders/actions/sync';
import { syncOrders as syncEpicentrOrders } from '@/app/actions/epicentr';
import { syncOrders as syncPromOrders } from '@/app/actions/prom-ua';
import { useTranslations } from 'next-intl';

type SyncStatus = {
  epicentr: boolean;
  rozetka: boolean;
  prom: boolean;
}

export function MarketplaceSync({ onSyncComplete }: { onSyncComplete?: () => void }) {
  const t = useTranslations('Sync');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    epicentr: false,
    rozetka: false,
    prom: false
  });

  // Calculate progress (each marketplace is worth 33.33%)
  const getProgress = () => {
    const completedSteps = Object.values(syncStatus).filter(Boolean).length;
    return completedSteps * 33.33;
  };

  const syncAllMarketplaces = async () => {
    setIsSyncing(true);
    setSyncStatus({ epicentr: false, rozetka: false, prom: false });
    
    try {
      // Sync Epicentr orders
      const epicentr = await syncEpicentrOrders();
      setSyncStatus(prev => ({ ...prev, epicentr: true }));
      toast.success(t('epicentrSyncComplete', {
        synced: epicentr.syncedOrders || 0,
        failed: epicentr.failedOrders || 0
      }));
      console.log('Epicentr sync completed:', epicentr);

      // Sync Rozetka orders  
      const rozetka = await syncRozetkaOrders();
      setSyncStatus(prev => ({ ...prev, rozetka: true }));
      toast.success(t('rozetkaSyncComplete', {
        synced: rozetka.syncedOrders || 0,
        failed: rozetka.failedOrders || 0
      }));
      console.log('Rozetka sync completed:', rozetka);

      // Sync Prom orders
      const prom = await syncPromOrders();
      setSyncStatus(prev => ({ ...prev, prom: true }));
      toast.success(t('promSyncComplete', {
        synced: prom.syncedOrders || 0,
        failed: prom.failedOrders || 0
      }));
      console.log('Prom sync completed:', prom);

      if (onSyncComplete) {
        onSyncComplete();
      }
    } catch (error) {
      console.error('Failed to sync marketplaces:', error);
      toast.error('Failed to sync marketplace orders');
    } finally {
      setTimeout(() => {
        setIsSyncing(false);
        setSyncStatus({ epicentr: false, rozetka: false, prom: false });
      }, 1000); // Reset after 1 second to show completion
    }
  };

  return (
    <div className="space-y-2 w-full">
      <Button 
        onClick={syncAllMarketplaces} 
        disabled={isSyncing}
        variant="ghost"
        size="sm"
        className="w-full mb-2"
      >
        {isSyncing ? 'Syncing...' : 'Sync Marketplaces'}
      </Button>
      
      {isSyncing && (
        <div className="space-y-2">
          <Progress value={getProgress()} className="w-full h-2" />
          <div className="text-sm text-muted-foreground space-y-1">
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${syncStatus.epicentr ? 'bg-green-500' : 'bg-gray-300'}`} />
              <span>Epicentr {syncStatus.epicentr ? '✓' : '...'}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${syncStatus.rozetka ? 'bg-green-500' : 'bg-gray-300'}`} />
              <span>Rozetka {syncStatus.rozetka ? '✓' : '...'}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${syncStatus.prom ? 'bg-green-500' : 'bg-gray-300'}`} />
              <span>Prom {syncStatus.prom ? '✓' : '...'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 