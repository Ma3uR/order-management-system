import PocketBase, { AdminAuthResponse, ClientResponseError } from 'pocketbase';
import { OrdersResponse, OrdersRecord } from '../types/pocketbase-types';

// Create a single PocketBase instance
const pb = new PocketBase(process.env.NEXT_PUBLIC_POCKETBASE_URL);

// Add authentication state tracking
let authPromise: Promise<AdminAuthResponse> | null = null;

// Authenticate admin on the server side
export async function authenticateAdmin() {
    if (pb.authStore.isValid) {
        return;
    }

    // Reuse existing auth promise if one is in progress
    if (authPromise) {
        return authPromise;
    }

    authPromise = pb.admins.authWithPassword(
        process.env.NEXT_PUBLIC_POCKETBASE_ADMIN_EMAIL!,
        process.env.NEXT_PUBLIC_POCKETBASE_ADMIN_PASSWORD!
    ).finally(() => {
        authPromise = null;
    });

    return authPromise;
}

// Optional: Add a method to check if admin is authenticated
export function isAdminAuthenticated() {
    return pb.authStore.isValid && pb.authStore.model?.type === 'admin';
}

// Wrapper function for authenticated collection calls
export async function authenticatedCall<T>(callback: () => Promise<T>): Promise<T> {
  try {
    await authenticateAdmin();
    return await callback();
  } catch (error) {
    // Ignore auto-cancelled requests
    if (error instanceof Error && error.message.includes('autocancelled')) {
      return Promise.reject(new Error('Request cancelled'));
    }

    // Log detailed error information
    if (error instanceof Error && 'response' in error) {
      const clientError = error as ClientResponseError;
      console.error('Detailed error:', {
        message: clientError.message,
        response: clientError.response,
        data: clientError.data
      });
    }
    
    // If we get a 401 or 403, try to re-authenticate once
    if (error instanceof Error && 'status' in error && (error.status === 401 || error.status === 403)) {
      pb.authStore.clear();
      await authenticateAdmin();
      return await callback();
    }
    
    throw error;
  }
}

export async function fetchOrders(): Promise<OrdersResponse[]> {
  return authenticatedCall(() => pb.collection('orders').getFullList<OrdersResponse>());
}

// Add this new function to get default status
export async function getDefaultStatus(): Promise<string> {
  const statuses = await authenticatedCall(() => 
    pb.collection('status_options').getFullList({
      sort: '+priority', // Sort by priority ascending
      limit: 1 // Get only one record
    })
  );
  
  if (!statuses.length) {
    throw new Error('No status options found');
  }
  
  return statuses[0].id;
}

interface ProductInput {
  title: string;
  quantity: number;
  price: number;
}

export async function createOrder(
  orderData: Partial<OrdersRecord>, 
  productInputs: ProductInput[]
): Promise<OrdersResponse> {
  const defaultStatus = await getDefaultStatus();
  
  // Calculate totals from products
  const amount = productInputs.reduce((sum, p) => sum + (p.price * p.quantity), 0);
  const numberOfItems = productInputs.reduce((sum, p) => sum + p.quantity, 0);
  
  // Format products for PocketBase
  const products = productInputs.map(p => ({
    name: p.title,
    quantity: p.quantity,
    price: p.price
  }));

  const completeOrderData: OrdersRecord = {
    ...orderData as OrdersRecord,
    status: defaultStatus,
    amount,
    numberOfItems,
    products,
  };

  return authenticatedCall(() => 
    pb.collection('orders').create<OrdersResponse>(completeOrderData)
  );
}

// Only export pb once, as default
export default pb; 