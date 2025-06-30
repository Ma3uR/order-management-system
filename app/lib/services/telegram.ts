'use server'

import axios from 'axios';
import { checkBlackList } from '../../[locale]/blacklist/actions/black-list';

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
  paymentMethod?: string;
  isPayed?: boolean;
  source?: string;
}

export interface CancellationData {
  orderNumber: string;
  previousStatusName: string;
  newStatusName: string;
  fullName: string;
  phoneNumber: string;
  totalAmount: number;
  currency?: string;
  sourceName?: string;
  products: Array<{
    title: string;
    quantity: number;
    price?: number;
  }>;
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

  private async formatOrderMessage(orderData: OrderData): Promise<string> {
    const { orderNumber, address, deliveryMethod, phoneNumber, fullName, products, paymentMethod, isPayed, source } = orderData;
    
    // Get source-specific emoji
    const getSourceEmoji = (source?: string): string => {
      switch (source) {
        case 'rozetka':
          return '🟢'; // Green circle for Rozetka
        case 'prom':
          return '🟣'; // Purple circle for Prom
        case 'epicentr':
          return '🔵'; // Blue circle for Epicentr
        default:
          return '⚪'; // White circle for unknown
      }
    };
    
    // Check blacklist status
    let blacklistIndicator = '';
    if (fullName || phoneNumber) {
      try {
        const blacklistResult = await checkBlackList({
          fullName: fullName || '',
          phoneNumber: phoneNumber || ''
        });
        
        if (blacklistResult.data?.isBlacklisted) {
          blacklistIndicator = '🔴 КОРИСТУВАЧ У ЧОРНОМУ СПИСКУ';
        }
      } catch (error) {
        console.error('Error checking blacklist:', error);
        // Continue without blacklist check if there's an error
      }
    }
    
    // Format products list
    const productsList = products.map(product => {
      return `${product.title} ${product.quantity} шт`;
    }).join('\n');

    // Build message according to the specified template
    const messageParts = [
      `${getSourceEmoji(source)} №${orderNumber}`,
      blacklistIndicator || null, // Add blacklist indicator if present
      blacklistIndicator ? '' : null, // Add empty line after blacklist indicator
      address || '',
      deliveryMethod || '',
      phoneNumber ? `${phoneNumber.replace(/^380(\d{2})(\d{3})(\d{2})(\d{2})$/, '0$1 $2 $3 $4')}` : '',
      fullName || '',
      '',
      productsList,
      '',
      `${products.reduce((sum, product) => sum + product.quantity, 0)} ${products.reduce((sum, product) => sum + product.quantity, 0) === 1 ? 'позиція' : 'позиції'}`,
      `💳 ${paymentMethod || 'Не вказано'}`,
      isPayed !== undefined ? `💰 ${isPayed ? 'Оплачено' : 'Не оплачено'}` : '',
      
    ];

    return messageParts.filter(part => part !== null && part !== undefined).join('\n');
  }

  private async formatCancellationMessage(cancellationData: CancellationData): Promise<string> {
    const { orderNumber, previousStatusName, newStatusName, fullName, phoneNumber, totalAmount, currency, sourceName, products } = cancellationData;
    
    // Check blacklist status
    let blacklistIndicator = '';
    if (fullName || phoneNumber) {
      try {
        const blacklistResult = await checkBlackList({
          fullName: fullName || '',
          phoneNumber: phoneNumber || ''
        });
        
        if (blacklistResult.data?.isBlacklisted) {
          blacklistIndicator = '🔴 КОРИСТУВАЧ У ЧОРНОМУ СПИСКУ';
        }
      } catch (error) {
        console.error('Error checking blacklist:', error);
        // Continue without blacklist check if there's an error
      }
    }
    
    // Format products list if available
    const productsList = products && products.length > 0 
      ? products.map(product => `${product.title} ${product.quantity} шт`).join('\n')
      : '';

    // Calculate total items
    const totalItems = products ? products.reduce((sum, product) => sum + product.quantity, 0) : 0;
    const itemsText = totalItems === 1 ? 'позиція' : 'позиції';

    // Build cancellation message
    const messageParts = [
      '🚫 СКАСУВАННЯ ЗАМОВЛЕННЯ',
      '',
      `№${orderNumber}`,
      blacklistIndicator || null, // Add blacklist indicator if present
      blacklistIndicator ? '' : null, // Add empty line after blacklist indicator
      `Джерело: ${sourceName || 'Невідоме'}`,
      `Попередній статус: ${previousStatusName}`,
      `Клієнт: ${fullName}`,
      `Телефон: ${phoneNumber}`,
      productsList ? '' : null, // Empty line before products if they exist
      productsList || null,
      productsList ? '' : null, // Empty line after products if they exist
      totalItems > 0 ? `${totalItems} ${itemsText}` : null,
      `Сума: ${totalAmount.toLocaleString('uk-UA')} ${currency || '₴'}`,
      '',
      `⚠️ Замовлення скасовано: ${newStatusName}`
    ];

    return messageParts.filter(part => part !== null && part !== undefined && part !== '').join('\n');
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
      const message = await this.formatOrderMessage(orderData);
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

  async sendCancellationNotification(cancellationData: CancellationData): Promise<TelegramSendResult> {
    if (!this.enabled) {
      console.log('🚫 Telegram cancellation notifications disabled, skipping notification');
      return { success: false, error: 'Telegram notifications disabled' };
    }

    if (!this.botToken || !this.chatId) {
      console.error('❌ Telegram bot token or chat ID not configured');
      return { success: false, error: 'Telegram configuration missing' };
    }

    try {
      const message = await this.formatCancellationMessage(cancellationData);
      console.log('🚫 Sending Telegram cancellation notification for order:', cancellationData.orderNumber);
      
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
        console.log('✅ Telegram cancellation notification sent successfully');
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
      console.error('❌ Failed to send Telegram cancellation notification:', errorMessage);
      
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
      totalAmount: 100,
      paymentMethod: 'Test Payment',
      isPayed: true,
      source: 'rozetka'
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

export async function sendCancellationNotification(cancellationData: CancellationData): Promise<TelegramSendResult> {
  return telegramService.sendCancellationNotification(cancellationData);
}

export async function testTelegramConnection(): Promise<TelegramSendResult> {
  return telegramService.testConnection();
}

export async function isTelegramEnabled(): Promise<boolean> {
  return telegramService.isEnabled();
}