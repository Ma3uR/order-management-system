import { z } from 'zod';
import { ToolDefinition } from './types';
import { calculateBalanceForPeriod } from '@/app/lib/services/finances';

export const calculateBalance: ToolDefinition<{ startDate: string; endDate: string }, unknown> = {
  description: 'Calculate financial balance (income minus expenses) for a specified time period',
  parameters: z.object({
    startDate: z.string().describe('Start date for the period in YYYY-MM-DD format'),
    endDate: z.string().describe('End date for the period in YYYY-MM-DD format')
  }),
  execute: async ({ startDate, endDate }) => {
    const result = await calculateBalanceForPeriod(startDate, endDate);
    
    // If there's an error, return the result as is
    if (result.error || result.message) {
      return result;
    }
    
    return {
      periodStart: startDate,
      periodEnd: endDate,
      totalIncome: result.totalIncome || 0,
      totalExpenses: result.totalExpenses || 0,
      netBalance: (result.totalIncome || 0) - (result.totalExpenses || 0),
      incomeBreakdown: result.incomeBreakdown || [],
      expensesBreakdown: result.expensesBreakdown || []
    };
  },
}; 