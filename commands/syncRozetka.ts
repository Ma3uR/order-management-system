// Load environment variables first
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
const result = config({
  path: path.resolve(__dirname, '../.env'),
  debug: true
});

console.log('Environment loading result:', result);
console.log('Current directory:', __dirname);
console.log('Environment variables:', {
  NEXT_PUBLIC_POCKETBASE_URL: process.env.NEXT_PUBLIC_POCKETBASE_URL,
  POCKETBASE_URL: process.env.POCKETBASE_URL,
  POCKETBASE_ADMIN_EMAIL: process.env.POCKETBASE_ADMIN_EMAIL,
  NODE_ENV: process.env.NODE_ENV
});

// Import after environment variables are loaded
import { OrderSyncService } from '../services/orderSync';

async function main() {
  try {
    const syncService = OrderSyncService.getInstance();
    const result = await syncService.syncOrders();
    console.log('Sync completed successfully!');
    console.log(`Synced orders: ${result.syncedOrders}`);
    console.log(`Failed orders: ${result.failedOrders}`);
  } catch (error) {
    console.error('Failed to sync orders:', error);
    process.exit(1);
  }
}

main(); 