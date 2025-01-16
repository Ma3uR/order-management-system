import PocketBase, { AdminAuthResponse } from 'pocketbase';
import { OrdersResponse, OrdersRecord } from '../types/pocketbase-types';
import * as dotenv from 'dotenv';
dotenv.config();
// Ensure the URL is properly formatted with protocol
const getPocketBaseUrl = () => {
    const url = process.env.NEXT_PUBLIC_POCKETBASE_URL;
    if (!url?.startsWith('http://') && !url?.startsWith('https://')) {
        return `http://${url}`;
    }
    return url;
};

// Create a single PocketBase instance
const pb = new PocketBase(getPocketBaseUrl());

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
    console.log('Attempting authentication with URL:', pb.baseUrl);
    await authenticateAdmin();
    return await callback();
  } catch (error) {
    if (error instanceof Error) {
      console.error('Authentication error details:', {
        message: error.message,
        url: pb.baseUrl,
        stack: error.stack,
        cause: error.cause
      });
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

// Add this temporarily to verify the connection
console.log('PocketBase URL:', pb.baseUrl);