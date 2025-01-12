import { RozetkaOrderResponse } from '@/app/types/orders';
import pb from '@/app/lib/pocketbase';
import { authenticatedCall } from '@/app/lib/pocketbase';
import { orderSchema } from '@/app/lib/validations/orders';
import { getOrders, getDeliveryMethodById, getPaymentMethods } from '@/app/actions/rozetka';
interface SyncRecord {
  source: string;
  ordersProcessed: number;
  failures: number;
}

export async function syncOrders() {
  try {
    const rozetkaOrders = await getOrders();
    
    let syncedOrders = 0;
    let failedOrders = 0;

    // Process orders sequentially to avoid cancellation issues
    for (const order of rozetkaOrders) {
      try {
        await processOrder(order);
        syncedOrders++;
      } catch (error) {
        console.error(`Failed to process order ${order.id}:`, error);
        failedOrders++;
      }
    }
    
    await pb.collection('sync_records').create({
      source: 'rozetka',
      orders_processed: syncedOrders,
      orders_failures: failedOrders
    });
    
    return { success: true, syncedOrders, failedOrders };
  } catch (error) {
    console.error('Failed to sync orders:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

async function processOrder(rozetkaOrder: RozetkaOrderResponse) {
  const existingOrders = await authenticatedCall(async () => {
    return await pb.collection('orders').getList(1, 1, {
      filter: `source = "rozetka" && orderNumber = "${rozetkaOrder.id}"`
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
  console.log('Rozetka order:', rozetkaOrder);
  const deliveryMethod = await getDeliveryMethodById(rozetkaOrder.delivery_type || '');
  console.log('Delivery method:', deliveryMethod);
  const paymentMethods = await getPaymentMethods();
  console.log('Payment methods:', paymentMethods);

  //TODO: order structure parsing here
  const orderData = {
    source: '4tvf116a5aitwmb',
    orderNumber: rozetkaOrder.id.toString(),
    phoneNumber: rozetkaOrder.user_phone,
    fullName: rozetkaOrder.user_title?.full_name || 'Unknown',
    products: (rozetkaOrder.items_photos || []).map(item => ({
      name: item.item_name,
      quantity: item.quantity || 1,
      price: parseFloat(item.item_price || '0')
    })),
    numberOfItems: rozetkaOrder.total_quantity || 0,
    amount: parseFloat(rozetkaOrder.amount || '0'),
    paymentMethod: await mapPaymentMethod(rozetkaOrder.payment_type || ''),
    deliveryMethod: await mapDeliveryMethod(rozetkaOrder.delivery_type || ''),
    status: defaultStatus,
    currency: defaultCurrency.items[0].id,
    notes: rozetkaOrder.comment || '',
    created: new Date().toISOString()
  };


  const validationResult = orderSchema.safeParse(orderData);
  if (!validationResult.success) {
    throw new Error(`Invalid order data: ${validationResult.error.message}`);
  }

  await authenticatedCall(async () => {
    return await pb.collection('orders').create(orderData);
  });
}

async function mapPaymentMethod(rozetkaPaymentType: string): Promise<string> {
  const paymentMethodMap: Record<string, string> = {
    'cash': '72p22vqr2viqrnw',
  };

  return paymentMethodMap[rozetkaPaymentType] || '72p22vqr2viqrnw';
}

async function mapDeliveryMethod(rozetkaDeliveryType: string): Promise<string> {
  const deliveryMethodMap: Record<string, string> = {
    'nova_poshta': 'd83lh5dgtgigugn',
  };

  return deliveryMethodMap[rozetkaDeliveryType] || 'd83lh5dgtgigugn';
} 