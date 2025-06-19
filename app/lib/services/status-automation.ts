'use server'

import { setOrderStatus as setRozetkaStatus } from '@/app/actions/rozetka';
import { setOrderStatus as setPromStatus } from '@/app/actions/prom-ua';
import { setOrderStatus as setEpicentrStatus } from '@/app/actions/epicentr';
import { sendOrderNotification, type OrderData } from './telegram';
import pb, { authenticatedCall } from '@/app/lib/pocketbase';
import { RozetkaOrderResponse } from '@/app/types/orders';

// Generic order interface for automation
interface AutomationOrder {
  id: string | number;
  number?: string;
  status?: string | number;
  statusCode?: string;
  // Rozetka specific
  delivery?: {
    delivery_service_name?: string;
    city?: {
      city_name?: string;
      name?: string;
    };
    place_street?: string;
    place_number?: string;
    place_house?: string;
  };
  items_photos?: Array<{
    item_name: string;
    item_price: string;
  }>;
  user_phone?: string;
  user_title?: {
    full_name?: string;
  };
  user?: {
    contact_fio?: string;
  };
  amount?: string;
  // Prom specific
  client_first_name?: string;
  client_second_name?: string;
  client_last_name?: string;
  delivery_address?: string;
  delivery_option?: {
    name?: string;
  };
  phone?: string;
  products?: Array<{
    name: string;
    quantity: number;
    price: string;
  }>;
  price?: string;
  // Epicentr specific
  address?: {
    firstName?: string;
    lastName?: string;
    patronymic?: string;
    phone?: string;
    shipment?: {
      provider?: string;
    };
  };
  items?: Array<{
    title: string;
    quantity: number;
    price: number;
  }>;
  subtotal?: number;
}

export interface AutomationResult {
  success: boolean;
  error?: string;
  statusChanged?: boolean;
  telegramSent?: boolean;
  telegramError?: string;
}

export interface AutomationStats {
  ordersProcessed: number;
  statusChanges: number;
  telegramNotifications: number;
  errors: number;
}

// Marketplace configuration
interface MarketplaceConfig {
  source: string;
  newStatusCodes: (string | number)[];
  processingStatusCode: string | number;
  processingStatusId: string;
  setStatusFunction: (orderId: string, statusCode: string) => Promise<{ error: string | null, data: boolean | null }>;
}

const MARKETPLACE_CONFIGS: Record<string, MarketplaceConfig> = {
  'rozetka': {
    source: '4tvf116a5aitwmb',
    newStatusCodes: [1],
    processingStatusCode: 26,
    processingStatusId: '4rko34nann7jvgl',
    setStatusFunction: setRozetkaStatus
  },
  'prom': {
    source: 'gfzk8nxfokgu9ku',
    newStatusCodes: [0],
    processingStatusCode: 145001,
    processingStatusId: 'vrhstdzvkotuvin',
    setStatusFunction: setPromStatus
  },
  'epicentr': {
    source: 'pj9sejm9vqtu8xq',
    newStatusCodes: ['new'],
    processingStatusCode: 'confirmed',
    processingStatusId: '0a3jmekr5xi0xqt',
    setStatusFunction: setEpicentrStatus
  }
};

class StatusAutomationService {
  private static instance: StatusAutomationService;
  private enabled: boolean = false;

  private constructor() {
    this.enabled = process.env.ENABLE_STATUS_AUTOMATION === 'true';
    
    if (!this.enabled) {
      console.log('🤖 Status automation disabled');
    }
  }

  static getInstance(): StatusAutomationService {
    if (!StatusAutomationService.instance) {
      StatusAutomationService.instance = new StatusAutomationService();
    }
    return StatusAutomationService.instance;
  }

  private getMarketplaceConfig(sourceId: string): MarketplaceConfig | null {
    for (const config of Object.values(MARKETPLACE_CONFIGS)) {
      if (config.source === sourceId) {
        return config;
      }
    }
    return null;
  }

  private isNewStatus(status: number | string, config: MarketplaceConfig): boolean {
    return config.newStatusCodes.includes(status as string | number);
  }

  private async getPaymentMethodName(orderDbId: string): Promise<string | undefined> {
    try {
      const order = await authenticatedCall(async () => {
        return await pb.collection('orders').getOne(orderDbId, {
          expand: 'paymentMethod'
        });
      });
      
      return order.expand?.paymentMethod?.name;
    } catch (error) {
      console.warn(`⚠️ Failed to fetch payment method for order ${orderDbId}:`, error);
      return undefined;
    }
  }

  private async mapOrderToTelegramData(order: AutomationOrder, sourceId: string, orderDbId: string): Promise<OrderData> {
    switch (sourceId) {
      case '4tvf116a5aitwmb': // Rozetka
        return this.mapRozetkaOrderToTelegramData(order as RozetkaOrderResponse, orderDbId);
      case 'gfzk8nxfokgu9ku': // Prom
        return this.mapPromOrderToTelegramData(order, orderDbId);
      case 'pj9sejm9vqtu8xq': // Epicentr
        return this.mapEpicentrOrderToTelegramData(order, orderDbId);
      default:
        throw new Error(`Unknown source ID: ${sourceId}`);
    }
  }

  private async mapRozetkaOrderToTelegramData(rozetkaOrder: RozetkaOrderResponse, orderDbId: string): Promise<OrderData> {
    // Get payment method from database
    const paymentMethod = await this.getPaymentMethodName(orderDbId);

    // Get delivery method name
    let deliveryMethod = 'ROZETKA Delivery';
    if (rozetkaOrder.delivery?.delivery_service_name) {
      deliveryMethod = rozetkaOrder.delivery.delivery_service_name;
    }

    // Format address
    let address = '';
    if (rozetkaOrder.delivery?.city) {
      address = rozetkaOrder.delivery.city.city_name || rozetkaOrder.delivery.city.name;
      if (rozetkaOrder.delivery.place_street) {
        address += `, ${rozetkaOrder.delivery.place_street}`;
        if (rozetkaOrder.delivery.place_number) {
          address += `, ${rozetkaOrder.delivery.place_number}`;
        }
        if (rozetkaOrder.delivery.place_house) {
          address += rozetkaOrder.delivery.place_house;
        }
      }
    }

    // Format products
    const products = rozetkaOrder.items_photos?.map(item => ({
      title: item.item_name,
      quantity: 1, // Rozetka items_photos doesn't have quantity, using default 1
      price: parseFloat(item.item_price)
    })) || [];

    return {
      orderNumber: rozetkaOrder.id.toString(),
      address,
      deliveryMethod,
      phoneNumber: rozetkaOrder.user_phone || '',
      fullName: rozetkaOrder.user_title?.full_name || rozetkaOrder.user?.contact_fio || 'Unknown',
      products,
      totalAmount: parseFloat(rozetkaOrder.amount),
      currency: '₴',
      paymentMethod
    };
  }

  private async mapPromOrderToTelegramData(promOrder: AutomationOrder, orderDbId: string): Promise<OrderData> {
    // Get payment method from database
    const paymentMethod = await this.getPaymentMethodName(orderDbId);

    const fullName = [promOrder.client_first_name, promOrder.client_second_name, promOrder.client_last_name]
      .filter(Boolean)
      .join(' ') || 'Unknown';

    return {
      orderNumber: promOrder.id.toString(),
      address: promOrder.delivery_address || '',
      deliveryMethod: promOrder.delivery_option?.name || 'Unknown',
      phoneNumber: promOrder.phone || '',
      fullName,
      products: promOrder.products?.map((item) => ({
        title: item.name,
        quantity: item.quantity,
        price: parseFloat(item.price || '0')
      })) || [],
      totalAmount: parseFloat(promOrder.price || '0'),
      currency: '₴',
      paymentMethod
    };
  }

  private async mapEpicentrOrderToTelegramData(epicentrOrder: AutomationOrder, orderDbId: string): Promise<OrderData> {
    // Get payment method from database
    const paymentMethod = await this.getPaymentMethodName(orderDbId);

    const fullName = [epicentrOrder.address?.firstName, epicentrOrder.address?.lastName, epicentrOrder.address?.patronymic]
      .filter(Boolean)
      .join(' ') || 'Unknown';

    return {
      orderNumber: epicentrOrder.number || epicentrOrder.id.toString(),
      address: epicentrOrder.address?.shipment?.provider || '',
      deliveryMethod: epicentrOrder.address?.shipment?.provider || 'Unknown',
      phoneNumber: epicentrOrder.address?.phone || '',
      fullName,
      products: epicentrOrder.items?.map((item) => ({
        title: item.title,
        quantity: item.quantity,
        price: item.price
      })) || [],
      totalAmount: epicentrOrder.subtotal || 0,
      currency: '₴',
      paymentMethod
    };
  }

  async processOrderAutomation(order: AutomationOrder, orderDbId: string, sourceId: string): Promise<AutomationResult> {
    if (!this.enabled) {
      return { success: true, statusChanged: false, telegramSent: false };
    }

    const config = this.getMarketplaceConfig(sourceId);
    if (!config) {
      console.error(`❌ No marketplace configuration found for source: ${sourceId}`);
      return { success: false, error: `Unknown marketplace source: ${sourceId}`, statusChanged: false, telegramSent: false };
    }

    const orderId = order.id || order.number || '';
    const orderStatus = order.status || order.statusCode;
    
    console.log(`🤖 Processing automation for order ${orderId}, status: ${orderStatus}`);

    // Check if order has "New" status
    if (!this.isNewStatus(orderStatus as string | number, config)) {
      console.log(`📝 Order ${orderId} status "${orderStatus}" is not a "New" variant for this marketplace, skipping automation`);
      return { success: true, statusChanged: false, telegramSent: false };
    }

    console.log(`✅ Order ${orderId} has "New" status, starting automation...`);

    let statusChanged = false;
    let telegramSent = false;
    let telegramError: string | undefined;

    try {
      // Step 1: Change status in marketplace API
      console.log(`🔄 Updating marketplace order ${orderId} status to processing...`);
      
      const statusResult = await config.setStatusFunction(orderId.toString(), config.processingStatusCode.toString());
      
      if (statusResult.error) {
        console.error(`❌ Failed to update marketplace status for order ${orderId}:`, statusResult.error);
        return { 
          success: false, 
          error: `Marketplace status update failed: ${statusResult.error}`,
          statusChanged: false,
          telegramSent: false
        };
      }

      console.log(`✅ Marketplace order ${orderId} status updated successfully`);

      // Step 2: Update local database status
      try {
        await authenticatedCall(async () => {
          return await pb.collection('orders').update(orderDbId, {
            status: config.processingStatusId,
            updated: new Date().toISOString()
          });
        });

        statusChanged = true;
        console.log(`✅ Local database order ${orderId} status updated to processing`);
      } catch (error) {
        console.error(`❌ Failed to update local database status for order ${orderId}:`, error);
        return { 
          success: false, 
          error: `Local database update failed: ${error}`,
          statusChanged: false,
          telegramSent: false
        };
      }

      // Step 3: Send Telegram notification
      try {
        const telegramData = await this.mapOrderToTelegramData(order, config.source, orderDbId);
        const telegramResult = await sendOrderNotification(telegramData);
        
        if (telegramResult.success) {
          telegramSent = true;
          console.log(`📱 Telegram notification sent for order ${orderId}`);
        } else {
          telegramError = telegramResult.error;
          console.warn(`⚠️ Telegram notification failed for order ${orderId}:`, telegramResult.error);
        }
      } catch (error) {
        telegramError = error instanceof Error ? error.message : 'Unknown error';
        console.warn(`⚠️ Telegram notification error for order ${orderId}:`, telegramError);
      }

      return {
        success: true,
        statusChanged,
        telegramSent,
        telegramError
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Automation failed for order ${orderId}:`, errorMessage);
      
      return {
        success: false,
        error: errorMessage,
        statusChanged,
        telegramSent,
        telegramError
      };
    }
  }

  async isEnabled(): Promise<boolean> {
    return this.enabled;
  }

  async getConfiguration(): Promise<{ enabled: boolean; marketplaces: typeof MARKETPLACE_CONFIGS }> {
    return {
      enabled: this.enabled,
      marketplaces: MARKETPLACE_CONFIGS
    };
  }
}

// Export singleton instance functions
const automationService = StatusAutomationService.getInstance();

export async function processOrderAutomation(order: AutomationOrder, orderDbId: string, sourceId: string): Promise<AutomationResult> {
  return automationService.processOrderAutomation(order, orderDbId, sourceId);
}

export async function isAutomationEnabled(): Promise<boolean> {
  return automationService.isEnabled();
}

export async function getAutomationConfiguration(): Promise<{ enabled: boolean; marketplaces: typeof MARKETPLACE_CONFIGS }> {
  return automationService.getConfiguration();
}