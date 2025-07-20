'use server'

import { RozetkaOrderResponse } from '@/app/types/orders';
import pb from '@/app/lib/pocketbase';
import { orderSchema } from '@/app/lib/validations/orders';
import { getDeliveryMethodById, getOrders } from '@/app/actions/rozetka';
import { SyncRecordsRecord } from '@/app/types/pocketbase-types';
import { appendFileSync } from 'fs';
import { getDefaultDeliveryMethod } from '../../settings/actions/delivery-methods';
import { getDefaultPaymentMethod } from '../../settings/actions/payment-methods';
import { extractProductsFromRozetkaOrder } from '@/app/lib/utils/rozetka';


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
        console.error(`Failed to process rozetka order ${order.id}:`, error);
        failedOrders++;
      }
    }
    
    await pb.collection('sync_records').create<SyncRecordsRecord>({
      source: '4tvf116a5aitwmb',
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
  console.log(rozetkaOrder);
  const existingOrders = await pb.collection('orders').getList(1, 1, {
    filter: `source = "4tvf116a5aitwmb" && orderNumber = "${rozetkaOrder.id}"`
  });

  if (existingOrders.items.length > 0) {
    return;
  }
  
  const defaultCurrency = await pb.collection('currency_options').getList(1, 1, {
    filter: "isDefault = true"
  });

  if (defaultCurrency.items.length === 0) {
    throw new Error('No default currency found');
  }

  // Get status by matching rozetkaOrder.status with marketplace_code
  const statusResult = await pb.collection('status_options').getList(1, 50, {
    filter: `marketplace_code = "${rozetkaOrder.status}" && source = "4tvf116a5aitwmb"`,
    sort: '+priority'
  });
  
  if (statusResult.items.length === 0) {
    throw new Error(`No matching status found for Rozetka status code: ${rozetkaOrder.status}`);
  }
  
  const orderStatus = statusResult.items[0].id;

  const deliveryPostNumber = [
    rozetkaOrder.delivery?.place_street,
    rozetkaOrder.delivery?.place_house,
    rozetkaOrder.delivery?.place_number
  ].filter(Boolean).join(' ');

  const products = extractProductsFromRozetkaOrder(rozetkaOrder);
  const orderData = {
    source: '4tvf116a5aitwmb',
    orderNumber: rozetkaOrder.id.toString(),
    marketplaceId: rozetkaOrder.id.toString(),
    phoneNumber: rozetkaOrder.user_phone,
    fullName: rozetkaOrder.user_title?.full_name || 'Unknown',
    products,
    numberOfItems: rozetkaOrder.total_quantity || products.reduce((sum, product) => sum + product.quantity, 0),
    amount: parseFloat(rozetkaOrder.amount || '0'),
    paymentMethod: (await mapPaymentMethod(rozetkaOrder.payment_method_id)).pbRecordId, 
    deliveryMethod: (await mapDeliveryMethod(rozetkaOrder.delivery.delivery_method_id)).pbRecordId,
    status: orderStatus,
    currency: defaultCurrency.items[0].id,
    notes: rozetkaOrder.comment || '',
    deliveryPostNumber: deliveryPostNumber,
    mergeSource: 'none',
    mergeStatus: 'none',
    productionCost: 0,
  };

  const validationResult = orderSchema.safeParse({
    ...orderData,
    mergeSource: orderData.mergeSource || 'none',
    mergeStatus: orderData.mergeStatus || 'none'
  });
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

  await pb.collection('orders').create(orderData);
}

async function mapPaymentMethod(paymentMethodId: number) {
  try {
    const paymentMethod = await pb.collection('payment_options').getList(1, 1, {
      filter: `rozetkaId = "${paymentMethodId}"`
    });

    if (!paymentMethod.items.length) {
      const defaultPaymentMethod = await getDefaultPaymentMethod();
      if (defaultPaymentMethod.data?.id) {
        return {error: null, pbRecordId: defaultPaymentMethod.data?.id};
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
    const deliveryMethod = await pb.collection('delivery_options').getList(1, 1, {
      filter: `rozetkaId = "${deliveryMethodId}"`
    });

    if (!deliveryMethod.items.length) {
      const deliveryMethod = await getDeliveryMethodById(deliveryMethodId.toString());
      appendFileSync(
        'delivery-method-not-found.log',
        `${new Date().toISOString()} - Delivery method not found:\n${JSON.stringify({
          deliveryMethodId,
          deliveryMethod,
        }, null, 2)}\n\n`
      );

      const defaultDeliveryMethod = await getDefaultDeliveryMethod();

      return {error: null, pbRecordId: defaultDeliveryMethod.data?.id || ''};
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