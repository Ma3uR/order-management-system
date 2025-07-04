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
  'use server'
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
  'use server'
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
 * Search fiscal receipts with filters
 */
export async function searchFiscalReceipts(
  searchQuery?: string,
  receiptType?: 'sale' | 'return' | 'z_report',
  status?: 'success' | 'failed' | 'pending',
  dateFrom?: string,
  dateTo?: string,
  page: number = 1,
  perPage: number = 20
): Promise<{
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
    // Build filter string
    const filters: string[] = []
    
    if (receiptType) {
      filters.push(`receipt_type = "${receiptType}"`)
    }
    
    if (status) {
      filters.push(`status = "${status}"`)
    }
    
    if (dateFrom) {
      filters.push(`created >= "${dateFrom}"`)
    }
    
    if (dateTo) {
      filters.push(`created <= "${dateTo}"`)
    }
    
    // Add search query filters for order number, customer name, document code
    if (searchQuery && searchQuery.trim()) {
      const query = searchQuery.trim()
      const searchFilters = [
        `document_code ~ "${query}"`,
        `order_id.orderNumber ~ "${query}"`,
        `order_id.fullName ~ "${query}"`,
        `id = "${query}"`
      ]
      filters.push(`(${searchFilters.join(' || ')})`)
    }
    
    const filterString = filters.length > 0 ? filters.join(' && ') : ''
    
    const receipts = await authenticatedCall(() =>
      pb.collection('fiscal_receipts').getList(page, perPage, {
        sort: '-created',
        expand: 'order_id',
        filter: filterString
      })
    );

    return {
      success: true,
      data: receipts
    };
  } catch (error) {
    console.error('[Fiscal Receipts] Error searching fiscal receipts:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Get sale receipts eligible for returns
 */
export async function getEligibleSaleReceipts(
  searchQuery?: string,
  page: number = 1,
  perPage: number = 50
): Promise<{
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
    return await searchFiscalReceipts(
      searchQuery,
      'sale',     // Only sale receipts
      'success',  // Only successful receipts
      undefined,  // No date from filter
      undefined,  // No date to filter
      page,
      perPage
    );
  } catch (error) {
    console.error('[Fiscal Receipts] Error getting eligible sale receipts:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Get return receipts for a specific order
 */
export async function getReturnReceiptsForOrder(orderId: string): Promise<{
  success: boolean;
  data?: unknown[];
  error?: string;
}> {
  try {
    const returns = await authenticatedCall(() =>
      pb.collection('fiscal_receipts').getList(1, 100, {
        filter: `order_id = "${orderId}" && receipt_type = "return" && status = "success"`,
        sort: '-created'
      })
    );

    return {
      success: true,
      data: returns.items
    };
  } catch (error) {
    console.error('[Fiscal Receipts] Error getting return receipts:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Calculate remaining returnable amount for an order
 */
export async function getReturnableAmount(orderId: string, originalAmount: number): Promise<{
  success: boolean;
  data?: {
    originalAmount: number;
    totalReturned: number;
    remainingReturnable: number;
    returnHistory: unknown[];
  };
  error?: string;
}> {
  try {
    const returnResult = await getReturnReceiptsForOrder(orderId);
    
    if (!returnResult.success) {
      return {
        success: false,
        error: returnResult.error || 'Failed to get return receipts'
      };
    }

    const returns = returnResult.data || [];
    let totalReturned = 0;

    // Calculate total returned amount
    returns.forEach((returnReceipt: unknown) => {
      const receipt = returnReceipt as Record<string, unknown>;
      const fiscalData = receipt.fiscal_data as Record<string, unknown> | undefined;
      const fiscal = fiscalData?.fiscal as Record<string, unknown> | undefined;
      const receiptData = fiscal?.receipt as Record<string, unknown> | undefined;
      const returnAmount = (receiptData?.sum as number) || 0;
      totalReturned += returnAmount;
    });

    const remainingReturnable = Math.max(0, originalAmount - totalReturned);

    return {
      success: true,
      data: {
        originalAmount,
        totalReturned,
        remainingReturnable,
        returnHistory: returns
      }
    };
  } catch (error) {
    console.error('[Fiscal Receipts] Error calculating returnable amount:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Validate return amount against remaining returnable amount
 */
export async function validateReturnAmount(
  orderId: string,
  originalAmount: number,
  requestedReturnAmount: number
): Promise<{
  success: boolean;
  data?: {
    valid: boolean;
    remainingReturnable: number;
    errorMessage?: string;
  };
  error?: string;
}> {
  try {
    const returnableResult = await getReturnableAmount(orderId, originalAmount);
    
    if (!returnableResult.success || !returnableResult.data) {
      return {
        success: false,
        error: returnableResult.error || 'Failed to calculate returnable amount'
      };
    }

    const { remainingReturnable } = returnableResult.data;
    
    const valid = requestedReturnAmount > 0 && requestedReturnAmount <= remainingReturnable;
    
    let errorMessage: string | undefined;
    if (requestedReturnAmount <= 0) {
      errorMessage = 'Return amount must be greater than zero';
    } else if (requestedReturnAmount > remainingReturnable) {
      errorMessage = `Return amount cannot exceed remaining returnable amount of ${remainingReturnable.toFixed(2)}`;
    }

    return {
      success: true,
      data: {
        valid,
        remainingReturnable,
        errorMessage
      }
    };
  } catch (error) {
    console.error('[Fiscal Receipts] Error validating return amount:', error);
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
  'use server'
  try {
    // Get current shift
    const currentShift = await casaVchasnoService.getCurrentShift();

    // Get today's receipts
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    const receipts = await authenticatedCall(() =>
      pb.collection('fiscal_receipts').getList(1, 1000, {
        filter: `created >= "${today} 00:00:00" && created < "${tomorrowStr} 00:00:00"`,
        fields: 'receipt_type,fiscal_data'
      })
    );

    console.log('Receipts:', JSON.stringify(receipts.items, null, 2))

    // Calculate statistics
    let todaySales = 0;
    let todayReturns = 0;
    const todayReceipts = receipts.items.length;

    receipts.items.forEach((receipt) => {
      const sum = receipt.fiscal_data?.fiscal?.receipt?.sum;
      if (sum) {
        if (receipt.receipt_type === 'sale') {
          todaySales += sum;
        } else if (receipt.receipt_type === 'return') {
          todayReturns += sum;
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
 * Get completed orders without fiscal receipts
 */
export async function getCompletedOrdersWithoutReceipts(): Promise<{
  success: boolean;
  data?: unknown[];
  error?: string;
}> {
  'use server'
  try {
    console.log('🔍 Loading completed orders without receipts...');
    
    // Get all orders with completed statuses that don't have successful fiscal receipts
    // and have prro_receipt_status = false (no receipt created on Rozetka side)
    const orders = await authenticatedCall(() =>
      pb.collection('orders').getList(1, 500, {
        filter: `archived = false && (prro_receipt_status = false || prro_receipt_status = null)`,
        expand: 'status,source',
        sort: '-created_at_marketplace,-created'
      })
    );

    console.log(`📊 Found ${orders.items.length} orders to check`);
    
    // Get all existing fiscal receipts in one query to avoid N+1 problem
    const existingReceipts = await authenticatedCall(() =>
      pb.collection('fiscal_receipts').getList(1, 1000, {
        filter: `receipt_type = "sale" && status = "success"`,
        fields: 'order_id'
      })
    );
    
    const receiptOrderIds = new Set(existingReceipts.items.map(r => r.order_id));
    console.log(`📋 Found ${existingReceipts.items.length} existing receipts`);

    // Filter orders efficiently
    const completedOrders = [];
    let processedCount = 0;
    
    for (const order of orders.items) {
      processedCount++;
      
      // Get status information
      const statusFromExpand = (order.expand as Record<string, unknown>)?.status as { name?: string; marketplace_code?: string | number } | undefined;
      const statusName = statusFromExpand?.name;
      const statusNameLower = statusName?.toLowerCase()?.trim();
      
      // Check marketplace code
      let marketplaceCode = statusFromExpand?.marketplace_code;
      if (!marketplaceCode && (order as Record<string, unknown>).marketplace_code) {
        marketplaceCode = (order as Record<string, unknown>).marketplace_code as string | number;
      }
      
      const marketplaceCodeNum = typeof marketplaceCode === 'string' ? parseInt(marketplaceCode) : marketplaceCode;
      const hasMarketplaceCode6 = marketplaceCodeNum === 6;
      
      if (hasMarketplaceCode6) {
        // Check for completed status
        const isCompleted = statusNameLower && (
          statusNameLower.includes('завершено') ||
          statusNameLower.includes('доставлено') ||
          statusNameLower.includes('выполнен') ||
          statusNameLower.includes('completed') ||
          statusNameLower.includes('delivered') ||
          statusNameLower.includes('done') ||
          statusNameLower.includes('finish') ||
          statusNameLower.includes('успешно') ||
          statusNameLower.includes('готов')
        );
        
        if (isCompleted && !receiptOrderIds.has(order.id)) {
          completedOrders.push(order);
        }
      }
      
      // Log progress every 100 orders
      if (processedCount % 100 === 0) {
        console.log(`⏳ Processed ${processedCount}/${orders.items.length} orders`);
      }
    }

    console.log(`✅ Found ${completedOrders.length} completed orders without receipts`);

    return {
      success: true,
      data: completedOrders
    };
  } catch (error) {
    console.error('[Fiscal Receipts] Error getting completed orders without receipts:', error);
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
  'use server'
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