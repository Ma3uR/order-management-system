import { z } from 'zod';
import { getTopProductsByPopularity, getLeastPopularProducts } from '@/app/lib/services/orders';
import { ToolDefinition } from './types';

// Helper function to format date to ISO
function formatDateToISO(date: Date): string {
  return date.toISOString().split('T')[0];
}

export type ProductPopularityInput = {
  type: 'most' | 'least';
  period: 'week' | 'month' | 'quarter' | 'year' | 'custom';
  startDate?: string;
  endDate?: string;
  limit?: number;
};

export type ProductPopularityOutput = {
  products: Array<{ name: string, count: number }>;
  period: { start: string; end: string };
  type: 'most' | 'least';
  message?: string;
  error?: string;
};

export const productPopularity: ToolDefinition<ProductPopularityInput, ProductPopularityOutput> = {
  description: 'Get the most or least popular products for a specified time period',
  parameters: z.object({
    type: z.enum(['most', 'least']).describe('Type of report: most popular or least popular products'),
    period: z.enum(['week', 'month', 'quarter', 'year', 'custom']).describe('Time period for the report'),
    startDate: z.string().optional().describe('Start date for custom period in YYYY-MM-DD format'),
    endDate: z.string().optional().describe('End date for custom period in YYYY-MM-DD format'),
    limit: z.number().min(1).max(10).default(5).describe('Number of products to return (1-10, default 5)')
  }),
  execute: async (input) => {
    try {
      // Calculate start and end dates based on period
      let startDate: string;
      let endDate = formatDateToISO(new Date());

      if (input.period === 'custom' && input.startDate && input.endDate) {
        startDate = formatDateToISO(new Date(input.startDate));
        endDate = formatDateToISO(new Date(input.endDate));
      } else {
        const now = new Date();
        switch (input.period) {
          case 'week':
            startDate = formatDateToISO(new Date(now.setDate(now.getDate() - 7)));
            break;
          case 'month':
            startDate = formatDateToISO(new Date(now.setMonth(now.getMonth() - 1)));
            break;
          case 'quarter':
            startDate = formatDateToISO(new Date(now.setMonth(now.getMonth() - 3)));
            break;
          case 'year':
            startDate = formatDateToISO(new Date(now.setFullYear(now.getFullYear() - 1)));
            break;
          default:
            startDate = formatDateToISO(new Date(now.setDate(now.getDate() - 7)));
        }
      }

      // Get product popularity data
      const limit = Math.min(input.limit || 5, 10); // Cap at 10 for token efficiency

      let result;
      if (input.type === 'most') {
        result = await getTopProductsByPopularity(startDate, endDate, limit);
        
        if (result.error) {
          return {
            products: [],
            period: { start: startDate, end: endDate },
            type: input.type,
            error: result.error
          };
        }
        
        // Ensure topProducts exists
        const topProducts = result.topProducts || [];
        
        return {
          products: topProducts.map(product => ({
            name: product.name,
            count: product.count
          })),
          period: { start: startDate, end: endDate },
          type: input.type
        };
      } else {
        result = await getLeastPopularProducts(startDate, endDate, limit);
        
        if (result.error) {
          return {
            products: [],
            period: { start: startDate, end: endDate },
            type: input.type,
            error: result.error
          };
        }
        
        // Ensure leastPopularProducts exists
        const leastPopularProducts = result.leastPopularProducts || [];
        
        return {
          products: leastPopularProducts.map(product => ({
            name: product.name,
            count: product.count
          })),
          period: { start: startDate, end: endDate },
          type: input.type
        };
      }
    } catch (error) {
      return {
        products: [],
        period: { start: '', end: '' },
        type: input.type,
        error: `Failed to get ${input.type} popular products: ${error}`
      };
    }
  }
};
