import { RozetkaOrderResponse } from '@/app/types/orders';
import RozetkaAPI from '@/app/lib/rozetka';
import pb from '@/app/lib/pocketbase';
import { authenticatedCall } from '@/app/lib/pocketbase';

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
    const mappings = await this.initializeMethodMappings();
    console.log('mappings', mappings);
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
      const existingOrders = await authenticatedCall(async () => {
        return await pb.collection('orders').getList(1, 1, {
          filter: `source = "4tvf116a5aitwmb" && orderNumber = "${rozetkaOrder.id}"`
        });
      });

      if (existingOrders.items.length > 0) {
        return;
      }
      
      const defaultCurrency = await authenticatedCall(async () => {
        return await pb.collection('currency_options').getList(1, 1, {
          filter: "isDefault = true"
        });
      });

      if (defaultCurrency.items.length === 0) {
        throw new Error('No default currency found');
      }

      let defaultStatus = '';
      try {
        const statuses = await authenticatedCall(async () => {
          return await pb.collection('status_options').getList(1, 50, {
            sort: '+priority',
            limit: 1
          });
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
        paymentMethod: await this.mapPaymentMethod(rozetkaOrder.payment_type || ''),
        deliveryMethod: await this.mapDeliveryMethod(rozetkaOrder.delivery_type || ''),
        status: defaultStatus,
        currency: defaultCurrency.items[0].id,
        notes: rozetkaOrder.comment || ''
      };

      await authenticatedCall(async () => {
        return await pb.collection('orders').create(orderData);
      });
    } catch (error) {
      console.error(`Failed to process order ${rozetkaOrder.id}:`, error);
      throw error;
    }
  }

  async initializeMethodMappings() {
    const rozetkaAPI = RozetkaAPI.getInstance();
    
    try {
      const [paymentMethods, deliveryMethods] = await Promise.all([
        rozetkaAPI.getPaymentMethods(),
        rozetkaAPI.getDeliveryMethods()
      ]);

      return {
        paymentMethods,
        deliveryMethods
      }
    } catch (error) {
      console.error('Failed to initialize method mappings:', error);
      throw error;
    }
  }

  private async mapPaymentMethod(rozetkaPaymentType: string): Promise<string> {
    const mappings = await this.initializeMethodMappings();
    const paymentMethods = mappings?.paymentMethods;

    if (!paymentMethods) {
      throw new Error('No payment methods found');
    }

    const paymentMethodMap: Record<string, string> = {
      'cash': '72p22vqr2viqrnw',
    };

    return paymentMethodMap[rozetkaPaymentType] || '72p22vqr2viqrnw';
  }

  private async mapDeliveryMethod(rozetkaDeliveryType: string): Promise<string> {
    const mappings = await this.initializeMethodMappings();
    const deliveryMethods = mappings?.deliveryMethods;

    if (!deliveryMethods) {
      throw new Error('No delivery methods found');
    }

    const deliveryMethodMap: Record<string, string> = {
      'nova_poshta': 'd83lh5dgtgigugn',
    };

    return deliveryMethodMap[rozetkaDeliveryType] || 'd83lh5dgtgigugn';
  }
} 