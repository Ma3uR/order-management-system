import { 
  getOrdersCount, 
  getLastOrder, 
  getOrdersByPhone, 
  getOrdersByStatus, 
  calculateBalanceForPeriod, 
  calculateSalaryForPeriod,
  getTopProductsByPopularity,
  getLeastPopularProducts,
  calculateAverageOrderValue,
  getOrdersBeingAssembled
} from './services/orders';

import {
  addExpense,
  getExpensesForPeriod,
  deleteExpense
} from './services/expenses';

// Define the available functions
export const availableFunctions = [
  {
    name: 'getOrdersCount',
    description: 'Get the total count of orders in the system',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'getLastOrder',
    description: 'Get the most recent order in the system',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'getOrdersByPhone',
    description: 'Get orders for a specific customer by phone number',
    parameters: {
      type: 'object',
      properties: {
        phoneNumber: {
          type: 'string',
          description: 'Customer phone number to search for'
        }
      },
      required: ['phoneNumber']
    }
  },
  {
    name: 'getOrdersByStatus',
    description: 'Get orders with a specific status',
    parameters: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          description: 'Status to filter orders by (e.g., "being assembled")'
        }
      },
      required: ['status']
    }
  },
  {
    name: 'calculateBalanceForPeriod',
    description: 'Calculate income minus expenses for a specific period',
    parameters: {
      type: 'object',
      properties: {
        startDate: {
          type: 'string',
          description: 'Start date in ISO format (YYYY-MM-DD)'
        },
        endDate: {
          type: 'string',
          description: 'End date in ISO format (YYYY-MM-DD)'
        }
      },
      required: ['startDate', 'endDate']
    }
  },
  {
    name: 'calculateSalaryForPeriod',
    description: 'Calculate salary based on source rules for a specific period',
    parameters: {
      type: 'object',
      properties: {
        startDate: {
          type: 'string',
          description: 'Start date in ISO format (YYYY-MM-DD)'
        },
        endDate: {
          type: 'string',
          description: 'End date in ISO format (YYYY-MM-DD)'
        }
      },
      required: ['startDate', 'endDate']
    }
  },
  {
    name: 'getTopProductsByPopularity',
    description: 'Get most popular products by order count',
    parameters: {
      type: 'object',
      properties: {
        startDate: {
          type: 'string',
          description: 'Start date in ISO format (YYYY-MM-DD)'
        },
        endDate: {
          type: 'string',
          description: 'End date in ISO format (YYYY-MM-DD)'
        },
        limit: {
          type: 'number',
          description: 'Number of products to return (e.g., 20, 50, 100)'
        }
      },
      required: ['startDate', 'endDate', 'limit']
    }
  },
  {
    name: 'getLeastPopularProducts',
    description: 'Get least popular products by order count',
    parameters: {
      type: 'object',
      properties: {
        startDate: {
          type: 'string',
          description: 'Start date in ISO format (YYYY-MM-DD)'
        },
        endDate: {
          type: 'string',
          description: 'End date in ISO format (YYYY-MM-DD)'
        },
        limit: {
          type: 'number',
          description: 'Number of products to return (e.g., 20, 50, 100)'
        }
      },
      required: ['startDate', 'endDate', 'limit']
    }
  },
  {
    name: 'calculateAverageOrderValue',
    description: 'Calculate average order value for a specific period',
    parameters: {
      type: 'object',
      properties: {
        startDate: {
          type: 'string',
          description: 'Start date in ISO format (YYYY-MM-DD)'
        },
        endDate: {
          type: 'string',
          description: 'End date in ISO format (YYYY-MM-DD)'
        },
        source: {
          type: 'string',
          description: 'Optional marketplace/source to filter by'
        }
      },
      required: ['startDate', 'endDate']
    }
  },
  {
    name: 'addExpense',
    description: 'Add a new expense to the system',
    parameters: {
      type: 'object',
      properties: {
        amount: {
          type: 'number',
          description: 'Expense amount'
        },
        description: {
          type: 'string',
          description: 'Description of the expense'
        },
        date: {
          type: 'string',
          description: 'Date of the expense in ISO format (YYYY-MM-DD)'
        },
        category: {
          type: 'string',
          description: 'Optional expense category'
        }
      },
      required: ['amount', 'description', 'date']
    }
  },
  {
    name: 'getExpensesForPeriod',
    description: 'Get expenses for a specific period',
    parameters: {
      type: 'object',
      properties: {
        startDate: {
          type: 'string',
          description: 'Start date in ISO format (YYYY-MM-DD)'
        },
        endDate: {
          type: 'string',
          description: 'End date in ISO format (YYYY-MM-DD)'
        },
        category: {
          type: 'string',
          description: 'Optional category to filter expenses'
        }
      },
      required: ['startDate', 'endDate']
    }
  },
  {
    name: 'deleteExpense',
    description: 'Delete an expense',
    parameters: {
      type: 'object',
      properties: {
        expenseId: {
          type: 'string',
          description: 'ID of the expense to delete'
        }
      },
      required: ['expenseId']
    }
  },
  {
    name: 'getOrdersBeingAssembled',
    description: 'Get orders with "being assembled" status and count all products needed',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  }
];

// Execute a function based on the name and arguments
export async function executeFunction(functionName: string, args: Record<string, unknown>) {
  console.log(`Executing function ${functionName} with args:`, args);
  
  switch (functionName) {
    case 'getOrdersCount':
      return await getOrdersCount();
    case 'getLastOrder':
      return await getLastOrder();
    case 'getOrdersByPhone':
      if (typeof args.phoneNumber === 'string') {
        return await getOrdersByPhone(args.phoneNumber);
      }
      return { error: 'Invalid phone number provided' };
    case 'getOrdersByStatus':
      if (typeof args.status === 'string') {
        return await getOrdersByStatus(args.status);
      }
      return { error: 'Invalid status provided' };
    case 'calculateBalanceForPeriod':
      if (typeof args.startDate === 'string' && typeof args.endDate === 'string') {
        return await calculateBalanceForPeriod(args.startDate, args.endDate);
      }
      return { error: 'Invalid date range provided' };
    case 'calculateSalaryForPeriod':
      if (typeof args.startDate === 'string' && typeof args.endDate === 'string') {
        return await calculateSalaryForPeriod(args.startDate, args.endDate);
      }
      return { error: 'Invalid date range provided' };
    case 'getTopProductsByPopularity':
      if (typeof args.startDate === 'string' && typeof args.endDate === 'string' && typeof args.limit === 'number') {
        return await getTopProductsByPopularity(args.startDate, args.endDate, args.limit);
      }
      return { error: 'Invalid parameters provided' };
    case 'getLeastPopularProducts':
      if (typeof args.startDate === 'string' && typeof args.endDate === 'string' && typeof args.limit === 'number') {
        return await getLeastPopularProducts(args.startDate, args.endDate, args.limit);
      }
      return { error: 'Invalid parameters provided' };
    case 'calculateAverageOrderValue':
      if (typeof args.startDate === 'string' && typeof args.endDate === 'string') {
        const source = typeof args.source === 'string' ? args.source : undefined;
        return await calculateAverageOrderValue(args.startDate, args.endDate, source);
      }
      return { error: 'Invalid parameters provided' };
    case 'addExpense':
      if (
        typeof args.amount === 'number' && 
        typeof args.description === 'string' && 
        typeof args.date === 'string'
      ) {
        const category = typeof args.category === 'string' ? args.category : undefined;
        return await addExpense(args.amount, args.description, args.date, category);
      }
      return { error: 'Invalid parameters provided' };
    case 'getExpensesForPeriod':
      if (typeof args.startDate === 'string' && typeof args.endDate === 'string') {
        const category = typeof args.category === 'string' ? args.category : undefined;
        return await getExpensesForPeriod(args.startDate, args.endDate, category);
      }
      return { error: 'Invalid date range provided' };
    case 'deleteExpense':
      if (typeof args.expenseId === 'string') {
        return await deleteExpense(args.expenseId);
      }
      return { error: 'Invalid expense ID provided' };
    case 'getOrdersBeingAssembled':
      return await getOrdersBeingAssembled();
    default:
      return { error: `Unknown function: ${functionName}` };
  }
} 