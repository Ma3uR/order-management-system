import { casaVchasnoService } from './casa-vchasno';
import { sendFiscalNotification } from './telegram';
import pb, { authenticatedCall } from '@/app/lib/pocketbase';
import { 
  OrdersResponse, 
  StatusResponse,
  FiscalReceiptsStatusOptions,
  FiscalReceiptsReceiptTypeOptions
} from '@/app/types/pocketbase-types';
import { CasaVchasnoResponse } from '@/app/types/casa-vchasno';
import { isCompletedMarketplaceCode } from '@/app/lib/utils/order-status';

// Interface for the status record
interface StatusRecord {
  marketplace_code?: string;
  name: string;
}

export class FiscalAutomationService {
  private static instance: FiscalAutomationService;
  private readonly ENABLE_AUTO_FISCAL: boolean;
  private readonly AUTO_CASHIER_NAME: string;

  private constructor() {
    this.ENABLE_AUTO_FISCAL = process.env.ENABLE_AUTO_FISCAL === 'true';
    this.AUTO_CASHIER_NAME = process.env.AUTO_CASHIER_NAME || 'AUTO';
    
    // Log configuration state
    console.log('[AutoFiscal] Configuration:');
    console.log(`  ENABLE_AUTO_FISCAL: ${this.ENABLE_AUTO_FISCAL}`);
    console.log(`  AUTO_CASHIER_NAME: ${this.AUTO_CASHIER_NAME}`);
  }

  static getInstance(): FiscalAutomationService {
    if (!FiscalAutomationService.instance) {
      FiscalAutomationService.instance = new FiscalAutomationService();
    }
    return FiscalAutomationService.instance;
  }

  /**
   * Check if receipt should be created for order
   * Returns true when the status represents a completed/delivered order
   * Uses the centralized order-status utility to check marketplace codes: '6', 'completed', 'delivered'
   */
  shouldCreateReceipt(order: OrdersResponse, statusRecord: StatusRecord): boolean {
    // Use the centralized utility function to check for completed status
    return isCompletedMarketplaceCode(statusRecord.marketplace_code);
  }

  /**
   * Check if order already has a successful sale receipt
   */
  async hasSaleReceipt(orderId: string): Promise<boolean> {
    try {
      const receipts = await authenticatedCall(() =>
        pb.collection('fiscal_receipts').getList(1, 1, {
          filter: `order_id = "${orderId}" && receipt_type = "${FiscalReceiptsReceiptTypeOptions.sale}" && status = "${FiscalReceiptsStatusOptions.success}"`,
        })
      );

      return receipts.items.length > 0;
    } catch (error) {
      console.error('[AutoFiscal] Error checking sale receipt:', error);
      return false;
    }
  }

  /**
   * Create receipt using CasaVchasnoService
   */
  async createReceipt(order: OrdersResponse): Promise<CasaVchasnoResponse | null> {
    try {
      console.log(`[AutoFiscal] Creating receipt for order ${order.orderNumber}`);
      return await casaVchasnoService.createSaleReceipt(order, this.AUTO_CASHIER_NAME);
    } catch (error) {
      console.error(`[AutoFiscal] Failed to create receipt for order ${order.orderNumber}:`, error);
      // The CasaVchasnoService already handles saving failed receipts for API errors
      // We only need to log and return null to indicate failure
      return null;
    }
  }



  /**
   * Send telegram notification about fiscal receipt creation
   */
  async notifyTelegram(order: OrdersResponse, casaResp: CasaVchasnoResponse): Promise<void> {
    try {
      console.log(`[AutoFiscal] Sending telegram notification for order ${order.orderNumber}`);
      
      // Use the new fiscal-specific notification method
      const result = await sendFiscalNotification(order, casaResp);
      
      if (result.success) {
        console.log(`[AutoFiscal] Telegram fiscal notification sent successfully for order ${order.orderNumber}`);
      } else {
        console.warn(`[AutoFiscal] Telegram fiscal notification failed for order ${order.orderNumber}:`, result.error);
      }
    } catch (error) {
      console.error(`[AutoFiscal] Error sending telegram fiscal notification for order ${order.orderNumber}:`, error);
      // Don't throw - this is not critical
    }
  }

  /**
   * Main processing method - orchestrates the fiscal automation workflow
   * Never throws exceptions - all errors are logged and handled gracefully
   */
  async process(orderId: string, newStatusId: string): Promise<void> {
    try {
      console.log(`[AutoFiscal] Processing order ${orderId} with new status ${newStatusId}`);

      // Check if fiscal automation is enabled
      if (!this.ENABLE_AUTO_FISCAL) {
        console.log(`[AutoFiscal] Fiscal automation is disabled (ENABLE_AUTO_FISCAL=false), skipping order ${orderId}`);
        return;
      }

      // Get order details
      let order: OrdersResponse;
      try {
        order = await authenticatedCall(() =>
          pb.collection('orders').getOne(orderId, {
            expand: 'status,source,currency,paymentMethod,deliveryMethod'
          })
        );
      } catch (error) {
        console.error(`[AutoFiscal] Failed to fetch order ${orderId}:`, error);
        return;
      }

      // Get status record
      let statusRecord: StatusResponse;
      try {
        statusRecord = await authenticatedCall(() =>
          pb.collection('status_options').getOne(newStatusId)
        );
      } catch (error) {
        console.error(`[AutoFiscal] Failed to fetch status ${newStatusId}:`, error);
        return;
      }

      console.log(`[AutoFiscal] Order ${order.orderNumber} status: ${statusRecord.name} (marketplace_code: ${statusRecord.marketplace_code})`);

      // Check if receipt should be created
      let shouldCreate: boolean;
      try {
        shouldCreate = this.shouldCreateReceipt(order, statusRecord);
      } catch (error) {
        console.error(`[AutoFiscal] Error checking if receipt should be created for order ${orderId}:`, error);
        // Default to not creating receipt on error
        shouldCreate = false;
      }
      
      if (!shouldCreate) {
        console.log(`[AutoFiscal] No receipt needed for order ${order.orderNumber} with status ${statusRecord.name}`);
        return;
      }

      console.log(`[AutoFiscal] Receipt should be created for order ${order.orderNumber}`);

      // Check if receipt already exists
      let hasExistingReceipt: boolean;
      try {
        hasExistingReceipt = await this.hasSaleReceipt(orderId);
      } catch (error) {
        console.error(`[AutoFiscal] Error checking existing receipts for order ${orderId}:`, error);
        // Assume no existing receipt to continue processing
        hasExistingReceipt = false;
      }
      
      if (hasExistingReceipt) {
        console.log(`[AutoFiscal] Order ${order.orderNumber} already has a successful sale receipt, skipping`);
        return;
      }

      // Create receipt - this method now handles errors gracefully
      const casaResponse = await this.createReceipt(order);
      
      // Check if receipt creation was successful
      if (!casaResponse || casaResponse.res !== 0) {
        console.log(`[AutoFiscal] Receipt creation failed for order ${order.orderNumber}, skipping telegram notification`);
        return;
      }

      console.log(`[AutoFiscal] Receipt created successfully for order ${order.orderNumber}`);

      // Send telegram notification
      try {
        await this.notifyTelegram(order, casaResponse);
      } catch (error) {
        console.error(`[AutoFiscal] Failed to send telegram notification for order ${order.orderNumber}:`, error);
        // Continue - this is not critical
      }

      console.log(`[AutoFiscal] Successfully processed order ${order.orderNumber}`);

    } catch (error) {
      console.error(`[AutoFiscal] Unexpected error processing order ${orderId}:`, error);
      // Never throw - this method should always complete gracefully
    }
  }
}

// Export singleton instance functions
const fiscalAutomationService = FiscalAutomationService.getInstance();

export async function processFiscalAutomation(orderId: string, newStatusId: string): Promise<void> {
  return fiscalAutomationService.process(orderId, newStatusId);
}

export function shouldCreateFiscalReceipt(order: OrdersResponse, statusRecord: StatusRecord): boolean {
  return fiscalAutomationService.shouldCreateReceipt(order, statusRecord);
}

export async function checkHasSaleReceipt(orderId: string): Promise<boolean> {
  return fiscalAutomationService.hasSaleReceipt(orderId);
}
