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
      return {
        orders: [lastOrder]
      };
    }
    
    return lastOrder;
  },
};