import { tool } from 'ai';
import { z } from 'zod';
import { getLastOrder as getLastOrderService } from '@/app/lib/services/orders';

export const getLastOrder = tool({
  description: 'Get the last order in the system',
  parameters: z.object({}),
  execute: async () => {
    const lastOrder = await getLastOrderService();
    return lastOrder;
  },
});