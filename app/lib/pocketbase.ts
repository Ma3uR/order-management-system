import PocketBase, { AdminAuthResponse } from 'pocketbase';
import { OrdersResponse, OrdersRecord, OrdersMergeStatusOptions, OrdersMergeSourceOptions } from '../types/pocketbase-types';
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

// Create a singleton instance
let pb: PocketBase;

// Initialize the PocketBase client
function initPocketBase() {
    if (pb) return pb;
    
    pb = new PocketBase(getPocketBaseUrl());
    
    // Enable both cookie-based auth and localStorage persistence for client-side usage
    if (typeof window !== 'undefined') {
        // Enable cookie auth - This is essential for middleware to work
        pb.autoCancellation(false);
        pb.authStore.onChange(() => {
            // When auth state changes, set the cookie for server-side use
            document.cookie = pb.authStore.exportToCookie({ httpOnly: false });
            
            try {
                if (pb.authStore.isValid) {
                    // Also save to localStorage as a backup persistence strategy
                    localStorage.setItem('pocketbase_auth', JSON.stringify({
                        token: pb.authStore.token,
                        model: pb.authStore.model
                    }));
                    console.log('Saved auth to localStorage and cookie:', {
                        userId: pb.authStore.model?.id,
                        isValid: pb.authStore.isValid
                    });
                } else {
                    localStorage.removeItem('pocketbase_auth');
                    console.log('Cleared auth (invalid)');
                }
            } catch (err) {
                console.error('Error saving auth data:', err);
            }
        });
        
        try {
            // Try to load from localStorage if necessary
            const storedAuthData = localStorage.getItem('pocketbase_auth');
            if (storedAuthData && !pb.authStore.isValid) {
                const authData = JSON.parse(storedAuthData);
                pb.authStore.save(authData.token, authData.model);
                // Ensure cookie is set
                document.cookie = pb.authStore.exportToCookie({ httpOnly: false });
                console.log('Restored auth from localStorage:', {
                    userId: authData.model?.id,
                    isValid: pb.authStore.isValid
                });
            }
        } catch (err) {
            console.error('Error loading auth from local storage:', err);
            localStorage.removeItem('pocketbase_auth');
            pb.authStore.clear();
        }
    }
    
    return pb;
}

// Get the PocketBase instance
const pocketBase = initPocketBase();

// Add authentication state tracking
let authPromise: Promise<AdminAuthResponse> | null = null;

// Authenticate admin on the server side
export async function authenticateAdmin() {
    if (pocketBase.authStore.isValid) {
        return;
    }

    // Reuse existing auth promise if one is in progress
    if (authPromise) {
        return authPromise;
    }

    authPromise = pocketBase.admins.authWithPassword(
        process.env.NEXT_PUBLIC_POCKETBASE_ADMIN_EMAIL!,
        process.env.NEXT_PUBLIC_POCKETBASE_ADMIN_PASSWORD!
    ).finally(() => {
        authPromise = null;
    });

    return authPromise;
}

// Helper to login a user and save to localStorage and cookie
export async function loginUser(email: string, password: string) {
    try {
        const authData = await pocketBase.collection('users').authWithPassword(email, password);
        
        // Ensure the cookie is set correctly
        if (typeof window !== 'undefined') {
            document.cookie = pocketBase.authStore.exportToCookie({ httpOnly: false });
        }
        
        console.log('User authenticated:', {
            userId: authData.record.id,
            email: authData.record.email
        });
        
        return {
            success: true,
            user: authData.record
        };
    } catch (error) {
        console.error('Login error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

// Helper to logout a user
export function logoutUser() {
    pocketBase.authStore.clear();
    if (typeof window !== 'undefined') {
        localStorage.removeItem('pocketbase_auth');
        // Clear the cookie
        document.cookie = "pb_auth=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    }
}

// Helper to get current user
export function getCurrentUser() {
    if (pocketBase.authStore.isValid) {
        return pocketBase.authStore.model;
    }
    return null;
}

// Helper to check if user is authenticated
export function isAuthenticated() {
    return pocketBase.authStore.isValid;
}

// Optional: Add a method to check if admin is authenticated
export function isAdminAuthenticated() {
    return pocketBase.authStore.isValid && pocketBase.authStore.model?.type === 'admin';
}

// Wrapper function for authenticated collection calls
export async function authenticatedCall<T>(callback: () => Promise<T>): Promise<T> {
  try {
    console.log('Attempting authentication with URL:', pocketBase.baseUrl);
    await authenticateAdmin();
    return await callback();
  } catch (error) {
    if (error instanceof Error) {
      console.error('Authentication error details:', {
        message: error.message,
        url: pocketBase.baseUrl,
        stack: error.stack,
        cause: error.cause
      });
    }
    throw error;
  }
}

export async function fetchOrders(): Promise<OrdersResponse[]> {
  return authenticatedCall(async () => {
    const orders = await pocketBase.collection('orders').getFullList<OrdersResponse>();
    
    // Clean and validate each order
    return orders.map(order => {
      // Handle empty string or invalid mergeSource
      let validMergeSource = undefined;
      if (typeof order.mergeSource === 'string' && order.mergeSource.length > 0) {
        // Check if it's a valid enum value
        if ([OrdersMergeSourceOptions.phone, OrdersMergeSourceOptions.name].includes(order.mergeSource as OrdersMergeSourceOptions)) {
          validMergeSource = order.mergeSource as OrdersMergeSourceOptions;
        }
      }

      return {
        ...order,
        // Ensure products have valid titles
        products: Array.isArray(order.products) 
          ? order.products.map(product => ({
              ...product,
              title: product.title || product.name || 'Untitled Product',
              quantity: Math.max(1, product.quantity || 1),
              price: Math.max(0, product.price || 0)
            }))
          : [],
        // Use the validated mergeSource
        mergeSource: validMergeSource || OrdersMergeSourceOptions.none,
        // Ensure mergeStatus has a valid value
        mergeStatus: order.mergeStatus || OrdersMergeStatusOptions.none
      };
    });
  });
}

// Add this new function to get default status
export async function getDefaultStatus(): Promise<string> {
  const statuses = await authenticatedCall(() => 
    pocketBase.collection('status_options').getFullList({
      sort: '+priority', // Sort by priority ascending
      limit: 1 // Get only one record
    })
  );
  
  if (!statuses) {
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
  //TODO: get default status from pocketbase
  const defaultStatus = 'xbqw6zjruht03og'
  
  // Calculate totals from products
  const amount = productInputs.reduce((sum, p) => sum + (p.price * p.quantity), 0);
  const numberOfItems = productInputs.reduce((sum, p) => sum + p.quantity, 0);
  
  // Format products for PocketBase and ensure title is present
  const products = productInputs.map(p => ({
    title: p.title || '',  // Ensure title is never undefined
    quantity: Math.max(1, p.quantity || 1),
    price: Math.max(0, p.price || 0)
  })).filter(p => p.title.length > 0); // Filter out products with empty titles

  if (products.length === 0) {
    throw new Error('At least one valid product with a title is required');
  }

  const completeOrderData: Partial<OrdersRecord> = {
    ...orderData as OrdersRecord,
    status: defaultStatus,
    amount,
    numberOfItems,
    products,
    mergeStatus: OrdersMergeStatusOptions.none,
    mergeSource: OrdersMergeSourceOptions.none,
    // mergeSource is omitted for new orders
  };

  return authenticatedCall(() => 
    pocketBase.collection('orders').create<OrdersResponse>(completeOrderData)
  );
}

// Export default PocketBase instance
export default pocketBase;

// Add this temporarily to verify the connection
console.log('PocketBase URL:', pocketBase.baseUrl);

// Collection Types
export interface ExpensesRecord {
  id: string;
  created: string;
  updated: string;
  amount: number;
  description: string;
  date: string;
  category?: string;
  receipt?: string;
}