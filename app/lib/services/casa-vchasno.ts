import { 
  CasaVchasnoRequest, 
  CasaVchasnoResponse,
  TaskType,
  PaymentType,
  TaxGroup,
  DiscountType,
  ReceiptRow,
  Payment,
  Receipt,
  FiscalData,
  UserInfo,
  CasaVchasnoError,
  ShiftStatusInfo,
  ShiftStatus
} from '@/app/types/casa-vchasno';
import { OrdersResponse, FiscalReceiptsReceiptTypeOptions, FiscalReceiptsStatusOptions, FiscalShiftsStatusOptions, FiscalShiftsResponse } from '@/app/types/pocketbase-types';
import pb, { authenticatedCall } from '@/app/lib/pocketbase';

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
        taxgrp: (p.taxGroup as string) || TaxGroup.NO_VAT.toString(),
        comment: (p.comment as string) || '',
      };
    });
  }

  /**
   * Convert payment method to Casa.vchasno payment type
   */
  private getPaymentType(paymentMethodName: string): PaymentType {
    const lowerPayment = paymentMethodName.toLowerCase();
    
    if (lowerPayment.includes('cash') || lowerPayment.includes('готівка') || lowerPayment.includes('наличные')) {
      return PaymentType.CASH;
    }
    
    if (lowerPayment.includes('card') || lowerPayment.includes('картка') || lowerPayment.includes('карта')) {
      return PaymentType.CARD;
    }
    
    return PaymentType.OTHER;
  }

  /**
   * Create payment array for receipt
   */
  private createPaymentArray(amount: number, paymentMethodName: string): Payment[] {
    const paymentType = this.getPaymentType(paymentMethodName);
    
    return [{
      type: paymentType,
      sum: amount,
      change: paymentType === PaymentType.CASH ? 0 : undefined,
      comment: `Payment via ${paymentMethodName}`,
    }];
  }

  /**
   * Create sale receipt for order
   */
  async createSaleReceipt(
    order: OrdersResponse,
    cashierName: string,
    customerEmail?: string,
    customerPhone?: string
  ): Promise<CasaVchasnoResponse> {
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
        order.amount || 0,
        order.expand?.paymentMethod?.name || 'Other'
      );

      // Prepare receipt data
      const receipt: Receipt = {
        sum: order.amount || 0,
        round: 0,
        comment_up: `Order: ${order.orderNumber}`,
        comment_down: `Customer: ${order.fullName}`,
        disc: 0,
        disc_type: DiscountType.AMOUNT,
        rows: receiptRows,
        pays: payments,
      };

      // Prepare user info (required for sales)
      const userinfo: UserInfo = {
        email: customerEmail || order.expand?.customer?.email || 'noemail@example.com',
        phone: customerPhone || order.phoneNumber || '+380000000000',
      };

      // Prepare fiscal data
      const fiscalData: FiscalData = {
        task: TaskType.SALE,
        cashier: cashierName,
        receipt,
      };

      // Create request
      const request: CasaVchasnoRequest = {
        source: 'ORDER_MANAGEMENT_SYSTEM',
        userinfo,
        fiscal: fiscalData,
      };

      const response = await this.makeRequest('/fiscal/execute', request);
      
      // Save receipt data to database
      await this.saveFiscalReceipt(order.id, FiscalReceiptsReceiptTypeOptions.sale, request, response);
      
      return response;
    } catch (error) {
      console.error('[Casa.vchasno] Error creating sale receipt:', error);
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
        amount,
        order.expand?.paymentMethod?.name || 'Other'
      );

      // Prepare receipt data
      const receipt: Receipt = {
        sum: amount,
        round: 0,
        comment_up: `Return for Order: ${order.orderNumber}`,
        comment_down: `Customer: ${order.fullName}`,
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
      };

      // Create request
      const request: CasaVchasnoRequest = {
        source: 'ORDER_MANAGEMENT_SYSTEM',
        fiscal: fiscalData,
      };

      const response = await this.makeRequest('/fiscal/execute', request);
      
      // Save receipt data to database
      await this.saveFiscalReceipt(order.id, FiscalReceiptsReceiptTypeOptions.return, request, response);
      
      return response;
    } catch (error) {
      console.error('[Casa.vchasno] Error creating return receipt:', error);
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
          qr_code: casaResponse.info?.qr || '',
          document_code: casaResponse.info?.doccode || '',
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
      const salesData = zReportResponse.info?.summary;
      const receiptData = zReportResponse.info?.receipt;

      // Update shift with Z-report data
      await authenticatedCall(() =>
        pb.collection('fiscal_shifts').update(shift.id, {
          closed_at: new Date().toISOString(),
          status: FiscalShiftsStatusOptions.closed,
          z_report_data: zReportResponse.info,
          total_sales: salesData?.base_p || 0,
          total_returns: salesData?.base_m || 0,
          receipts_count: (receiptData?.count_p || 0) + (receiptData?.count_m || 0),
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

// Export singleton instance
export const casaVchasnoService = new CasaVchasnoService();