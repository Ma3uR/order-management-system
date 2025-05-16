import { z } from 'zod';
import { ToolDefinition } from './types';
import { getOrdersBeingAssembled } from '@/app/lib/services/orders';

export const getProductsBeingAssembled: ToolDefinition<Record<string, never>, unknown> = {
  description: 'Get all products from orders with status "being assembled" (комплектуються) with quantity totals',
  parameters: z.object({}),
  execute: async () => {
    const result = await getOrdersBeingAssembled();
    
    // If there's an error or no orders found, return the result as is
    if (result.error || result.message) {
      return result;
    }
    
    // Return the productsNeeded property which contains the aggregated products
    return {
      productsCount: result.productsNeeded?.length || 0,
      products: result.productsNeeded || [],
      ordersCount: result.count || 0
    };
  },
}; 