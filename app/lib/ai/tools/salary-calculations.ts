import { z } from 'zod';
import { ToolDefinition } from './types';
import { calculateSalaryForPeriod } from '@/app/lib/services/finances';

export const salaryCalculator: ToolDefinition<{ startDate: string; endDate: string }, unknown> = {
  description: 'Calculate salary based on order sources and their respective percentages for a specified time period',
  parameters: z.object({
    startDate: z.string().describe('Start date for the period in YYYY-MM-DD format'),
    endDate: z.string().describe('End date for the period in YYYY-MM-DD format')
  }),
  execute: async ({ startDate, endDate }) => {
    const result = await calculateSalaryForPeriod(startDate, endDate);
    
    // If there's an error, return the result as is
    if (result.error || result.message) {
      return result;
    }
    
    return {
      periodStart: startDate,
      periodEnd: endDate,
      totalSalary: result.totalSalary || 0,
      salaryBreakdown: result.salaryBreakdown || [],
      orderCount: result.orderCount || 0,
      totalOrderValue: result.totalOrderValue || 0,
      totalProductionCosts: result.totalProductionCosts || 0
    };
  },
};

