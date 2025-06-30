'use server';

import { casaVchasnoService } from '@/app/lib/services/casa-vchasno';
import { authenticatedCall } from '@/app/lib/pocketbase';
import pb from '@/app/lib/pocketbase';
import { CasaVchasnoResponse, ShiftStatusInfo } from '@/app/types/casa-vchasno';
import { OrdersResponse } from '@/app/types/pocketbase-types';

export interface FiscalReceiptResult {
  success: boolean;
  data?: CasaVchasnoResponse;
  error?: string;
}

export interface ShiftResult {
  success: boolean;
  data?: {
    items?: unknown[];
    totalItems?: number;
    page?: number;
    perPage?: number;
    message?: string;
  };
  error?: string;
}

/**
 * Create sale receipt for order
 */
export async function createSaleReceipt(
  orderId: string,
  cashierName: string,
  customerEmail?: string,
  customerPhone?: string
): Promise<FiscalReceiptResult> {
  try {
    // Get order details
    const order = await authenticatedCall(() =>
      pb.collection('orders').getOne<OrdersResponse>(orderId, {
        expand: 'paymentMethod,deliveryMethod,status,currency'
      })
    );

    if (!order) {
      return {
        success: false,
        error: 'Order not found'
      };
    }

    // Create sale receipt using Casa.vchasno service
    const response = await casaVchasnoService.createSaleReceipt(
      order,
      cashierName,
      customerEmail,
      customerPhone
    );

    return {
      success: true,
      data: response
    };
  } catch (error) {
    console.error('[Fiscal Receipts] Error creating sale receipt:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Create return receipt for order
 */
export async function createReturnReceipt(
  orderId: string,
  cashierName: string,
  returnAmount?: number
): Promise<FiscalReceiptResult> {
  try {
    // Get order details
    const order = await authenticatedCall(() =>
      pb.collection('orders').getOne<OrdersResponse>(orderId, {
        expand: 'paymentMethod,deliveryMethod,status,currency'
      })
    );

    if (!order) {
      return {
        success: false,
        error: 'Order not found'
      };
    }

    // Create return receipt using Casa.vchasno service
    const response = await casaVchasnoService.createReturnReceipt(
      order,
      cashierName,
      returnAmount
    );

    return {
      success: true,
      data: response
    };
  } catch (error) {
    console.error('[Fiscal Receipts] Error creating return receipt:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Create Z-report and close current shift
 */
export async function createZReport(cashierName: string): Promise<FiscalReceiptResult> {
  try {
    // Check if there's an open shift
    const currentShift = await casaVchasnoService.getCurrentShift();
    
    if (!currentShift) {
      return {
        success: false,
        error: 'No open shift found. Please open a shift first.'
      };
    }

    if (currentShift.cashier !== cashierName) {
      return {
        success: false,
        error: `Shift is opened by ${currentShift.cashier}. Only the same cashier can close it.`
      };
    }

    // Create Z-report and close shift
    const response = await casaVchasnoService.createZReport(cashierName);

    return {
      success: true,
      data: response
    };
  } catch (error) {
    console.error('[Fiscal Receipts] Error creating Z-report:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Open new shift
 */
export async function openShift(cashierName: string): Promise<ShiftResult> {
  try {
    if (!cashierName.trim()) {
      return {
        success: false,
        error: 'Cashier name is required'
      };
    }

    await casaVchasnoService.openShift(cashierName);

    return {
      success: true,
      data: { message: 'Shift opened successfully' }
    };
  } catch (error) {
    console.error('[Fiscal Receipts] Error opening shift:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Get current shift information
 */
export async function getCurrentShift(): Promise<ShiftResult> {
  try {
    const shift = await casaVchasnoService.getCurrentShift();

    return {
      success: true,
      data: shift ? { items: [shift] } : { items: [] }
    };
  } catch (error) {
    console.error('[Fiscal Receipts] Error getting current shift:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Get fiscal receipts for specific order
 */
export async function getFiscalReceiptsForOrder(orderId: string): Promise<{
  success: boolean;
  data?: unknown[];
  error?: string;
}> {
  try {
    const receipts = await casaVchasnoService.getFiscalReceiptsForOrder(orderId);

    return {
      success: true,
      data: receipts
    };
  } catch (error) {
    console.error('[Fiscal Receipts] Error getting fiscal receipts:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Get all fiscal shifts with pagination
 */
export async function getFiscalShifts(page: number = 1, perPage: number = 20): Promise<{
  success: boolean;
  data?: {
    items?: unknown[];
    totalItems?: number;
    page?: number;
    perPage?: number;
  };
  error?: string;
}> {
  try {
    const shifts = await authenticatedCall(() =>
      pb.collection('fiscal_shifts').getList(page, perPage, {
        sort: '-created'
      })
    );

    return {
      success: true,
      data: shifts
    };
  } catch (error) {
    console.error('[Fiscal Receipts] Error getting fiscal shifts:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Get all fiscal receipts with pagination
 */
export async function getFiscalReceipts(page: number = 1, perPage: number = 20): Promise<{
  success: boolean;
  data?: {
    items?: unknown[];
    totalItems?: number;
    page?: number;
    perPage?: number;
  };
  error?: string;
}> {
  try {
    const receipts = await authenticatedCall(() =>
      pb.collection('fiscal_receipts').getList(page, perPage, {
        sort: '-created',
        expand: 'order_id'
      })
    );

    return {
      success: true,
      data: receipts
    };
  } catch (error) {
    console.error('[Fiscal Receipts] Error getting fiscal receipts:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Get fiscal statistics for dashboard
 */
export async function getFiscalStatistics(): Promise<{
  success: boolean;
  data?: {
    currentShift: unknown;
    todayReceipts: number;
    todaySales: number;
    todayReturns: number;
  };
  error?: string;
}> {
  try {
    // Get current shift
    const currentShift = await casaVchasnoService.getCurrentShift();

    // Get today's receipts
    const today = new Date().toISOString().split('T')[0];
    const receipts = await authenticatedCall(() =>
      pb.collection('fiscal_receipts').getList(1, 1000, {
        filter: `created >= "${today} 00:00:00"`,
        fields: 'receipt_type,casa_response'
      })
    );

    // Calculate statistics
    let todaySales = 0;
    let todayReturns = 0;
    const todayReceipts = receipts.items.length;

    receipts.items.forEach(receipt => {
      if (receipt.casa_response?.info?.receipt?.sum) {
        if (receipt.receipt_type === 'sale') {
          todaySales += receipt.casa_response.info.receipt.sum;
        } else if (receipt.receipt_type === 'return') {
          todayReturns += receipt.casa_response.info.receipt.sum;
        }
      }
    });

    return {
      success: true,
      data: {
        currentShift,
        todayReceipts,
        todaySales,
        todayReturns
      }
    };
  } catch (error) {
    console.error('[Fiscal Receipts] Error getting fiscal statistics:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Check current shift status from Casa.vchasno
 */
export async function checkShiftStatus(): Promise<{
  success: boolean;
  data?: ShiftStatusInfo;
  error?: string;
}> {
  try {
    const shiftStatus = await casaVchasnoService.checkShiftStatus();

    return {
      success: true,
      data: shiftStatus
    };
  } catch (error) {
    console.error('[Fiscal Receipts] Error checking shift status:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}