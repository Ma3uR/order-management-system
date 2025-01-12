import { syncOrders } from './app/[locale]/orders/actions/sync';

async function main() {
  console.log('Starting order sync cron job...');
  try {
    const result = await syncOrders();
    console.log('Order sync completed:', result);
  } catch (error) {
    console.error('Order sync failed:', error);
    process.exit(1);
  }
}

main(); 