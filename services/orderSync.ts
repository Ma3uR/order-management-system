import { Order, RozetkaOrderResponse } from '@/types/orders';
import RozetkaAPI from '@/lib/rozetka';
import { getPocketBase, authenticateAdmin } from '@/lib/pocketbase';

export class OrderSyncService {
  private static instance: OrderSyncService;
  
  private constructor() {}
  
  static getInstance(): OrderSyncService {
    if (!OrderSyncService.instance) {
      OrderSyncService.instance = new OrderSyncService();
    }
    return OrderSyncService.instance;
  }

  async syncOrders() {
    try {
      console.log('Starting Rozetka orders sync...');
      
      // Authenticate with PocketBase first
      await authenticateAdmin();
      console.log('Successfully authenticated with PocketBase');
      
      const api = RozetkaAPI.getInstance();
      const rozetkaOrders = await api.getOrders();
      
      console.log(`Found ${rozetkaOrders.length} orders to sync`);
      
      let syncedOrders = 0;
      let failedOrders = 0;

      // Process orders sequentially to avoid cancellation issues
      for (const order of rozetkaOrders) {
        try {
          await this.processOrder(order);
          syncedOrders++;
          console.log(`Successfully synced order ${order.id} (${syncedOrders}/${rozetkaOrders.length})`);
        } catch (error) {
          console.error(`Failed to process order ${order.id}:`, error);
          failedOrders++;
        }
      }

      console.log(`Sync completed. Successfully synced ${syncedOrders} orders, failed to sync ${failedOrders} orders`);
      return { syncedOrders, failedOrders };
    } catch (error) {
      console.error('Failed to sync orders:', error);
      throw error;
    }
  }

  private async processOrder(rozetkaOrder: RozetkaOrderResponse) {
    try {
      console.log(`Processing order ${rozetkaOrder.id}...`);
      
      const pb = getPocketBase();
      
      // Check if order already exists
      const existingOrders = await pb.collection('orders').getList(1, 1, {
        filter: `source = "4tvf116a5aitwmb" && orderNumber = "${rozetkaOrder.id}"`
      });

      if (existingOrders.items.length > 0) {
        console.log(`Order ${rozetkaOrder.id} already exists, skipping`);
        return;
      }

      // Get status with minimal priority with error handling
      let defaultStatus = 'fyd1lih4h6aqyv5'; // Fallback status ID
      try {
        const statuses = await pb.collection('status_options').getList(1, 50, {
          sort: '+priority',
        });
        
        if (statuses.items.length > 0) {
          defaultStatus = statuses.items[0].id;
          console.log(`Using status ${defaultStatus} for order ${rozetkaOrder.id}`);
        } else {
          console.warn('No statuses found, using fallback status');
        }
      } catch (error) {
        console.warn('Failed to fetch statuses, using fallback status:', error);
      }

      // Process products
      const products = (rozetkaOrder.items_photos || []).map(item => ({
        name: item.item_name,
        quantity: item.quantity || 1,
        price: parseFloat(item.item_price || '0')
      }));

      const orderData = {
        source: '4tvf116a5aitwmb',
        orderNumber: rozetkaOrder.id.toString(),
        phoneNumber: rozetkaOrder.user_phone,
        fullName: rozetkaOrder.user_title?.full_name || 'Unknown',
        products: JSON.stringify(products),
        numberOfItems: rozetkaOrder.total_quantity || products.reduce((sum, p) => sum + p.quantity, 0),
        amount: parseFloat(rozetkaOrder.amount || '0'),
        paymentMethod: '72p22vqr2viqrnw',
        deliveryMethod: 'd83lh5dgtgigugn',
        status: defaultStatus,
        currency: 'w34c15gjkvpsesg',
        notes: rozetkaOrder.comment || ''
      };

      console.log(`Creating order ${rozetkaOrder.id} with data:`, orderData);
      await pb.collection('orders').create(orderData);
      console.log(`Successfully created order ${rozetkaOrder.id}`);
    } catch (error) {
      console.error(`Failed to process order ${rozetkaOrder.id}:`, error);
      throw error;
    }
  }
} 