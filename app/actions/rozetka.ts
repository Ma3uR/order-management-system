'use server'

import axios from 'axios';
import { RozetkaOrderResponse } from '@/app/types/orders';
import * as dotenv from 'dotenv';

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
          expand: 'delivery,user,status_data,payment_method_id'
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
