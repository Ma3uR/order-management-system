'use server';

import { casaVchasnoService } from '@/app/lib/services/casa-vchasno';
import pb from '@/app/lib/pocketbase';
import { CasaVchasnoResponse, ShiftStatusInfo } from '@/app/types/casa-vchasno';
import { OrdersResponse } from '@/app/types/pocketbase-types';
import { sendFiscalNotification } from '@/app/lib/services/telegram';
import { isCompletedMarketplaceCode } from '@/app/lib/utils/order-status';

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
    // Validate input parameters
    if (!orderId || orderId.trim() === '') {
      return {
        success: false,
        error: 'Order ID is required'
      };
    }

    if (!cashierName || cashierName.trim() === '') {
      return {
        success: false,
        error: 'Cashier name is required'
      };
    }

    // Get order details
    const order = await pb.collection('orders').getOne<OrdersResponse>(orderId, {
      expand: 'paymentMethod,deliveryMethod,status,currency'
    });

    if (!order) {
      return {
        success: false,
        error: 'Order not found'
      };
    }

    // Check if order already has a successful receipt
    const existingReceipts = await pb.collection('fiscal_receipts').getList(1, 10, {
      filter: `order_id = "${orderId}" && receipt_type = "sale" && status = "success"`,
      sort: '-created'
    });

    if (existingReceipts.items.length > 0) {
      console.log(`[Fiscal Receipts] Order ${order.orderNumber} already has a successful receipt, exiting silently`);
      return {
        success: true,
        data: undefined // Return success but no new receipt created
      };
    }

    // Check prro_receipt_status flag (alternative check)
    if (order.prro_receipt_status === true) {
      console.log(`[Fiscal Receipts] Order ${order.orderNumber} marked as having receipt (prro_receipt_status=true), exiting silently`);
      return {
        success: true,
        data: undefined // Return success but no new receipt created
      };
    }

    // Create sale receipt using Casa.vchasno service
    const response = await casaVchasnoService.createSaleReceipt(
      order,
      cashierName,
    );

    // Handle successful receipt creation
    if (response && response.res === 0) {
      try {
        // Ensure prro_receipt_status flag is set to true for successful receipts
        await pb.collection('orders').update(orderId, {
          prro_receipt_status: true,
          updated: new Date().toISOString()
        });

        // Validate the flag was set correctly
        const updatedOrder = await pb.collection('orders').getOne(orderId, { 
          fields: 'prro_receipt_status,orderNumber' 
        });
        
        if (updatedOrder.prro_receipt_status !== true) {
          console.error(`⚠️ [Fiscal Receipts] Flag validation failed for order ${updatedOrder.orderNumber}: expected true, got ${updatedOrder.prro_receipt_status}`);
        }

        console.log(`[Fiscal Receipts] Sending telegram notification for successful receipt: ${order.orderNumber}`);
        const telegramResult = await sendFiscalNotification(order, response);
        
        if (telegramResult.success) {
          console.log(`[Fiscal Receipts] ✅ Telegram notification sent successfully for order ${order.orderNumber}`);
        } else {
          console.warn(`[Fiscal Receipts] ⚠️ Telegram notification failed for order ${order.orderNumber}:`, telegramResult.error);
        }
      } catch (telegramError) {
        console.warn(`[Fiscal Receipts] ⚠️ Error in post-receipt processing for order ${order.orderNumber}:`, telegramError);
        // Don't fail the main operation if post-processing fails
      }
    } else {
      console.log(`[Fiscal Receipts] Skipping post-processing - receipt creation failed for order ${order.orderNumber}`);
    }

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
    const order = await pb.collection('orders').getOne<OrdersResponse>(orderId, {
      expand: 'paymentMethod,deliveryMethod,status,currency'
    });

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
    const shifts = await pb.collection('fiscal_shifts').getList(page, perPage, {
        sort: '-created'
      });

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
    const receipts = await pb.collection('fiscal_receipts').getList(page, perPage, {
        sort: '-created',
        expand: 'order_id'
      });

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
    
    const receipts = await pb.collection('fiscal_receipts').getList(page, perPage, {
        sort: '-created',
        expand: 'order_id',
        filter: filterString
    });

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
    const returns = await pb.collection('fiscal_receipts').getList(1, 100, {
      filter: `order_id = "${orderId}" && receipt_type = "return" && status = "success"`,
      sort: '-created'
    });

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
 * Check current shift status
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
    
    const receipts = await pb.collection('fiscal_receipts').getList(1, 1000, {
        filter: `created >= "${today} 00:00:00" && created < "${tomorrowStr} 00:00:00"`,
        fields: 'receipt_type,fiscal_data'
      });

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
 * Double-checks both prro_receipt_status flag AND actual fiscal_receipts table
 */
export async function getCompletedOrdersWithoutReceipts(): Promise<{
  success: boolean;
  data?: unknown[];
  error?: string;
}> {
  'use server'
  try {
    console.log('🔍 Loading completed orders without receipts...');
    
    // rozetka source id 4tvf116a5aitwmb
    // prom source id gfzk8nxfokgu9ku
    // epicentr source id pj9sejm9vqtu8xq

    // rozetka completed status code = 6 
    // prom completed status code = delivered
    // epicentr completed status code = completed

    // but i have epicentr code "delivered" that i need to skip. becouse for epicentr delivered is not completed status.
    // so i need to skip all orders with status code "delivered" and source id "pj9sejm9vqtu8xq"

    // Get all completed orders (regardless of receipt status initially)
    const completedCodes = ['6', 'completed', 'delivered'];
    const statusFilter = completedCodes.map(code => `status.marketplace_code = "${code}"`).join(' || ');
    
    const orders = await pb.collection('orders').getList(1, 1000, {
      filter: `archived = false && (${statusFilter})`,
      expand: 'status,source',
      sort: '-created_at_marketplace,-created'
    });

    console.log(`📊 Found ${orders.items.length} completed orders`);

    // Get ALL order IDs that have successful fiscal receipts
    const existingReceipts = await pb.collection('fiscal_receipts').getFullList({
      filter: `receipt_type = "sale" && status = "success"`,
      fields: 'order_id'
    });
    
    const receiptOrderIds = new Set(existingReceipts.map(r => r.order_id));
    console.log(`📋 Found ${existingReceipts.length} successful fiscal receipts`);

    // Filter orders: only those that DON'T have successful receipts
    const ordersWithoutReceipts = orders.items.filter(order => {
      // Check if order has completed status
      const statusFromExpand = (order.expand as Record<string, unknown>)?.status as { 
        name?: string; 
        marketplace_code?: string | number 
      } | undefined;
      
      const sourceFromExpand = (order.expand as Record<string, unknown>)?.source as {
        id?: string;
        name?: string;
      } | undefined;
      
      const marketplaceCode = statusFromExpand?.marketplace_code?.toString();
      const sourceId = sourceFromExpand?.id;
      
      // Skip Epicentr orders with "delivered" status (not completed for Epicentr)
      if (sourceId === 'pj9sejm9vqtu8xq' && marketplaceCode === 'delivered') {
        return false;
      }
      
      const isCompleted = isCompletedMarketplaceCode(marketplaceCode);
      
      // Only include if completed AND no successful receipt exists
      return isCompleted && !receiptOrderIds.has(order.id);
    });

    console.log(`✅ Found ${ordersWithoutReceipts.length} completed orders truly without receipts`);
    
    // Check for flag inconsistencies
    const flagInconsistencies = ordersWithoutReceipts.filter(order => order.prro_receipt_status === true);
    if (flagInconsistencies.length > 0) {
      console.warn(`⚠️ Found ${flagInconsistencies.length} orders with prro_receipt_status=true but no actual receipts`);
      console.log(`💡 Tip: Run 'npm run fiscal:fix' to fix flag inconsistencies`);
    }

    return {
      success: true,
      data: ordersWithoutReceipts
    };
  } catch (error) {
    console.error('[Fiscal Receipts] Error getting completed orders without receipts:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

