'use server'

import axios from 'axios';
import { RozetkaOrderResponse } from '@/app/types/orders';
import * as dotenv from 'dotenv';
import pb, { authenticatedCall } from '@/app/lib/pocketbase';
import { orderSchema } from '@/app/lib/validations/orders';
import { appendFileSync } from 'fs';
import { getDefaultDeliveryMethod } from '../[locale]/settings/actions/delivery-methods';

dotenv.config();

const ROZETKA_API_BASE = 'https://api-seller.rozetka.com.ua';

interface RozetkaOrdersResponse {
  success: boolean;
  content: {
    orders: RozetkaOrderResponse[];
    _meta: {
      totalCount: number;
      pageCount: number;
      currentPage: number;
      perPage: number;
    };
    totalFields: {
      amount: string;
      amount_with_discount: string;
      cost: string;
      cost_with_discount: string;
    };
  };
  errors?: {
    description: string;
    code: number;
  };
}

class RozetkaAPI {
  private static instance: RozetkaAPI;
  private token: string | null = null;
  private tokenExpiry: Date | null = null;
  
  private constructor() {
    if (typeof window !== 'undefined') {
      throw new Error('RozetkaAPI can only be used on the server side');
    }
  }
  
  static getInstance(): RozetkaAPI {
    if (!RozetkaAPI.instance) {
      RozetkaAPI.instance = new RozetkaAPI();
    }
    return RozetkaAPI.instance;
  }

  async authenticate() {
    try {
      const base64Password = Buffer.from(process.env.ROZETKA_PASSWORD || '').toString('base64');

      const response = await axios.post(`${ROZETKA_API_BASE}/sites`, {
        username: process.env.ROZETKA_USERNAME,
        password: base64Password
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.data?.content?.access_token) {
        throw new Error('No access token in response');
      }

      this.token = response.data.content.access_token;
      // Set token expiry to slightly less than the actual expiry time
      this.tokenExpiry = new Date(Date.now() + (3600 * 1000 - 60000)); // 59 minutes
      return this.token;
    } catch (error) {
      console.error('Rozetka authentication failed:', error);
      throw error;
    }
  }

  public async ensureValidToken() {
    if (!this.token || !this.tokenExpiry || new Date() >= this.tokenExpiry) {
      await this.authenticate();
    }
    return this.token;
  }

  async getOrders(params?: { 
    from?: string; 
    to?: string;
    page?: number;
    type?: number;
  }) {
    try {
      const token = await this.ensureValidToken();
      
      // Calculate dates for the last 30 days
      const today = new Date();
      const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      const defaultFrom = thirtyDaysAgo.toISOString().split('T')[0];
      const defaultTo = today.toISOString().split('T')[0];
      
      const response = await axios.get<RozetkaOrdersResponse>(`${ROZETKA_API_BASE}/orders/search`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept-Validate-Exception': '1',
          'Content-Language': 'uk'
        },
        params: {
          page: params?.page || 1,
          sort: '-id',
          type: params?.type || 1,
          created_from: params?.from || defaultFrom,
          created_to: params?.to || defaultTo,
          expand: 'delivery,user,status_data,payment_method_id,status_available'
        }
      });

      if (!response.data.success) {
        throw new Error(response.data.errors?.description || 'Failed to fetch orders');
      }

      return response.data.content.orders || [];
    } catch (error) {
      console.error('Failed to fetch Rozetka orders:', error);
      throw error;
    }
  }

  async getPaymentMethods() {
    try {
      const token = await this.ensureValidToken();
      const response = await axios.get(`${ROZETKA_API_BASE}/market-payment-methods/list`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.data.success) {
        throw new Error(response.data.errors?.description || 'Failed to fetch payment methods');
      }

      return response.data.content;
    } catch (error) {
      console.error('Failed to fetch Rozetka payment methods:', error);
      throw error;
    }
  }

  async getAllDeliveryMethods() {
    try {
      const token = await this.ensureValidToken();
      const response = await axios.get(`${ROZETKA_API_BASE}/delivery-services/search`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.data.success) {
        throw new Error(response.data.errors?.description || 'Failed to fetch delivery methods');
      }

      return response.data.content;
    } catch (error: unknown) {
      if (error instanceof Error) { 
        console.error('Failed to fetch Rozetka delivery methods:', error.message);
      } else {
        console.error('Failed to fetch Rozetka delivery methods:', error);
      }
      throw error;
    }
  }

  async getDeliveryMethodById(id: string) {
    try {
      const token = await this.ensureValidToken();
      const response = await axios.get(`${ROZETKA_API_BASE}/delivery-services/search`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        params: {
          id: id
        }
      });

      if (!response.data.success) {
        throw new Error(response.data.errors?.description || 'Failed to fetch delivery methods');
      }

      return response.data.content;
    } catch (error) {
      console.error('Failed to fetch Rozetka delivery methods:', error);
      throw error;
    }
  }

  async getOrderStatuses() {
    try {
      const token = await this.ensureValidToken();
      const response = await axios.get(`${ROZETKA_API_BASE}/order-statuses/search`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.data.success) {
        throw new Error(response.data.errors?.description || 'Failed to fetch order statuses');
      }

      return { error: undefined, data: response.data.content.orderStatuses };
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('Failed to fetch Rozetka order statuses:', error.message);
        return { error: error.message, data: undefined };
      }
      console.error('Failed to fetch Rozetka order statuses:', error);
      throw error;
    }
  }

  async setOrderStatus(orderId: string, statusCode: string): Promise<{ error: string | null, data: boolean | null }> {
    try {
      const token = await this.ensureValidToken();
      const response = await axios.put(`${ROZETKA_API_BASE}/orders/${orderId}`, 
        {
          status: statusCode
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      console.log('response ROZETKA', response);
      return { error: null, data: response.status === 200 ? true : false };
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error(`Status update failed for ${orderId}:`, error.message);
        return { error: error.message, data: null };
      }
      console.error(`Status update failed for ${orderId}:`, error);
      return { error: 'Failed to update Rozetka status', data: null };
    }
  }
}

const api = RozetkaAPI.getInstance();

async function processOrder(rozetkaOrder: RozetkaOrderResponse) {
  console.log('rozetkaOrder', rozetkaOrder);
  const existingOrders = await authenticatedCall(async () => {
    return await pb.collection('orders').getList(1, 1, {
      filter: `source = "4tvf116a5aitwmb" && orderNumber = "${rozetkaOrder.id}"`
    });
  });

  if (existingOrders.items.length > 0) {
    // Order exists, check if status needs to be updated
    const existingOrder = existingOrders.items[0];
    
    // Get the new status based on rozetka status
    const statusResult = await authenticatedCall(async () => {
      return await pb.collection('status_options').getList(1, 50, {
        filter: `marketplace_code = "${rozetkaOrder.status}" && source = "4tvf116a5aitwmb"`,
        sort: '+priority'
      });
    });
    
    if (statusResult.items.length > 0) {
      const newStatusId = statusResult.items[0].id;
      
      // Only update if status has changed
      if (existingOrder.status !== newStatusId) {
        console.log(`Updating order ${rozetkaOrder.id} status from ${existingOrder.status} to ${newStatusId}`);
        
        await authenticatedCall(async () => {
          return await pb.collection('orders').update(existingOrder.id, {
            status: newStatusId,
            updated: new Date().toISOString()
          });
        });
        
        console.log(`Order ${rozetkaOrder.id} status updated successfully`);
      }
    }
    return;
  }

  // Order doesn't exist, create new order
  const defaultCurrency = await authenticatedCall(async () => {
    return await pb.collection('currency_options').getList(1, 1, {
      filter: "isDefault = true"
    });
  });

  if (defaultCurrency.items.length === 0) {
    throw new Error('No default currency found');
  }

  // Get status by matching rozetkaOrder.status with marketplace_code
  const statusResult = await authenticatedCall(async () => {
    return await pb.collection('status_options').getList(1, 50, {
      filter: `marketplace_code = "${rozetkaOrder.status}" && source = "4tvf116a5aitwmb"`,
      sort: '+priority'
    });
  });
  
  if (statusResult.items.length === 0) {
    throw new Error(`No matching status found for Rozetka status: ${rozetkaOrder.status}`);
  }
  
  const orderStatus = statusResult.items[0].id;

  const defaultDeliveryMethod = await getDefaultDeliveryMethod();
  if (!defaultDeliveryMethod.data?.id) {
    throw new Error('No default delivery method found');
  }

  // Get default payment method
  const defaultPaymentMethod = await authenticatedCall(async () => {
    return await pb.collection('payment_options').getList(1, 1, {
      filter: "isDefault = true"
    });
  });

  if (defaultPaymentMethod.items.length === 0) {
    throw new Error('No default payment method found');
  }

  const fullName = rozetkaOrder.user_title?.full_name || rozetkaOrder.user?.contact_fio || 'Unknown';

  const orderData = {
    source: '4tvf116a5aitwmb',
    orderNumber: rozetkaOrder.id.toString(),
    marketplaceIds: rozetkaOrder.id.toString(),
    phoneNumber: rozetkaOrder.user_phone || '',
    fullName,
    products: rozetkaOrder.items_photos?.map(item => ({
      title: item.item_name,
      quantity: 1,
      price: parseFloat(item.item_price)
    })) || [],
    numberOfItems: rozetkaOrder.total_quantity || 0,
    amount: parseFloat(rozetkaOrder.amount),
    paymentMethod: defaultPaymentMethod.items[0].id,
    deliveryMethod: defaultDeliveryMethod.data.id,
    status: orderStatus,
    currency: defaultCurrency.items[0].id,
    notes: rozetkaOrder.comment || '',
    deliveryPostNumber: rozetkaOrder.delivery?.delivery_service_name || '',
    mergeSource: 'none',
    mergeStatus: 'none',
    archived: false,
    productionCost: 0,
    created: rozetkaOrder.created,
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

  await authenticatedCall(async () => {
    return await pb.collection('orders').create(orderData);
  });
}

export async function syncOrders() {
  try {
    const rozetkaOrders = await getOrders();
    if (!rozetkaOrders || !Array.isArray(rozetkaOrders)) {
      throw new Error('Failed to fetch Rozetka orders');
    }
    
    let syncedOrders = 0;
    let failedOrders = 0;

    for (const order of rozetkaOrders) {
      try {
        await processOrder(order);
        syncedOrders++;
      } catch (error) {
        console.error(`Failed to process rozetka order ${order.id}:`, error);
        failedOrders++;
      }
    }
    
    await pb.collection('sync_records').create({
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

// Export only the functions
export async function ensureValidToken() {
  return api.ensureValidToken();
}

export async function getOrders(params?: { 
  from?: string; 
  to?: string;
  page?: number;
  type?: number;
}) {
  return api.getOrders(params);
}

export async function getDeliveryMethodById(id: string) {
  return api.getDeliveryMethodById(id);
}

export async function getPaymentMethods() {
  return api.getPaymentMethods();
}

export async function getDeliveryMethods() {
  return api.getAllDeliveryMethods();
}

export async function getOrderStatuses() {
  return api.getOrderStatuses();
}

export async function setOrderStatus(orderId: string, statusCode: string): Promise<{ error: string | null, data: boolean | null }> {
  return api.setOrderStatus(orderId, statusCode);
}

/**
 * Get available statuses for a specific Rozetka order
 * Uses the order number (Rozetka order ID) directly
 */
export async function getAvailableStatusesForOrder(orderNumber: string): Promise<{ error: string | null, data: Array<{ id: number, name: string, name_uk: string, status: number, color: string }> | null }> {
  try {
    console.log(`🔍 [DEBUG] Searching for Rozetka order: ${orderNumber}`);
    
    // First, get all available statuses from Rozetka to map against
    const allStatuses = await api.getOrderStatuses();
    if (!allStatuses.data || allStatuses.data.length === 0) {
      console.warn(`❌ [DEBUG] Could not fetch general Rozetka statuses`);
      return { error: 'Could not fetch available statuses from Rozetka', data: null };
    }
    
    console.log(`🔍 [DEBUG] Found ${allStatuses.data.length} total Rozetka statuses available`);
    
    // Search for the specific order by ID in recent orders
    let order = null;
    let page = 1;
    const maxPages = 5; // Limit search to recent orders
    
    while (page <= maxPages && !order) {
      console.log(`🔍 [DEBUG] Fetching page ${page} of Rozetka orders...`);
      const orders = await api.getOrders({ page });
      console.log(`🔍 [DEBUG] Page ${page} returned ${orders.length} orders`);
      
      if (orders.length > 0) {
        console.log(`🔍 [DEBUG] First few order IDs on page ${page}:`, orders.slice(0, 3).map(o => o.id));
      }
      
      order = orders.find(o => o.id.toString() === orderNumber);
      
      if (order) {
        console.log(`✅ [DEBUG] Found order ${orderNumber}:`, {
          id: order.id,
          status: order.status,
          has_status_available: !!order.status_available,
          status_available_length: order.status_available?.length || 0,
          status_available_sample: order.status_available?.slice(0, 2)
        });
        break;
      }
      
      if (orders.length === 0) {
        console.log(`🔍 [DEBUG] No more orders to fetch at page ${page}`);
        break;
      }
      
      page++;
    }
    
    if (!order) {
      console.warn(`❌ [DEBUG] Order ${orderNumber} not found in ${maxPages} pages of recent orders`);
      
      // If order not found, return all available statuses as fallback
      console.log(`🔄 [DEBUG] Order not found, returning all available Rozetka statuses as fallback`);
      return { error: null, data: allStatuses.data };
    }
    
    if (!order.status_available || order.status_available.length === 0) {
      console.warn(`❌ [DEBUG] Order ${orderNumber} found but has no available status transitions`);
      console.log(`🔍 [DEBUG] Order structure:`, {
        id: order.id,
        status: order.status,
        keys: Object.keys(order).slice(0, 10),
        status_available: order.status_available
      });
      
      // If no specific transitions available, return all statuses
      console.log(`🔄 [DEBUG] No status transitions available, returning all Rozetka statuses`);
      return { error: null, data: allStatuses.data };
    }
    
    // Map the available transition IDs to actual status objects
    const availableStatusIds = order.status_available.map(transition => transition.status);
    console.log(`🔍 [DEBUG] Available transition status ids:`, availableStatusIds);
    
    const availableStatuses = allStatuses.data.filter((status: { id: number; name: string; name_uk: string; name_en: string; status_group: number; status: number; color: string; title: string }) => 
      availableStatusIds.includes(status.status)
    );
    
    console.log(`✅ [DEBUG] Found ${availableStatuses.length} matching statuses out of ${availableStatusIds.length} transitions`);
    console.log(`🔍 [DEBUG] Matched statuses:`, availableStatuses.map((s: { id: number; name: string; name_uk: string; name_en: string; status_group: number; status: number; color: string; title: string }) => ({ id: s.id, name: s.name_uk, status: s.status })));
    
    if (availableStatuses.length === 0) {
      console.warn(`❌ [DEBUG] No matching statuses found for available transitions, returning all statuses as fallback`);
      return { error: null, data: allStatuses.data };
    }
    
    return { error: null, data: availableStatuses };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`❌ [DEBUG] Failed to get available statuses for Rozetka order ${orderNumber}:`, errorMessage);
    return { error: errorMessage, data: null };
  }
}
