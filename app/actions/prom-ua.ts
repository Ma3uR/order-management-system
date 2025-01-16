'use server'

import axios from 'axios';
import * as dotenv from 'dotenv';

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

  async getOrders() {
    try {
      const response = await axios.get<PromOrdersResponse>(`${process.env.PROM_UA_URL}/orders/list`, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.data || response.data.status !== 'success') {
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
}

const api = PromUaAPI.getInstance();

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