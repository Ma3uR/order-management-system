'use server'

import axios from 'axios';

export interface OrderData {
  orderNumber: string;
  address?: string;
  deliveryMethod?: string;
  phoneNumber?: string;
  fullName?: string;
  products: Array<{
    title: string;
    quantity: number;
    price?: number;
  }>;
  totalAmount: number;
  currency?: string;
}

export interface TelegramSendResult {
  success: boolean;
  error?: string;
  messageId?: number;
}

class TelegramService {
  private static instance: TelegramService;
  private botToken: string | null = null;
  private chatId: string | null = null;
  private enabled: boolean = false;

  private constructor() {
    this.botToken = process.env.TELEGRAM_BOT_TOKEN || null;
    this.chatId = process.env.TELEGRAM_CHAT_ID || null;
    this.enabled = process.env.ENABLE_STATUS_AUTOMATION === 'true' && !!this.botToken && !!this.chatId;
    
    if (!this.enabled) {
      console.log('🤖 Telegram notifications disabled - missing environment variables or automation disabled');
    }
  }

  static getInstance(): TelegramService {
    if (!TelegramService.instance) {
      TelegramService.instance = new TelegramService();
    }
    return TelegramService.instance;
  }

  private formatOrderMessage(orderData: OrderData): string {
    const { orderNumber, address, deliveryMethod, phoneNumber, fullName, products, totalAmount, currency = '₴' } = orderData;
    
    // Format products list
    const productsList = products.map(product => {
      return `${product.title} ${product.quantity} шт`;
    }).join('\n');

    // Build message according to the specified template
    const messageParts = [
      `№${orderNumber}`,
      '',
      address || '',
      '',
      deliveryMethod || '',
      '',
      phoneNumber || '',
      '',
      fullName || '',
      '',
      productsList,
      '',
      `Разом: ${totalAmount} ${currency}`
    ];

    return messageParts.filter(part => part !== '').join('\n');
  }

  async sendOrderNotification(orderData: OrderData): Promise<TelegramSendResult> {
    if (!this.enabled) {
      console.log('🤖 Telegram notifications disabled, skipping notification');
      return { success: false, error: 'Telegram notifications disabled' };
    }

    if (!this.botToken || !this.chatId) {
      console.error('❌ Telegram bot token or chat ID not configured');
      return { success: false, error: 'Telegram configuration missing' };
    }

    try {
      const message = this.formatOrderMessage(orderData);
      console.log('📱 Sending Telegram notification for order:', orderData.orderNumber);
      
      const response = await axios.post(
        `https://api.telegram.org/bot${this.botToken}/sendMessage`,
        {
          chat_id: this.chatId,
          text: message,
          parse_mode: 'HTML'
        },
        {
          timeout: 10000, // 10 second timeout
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.ok) {
        console.log('✅ Telegram notification sent successfully');
        return { 
          success: true, 
          messageId: response.data.result.message_id 
        };
      } else {
        console.error('❌ Telegram API error:', response.data);
        return { 
          success: false, 
          error: response.data.description || 'Unknown Telegram API error' 
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Failed to send Telegram notification:', errorMessage);
      
      // Check for specific error types
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          return { success: false, error: 'Telegram request timeout' };
        }
        if (error.response?.status === 401) {
          return { success: false, error: 'Invalid Telegram bot token' };
        }
        if (error.response?.status === 400) {
          return { success: false, error: 'Invalid chat ID or message format' };
        }
      }
      
      return { success: false, error: errorMessage };
    }
  }

  // Test method to verify configuration
  async testConnection(): Promise<TelegramSendResult> {
    if (!this.enabled) {
      return { success: false, error: 'Telegram notifications disabled' };
    }

    return this.sendOrderNotification({
      orderNumber: 'TEST-001',
      address: 'Test Address',
      deliveryMethod: 'Test Delivery',
      phoneNumber: '+380000000000',
      fullName: 'Test User',
      products: [{ title: 'Test Product', quantity: 1 }],
      totalAmount: 100
    });
  }

  async isEnabled(): Promise<boolean> {
    return this.enabled;
  }
}

// Export singleton instance functions
const telegramService = TelegramService.getInstance();

export async function sendOrderNotification(orderData: OrderData): Promise<TelegramSendResult> {
  return telegramService.sendOrderNotification(orderData);
}

export async function testTelegramConnection(): Promise<TelegramSendResult> {
  return telegramService.testConnection();
}

export async function isTelegramEnabled(): Promise<boolean> {
  return telegramService.isEnabled();
}