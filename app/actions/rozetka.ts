'use server'

import axios from 'axios';
import { RozetkaOrderResponse } from '@/app/types/orders';
import * as dotenv from 'dotenv';
import pb from '@/app/lib/pocketbase';
import { orderSchema } from '@/app/lib/validations/orders';
import { appendFileSync } from 'fs';
import { getDefaultDeliveryMethod } from '../[locale]/settings/actions/delivery-methods';
import { processOrderAutomation, type AutomationResult } from '@/app/lib/services/status-automation';
import { extractProductsFromRozetkaOrder } from '@/app/lib/utils/rozetka';

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
    types?: number;
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
          types: params?.types || 1,
          created_from: params?.from || defaultFrom,
          created_to: params?.to || defaultTo,
          expand: 'delivery,user,status_data,payment_method_id,status_available, is_payed, prro_receipt_status,purchases'
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

function buildRozetkaDeliveryAddress(delivery: RozetkaOrderResponse['delivery']): string {
  if (!delivery) return '';
  
  const parts = [];
  
  // Add city
  if (delivery.city?.name_ua || delivery.city?.city_name || delivery.city?.name) {
    parts.push(delivery.city.name_ua || delivery.city.city_name || delivery.city.name);
  }
  
  // Add street and building info
  if (delivery.place_street) {
    let streetInfo = delivery.place_street;
    if (delivery.place_number) {
      streetInfo += `, ${delivery.place_number}`;
    }
    if (delivery.place_house) {
      streetInfo += `/${delivery.place_house}`;
    }
    parts.push(streetInfo);
  }
  
  // Add pickup point reference if available
  if (delivery.pickup_rz_id) {
    parts.push(`Відділення: ${delivery.pickup_rz_id}`);
  }
  
  return parts.length > 0 ? parts.join(', ') : '';
}


async function processOrder(rozetkaOrder: RozetkaOrderResponse) {
  console.log('rozetkaOrder', rozetkaOrder);
  const existingOrders = await pb.collection('orders').getList(1, 1, {
    filter: `source = "4tvf116a5aitwmb" && orderNumber = "${rozetkaOrder.id}"`
  });

  if (existingOrders.items.length > 0) {
    // Order exists, check if status needs to be updated
    const existingOrder = existingOrders.items[0];
    
    // Get the new status based on rozetka status
    const statusResult = await pb.collection('status_options').getList(1, 50, {
      filter: `marketplace_code = "${rozetkaOrder.status}" && source = "4tvf116a5aitwmb"`,
      sort: '+priority'
    });
    
    if (statusResult.items.length > 0) {
      const newStatusId = statusResult.items[0].id;
      
      // Check if status or prro_receipt_status has changed
      const newPrroReceiptStatus = rozetkaOrder.prro_receipt_status || false;
      const statusChanged = existingOrder.status !== newStatusId;
      const prroStatusChanged = existingOrder.prro_receipt_status !== newPrroReceiptStatus;
      
      if (statusChanged || prroStatusChanged) {
        console.log(`Updating order ${rozetkaOrder.id}${statusChanged ? ` status from ${existingOrder.status} to ${newStatusId}` : ''}${prroStatusChanged ? ` prro_receipt_status to ${newPrroReceiptStatus}` : ''}`);
        
        await pb.collection('orders').update(existingOrder.id, {
          status: newStatusId,
          prro_receipt_status: newPrroReceiptStatus,
          updated: new Date().toISOString()
        });
        
        console.log(`Order ${rozetkaOrder.id} updated successfully`);
      }
    }
    return;
  }

  // Order doesn't exist, create new order
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
    throw new Error(`No matching status found for Rozetka status: ${rozetkaOrder.status}`);
  }
  
  const orderStatus = statusResult.items[0].id;

  const defaultDeliveryMethod = await getDefaultDeliveryMethod();
  if (!defaultDeliveryMethod.data?.id) {
    throw new Error('No default delivery method found');
  }

  // Get default payment method
  const defaultPaymentMethod = await pb.collection('payment_options').getList(1, 1, {
    filter: "isDefault = true"
  });

  if (defaultPaymentMethod.items.length === 0) {
    throw new Error('No default payment method found');
  }

  const fullName = rozetkaOrder.user_title?.full_name || rozetkaOrder.user?.contact_fio || 'Unknown';

  const products = extractProductsFromRozetkaOrder(rozetkaOrder);
  const orderData = {
    source: '4tvf116a5aitwmb',
    orderNumber: rozetkaOrder.id.toString(),
    marketplaceIds: rozetkaOrder.id.toString(),
    phoneNumber: rozetkaOrder.user_phone || '',
    fullName,
    products,
    numberOfItems: rozetkaOrder.total_quantity || products.reduce((sum, product) => sum + product.quantity, 0),
    amount: parseFloat(rozetkaOrder.amount_with_discount),
    paymentMethod: defaultPaymentMethod.items[0].id,
    deliveryMethod: defaultDeliveryMethod.data.id,
    status: orderStatus,
    currency: defaultCurrency.items[0].id,
    notes: rozetkaOrder.comment || '',
    deliveryPostNumber: buildRozetkaDeliveryAddress(rozetkaOrder.delivery),
    mergeSource: 'none',
    mergeStatus: 'none',
    archived: false,
    productionCost: 0,
    created_at_marketplace: rozetkaOrder.created,
    prro_receipt_status: rozetkaOrder.prro_receipt_status || false,
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

  const createdOrder = await pb.collection('orders').create(orderData);

  // Process status automation for new orders
  try {
    const automationResult: AutomationResult = await processOrderAutomation(rozetkaOrder, createdOrder.id, '4tvf116a5aitwmb');
    if (automationResult.success) {
      if (automationResult.statusChanged) {
        console.log(`🤖 Order ${rozetkaOrder.id} automated: status changed`);
      }
      if (automationResult.telegramSent) {
        console.log(`📱 Order ${rozetkaOrder.id} automated: Telegram notification sent`);
      }
      if (automationResult.telegramError) {
        console.warn(`⚠️ Order ${rozetkaOrder.id} automation warning: ${automationResult.telegramError}`);
      }
    } else {
      console.error(`❌ Order ${rozetkaOrder.id} automation failed: ${automationResult.error}`);
    }
  } catch (error) {
    console.error(`❌ Order ${rozetkaOrder.id} automation error:`, error);
    // Don't throw error here - we don't want automation failures to break the sync
  }
}

export async function syncOrders() {
  try {
    console.log('🔄 Starting Rozetka orders sync with pagination...');
    
    // Fetch all orders across all pages
    const allOrders: RozetkaOrderResponse[] = [];
    let page = 1;
    let totalPagesProcessed = 0;
    const maxPages = 50; // Safety limit
    
    while (page <= maxPages) {
      console.log(`📄 Fetching page ${page}...`);
      
      // Use 21-day date range for more recent orders only
      const today = new Date();
      const twentyOneDaysAgo = new Date(today.getTime() - 21 * 24 * 60 * 60 * 1000);
      const from = twentyOneDaysAgo.toISOString().split('T')[0];
      const to = today.toISOString().split('T')[0];
      
      const pageOrders = await getOrders({ 
        types: 1, 
        page,
        from: from,
        to: to
      });
      
      if (!pageOrders || !Array.isArray(pageOrders) || pageOrders.length === 0) {
        console.log(`✅ No more orders on page ${page}, stopping pagination`);
        break;
      }
      
      console.log(`✅ Page ${page}: Found ${pageOrders.length} orders`);
      allOrders.push(...pageOrders);
      totalPagesProcessed++;
      page++;
      
      // Safety check: if we already have more than 200 orders, that's probably enough
      if (allOrders.length > 200) {
        console.log(`⏹️ Reached 200+ orders, stopping to avoid processing too many old orders`);
        break;
      }
    }
    
    console.log(`📊 Total orders fetched: ${allOrders.length} across ${totalPagesProcessed} pages`);
    
    if (allOrders.length === 0) {
      throw new Error('No Rozetka orders found');
    }
    
    const rozetkaOrders = allOrders;
    
    let syncedOrders = 0;
    let failedOrders = 0;
    let automatedStatusChanges = 0;
    let telegramNotifications = 0;
    let automationErrors = 0;

    for (const order of rozetkaOrders) {
      try {
        // Store original processOrder to capture automation results
        const originalLog = console.log;
        const originalWarn = console.warn;
        const originalError = console.error;
        
        
        // Temporarily intercept logs to capture automation results
        console.log = (...args) => {
          originalLog(...args);
          if (typeof args[0] === 'string' && args[0].includes(`🤖 Order ${order.id} automated: status changed`)) {
            automatedStatusChanges++;
          }
          if (typeof args[0] === 'string' && args[0].includes(`📱 Order ${order.id} automated: Telegram notification sent`)) {
            telegramNotifications++;
          }
        };
        
        console.error = (...args) => {
          originalError(...args);
          if (typeof args[0] === 'string' && (args[0].includes(`❌ Order ${order.id} automation failed`) || args[0].includes(`❌ Order ${order.id} automation error`))) {
            automationErrors++;
          }
        };

        await processOrder(order);
        syncedOrders++;
        
        // Restore original console methods
        console.log = originalLog;
        console.warn = originalWarn;
        console.error = originalError;
        
      } catch (error) {
        console.error(`Failed to process rozetka order ${order.id}:`, error);
        failedOrders++;
      }
    }
    
    await pb.collection('sync_records').create({
      source: '4tvf116a5aitwmb',
      orders_processed: syncedOrders,
      orders_failures: failedOrders,
      automation_status_changes: automatedStatusChanges,
      automation_telegram_sent: telegramNotifications,
      automation_errors: automationErrors
    });
    
    console.log(`✅ Sync completed: ${syncedOrders} synced, ${failedOrders} failed, ${totalPagesProcessed} pages processed`);
    
    return { 
      success: true, 
      syncedOrders, 
      failedOrders,
      automatedStatusChanges,
      telegramNotifications,
      automationErrors,
      totalOrdersFetched: allOrders.length,
      pagesProcessed: totalPagesProcessed
    };
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
  types?: number;
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
 * Create receipt on Rozetka side after local fiscal receipt creation
 */
export async function createRozetkaReceipt(
  orderId: string, 
): Promise<{ error: string | null, data: boolean | null }> {
  try {
    const token = await api.ensureValidToken();
      
    const payload = {
      order_id: parseInt(orderId),
    };
    
    const response = await axios.post(
      `${ROZETKA_API_BASE}/prro/create-receipt`,
      payload,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log(`✅ Rozetka receipt created successfully for order ${orderId}:`, response.data);
    return { error: null, data: response.data.content };
    
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error(`❌ Failed to create Rozetka receipt for order ${orderId}:`, error.message);
      return { error: error.message, data: null };
    }
    console.error(`❌ Failed to create Rozetka receipt for order ${orderId}:`, error);
    return { error: 'Failed to create Rozetka receipt', data: null };
  }
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
