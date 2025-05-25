import pb, { authenticatedCall } from '../pocketbase';
import { OrdersRecord, ExpensesRecord } from '@/app/types/pocketbase-types';

// Type for expanded order record
interface ExpandedOrderRecord extends OrdersRecord {
  expand?: {
    source?: {
      id: string;
      name: string;
      [key: string]: string | number | boolean | null;
    };
  };
}

// Type for expanded expense record
interface ExpandedExpenseRecord extends ExpensesRecord {
  expand?: {
    category?: {
      id: string;
      name: string;
      [key: string]: string | number | boolean | null;
    };
  };
}

/**
 * Calculate balance (income - expenses) for a specified period
 * 
 * @param startDate Start date in YYYY-MM-DD format
 * @param endDate End date in YYYY-MM-DD format
 * @returns Object with income, expenses and balance data
 */
export async function calculateBalanceForPeriod(
  startDate: string,
  endDate: string
) {
  try {
    // Convert to Date objects for comparison
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Validate dates
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return {
        error: true,
        message: 'Invalid date format. Please use YYYY-MM-DD format.'
      };
    }
    
    // Calculate income from orders in the period
    const orders = await authenticatedCall(async () => pb.collection<OrdersRecord>('orders').getList(1, 50, {
      filter: `created >= "${startDate}" && created <= "${endDate}" && status != "Скасовано"`,
      expand: 'source',
    }));
    
    // Calculate total income from orders
    const totalIncome = orders.items.reduce((sum, order) => {
      const typedOrder = order;
      return sum + (typedOrder.amount || 0);
    }, 0);
    
    // Get expenses for the period
    const expenses = await authenticatedCall(async () => pb.collection<ExpensesRecord>('expenses').getList(1, 50, {
      filter: `date >= "${startDate}" && date <= "${endDate}"`,
      expand: 'category',
    }));
    
    // Calculate total expenses
    const totalExpenses = expenses.items.reduce((sum: number, expense) => {
      const typedExpense = expense as ExpandedExpenseRecord;
      return sum + (typedExpense.amount || 0);
    }, 0);
    
    // Group orders by marketplace for breakdown
    const incomeBreakdown = orders.items.reduce((acc: Record<string, number>, order) => {
      const typedOrder = order as ExpandedOrderRecord;
      const sourceId = typedOrder.source || 'unknown';
      
      // Get source name from expanded data if available
      let sourceName = 'unknown';
      if (sourceId && typedOrder.expand?.source?.name) {
        sourceName = typedOrder.expand.source.name;
      } else {
        sourceName = sourceId;
      }
      
      if (!acc[sourceName]) {
        acc[sourceName] = 0;
      }
      acc[sourceName] += typedOrder.amount || 0;
      return acc;
    }, {} as Record<string, number>);
    
    // Group expenses by category for breakdown
    const expensesBreakdown = expenses.items.reduce((acc: Record<string, number>, expense) => {
      const typedExpense = expense as ExpandedExpenseRecord;
      const categoryId = typedExpense.category || 'other';
      
      // Get category name from expanded data if available
      let categoryName = 'Other';
      if (categoryId && typedExpense.expand?.category?.name) {
        categoryName = typedExpense.expand.category.name;
      } else {
        categoryName = categoryId;
      }
      
      if (!acc[categoryName]) {
        acc[categoryName] = 0;
      }
      acc[categoryName] += typedExpense.amount || 0;
      return acc;
    }, {} as Record<string, number>);
    
    return {
      periodStart: startDate,
      periodEnd: endDate,
      totalIncome,
      totalExpenses,
      netBalance: totalIncome - totalExpenses,
      incomeBreakdown: Object.entries(incomeBreakdown).map(([source, amount]) => ({ source, amount })),
      expensesBreakdown: Object.entries(expensesBreakdown).map(([category, amount]) => ({ category, amount })),
      count: orders.items.length
    };
  } catch (error) {
    console.error('Error calculating balance:', error);
    return {
      error: true,
      message: 'Failed to calculate balance. Please try again later.'
    };
  }
} 