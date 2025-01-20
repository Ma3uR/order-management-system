import { syncOrders as syncRozetkaOrders } from './app/[locale]/orders/actions/sync';
import { syncOrders as syncEpicentrOrders } from './app/actions/epicentr';
import { syncOrders as syncPromOrders } from './app/actions/prom-ua';

async function main() {
  console.log('Starting order sync cron job...');
  try {

   // Sync Epicentr orders
    const epicentr = await syncEpicentrOrders();
    console.log('Epicentr order sync completed:', epicentr);

    // //  // Sync Rozetka orders
    const rozetkaResult = await syncRozetkaOrders();
    console.log('Rozetka order sync completed:', rozetkaResult);

    // //  // Sync Prom orders 
    const promResult = await syncPromOrders();
    console.log('Prom order sync completed:', promResult);
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Order sync failed:', error.message);
    } else {
      console.error('Order sync failed:', error);
    }
    process.exit(1);
  }
}

main();
