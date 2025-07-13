import { z } from 'zod';
import { ToolDefinition } from './types';
import { getLastOrder as getLastOrderService } from '@/app/lib/services/orders';

export const getLastOrder: ToolDefinition<Record<string, never>, unknown> = {
  description: 'Get the last order in the system',
  parameters: z.object({}),
  execute: async () => {
    const lastOrder = await getLastOrderService();
    
    // Ensure we return in the expected format with an 'orders' array
    if (lastOrder && !lastOrder.error) {
      // Optimize the order data for token efficiency
      const optimizedOrder = {
        id: lastOrder.id,
        orderNumber: lastOrder.orderNumber,
        fullName: lastOrder.fullName,
        phoneNumber: lastOrder.phoneNumber,
        status: lastOrder.status,
        amount: lastOrder.amount,
        numberOfItems: lastOrder.numberOfItems,
        created: lastOrder.created,
        // Limit products array to essential info only
        products: Array.isArray(lastOrder.products) 
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ? lastOrder.products.slice(0, 3).map((p: any) => ({
              title: p?.title || 'Unnamed Product',
              quantity: p?.quantity || 1,
              price: p?.price || 0
            }))
          : []
      };
      
      return {
        orders: [optimizedOrder]
      };
    }
    
    return lastOrder;
  },
};