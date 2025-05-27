import pb, { authenticatedCall } from '../pocketbase';
import { OrdersResponse, ExpensesRecord } from '@/app/types/pocketbase-types';

// Type for expanded order record
interface ExpandedOrderRecord extends OrdersResponse {
  expand?: {
    source?: {
      id: string;
      name: string;
      percentage?: number | null;
      [key: string]: string | number | boolean | null | undefined;
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
    const orders = await authenticatedCall(async () => pb.collection<OrdersResponse>('orders').getList(1, 50, {
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

/**
 * Calculate salary based on order sources and their respective percentages for a specified period
 * 
 * @param startDate Start date in YYYY-MM-DD format
 * @param endDate End date in YYYY-MM-DD format
 * @returns Object with salary calculation data and orders list
 */
export async function calculateSalaryForPeriod(
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
    
    // Get orders for the period with source expansion
    const orders = await authenticatedCall(async () => pb.collection<OrdersResponse>('orders').getList(1, 50, {
      filter: `created >= "${startDate}" && created <= "${endDate}" && status != "Скасовано"`,
      expand: 'source',
    })); 
    
    let totalSalary = 0;
    let totalOrderValue = 0;
    let totalProductionCosts = 0;
    const salaryBreakdown: Array<{ source: string; orderValue: number; productionCost: number; salary: number; percentage: number }> = [];
    const ordersWithSalary: Array<{
      id: string;
      orderNumber?: string;
      amount: number;
      productionCost: number;
      source: string;
      percentage: number;
      salary: number;
      created: string;
      status?: string;
    }> = [];
    
    // Calculate salary for each order
    for (const order of orders.items) {
      const typedOrder = order as ExpandedOrderRecord;
      const orderAmount = typedOrder.amount || 0;
      const productionCost = typedOrder.productionCost || 0;
      
      // Calculate the value after subtracting production cost
      const calculationBase = orderAmount - productionCost;
      
      // Get source name and percentage
      let sourceName = 'unknown';
      let percentage = 10; // Default percentage for other sources
      
      if (typedOrder.expand?.source?.name) {
        sourceName = typedOrder.expand.source.name;
        
        // Get percentage from source if available, otherwise use default based on source name
        if (typedOrder.expand.source.percentage) {
          percentage = Number(typedOrder.expand.source.percentage);
        } else {
          // Default percentages based on source name
          const lowerSourceName = sourceName.toLowerCase();
          if (lowerSourceName.includes('rozetka') || lowerSourceName.includes('promua')) {
            percentage = 8;
          } else if (lowerSourceName.includes('kasta') || lowerSourceName.includes('epicentr') || lowerSourceName.includes('shafa')) {
            percentage = 8.5;
          } else {
            percentage = 10; // website, Instagram, Facebook, Viber, Telegram
          }
        }
      }
      
      // Calculate salary for this order
      const orderSalary = (calculationBase * percentage) / 100;
      
      totalSalary += orderSalary;
      totalOrderValue += orderAmount;
      totalProductionCosts += productionCost;
      
      // Add to breakdown
      const existingBreakdown = salaryBreakdown.find(item => item.source === sourceName);
      if (existingBreakdown) {
        existingBreakdown.orderValue += orderAmount;
        existingBreakdown.productionCost += productionCost;
        existingBreakdown.salary += orderSalary;
      } else {
        salaryBreakdown.push({
          source: sourceName,
          orderValue: orderAmount,
          productionCost: productionCost,
          salary: orderSalary,
          percentage: percentage
        });
      }
      
      // Add order to the list with salary calculation
      ordersWithSalary.push({
        id: typedOrder.id,
        orderNumber: typedOrder.orderNumber,
        amount: orderAmount,
        productionCost: productionCost,
        source: sourceName,
        percentage: percentage,
        salary: orderSalary,
        created: typedOrder.created,
        status: typedOrder.status
      });
    }
    
    return {
      periodStart: startDate,
      periodEnd: endDate,
      totalSalary,
      totalOrderValue,
      totalProductionCosts,
      orderCount: orders.items.length,
      salaryBreakdown,
      orders: ordersWithSalary
    };
  } catch (error) {
    console.error('Error calculating salary:', error);
    return {
      error: true,
      message: 'Failed to calculate salary. Please try again later.'
    };
  }
}
