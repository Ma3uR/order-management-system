import { z } from 'zod';
import { calculateAverageOrderValue } from '@/app/lib/services/orders';
import { ToolDefinition } from './types';

// Helper function to format date to ISO
function formatDateToISO(date: Date): string {
  return date.toISOString().split('T')[0];
}

export type AverageOrderValueInput = {
  period: 'week' | 'month' | 'quarter' | 'year' | 'custom';
  startDate?: string;
  endDate?: string;
  source?: string;
};

export type AverageOrderValueOutput = {
  averageValue: number;
  ordersCount: number;
  totalAmount: number;
  period: { start: string; end: string };
  source?: string;
  message?: string;
  error?: string;
};

export const averageOrderValue: ToolDefinition<AverageOrderValueInput, AverageOrderValueOutput> = {
  description: 'Calculate the average order value for a specified time period',
  parameters: z.object({
    period: z.enum(['week', 'month', 'quarter', 'year', 'custom']).describe('Time period for the calculation'),
    startDate: z.string().optional().describe('Start date for custom period in YYYY-MM-DD format'),
    endDate: z.string().optional().describe('End date for custom period in YYYY-MM-DD format'),
    source: z.string().optional().describe('Optional marketplace source to filter by')
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

      // Calculate average order value
      const result = await calculateAverageOrderValue(startDate, endDate, input.source);

      if (result.error) {
        return {
          averageValue: 0,
          ordersCount: 0,
          totalAmount: 0,
          period: { start: startDate, end: endDate },
          source: input.source,
          error: result.error
        };
      }

      return {
        averageValue: result.averageValue || 0,
        ordersCount: result.ordersCount || 0,
        totalAmount: result.totalAmount || 0,
        period: { 
          start: result.period?.start || startDate, 
          end: result.period?.end || endDate 
        },
        source: input.source,
        message: result.message
      };
    } catch (error) {
      return {
        averageValue: 0,
        ordersCount: 0,
        totalAmount: 0,
        period: { start: '', end: '' },
        source: input.source,
        error: `Failed to calculate average order value: ${error}`
      };
    }
  }
}; 