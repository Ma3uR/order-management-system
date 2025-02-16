'use server'

import axios from 'axios';
import * as dotenv from 'dotenv';
import pb, { authenticatedCall } from '@/app/lib/pocketbase';
import { orderSchema } from '@/app/lib/validations/orders';
import { appendFileSync } from 'fs';
import { getDefaultDeliveryMethod } from '../[locale]/settings/actions/delivery-methods';

dotenv.config();

interface PromPaymentMethod {
  id: number;
  name: string;
  description: string;
}

interface PromDeliveryMethod {
  id: number;
  name: string;
  comment: string;
  enabled: boolean;
  type: string;
}

interface PromOrderResponse {
  id: number;
  date_created: string;
  client_first_name: string;
  client_second_name: string;
  client_last_name: string;
  client_id: number;
  client_notes: string;
  products: Array<{
    id: number;
    external_id: string;
    image: string;
    quantity: number;
    price: string;
    url: string;
    name: string;
    name_multilang: {
      ru: string;
      uk: string;
    };
    total_price: string;
    measure_unit: string;
    sku: string;
    cpa_commission: {
      amount: string;
    };
  }>;
  phone: string;
  email: string;
  price: string;
  full_price: string;
  delivery_option: {
    id: number;
    name: string;
    shipping_service: string;
  };
  delivery_provider_data: {
    provider: string;
    type: string;
    sender_warehouse_id: string;
    recipient_warehouse_id: string;
    declaration_number: string;
    unified_status: string;
  };
  delivery_address: string;
  delivery_cost: number;
  payment_option: {
    id: number;
    name: string;
  };
  payment_data: {
    type: string;
    status: string;
    status_modified: string;
  };
  status: string;
  status_name: string;
  source: string;
  has_order_promo_free_delivery: boolean;
  cpa_commission: {
    amount: string;
    is_refunded: boolean;
  };
  utm: {
    medium: string;
    source: string;
    campaign: string;
  };
  dont_call_customer_back: boolean;
  ps_promotion: {
    name: string;
    conditions: string[];
  };
  cancellation: {
    title: string;
    initiator: string;
  };
}

interface PromOrdersResponse {
  orders: PromOrderResponse[];
  status: string;
}

interface MappedMethod {
  error: null;
  pbRecordId: string;
}

class PromUaAPI {
  private static instance: PromUaAPI;
  private token: string;
  
  private constructor() {
    if (typeof window !== 'undefined') {
      throw new Error('PromUaAPI can only be used on the server side');
    }
    
    const token = process.env.PROM_UA_TOKEN;
    if (!token) {
      throw new Error('PROM_UA_TOKEN is not set in environment variables');
    }
    
    this.token = token;
  }
  
  static getInstance(): PromUaAPI {
    if (!PromUaAPI.instance) {
      PromUaAPI.instance = new PromUaAPI();
    }
    return PromUaAPI.instance;
  }

  async checkToken() {
    try {
      const response = await axios.get(`${process.env.PROMUA_API_URL}/orders/list`, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        }
      });
      return response.status === 200;
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('Failed to check Prom.ua connection:', error.message);
      } else {
        console.error('Failed to check Prom.ua connection:', error);
      }
      return false;
    }
  }

  async getOrders() {
    try {
      const response = await axios.get<PromOrdersResponse>(`${process.env.PROMUA_API_URL}/orders/list`, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.data.orders) {
        throw new Error('Failed to fetch orders from Prom.ua');
      }

      if (!Array.isArray(response.data.orders)) {
        throw new Error('Invalid response format from Prom.ua API');
      }

      return { error: undefined, data: response.data.orders };
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('Failed to fetch Prom.ua orders:', error.message);
        return { error: error.message, data: undefined };
      } else {
        console.error('Failed to fetch Prom.ua orders:', error);
        return { error: 'Unknown error in getOrders', data: undefined };
      }
    }
  }

  async getOrderById(id: string) {
    try {
      const response = await axios.get<{ status: string; order: PromOrderResponse }>(`${process.env.PROMUA_API_URL}/orders/${id}`, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'        
        }
      });

      if (!response.data || response.data.status !== 'success') {
        throw new Error('Failed to fetch order from Prom.ua');
      }

      return { error: undefined, data: response.data.order };
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error(`Failed to fetch Prom.ua order ${id}:`, error.message);
        return { error: error.message, data: undefined };
      } else {
        console.error(`Failed to fetch Prom.ua order ${id}:`, error);
        return { error: 'Unknown error in getOrderById', data: undefined };
      }
    }
  }

  async getPaymentMethods() {
    try {
      const response = await axios.get<{ status: string; payment_options: PromPaymentMethod[] }>(`${process.env.PROMUA_API_URL}/payment_options/list`, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.data.payment_options) {
        throw new Error('Failed to fetch payment methods from Prom.ua');
      }
      
      return { error: undefined, data: response.data.payment_options };
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('Failed to fetch payment methods from Prom.ua:', error.message);
        return { error: error.message, data: undefined };
      }
      console.error('Failed to fetch payment methods from Prom.ua:', error);
      return { error: 'Unknown error in getPaymentMethods', data: undefined };
    }
  }

  async getDeliveryMethods() {
    try {
      const response = await axios.get<{ status: string; delivery_options: PromDeliveryMethod[] }>(`${process.env.PROMUA_API_URL}/delivery_options/list`, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.data.delivery_options) {
        throw new Error('Failed to fetch delivery methods from Prom.ua');
      }
      return { error: undefined, data: response.data.delivery_options };
  } catch (error: unknown) {
    if (error instanceof Error) {
        console.error('Failed to fetch delivery methods from Prom.ua:', error.message);
        return { error: error.message, data: undefined };
      }
      console.error('Failed to fetch delivery methods from Prom.ua:', error);
      return { error: 'Unknown error in getDeliveryMethods', data: undefined };
    }
  }

  async getLastOrderId() {
    const orders = await authenticatedCall(async () => {
      return await pb.collection('orders').getList(1, 1, {
        filter: 'source = "pj9sejm9vqtu8xq"',
        sort: '-created'
      });
    });
    return orders.items[0]?.marketplaceIds;
  }

  async getOrderStatuses() {
    try {
      const response = await axios.get<{ status: string; order_status_options: Array<{ id: number, name: string, code: string }> }>(
        `${process.env.PROMUA_API_URL}/order_status_options/list`,
        {
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('response.data', response.data);
      if (!response.data.order_status_options) {
        throw new Error('Failed to fetch order statuses from Prom.ua');
      }
      
      return { error: undefined, data: response.data.order_status_options };
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('Failed to fetch order statuses from Prom.ua:', error.message);
        return { error: error.message, data: undefined };
      }
      console.error('Failed to fetch order statuses from Prom.ua:', error);
      return { error: 'Unknown error in getOrderStatuses', data: undefined };
    }
  }

  async setOrderStatus(orderId: string, statusCode: string): Promise<{ error: string | null, data: boolean | null }> {
    try {
      const baseUrl = process.env.PROMUA_API_URL;
      const response = await axios.patch(`${baseUrl}/orders/set_status`, {
        status: statusCode,
        ids: [orderId],
        cancellation_reason: "not_available",
        cancellation_text: "string",
        custom_status_id: 0
      }, {
        headers: { 
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        }
      });
      return { error: null, data: response.status == 200 ? true : false };
    } catch (error) {
      console.error(`Status update failed for ${orderId}:`, error);
      return { error: 'Failed to update Prom.ua status', data: null };
    }
  }
}




const api = PromUaAPI.getInstance();

async function mapPaymentMethod(paymentOptionId: number): Promise<MappedMethod> {
  try {
    const paymentMethod = await authenticatedCall(() => 
      pb.collection('payment_options').getList(1, 1, {
        filter: `promId = "${paymentOptionId}"`
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

async function mapDeliveryMethod(deliveryOptionId: number): Promise<MappedMethod> {
  try {
    const deliveryMethod = await authenticatedCall(() => 
      pb.collection('delivery_options').getList(1, 1, {
        filter: `promId = "${deliveryOptionId}"`
      })
    );

    console.log('deliveryMethod', deliveryMethod);
    console.log('deliveryOptionId', deliveryOptionId);

    if (!deliveryMethod.items.length) {
      const defaultDeliveryMethod = await getDefaultDeliveryMethod();
      console.log('defaultDeliveryMethod', defaultDeliveryMethod);
      if (!defaultDeliveryMethod.data?.id) {
        throw new Error('Delivery method not found');
      }
      return {error: null, pbRecordId: defaultDeliveryMethod.data?.id};
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

async function processOrder(promOrder: PromOrderResponse) {
  console.log('promOrder', promOrder);
  const existingOrders = await authenticatedCall(async () => {
    return await pb.collection('orders').getList(1, 1, {
      filter: `source = "gfzk8nxfokgu9ku" && orderNumber = "${promOrder.id}"`
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
  const paymentMethod = await mapPaymentMethod(promOrder.payment_option.id);
  const deliveryMethod = await mapDeliveryMethod(promOrder.delivery_option.id);
  const deliveryPostNumber = promOrder.delivery_address || '';

  const fullName = [promOrder.client_first_name, promOrder.client_second_name, promOrder.client_last_name]
    .filter(Boolean)
    .join(' ') || 'Unknown';

  const orderData = {
    source: 'gfzk8nxfokgu9ku',
    orderNumber: promOrder.id.toString(),
    marketplaceIds: promOrder.id.toString(),
    phoneNumber: promOrder.phone,
    fullName,
    products: promOrder.products.map(item => ({
      title: item.name,
      quantity: item.quantity,
      price: parseFloat(item.price)
    })),
    numberOfItems: promOrder.products.reduce((sum, item) => sum + item.quantity, 0),
    amount: parseFloat(promOrder.price),
    paymentMethod: paymentMethod.pbRecordId,
    deliveryMethod: deliveryMethod.pbRecordId,
    status: defaultStatus,
    currency: defaultCurrency.items[0].id,
    notes: promOrder.client_notes || '',
    deliveryPostNumber: deliveryPostNumber,
    mergeSource: 'none',
    mergeStatus: 'none',
    archived: false,
  };

  const safeData = {
    ...orderData,
    mergeSource: orderData.mergeSource === '' ? 'none' : orderData.mergeSource,
    mergeStatus: orderData.mergeStatus === '' ? 'none' : orderData.mergeStatus
  };
  const validationResult = orderSchema.safeParse(safeData);
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

export async function syncOrders() {
  try {
    const promOrders = await getOrders();
    if (!promOrders.data) {
      throw new Error('Failed to fetch Prom.ua orders');
    }
    
    let syncedOrders = 0;
    let failedOrders = 0;

    // Process orders sequentially to avoid cancellation issues
    for (const order of promOrders.data) {
      try {
        await processOrder(order);
        syncedOrders++;
      } catch (error) {
        console.error(`Failed to process promua order ${order.id}:`, error);
        failedOrders++;
      }
    }
    
    await pb.collection('sync_records').create({
      source: 'gfzk8nxfokgu9ku',
      orders_processed: syncedOrders,
      orders_failures: failedOrders
    });
    
    return { success: true, syncedOrders, failedOrders };
  } catch (error) {
    console.error('Failed to sync orders:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Export functions
export async function getOrders() {
  return api.getOrders();
}

export async function getOrderById(id: string) {
  return api.getOrderById(id);
}

export async function getDeliveryMethods() {
  return api.getDeliveryMethods();
}

export async function getPaymentMethods() {
  return api.getPaymentMethods();
}

export async function getOrderStatuses() {
  return api.getOrderStatuses();
}

export async function getLastOrderId() {
  return api.getLastOrderId();
}

export async function setOrderStatus(orderId: string, statusCode: string) {
  return api.setOrderStatus(orderId, statusCode);
}