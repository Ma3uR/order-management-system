import { 
  CasaVchasnoRequest, 
  CasaVchasnoResponse,
  TaskType,
  PaymentType,
  DiscountType,
  ReceiptRow,
  Payment,
  Receipt,
  FiscalData,
  CasaVchasnoError,
  ShiftStatusInfo,
  ShiftStatus
} from '@/app/types/casa-vchasno';
import { OrdersResponse, FiscalReceiptsReceiptTypeOptions, FiscalReceiptsStatusOptions, FiscalShiftsStatusOptions, FiscalShiftsResponse } from '@/app/types/pocketbase-types';
import pb, { authenticatedCall } from '@/app/lib/pocketbase';
import { createRozetkaReceipt } from '@/app/actions/rozetka';

export class CasaVchasnoService {
  private readonly baseUrl = 'https://kasa.vchasno.ua/api/v3';
  private readonly token: string;

  constructor() {
    this.token = process.env.CASA_VCHASNO_TOKEN || '';
    if (!this.token) {
      throw new Error('CASA_VCHASNO_TOKEN environment variable is required');
    }
  }

  /**
   * Make authenticated request to Casa.vchasno API
   */
  private async makeRequest(
    endpoint: string, 
    data: CasaVchasnoRequest
  ): Promise<CasaVchasnoResponse> {
    try {
      console.log('[Casa.vchasno] Making request to:', `${this.baseUrl}${endpoint}`);
      console.log('[Casa.vchasno] Request data:', JSON.stringify(data, null, 2));

      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': this.token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: CasaVchasnoResponse = await response.json();
      
      console.log('[Casa.vchasno] Response:', JSON.stringify(result, null, 2));

      // Check if the API returned an error
      if (result.res !== 0) {
        const error = new Error(result.errortxt || 'Unknown API error') as CasaVchasnoError;
        error.code = result.res;
        error.response = result;
        throw error;
      }

      return result;
    } catch (error) {
      console.error('[Casa.vchasno] Request failed:', error);
      throw error;
    }
  }

  /**
   * Convert order products to Casa.vchasno receipt rows
   */
  private orderProductsToReceiptRows(products: unknown[]): ReceiptRow[] {
    return products.map((product, index) => {
      const p = product as Record<string, unknown>;
      return {
        code: (p.code as string) || `PROD_${index + 1}`,
        name: (p.title as string) || (p.name as string) || (p.productName as string) || `Product ${index + 1}`,
        cnt: (p.quantity as number) || (p.qty as number) || 1,
        price: (p.price as number) || 0,
        disc: (p.discount as number) || 0,
        taxgrp: 2, // Always use tax group 2 (no VAT) info from casa.vchasno support
        comment: (p.comment as string) || '',
      };
    });
  }

  /**
   * Create payment array for receipt
   */
  private createPaymentArray(amount: number): Payment[] {    
    return [{
      type: PaymentType.CARD,
      sum: amount,
      change: 0,
    }];
  }

  /**
   * Create sale receipt for order
   */
  async createSaleReceipt(
    order: OrdersResponse,
    cashierName: string,
  ): Promise<CasaVchasnoResponse> {
    let request: CasaVchasnoRequest | null = null;
    let apiReached = false;
    
    try {
      console.log('[Casa.vchasno] Creating sale receipt for order:', order.orderNumber);

      // Prepare receipt rows from order products
      const receiptRows = this.orderProductsToReceiptRows(
        Array.isArray(order.products) ? order.products : []
      );

      if (receiptRows.length === 0) {
        throw new Error('Order must have at least one product');
      }

      // Prepare payment information
      const payments = this.createPaymentArray(
        order.amount || 0
      );

      // Prepare receipt data
      const receipt: Receipt = {
        sum: order.amount || 0,
        round: 0,
        comment_up: `Замовлення: ${order.orderNumber}`,
        comment_down: `Покупець: ${order.fullName}, дякуємо за покупку!`,
        disc: 0,
        disc_type: DiscountType.AMOUNT,
        rows: receiptRows,
        pays: payments,
      };


      // Prepare fiscal data
      const fiscalData: FiscalData = {
        task: TaskType.SALE,
        cashier: cashierName,
        receipt,
        dtype: 0, // Test mode
      };

      // Create request
      request = {
        source: 'ORDER_MANAGEMENT_SYSTEM',
        fiscal: fiscalData,
      };

      // Mark that we're about to reach the API
      apiReached = true;
      const response = await this.makeRequest('/fiscal/execute', request);
      
      // Save receipt data to database
      await this.saveFiscalReceipt(order.id, FiscalReceiptsReceiptTypeOptions.sale, request, response);
      
      // If this is a Rozetka order and receipt was successful, create receipt on Rozetka side
      await this.handleRozetkaReceiptCreation(order, response);
      
      return response;
    } catch (error) {
      console.error('[Casa.vchasno] Error creating sale receipt:', error);
      
      // If API was reached but failed, save failed receipt record
      if (apiReached && request) {
        try {
          const failedResponse: CasaVchasnoResponse = {
            task: -1,
            type: -1,
            ver: 1,
            source: 'ORDER_MANAGEMENT_SYSTEM',
            device: '',
            tag: '',
            dt: new Date().toISOString(),
            res: -1,
            res_action: -1,
            errortxt: error instanceof Error ? error.message : 'Unknown error',
            warnings: [],
            info: {
              task: -1,
              fisid: '',
              dataid: -1,
              doccode: '',
              dt: new Date().toISOString(),
              cashier: '',
              dtype: -1,
              isprint: 0,
              isoffline: false,
              safe: 0,
              shift_link: 0,
              docno: 0,
              cancelid: '',
              qr: '',
              mac: ''
            },
            error_extra: null
          };
          await this.saveFiscalReceipt(order.id, FiscalReceiptsReceiptTypeOptions.sale, request, failedResponse);
        } catch (saveError) {
          console.error('[Casa.vchasno] Failed to save failed receipt record:', saveError);
        }
      }
      
      throw error;
    }
  }

  /**
   * Create return receipt for order
   */
  async createReturnReceipt(
    order: OrdersResponse,
    cashierName: string,
    returnAmount?: number
  ): Promise<CasaVchasnoResponse> {
    let request: CasaVchasnoRequest | null = null;
    let apiReached = false;
    
    try {
      console.log('[Casa.vchasno] Creating return receipt for order:', order.orderNumber);

      // Prepare receipt rows from order products
      const receiptRows = this.orderProductsToReceiptRows(
        Array.isArray(order.products) ? order.products : []
      );

      if (receiptRows.length === 0) {
        throw new Error('Order must have at least one product');
      }

      // Use provided return amount or full order amount
      const amount = returnAmount || order.amount || 0;

      // Prepare payment information
      const payments = this.createPaymentArray(
        amount
      );

      // Prepare receipt data
      const receipt: Receipt = {
        sum: amount,
        round: 0,
        comment_up: `Повернення за замовленням: ${order.orderNumber}`,
        comment_down: `Покупець: ${order.fullName}`,
        disc: 0,
        disc_type: DiscountType.AMOUNT,
        rows: receiptRows,
        pays: payments,
      };

      // Prepare fiscal data (no userinfo required for returns)
      const fiscalData: FiscalData = {
        task: TaskType.RETURN,
        cashier: cashierName,
        receipt,
        dtype: 0, // Test mode
      };

      // Create request
      request = {
        source: 'ORDER_MANAGEMENT_SYSTEM',
        fiscal: fiscalData,
      };

      // Mark that we're about to reach the API
      apiReached = true;
      const response = await this.makeRequest('/fiscal/execute', request);
      
      // Save receipt data to database
      await this.saveFiscalReceipt(order.id, FiscalReceiptsReceiptTypeOptions.return, request, response);
      
      return response;
    } catch (error) {
      console.error('[Casa.vchasno] Error creating return receipt:', error);
      
      // If API was reached but failed, save failed receipt record
      if (apiReached && request) {
        try {
          const failedResponse: CasaVchasnoResponse = {
            task: -1,
            type: -1,
            ver: 1,
            source: 'ORDER_MANAGEMENT_SYSTEM',
            device: '',
            tag: '',
            dt: new Date().toISOString(),
            res: -1,
            res_action: -1,
            errortxt: error instanceof Error ? error.message : 'Unknown error',
            warnings: [],
            info: {
              task: -1,
              fisid: '',
              dataid: -1,
              doccode: '',
              dt: new Date().toISOString(),
              cashier: '',
              dtype: -1,
              isprint: 0,
              isoffline: false,
              safe: 0,
              shift_link: 0,
              docno: 0,
              cancelid: '',
              qr: '',
              mac: ''
            },
            error_extra: null
          };
          await this.saveFiscalReceipt(order.id, FiscalReceiptsReceiptTypeOptions.return, request, failedResponse);
        } catch (saveError) {
          console.error('[Casa.vchasno] Failed to save failed receipt record:', saveError);
        }
      }
      
      throw error;
    }
  }

  /**
   * Create Z-report (close shift)
   */
  async createZReport(cashierName: string): Promise<CasaVchasnoResponse> {
    try {
      console.log('[Casa.vchasno] Creating Z-report for cashier:', cashierName);

      // Prepare fiscal data for Z-report
      const fiscalData: FiscalData = {
        task: TaskType.Z_REPORT,
        cashier: cashierName,
        dtype: 0, // Test mode
      };

      // Create request
      const request: CasaVchasnoRequest = {
        source: 'ORDER_MANAGEMENT_SYSTEM',
        fiscal: fiscalData,
      };

      const response = await this.makeRequest('/fiscal/execute', request);
      
      // Save Z-report data and close shift
      await this.closeShift(cashierName, response);
      
      return response;
    } catch (error) {
      console.error('[Casa.vchasno] Error creating Z-report:', error);
      throw error;
    }
  }

  /**
   * Save fiscal receipt to database
   */
  private async saveFiscalReceipt(
    orderId: string,
    receiptType: FiscalReceiptsReceiptTypeOptions,
    fiscalData: CasaVchasnoRequest,
    casaResponse: CasaVchasnoResponse
  ): Promise<void> {
    try {
      await authenticatedCall(() =>
        pb.collection('fiscal_receipts').create({
          order_id: orderId,
          receipt_type: receiptType,
          fiscal_data: fiscalData,
          casa_response: casaResponse,
          qr_code: (casaResponse.info as unknown as Record<string, unknown>)?.qr as string || '',
          document_code: (casaResponse.info as unknown as Record<string, unknown>)?.doccode as string || '',
          status: casaResponse.res === 0 ? FiscalReceiptsStatusOptions.success : FiscalReceiptsStatusOptions.failed,
          error_message: casaResponse.res !== 0 ? casaResponse.errortxt : undefined,
        })
      );
    } catch (error) {
      console.error('[Casa.vchasno] Error saving fiscal receipt:', error);
      throw error;
    }
  }

  /**
   * Handle Rozetka receipt creation after successful local fiscal receipt
   */
  private async handleRozetkaReceiptCreation(
    order: OrdersResponse,
    casaResponse: CasaVchasnoResponse
  ): Promise<void> {
    try {
      // Check if this is a successful receipt creation
      if (casaResponse.res !== 0) {
        console.log('[Casa.vchasno] Skipping Rozetka receipt - Casa.vchasno receipt failed');
        return;
      }

      // Get order source to check if it's Rozetka (source ID: 4tvf116a5aitwmb)
      const orderWithSource = await authenticatedCall(() =>
        pb.collection('orders').getOne(order.id, {
          expand: 'source'
        })
      );

      const sourceId = orderWithSource.source;
      const isRozetkaOrder = sourceId === '4tvf116a5aitwmb';

      if (!isRozetkaOrder) {
        console.log(`[Casa.vchasno] Skipping Rozetka receipt - not a Rozetka order (source: ${sourceId})`);
        return;
      }

      // Extract QR code URL from Casa.vchasno response
      const qrCodeUrl = (casaResponse.info as unknown as Record<string, unknown>)?.qr as string;
      
      console.log(`[Casa.vchasno] Creating Rozetka receipt for order ${orderWithSource.orderNumber}...`);
      
      // Create receipt on Rozetka side
      const rozetkaResult = await createRozetkaReceipt(orderWithSource.orderNumber, qrCodeUrl);
      
      if (rozetkaResult.error) {
        console.error(`[Casa.vchasno] Failed to create Rozetka receipt for order ${orderWithSource.orderNumber}:`, rozetkaResult.error);
        // Don't throw error - continue even if Rozetka API fails
        return;
      }

      // Update local order prro_receipt_status to true
      await authenticatedCall(() =>
        pb.collection('orders').update(orderWithSource.id, {
          prro_receipt_status: true,
          updated: new Date().toISOString()
        })
      );

      console.log(`✅ [Casa.vchasno] Successfully created Rozetka receipt and updated local status for order ${orderWithSource.orderNumber}`);
      
    } catch (error) {
      console.error('[Casa.vchasno] Error handling Rozetka receipt creation:', error);
      // Don't throw error - this is a non-critical operation
    }
  }

  /**
   * Open new shift
   */
  async openShift(cashierName: string): Promise<void> {
    try {
      console.log('[Casa.vchasno] Opening shift for cashier:', cashierName);

      // Check if there's already an open shift
      const existingShifts = await authenticatedCall(() =>
        pb.collection('fiscal_shifts').getList(1, 1, {
          filter: `status = "${FiscalShiftsStatusOptions.open}"`,
          sort: '-created',
        })
      );

      if (existingShifts.items.length > 0) {
        throw new Error('There is already an open shift. Please close it first.');
      }

      // Create new shift record
      await authenticatedCall(() =>
        pb.collection('fiscal_shifts').create({
          cashier: cashierName,
          opened_at: new Date().toISOString(),
          status: FiscalShiftsStatusOptions.open,
          total_sales: 0,
          total_returns: 0,
          receipts_count: 0,
        })
      );

      console.log('[Casa.vchasno] Shift opened successfully');
    } catch (error) {
      console.error('[Casa.vchasno] Error opening shift:', error);
      throw error;
    }
  }

  /**
   * Close shift with Z-report data
   */
  private async closeShift(
    cashierName: string,
    zReportResponse: CasaVchasnoResponse
  ): Promise<void> {
    try {
      console.log('[Casa.vchasno] Closing shift for cashier:', cashierName);

      // Find open shift
      const openShifts = await authenticatedCall(() =>
        pb.collection('fiscal_shifts').getList(1, 1, {
          filter: `status = "${FiscalShiftsStatusOptions.open}" && cashier = "${cashierName}"`,
          sort: '-created',
        })
      );

      if (openShifts.items.length === 0) {
        throw new Error('No open shift found for this cashier');
      }

      const shift = openShifts.items[0];

      // Extract sales data from Z-report
      const salesData = (zReportResponse.info as unknown as Record<string, unknown>)?.summary;
      const receiptData = (zReportResponse.info as unknown as Record<string, unknown>)?.receipt;

      // Update shift with Z-report data
      await authenticatedCall(() =>
        pb.collection('fiscal_shifts').update(shift.id, {
          closed_at: new Date().toISOString(),
          status: FiscalShiftsStatusOptions.closed,
          z_report_data: zReportResponse.info,
          total_sales: (salesData as Record<string, unknown>)?.base_p as number || 0,
          total_returns: (salesData as Record<string, unknown>)?.base_m as number || 0,
          receipts_count: ((receiptData as Record<string, unknown>)?.count_p as number || 0) + ((receiptData as Record<string, unknown>)?.count_m as number || 0),
        })
      );

      console.log('[Casa.vchasno] Shift closed successfully');
    } catch (error) {
      console.error('[Casa.vchasno] Error closing shift:', error);
      throw error;
    }
  }

  /**
   * Get current open shift
   */
  async getCurrentShift(): Promise<FiscalShiftsResponse | null> {
    try {
      const shifts = await authenticatedCall(() =>
        pb.collection('fiscal_shifts').getList(1, 1, {
          filter: `status = "${FiscalShiftsStatusOptions.open}"`,
          sort: '-created',
        })
      );

      return shifts.items.length > 0 ? shifts.items[0] as FiscalShiftsResponse : null;
    } catch (error) {
      console.error('[Casa.vchasno] Error getting current shift:', error);
      return null;
    }
  }

  /**
   * Get fiscal receipts for order
   */
  async getFiscalReceiptsForOrder(orderId: string): Promise<unknown[]> {
    try {
      const receipts = await authenticatedCall(() =>
        pb.collection('fiscal_receipts').getList(1, 50, {
          filter: `order_id = "${orderId}"`,
          sort: '-created',
        })
      );

      return receipts.items;
    } catch (error) {
      console.error('[Casa.vchasno] Error getting fiscal receipts:', error);
      return [];
    }
  }

  /**
   * Check shift status (Task 18)
   */
  async checkShiftStatus(): Promise<ShiftStatusInfo> {
    try {
      console.log('[Casa.vchasno] Checking shift status');

      // Prepare fiscal data for shift status check
      const fiscalData: FiscalData = {
        task: TaskType.SHIFT_STATUS,
        cashier: '', // Not required for status check
        dtype: 0, // Test mode
      };

      // Create request
      const request: CasaVchasnoRequest = {
        source: 'ORDER_MANAGEMENT_SYSTEM',
        fiscal: fiscalData,
      };

      const response = await this.makeRequest('/fiscal/execute', request);
      
      // Return shift status info
      return response.info as ShiftStatusInfo;
    } catch (error) {
      console.error('[Casa.vchasno] Error checking shift status:', error);
      throw error;
    }
  }

  /**
   * Get human-readable shift status text
   */
  getShiftStatusText(status: ShiftStatus): string {
    switch (status) {
      case ShiftStatus.UNKNOWN:
        return 'Unknown';
      case ShiftStatus.CLOSED:
        return 'Closed';
      case ShiftStatus.OPEN:
        return 'Open';
      case ShiftStatus.BLOCKED:
        return 'Blocked';
      default:
        return 'Unknown';
    }
  }

  /**
   * Get shift status color for UI
   */
  getShiftStatusColor(status: ShiftStatus): string {
    switch (status) {
      case ShiftStatus.OPEN:
        return 'green';
      case ShiftStatus.CLOSED:
        return 'gray';
      case ShiftStatus.BLOCKED:
        return 'red';
      case ShiftStatus.UNKNOWN:
      default:
        return 'yellow';
    }
  }
}

// Lazy singleton instance - only instantiate when needed on server side
let _casaVchasnoService: CasaVchasnoService | null = null;

export const casaVchasnoService = {
  getInstance(): CasaVchasnoService {
    if (!_casaVchasnoService) {
      _casaVchasnoService = new CasaVchasnoService();
    }
    return _casaVchasnoService;
  },
  
  // Proxy methods to the singleton instance
  async createSaleReceipt(order: OrdersResponse, cashierName: string) {
    return this.getInstance().createSaleReceipt(order, cashierName);
  },
  
  async createReturnReceipt(order: OrdersResponse, cashierName: string, returnAmount?: number) {
    return this.getInstance().createReturnReceipt(order, cashierName, returnAmount);
  },
  
  async createZReport(cashierName: string) {
    return this.getInstance().createZReport(cashierName);
  },
  
  async openShift(cashierName: string) {
    return this.getInstance().openShift(cashierName);
  },
  
  async getCurrentShift() {
    return this.getInstance().getCurrentShift();
  },
  
  async getFiscalReceiptsForOrder(orderId: string) {
    return this.getInstance().getFiscalReceiptsForOrder(orderId);
  },
  
  async checkShiftStatus() {
    return this.getInstance().checkShiftStatus();
  },
  
  getShiftStatusText(status: ShiftStatus) {
    return this.getInstance().getShiftStatusText(status);
  },
  
  getShiftStatusColor(status: ShiftStatus) {
    return this.getInstance().getShiftStatusColor(status);
  }
};