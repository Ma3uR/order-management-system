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
      // Check if lastOrder has the expected structure (cast to any for flexible access)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const orderData = lastOrder as any;
      
      // Optimize the order data for token efficiency
      const optimizedOrder = {
        id: orderData.id || '',
        orderNumber: orderData.orderNumber || '',
        fullName: orderData.fullName || '',
        phoneNumber: orderData.phoneNumber || '',
        status: orderData.status || '',
        amount: orderData.amount || 0,
        numberOfItems: orderData.numberOfItems || 0,
        created: orderData.created || '',
        // Limit products array to essential info only
        products: Array.isArray(orderData.products) 
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ? orderData.products.slice(0, 3).map((p: any) => ({
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