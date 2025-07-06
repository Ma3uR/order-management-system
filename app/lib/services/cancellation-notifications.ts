'use server'

import { sendCancellationNotification, type CancellationData } from './telegram';
import pb, { authenticatedCall } from '@/app/lib/pocketbase';
import type { StatusResponse, OrdersResponse } from '@/app/types/pocketbase-types';

export interface CancellationNotificationResult {
  success: boolean;
  error?: string;
  notificationSent?: boolean;
  reason?: string;
}

class CancellationNotificationService {
  private static instance: CancellationNotificationService;
  private enabled: boolean = false;

  private constructor() {
    this.enabled = process.env.ENABLE_STATUS_AUTOMATION === 'true';
    
    if (!this.enabled) {
      console.log('🚫 Cancellation notifications disabled');
    }
  }

  static getInstance(): CancellationNotificationService {
    if (!CancellationNotificationService.instance) {
      CancellationNotificationService.instance = new CancellationNotificationService();
    }
    return CancellationNotificationService.instance;
  }

  private async getStatusById(statusId: string): Promise<StatusResponse | null> {
    try {
      return await authenticatedCall(async () => {
        return await pb.collection('status_options').getOne<StatusResponse>(statusId);
      });
    } catch (error) {
      console.warn(`⚠️ Failed to fetch status ${statusId}:`, error);
      return null;
    }
  }

  private isCancelledStatus(status: StatusResponse): boolean {
    if (!status) return false;
    
    const statusName = status.name.toLowerCase();
    
    console.log(`🔍 Checking cancellation status: "${status.name}" (marketplace_code: ${status.marketplace_code})`);
    
    // Check for various cancellation status names
    const isCancelled = (
      //prom
      status.marketplace_code === '4' || statusName.includes('отменён') ||
      //epicentr
      status.marketplace_code === 'canceled' || statusName.includes('скасован') ||
      //rozetka
      status.marketplace_code === '45' || statusName.includes('скасовано покупцем') ||
      statusName.includes('скасовано') ||
      statusName.includes('cancel')
    );
    
    console.log(`🔍 Status "${status.name}" is cancelled: ${isCancelled}`);
    return isCancelled;
  }

  private isProcessingStatus(status: StatusResponse): boolean {
    if (!status) return false;
    
    const statusName = status.name.toLowerCase();
    
    console.log(`🔍 Checking processing status: "${status.name}"`);
    
    // Check for processing status names
    const isProcessing = (
      statusName.includes('обробляється') ||
      statusName.includes('обробка') ||
      statusName.includes('processing') ||
      statusName.includes('в роботі') ||
      statusName === 'обробляється'
    );
    
    console.log(`🔍 Status "${status.name}" is processing: ${isProcessing}`);
    return isProcessing;
  }

  private async buildCancellationData(
    order: OrdersResponse, 
    previousStatus: StatusResponse, 
    newStatus: StatusResponse
  ): Promise<CancellationData> {
    // Format phone number for display
    const formatPhoneNumber = (phone: string): string => {
      if (phone.startsWith('380')) {
        return phone.replace(/^380(\d{2})(\d{3})(\d{2})(\d{2})$/, '0$1 $2 $3 $4');
      }
      return phone;
    };

    // Get source name for display
    let sourceName = 'Невідоме джерело';
    try {
      if (order.source) {
        const source = await authenticatedCall(async () => {
          return await pb.collection('sources').getOne(order.source as string);
        });
        sourceName = source.name || sourceName;
      }
    } catch (error) {
      console.warn('⚠️ Failed to fetch source name:', error);
    }

    return {
      orderNumber: order.orderNumber,
      previousStatusName: previousStatus.name,
      newStatusName: newStatus.name,
      fullName: order.fullName,
      phoneNumber: formatPhoneNumber(order.phoneNumber),
      totalAmount: order.amount,
      currency: '₴', // Default to UAH
      sourceName,
      products: Array.isArray(order.products) ? 
        (order.products as Array<{ title?: string; name?: string; quantity: number; price: number }>).map(p => ({
          title: p.title || p.name || 'Невідомий товар',
          quantity: p.quantity || 0,
          price: p.price || 0
        })) : []
    };
  }

  async processCancellationCheck(
    orderId: string,
    previousStatusId: string,
    newStatusId: string,
    orderData: OrdersResponse
  ): Promise<CancellationNotificationResult> {
    console.log(`🔍 Processing cancellation check for order ${orderData.orderNumber}`);
    console.log(`🔍 Previous status ID: ${previousStatusId}, New status ID: ${newStatusId}`);
    
    if (!this.enabled) {
      console.log(`🚫 Cancellation notifications disabled for order ${orderData.orderNumber}`);
      return { 
        success: true, 
        notificationSent: false, 
        reason: 'Cancellation notifications disabled' 
      };
    }

    try {
      // Fetch status information
      console.log(`🔍 Fetching status information for order ${orderData.orderNumber}`);
      const [previousStatus, newStatus] = await Promise.all([
        this.getStatusById(previousStatusId),
        this.getStatusById(newStatusId)
      ]);

      if (!previousStatus || !newStatus) {
        console.error(`❌ Failed to fetch status information for order ${orderData.orderNumber}`);
        return {
          success: false,
          error: 'Failed to fetch status information',
          notificationSent: false
        };
      }

      console.log(`🔍 Previous status: "${previousStatus.name}" (${previousStatusId})`);
      console.log(`🔍 New status: "${newStatus.name}" (${newStatusId})`);

      // Check if new status is cancelled
      if (!this.isCancelledStatus(newStatus)) {
        console.log(`🔍 New status "${newStatus.name}" is not cancelled, skipping notification`);
        return {
          success: true,
          notificationSent: false,
          reason: 'New status is not cancelled'
        };
      }

      // Check if previous status was processing (skip notification only for specific cases)
      // This logic may be too restrictive for "Скасовано покупцем" - consider if this should apply to all cancellations
      if (this.isProcessingStatus(previousStatus)) {
        console.log(`🚫 Previous status was processing (${previousStatus.name}), but proceeding with cancellation notification for order ${orderData.orderNumber}`);
        console.log(`🔍 Consider if processing status skip should apply to "${newStatus.name}" cancellation type`);
        // For now, we'll proceed with the notification instead of skipping
        // return {
        //   success: true,
        //   notificationSent: false,
        //   reason: 'Previous status was processing - notification skipped as requested'
        // };
      }

      console.log(`🚫 Order ${orderData.orderNumber} cancelled: ${previousStatus.name} → ${newStatus.name}`);

      // Build notification data
      const cancellationData = await this.buildCancellationData(orderData, previousStatus, newStatus);

      // Send notification
      const notificationResult = await sendCancellationNotification(cancellationData);

      if (notificationResult.success) {
        console.log(`📱 Cancellation notification sent for order ${orderData.orderNumber}`);
        return {
          success: true,
          notificationSent: true
        };
      } else {
        console.warn(`⚠️ Failed to send cancellation notification for order ${orderData.orderNumber}:`, notificationResult.error);
        return {
          success: false,
          error: notificationResult.error,
          notificationSent: false
        };
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Cancellation notification processing failed for order ${orderId}:`, errorMessage);
      
      return {
        success: false,
        error: errorMessage,
        notificationSent: false
      };
    }
  }

  async isEnabled(): Promise<boolean> {
    return this.enabled;
  }
}

// Export singleton instance functions
const cancellationService = CancellationNotificationService.getInstance();

export async function processCancellationNotification(
  orderId: string,
  previousStatusId: string,
  newStatusId: string,
  orderData: OrdersResponse
): Promise<CancellationNotificationResult> {
  return cancellationService.processCancellationCheck(orderId, previousStatusId, newStatusId, orderData);
}

export async function isCancellationNotificationEnabled(): Promise<boolean> {
  return cancellationService.isEnabled();
}