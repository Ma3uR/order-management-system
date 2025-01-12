'use server'

import axios from 'axios';
import { RozetkaOrderResponse } from '@/app/types/orders';
import * as dotenv from 'dotenv';
import { log } from 'console';

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
          expand: 'delivery,user,purchases,status_data'
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

  private paymentMethodsCache: { [key: string]: string } = {};
  private deliveryMethodsCache: { [key: string]: string } = {};

  async getPaymentMethodTitle(id: string | number): Promise<string> {
    try {
      // Check cache first
      if (!Object.keys(this.paymentMethodsCache).length) {
        const methods = await this.getPaymentMethods();
        console.log('Payment methods:', methods);

        methods.forEach((method: any) => {
          this.paymentMethodsCache[method.id] = method.title;
        });
      }

      return this.paymentMethodsCache[id] || 'Unknown Payment Method';
    } catch (error) {
      console.error('Failed to get payment method title:', error);
      return 'Unknown Payment Method';
    }
  }

  async getDeliveryMethodTitle(id: string): Promise<string> {
    try {
      // Check cache first
      if (!Object.keys(this.deliveryMethodsCache).length) {
        const methods = await this.getDeliveryMethodById(id);
        console.log('Delivery methods:', methods);
        methods.forEach((method: any) => {
          this.deliveryMethodsCache[method.id] = method.title;
        });
      }

      return this.deliveryMethodsCache[id] || 'Unknown Delivery Method';
    } catch (error) {
      console.error('Failed to get delivery method title:', error);
      return 'Unknown Delivery Method';
    }
  }

  // Optional: Add a method to get both titles at once
  async getOrderMethodTitles(paymentId: string, deliveryId: string) {
    const [paymentTitle, deliveryTitle] = await Promise.all([
      this.getPaymentMethodTitle(paymentId),
      this.getDeliveryMethodTitle(deliveryId)
    ]);

    return {
      paymentMethod: paymentTitle,
      deliveryMethod: deliveryTitle
    };
  } 
}

const api = RozetkaAPI.getInstance();

// Instead of exporting the instance, export async functions that use it
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

// ... export other methods as needed
