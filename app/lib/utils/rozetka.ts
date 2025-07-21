import { RozetkaOrderResponse } from '@/app/types/orders';

/**
 * Extracts product data from a Rozetka order, preferring the purchases array
 * over items_photos for better accuracy of quantities and pricing
 */
export function extractProductsFromRozetkaOrder(rozetkaOrder: RozetkaOrderResponse): Array<{title: string; quantity: number; price: number}> {
  if (rozetkaOrder.purchases && rozetkaOrder.purchases.length > 0) {
    return rozetkaOrder.purchases.map(purchase => ({
      title: purchase.item_name,
      quantity: purchase.quantity,
      price: parseFloat(purchase.price_with_discount)
    }));
  }
  
  // Return empty array if no product data available
  return [];
}