import { RozetkaOrderResponse } from '@/app/types/orders';
import RozetkaAPI from '@/app/lib/rozetka';
import pb from '@/app/lib/pocketbase';

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
      const api = RozetkaAPI.getInstance();
      const rozetkaOrders = await api.getOrders();
      
      let syncedOrders = 0;
      let failedOrders = 0;

      // Process orders sequentially to avoid cancellation issues
      for (const order of rozetkaOrders) {
        try {
          await this.processOrder(order);
          syncedOrders++;
        } catch (error) {
          console.error(`Failed to process order ${order.id}:`, error);
          failedOrders++;
        }
      }

      return { syncedOrders, failedOrders };
    } catch (error) {
      console.error('Failed to sync orders:', error);
      throw error;
    }
  }

  private async processOrder(rozetkaOrder: RozetkaOrderResponse) {
    try {
      const existingOrders = await pb.collection('orders').getList(1, 1, {
        filter: `source = "4tvf116a5aitwmb" && orderNumber = "${rozetkaOrder.id}"`
      });

      if (existingOrders.items.length > 0) {
        return;
      }

      // Get status with minimal priority with error handling
      let defaultStatus = 'fyd1lih4h6aqyv5'; // Fallback status ID
      try {
        const statuses = await pb.collection('statuses').getList(1, 50, {
          sort: '+priority',
        });
        
        if (statuses.items.length > 0) {
          defaultStatus = statuses.items[0].id;
        } else {
          console.warn('No statuses found, using fallback status');
        }
      } catch (error) {
        console.warn('Failed to fetch statuses, using fallback status:', error);
      }

      const orderData = {
        source: '4tvf116a5aitwmb',
        orderNumber: rozetkaOrder.id.toString(),
        phoneNumber: rozetkaOrder.user_phone,
        fullName: rozetkaOrder.user_title?.full_name || 'Unknown',
        products: JSON.stringify((rozetkaOrder.items_photos || []).map(item => ({
          name: item.item_name,
          quantity: item.quantity || 1,
          price: parseFloat(item.item_price || '0')
        }))),
        numberOfItems: rozetkaOrder.total_quantity || 0,
        amount: parseFloat(rozetkaOrder.amount || '0'),
        paymentMethod: '72p22vqr2viqrnw',
        deliveryMethod: 'd83lh5dgtgigugn',
        status: defaultStatus,
        currency: 'w34c15gjkvpsesg',
        notes: rozetkaOrder.comment || ''
      };

      await pb.collection('orders').create(orderData);
    } catch (error) {
      console.error(`Failed to process order ${rozetkaOrder.id}:`, error);
      throw error;
    }
  }
} 