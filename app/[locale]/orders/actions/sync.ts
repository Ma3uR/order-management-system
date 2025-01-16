import { RozetkaOrderResponse } from '@/app/types/orders';
import pb from '@/app/lib/pocketbase';
import { authenticatedCall } from '@/app/lib/pocketbase';
import { orderSchema } from '@/app/lib/validations/orders';
import { getDeliveryMethodById, getOrders } from '@/app/actions/rozetka';
import { SyncRecordsRecord } from '@/app/types/pocketbase-types';
import { appendFileSync } from 'fs';

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
    
    await pb.collection('sync_records').create<SyncRecordsRecord>({
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

  const deliveryPostNumber = rozetkaOrder.delivery?.place_id?.toString() || '';

  console.log(rozetkaOrder);


  //TODO: remove toString's and change type in pocketbase to int
  const orderData = {
    source: '4tvf116a5aitwmb',
    orderNumber: rozetkaOrder.id.toString(),
    phoneNumber: rozetkaOrder.user_phone,
    fullName: rozetkaOrder.user_title?.full_name || 'Unknown',
    products: (rozetkaOrder.items_photos || []).map(item => ({
      title: item.item_name,
      quantity: 1,
      price: parseFloat(item.item_price || '0')
    })),
    numberOfItems: rozetkaOrder.total_quantity || 0,
    amount: parseFloat(rozetkaOrder.amount || '0'),
    paymentMethod: (await mapPaymentMethod(rozetkaOrder.payment_method_id)).pbRecordId, 
    deliveryMethod: (await mapDeliveryMethod(rozetkaOrder.delivery.delivery_method_id)).pbRecordId,
    status: defaultStatus,
    currency: defaultCurrency.items[0].id,
    notes: rozetkaOrder.comment || '',
    deliveryPostNumber: deliveryPostNumber
  };

  const validationResult = orderSchema.safeParse(orderData);
  if (!validationResult.success) {
    appendFileSync(
      'orders-validation-errors.log',
      `${new Date().toISOString()} - Validation Error:\n${JSON.stringify({
        orderData,
        validationErrors: validationResult.error.format()
      }, null, 2)}\n\n`
    );
    throw new Error(`Invalid order data: ${validationResult.error.message}`);
  }

  await authenticatedCall(async () => {
    return await pb.collection('orders').create(orderData);
  });
}

async function mapPaymentMethod(paymentMethodId: number) {
  try {
    const paymentMethod = await authenticatedCall(() => 
      pb.collection('payment_options').getList(1, 1, {
        filter: `rozetkaId = "${paymentMethodId}"`
      })
    );

    if (!paymentMethod.items.length) {
      const defaultPaymentMethod = await authenticatedCall(() => pb.collection('payment_options').getList(1, 1, {
        filter: "isDefault = true"
      }));
      if (defaultPaymentMethod.items.length) {
        return {error: null, pbRecordId: defaultPaymentMethod.items[0].id};
      }
      throw new Error('Payment method not found');
    } 

    return {error: null, pbRecordId: paymentMethod.items[0].id};
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(`Failed to map payment method: ${error.message}`);
    } else {
      throw new Error('Failed to map payment method');
    }
  }
}

async function mapDeliveryMethod(deliveryMethodId: number) {
  try {
    const deliveryMethod = await authenticatedCall(() => 
      pb.collection('delivery_options').getList(1, 1, {
        filter: `rozetkaId = "${deliveryMethodId}"`
      })
    );

    if (!deliveryMethod.items.length) {
      const deliveryMethod = await getDeliveryMethodById(deliveryMethodId.toString());
      appendFileSync(
        'delivery-method-not-found.log',
        `${new Date().toISOString()} - Delivery method not found:\n${JSON.stringify({
          deliveryMethodId,
          deliveryMethod,
        }, null, 2)}\n\n`
      );

      return {error: null, pbRecordId: 'epux4piv45by0ot'};
    }

    return {error: null, pbRecordId: deliveryMethod.items[0].id};
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(`Failed to map delivery method: ${error.message}`);
    } else {
      throw new Error('Failed to map delivery method');
    }
  }
} 