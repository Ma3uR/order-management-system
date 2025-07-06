import { StatusOptionsRecord } from '@/app/types/pocketbase-types';

/**
 * Checks if a status represents a completed/delivered order
 * This function recognizes marketplace codes '6', 'completed', 'delivered' as completed statuses
 */
export function isCompletedStatus(status: StatusOptionsRecord | null | undefined): boolean {
  if (!status) return false;

  const code = status.marketplace_code?.toLowerCase();
  const name = status.name?.toLowerCase();

  // Check marketplace codes that represent completed orders
  if (code === '6' || code === 'completed' || code === 'delivered') {
    return true;
  }

  // Additional check for status names (fallback)
  if (name) {
    const completedKeywords = [
      'completed', 
      'delivered', 
      'виконано',    // Ukrainian for "completed"
      'доставлено',  // Ukrainian for "delivered"
      'complete',
      'deliver'
    ];
    
    return completedKeywords.some(keyword => name.includes(keyword));
  }

  return false;
}

/**
 * Checks if a status marketplace code represents a completed order
 * This is a more direct check just using the marketplace code
 */
export function isCompletedMarketplaceCode(marketplaceCode: string | null | undefined): boolean {
  if (!marketplaceCode) return false;

  const code = marketplaceCode.toLowerCase();
  return code === '6' || code === 'completed' || code === 'delivered';
}

/**
 * Gets all marketplace codes that represent completed orders
 */
export function getCompletedMarketplaceCodes(): string[] {
  return ['6', 'completed', 'delivered'];
}

/**
 * Creates a filter string for PocketBase queries to find completed orders
 */
export function createCompletedOrdersFilter(): string {
  const codes = getCompletedMarketplaceCodes();
  const filterParts = codes.map(code => `status.marketplace_code = "${code}"`);
  return `(${filterParts.join(' || ')})`;
}

/**
 * Checks if an order with a given status ID is completed
 * This requires the status to be expanded in the order query
 */
export function isOrderCompleted(order: { status: StatusOptionsRecord | string }): boolean {
  if (typeof order.status === 'string') {
    // If status is just an ID string, we can't determine completion status
    // The caller should expand the status relation in their query
    console.warn('Order status is not expanded. Cannot determine completion status from ID alone.');
    return false;
  }

  return isCompletedStatus(order.status);
}
