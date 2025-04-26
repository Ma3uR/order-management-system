import { getOrdersCount, getLastOrder, getOrdersByPhone } from './services/orders';

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
    default:
      return { error: `Unknown function: ${functionName}` };
  }
} 