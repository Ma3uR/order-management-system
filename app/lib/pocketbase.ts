import PocketBase, { AdminAuthResponse } from 'pocketbase';
import { OrdersResponse, OrdersRecord, OrdersMergeStatusOptions, OrdersMergeSourceOptions } from '../types/pocketbase-types';
import * as dotenv from 'dotenv';
dotenv.config();

// Ensure the URL is properly formatted with protocol
const getPocketBaseUrl = () => {
    // In browser environment, check if we're in production
    if (typeof window !== 'undefined') {
        // Use environment variable in development, window.location.origin in production
        const isDevelopment = window.location.hostname === 'localhost';
        
        if (!isDevelopment) {
            // For production, log the current URL for debugging
            console.log("Current origin for PocketBase connection:", window.location.origin);
            
            // In production, always use the environment variable for PocketBase
            // This should be the correct PocketBase URL, not the app URL
            const pocketBaseUrl = process.env.NEXT_PUBLIC_POCKETBASE_URL;
            
            if (pocketBaseUrl) {
                // Make sure URL has protocol
                let finalUrl = pocketBaseUrl;
                if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
                    finalUrl = `http://${finalUrl}`;
                }
                console.log("Using configured PocketBase URL:", finalUrl);
                return finalUrl;
            }
            
            // If no URL is configured, log an error but still try with origin
            console.error("No PocketBase URL configured for production!");
            return window.location.origin;
        }
    }

    // For development or server-side rendering
    const url = process.env.NEXT_PUBLIC_POCKETBASE_URL;
    if (!url) {
        console.error("No PocketBase URL configured in environment variables!");
        return 'http://localhost:8090'; // Default fallback for local development
    }
    
    // Ensure URL has protocol
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return `http://${url}`;
    }
    
    return url;
};

// Create a singleton instance
let pb: PocketBase;

// Safe localStorage functions that work in both browser and server contexts
const safeLocalStorage = {
  setItem: (key: string, value: string) => {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(key, value);
        return true;
      } catch (err) {
        console.error('[PocketBase] Error accessing localStorage:', err);
        return false;
      }
    }
    return false;
  },
  getItem: (key: string) => {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        return window.localStorage.getItem(key);
      } catch (err) {
        console.error('[PocketBase] Error accessing localStorage:', err);
        return null;
      }
    }
    return null;
  },
  removeItem: (key: string) => {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.removeItem(key);
        return true;
      } catch (err) {
        console.error('[PocketBase] Error accessing localStorage:', err);
        return false;
      }
    }
    return false;
  }
};

// Initialize the PocketBase client
function initPocketBase() {
    if (pb) return pb;
    
    const pocketBaseUrl = getPocketBaseUrl();
    console.log('[PocketBase] Initializing with URL:', pocketBaseUrl);
    
    pb = new PocketBase(pocketBaseUrl);
    
    // Enable localStorage persistence for client-side usage
    if (typeof window !== 'undefined') {
        // Disable auto cancellation for consistent behavior
        pb.autoCancellation(false);
        
        // Setup the onChange handler to save to localStorage
        pb.authStore.onChange(() => {
            if (pb.authStore.isValid) {
                try {
                    // Save to localStorage only (no cookies)
                    safeLocalStorage.setItem('pocketbase_auth', JSON.stringify({
                        token: pb.authStore.token,
                        model: pb.authStore.model
                    }));
                    console.log('[PocketBase] Auth changed: Saved to localStorage:', {
                        userId: pb.authStore.model?.id,
                        isValid: pb.authStore.isValid
                    });
                } catch (err) {
                    console.error('[PocketBase] Error saving auth data:', err);
                }
            } else {
                safeLocalStorage.removeItem('pocketbase_auth');
                console.log('[PocketBase] Auth changed: Cleared invalid auth state');
            }
        });
    }
    
    // Try to restore auth from localStorage if needed
    try {
        const storedAuthData = safeLocalStorage.getItem('pocketbase_auth');
        if (storedAuthData && !pb.authStore.isValid) {
            const authData = JSON.parse(storedAuthData);
            console.log('[PocketBase] Found stored auth data, attempting to restore');
            
            // Save to PocketBase auth store
            pb.authStore.save(authData.token, authData.model);
            
            if (pb.authStore.isValid) {
                console.log('[PocketBase] Restored auth from localStorage:', {
                    userId: authData.model?.id,
                    isValid: pb.authStore.isValid
                });
            } else {
                console.log('[PocketBase] Restored auth is not valid, clearing');
                safeLocalStorage.removeItem('pocketbase_auth');
                pb.authStore.clear();
            }
        }
    } catch (err) {
        console.error('[PocketBase] Error loading auth from local storage:', err);
        safeLocalStorage.removeItem('pocketbase_auth');
        pb.authStore.clear();
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

// Helper to login a user and save to localStorage
export async function loginUser(email: string, password: string) {
  try {
    console.log('[PocketBase] Login attempt for:', email);
    
    // Log pre-login state
    console.log('[PocketBase] Auth state before login:', {
      isValid: pocketBase.authStore.isValid,
      hasToken: !!pocketBase.authStore.token,
      baseUrl: pocketBase.baseUrl
    });
    
    const authData = await pocketBase.collection('users').authWithPassword(email, password);
    
    // Save auth data to localStorage only
    if (typeof window !== 'undefined') {
      try {
        safeLocalStorage.setItem('pocketbase_auth', JSON.stringify({
          token: pocketBase.authStore.token,
          model: pocketBase.authStore.model
        }));
        console.log('[PocketBase] Auth data saved to localStorage');
      } catch (storageError) {
        console.error('[PocketBase] Failed to save to localStorage:', storageError);
      }
    }
    
    console.log('[PocketBase] User authenticated:', {
      userId: authData.record.id,
      email: authData.record.email,
      isValid: pocketBase.authStore.isValid,
      hasToken: !!pocketBase.authStore.token
    });
    
    return {
      success: true,
      user: authData.record
    };
  } catch (error) {
    console.error('[PocketBase] Login error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Helper to logout a user
export function logoutUser() {
    console.log('[PocketBase] Logout initiated, clearing auth state');
    
    try {
        // Clear the PocketBase auth store first
        pocketBase.authStore.clear();
        
        // Browser-only operations
        if (typeof window !== 'undefined') {
            // Clear localStorage
            safeLocalStorage.removeItem('pocketbase_auth');
            console.log('[PocketBase] Auth cleared from localStorage');
            
            // Force a redirect to login to ensure all state is reset
            console.log('[PocketBase] Redirecting to login after logout');
            window.location.href = `/${window.location.pathname.split('/')[1] || 'en'}/login`;
        }
    } catch (err) {
        console.error('[PocketBase] Error during logout:', err);
        
        // Last resort - if there's an error, try a very basic logout
        if (typeof window !== 'undefined') {
            safeLocalStorage.removeItem('pocketbase_auth');
            window.location.href = '/login';
        }
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
  console.log('[PocketBase] isAuthenticated check', {
    isValid: pocketBase.authStore.isValid,
    model: pocketBase.authStore.model,
    token: pocketBase.authStore.token ? 'exists' : 'missing'
  });
  return pocketBase.authStore.isValid;
}

// Optional: Add a method to check if admin is authenticated
export function isAdminAuthenticated() {
    return pocketBase.authStore.isValid && pocketBase.authStore.model?.type === 'admin';
}

// Wrapper function for authenticated collection calls
export async function authenticatedCall<T>(callback: () => Promise<T>): Promise<T> {
  try {
    // Only attempt authentication if not already authenticated
    if (!pocketBase.authStore.isValid) {
      await authenticateAdmin();
    }
    
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