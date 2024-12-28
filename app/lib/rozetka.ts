import axios from 'axios';
import { RozetkaOrderResponse } from '@/app/types/orders';

const LOCAL_API_BASE = '/api/rozetka';

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
  
  private constructor() {}
  
  static getInstance(): RozetkaAPI {
    if (!RozetkaAPI.instance) {
      RozetkaAPI.instance = new RozetkaAPI();
    }
    return RozetkaAPI.instance;
  }

  async authenticate() {
    try {
      const response = await axios.post(`${LOCAL_API_BASE}/auth`);
      
      if (!response.data.success || !response.data.content?.access_token) {
        throw new Error(response.data.errors?.description || 'Authentication failed');
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

  private async ensureValidToken() {
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
      
      const response = await axios.get<RozetkaOrdersResponse>(`${LOCAL_API_BASE}/orders/search`, {
        headers: {
          Authorization: `Bearer ${token}`
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

      // Log the response and request parameters for debugging
      console.log('Request parameters:', {
        created_from: params?.from || defaultFrom,
        created_to: params?.to || defaultTo,
        type: params?.type || 1,
        page: params?.page || 1,
        sort: '-id',
        expand: 'delivery,user,purchases,status_data'
      });
      console.log('Rozetka orders response:', JSON.stringify(response.data, null, 2));

      if (!response.data.success) {
        throw new Error(response.data.errors?.description || 'Failed to fetch orders');
      }

      if (!response.data.content?.orders) {
        console.warn('No orders found in response');
        return [];
      }

      // Return raw Rozetka orders without mapping
      return response.data.content.orders;
    } catch (error) {
      console.error('Failed to fetch Rozetka orders:', error);
      throw error;
    }
  }
}

export default RozetkaAPI;