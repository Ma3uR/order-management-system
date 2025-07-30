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
    
    console.log(`🔧 Cancellation notifications service initialization:`);
    console.log(`   - ENABLE_STATUS_AUTOMATION: ${process.env.ENABLE_STATUS_AUTOMATION}`);
    console.log(`   - Service enabled: ${this.enabled}`);
    
    if (!this.enabled) {
      console.log('🚫 Cancellation notifications disabled - check ENABLE_STATUS_AUTOMATION environment variable');
    } else {
      console.log('✅ Cancellation notifications enabled');
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
    if (!status) {
      console.log('🔍 Status is null/undefined, not cancelled');
      return false;
    }
    
    const statusName = status.name.toLowerCase();
    const marketplaceCode = String(status.marketplace_code || ''); // Convert to string for comparison
    
    console.log(`🔍 Checking cancellation status:`);
    console.log(`   - Status name: "${status.name}"`);
    console.log(`   - Marketplace code (raw): ${status.marketplace_code} (type: ${typeof status.marketplace_code})`);
    console.log(`   - Marketplace code (string): "${marketplaceCode}"`);
    
    // Check for various cancellation status names and codes
    const checks = {
      // Prom.ua cancellation
      promCode: marketplaceCode === '4',
      promName: statusName.includes('отменён'),
      
      // Epicentr cancellation
      epicentrCode: marketplaceCode === 'canceled',
      epicentrName: statusName.includes('скасован'),
      
      // Rozetka cancellation
      rozetkaCode: marketplaceCode === '45',
      rozetkaName: statusName.includes('скасовано покупцем'),
      
      // Generic cancellation indicators
      genericCancelled: statusName.includes('скасовано'),
      genericCancel: statusName.includes('cancel')
    };
    
    console.log(`🔍 Cancellation checks for "${status.name}":`);
    Object.entries(checks).forEach(([key, value]) => {
      if (value) console.log(`   ✅ ${key}: ${value}`);
    });
    
    const isCancelled = Object.values(checks).some(check => check);
    
    console.log(`🔍 Final result - Status "${status.name}" is cancelled: ${isCancelled}`);
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
    console.log(`🔍 ============= CANCELLATION CHECK START =============`);
    console.log(`🔍 Processing cancellation check for order: ${orderData.orderNumber} (ID: ${orderId})`);
    console.log(`🔍 Previous status ID: ${previousStatusId}`);
    console.log(`🔍 New status ID: ${newStatusId}`);
    console.log(`🔍 Service enabled: ${this.enabled}`);
    
    if (!this.enabled) {
      console.log(`🚫 Cancellation notifications disabled for order ${orderData.orderNumber}`);
      console.log(`🔍 ============= CANCELLATION CHECK END (DISABLED) =============`);
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
        console.log(`🔍 ============= CANCELLATION CHECK END (STATUS FETCH FAILED) =============`);
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
        console.log(`🔍 ============= CANCELLATION CHECK END (NOT CANCELLED) =============`);
        return {
          success: true,
          notificationSent: false,
          reason: 'New status is not cancelled'
        };
      }

      // Check if previous status was processing and should skip notification
      // Note: Based on business requirements, we typically skip notifications when 
      // admin cancels from processing status (intentional cancellations)
      // but for customer-initiated cancellations (like marketplace code 45), we may want to notify
      if (this.isProcessingStatus(previousStatus)) {
        console.log(`🚫 Previous status was processing (${previousStatus.name}) for order ${orderData.orderNumber}`);
        console.log(`🔍 Customer cancellation from marketplace (code: ${newStatus.marketplace_code}) - proceeding with notification`);
        
        // For marketplace code 45 (customer cancellation), we want notifications even from processing
        const isCustomerCancellation = String(newStatus.marketplace_code || '') === '45' || 
                                     newStatus.name.toLowerCase().includes('скасовано покупцем');
        
        if (!isCustomerCancellation) {
          console.log(`🚫 Skipping notification - admin cancellation from processing status`);
          console.log(`🔍 ============= CANCELLATION CHECK END (PROCESSING SKIP) =============`);
          return {
            success: true,
            notificationSent: false,
            reason: 'Previous status was processing - admin cancellation skipped'
          };
        }
        
        console.log(`✅ Proceeding with notification - customer initiated cancellation`);
      }

      console.log(`🚫 Order ${orderData.orderNumber} cancelled: ${previousStatus.name} → ${newStatus.name}`);

      // Build notification data
      const cancellationData = await this.buildCancellationData(orderData, previousStatus, newStatus);

      // Send notification
      const notificationResult = await sendCancellationNotification(cancellationData);

      if (notificationResult.success) {
        console.log(`📱 Cancellation notification sent for order ${orderData.orderNumber}`);
        console.log(`🔍 ============= CANCELLATION CHECK END (SUCCESS) =============`);
        return {
          success: true,
          notificationSent: true
        };
      } else {
        console.warn(`⚠️ Failed to send cancellation notification for order ${orderData.orderNumber}:`, notificationResult.error);
        console.log(`🔍 ============= CANCELLATION CHECK END (TELEGRAM FAILED) =============`);
        return {
          success: false,
          error: notificationResult.error,
          notificationSent: false
        };
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Cancellation notification processing failed for order ${orderId}:`, errorMessage);
      console.log(`🔍 ============= CANCELLATION CHECK END (ERROR) =============`);
      
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