import axios, { AxiosError } from 'axios';
import { RozetkaOrderResponse } from '../types/orders';

const LOCAL_API_BASE = '/api/rozetka';
const ROZETKA_API_BASE = 'https://api-seller.rozetka.com.ua';

interface RozetkaError {
  code: number;
  message?: string;
  description?: string;
  details?: any;
}

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
  errors?: RozetkaError;
}

class RozetkaAPI {
  private static instance: RozetkaAPI;
  private token: string | null = null;
  private tokenExpiry: Date | null = null;
  private retryCount = 0;
  private maxRetries = 3;
  
  private constructor() {}
  
  static getInstance(): RozetkaAPI {
    if (!RozetkaAPI.instance) {
      RozetkaAPI.instance = new RozetkaAPI();
    }
    return RozetkaAPI.instance;
  }

  async authenticate() {
    try {
      console.log('Authenticating with Rozetka API...');
      
      // Encode password to base64
      const base64Password = Buffer.from(process.env.ROZETKA_PASSWORD || '').toString('base64');
      
      console.log('Auth request details:', {
        url: `${ROZETKA_API_BASE}/sites`,
        username: process.env.ROZETKA_USERNAME,
        passwordLength: process.env.ROZETKA_PASSWORD?.length || 0,
        base64PasswordLength: base64Password.length
      });

      const response = await axios.post(`${ROZETKA_API_BASE}/sites`, {
        username: process.env.ROZETKA_USERNAME,
        password: base64Password
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Accept-Validate-Exception': '1',
          'Content-Language': 'uk',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko)'
        }
      });
      
      console.log('Auth response:', {
        status: response.status,
        data: response.data
      });

      if (!response.data.success || !response.data.content?.access_token) {
        console.error('Full auth response:', response.data);
        throw new Error(response.data.errors?.description || response.data.errors?.message || 'Authentication failed');
      }
      
      this.token = response.data.content.access_token;
      // Set token expiry to slightly less than the actual expiry time
      this.tokenExpiry = new Date(Date.now() + (3600 * 1000 - 60000)); // 59 minutes
      console.log('Successfully authenticated with Rozetka API');
      return this.token;
    } catch (error: any) {
      console.error('Rozetka authentication failed:', {
        error: error.message,
        response: error.response?.data,
        status: error.response?.status,
        headers: error.response?.headers
      });
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
  }): Promise<RozetkaOrderResponse[]> {
    try {
      const token = await this.ensureValidToken();
      
      // Calculate dates for the last 30 days
      const today = new Date();
      const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      const defaultFrom = thirtyDaysAgo.toISOString().split('T')[0];
      const defaultTo = today.toISOString().split('T')[0];

      const requestParams = {
        page: params?.page || 1,
        sort: '-id',
        type: params?.type || 1,
        created_from: params?.from || defaultFrom,
        created_to: params?.to || defaultTo,
        expand: 'delivery,user,purchases,status_data'
      };
      
      console.log('Fetching Rozetka orders with params:', requestParams);
      
      const response = await axios.get<RozetkaOrdersResponse>(`${ROZETKA_API_BASE}/orders/search`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Accept-Validate-Exception': '1',
          'Content-Language': 'uk',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko)'
        },
        params: {
          ...requestParams,
          limit: 50, // Number of orders per page
          offset: ((params?.page || 1) - 1) * 50, // Calculate offset based on page
        }
      });

      console.log('Orders response headers:', response.headers);
      console.log('Orders response status:', response.status);

      if (!response.data.success) {
        console.error('Full orders response:', response.data);
        if (response.data.errors?.code === 1010) {
          // If access denied, try to refresh token
          console.log('Access denied, refreshing token...');
          this.token = null;
          this.tokenExpiry = null;
          return this.getOrders(params);
        }
        throw new Error(response.data.errors?.message || response.data.errors?.description || 'Failed to fetch orders');
      }

      if (!response.data.content?.orders) {
        console.warn('No orders found in response');
        return [];
      }

      console.log(`Successfully fetched ${response.data.content.orders.length} orders from Rozetka`);
      return response.data.content.orders;
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 401 && this.retryCount < this.maxRetries) {
        console.log('Token expired, retrying with new token...');
        this.token = null;
        this.tokenExpiry = null;
        this.retryCount++;
        return this.getOrders(params);
      }
      
      this.retryCount = 0;
      console.error('Failed to fetch Rozetka orders:', error);
      throw error;
    }
  }
}

export default RozetkaAPI;