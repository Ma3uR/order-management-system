import PocketBase, { AdminAuthResponse } from 'pocketbase';
import { OrdersResponse, OrdersMergeStatusOptions, OrdersMergeSourceOptions, UsersRoleOptions } from '../types/pocketbase-types';
import { UsersResponse } from '../types/pocketbase-types';
import * as dotenv from 'dotenv';
dotenv.config();

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
        pb.authStore.onChange((token, model) => {
            console.log('🔄 [PocketBase authStore] Auth store changed:', {
                hasToken: !!token,
                hasModel: !!model,
                modelId: model?.id,
                modelEmail: model?.email,
                modelType: model?.collectionName || model?.type,
                isValid: pb.authStore.isValid,
                timestamp: new Date().toISOString(),
                stackTrace: new Error('Auth change').stack?.split('\n').slice(0, 5)
            });
            
            if (pb.authStore.isValid) {
                try {
                    // Save to localStorage only (no cookies)
                    safeLocalStorage.setItem('pocketbase_auth', JSON.stringify({
                        token: pb.authStore.token,
                        model: pb.authStore.model
                    }));
                    console.log('✅ [PocketBase] Auth saved to localStorage:', {
                        userId: pb.authStore.model?.id,
                        email: pb.authStore.model?.email,
                        isValid: pb.authStore.isValid
                    });
                } catch (err) {
                    console.error('❌ [PocketBase] Error saving auth data:', err);
                }
            } else {
                safeLocalStorage.removeItem('pocketbase_auth');
                console.log('🗑️ [PocketBase] Auth cleared - invalid auth state');
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
export async function loginUser(email: string, password: string): Promise<{ user: UsersResponse; isAdmin: boolean }> {
  console.log(`🚀 [loginUser] Starting login for:`, email);
  
  try {
    // Clear any existing auth first
    pb.authStore.clear();
    console.log(`🧹 [loginUser] Cleared existing auth`);
    
    // First try admin login
    console.log(`🔐 [loginUser] Attempting PocketBase admin login...`);
    try {
      const adminAuth = await pb.admins.authWithPassword(email, password);
      console.log(`✅ [loginUser] PocketBase admin login successful:`, {
        id: adminAuth.admin.id,
        email: adminAuth.admin.email,
        token: !!adminAuth.token
      });
      
      const adminUser = {
        id: adminAuth.admin.id,
        email: adminAuth.admin.email,
        emailVisibility: false,
        name: adminAuth.admin.email, // Admins don't have separate names
        username: adminAuth.admin.email,
        verified: true,
        role: UsersRoleOptions.admin,
        created: adminAuth.admin.created || '',
        updated: adminAuth.admin.updated || '',
        collectionId: '',
        collectionName: 'users',
      } as UsersResponse;
      
      console.log(`🎯 [loginUser] Returning admin user:`, adminUser);
      return { user: adminUser, isAdmin: true };
      
    } catch (adminError) {
      console.log(`❌ [loginUser] Admin login failed (this is normal for regular users):`, adminError);
      
      // If admin login fails, try regular user login
      console.log(`👤 [loginUser] Attempting regular user login...`);
      const userAuth = await pb.collection('users').authWithPassword(email, password);
      console.log(`✅ [loginUser] Regular user login successful:`, {
        id: userAuth.record.id,
        email: userAuth.record.email,
        name: userAuth.record.name,
        role: userAuth.record.role,
        token: !!userAuth.token
      });
      
      const regularUser = {
        id: userAuth.record.id,
        email: userAuth.record.email,
        emailVisibility: userAuth.record.emailVisibility || false,
        name: userAuth.record.name || userAuth.record.email,
        username: userAuth.record.username || userAuth.record.email,
        verified: userAuth.record.verified || false,
        role: userAuth.record.role || UsersRoleOptions.user,
        created: userAuth.record.created || '',
        updated: userAuth.record.updated || '',
        collectionId: userAuth.record.collectionId || '',
        collectionName: userAuth.record.collectionName || 'users',
      } as UsersResponse;
      
      console.log(`🎯 [loginUser] Returning regular user:`, regularUser);
      return { user: regularUser, isAdmin: false };
    }
  } catch (error) {
    console.error(`❌ [loginUser] Login failed for ${email}:`, error);
    throw error;
  }
}

// Export the PocketBase instance
export { pb };

// Smart wrapper function for authenticated collection calls
// Preserves existing user auth instead of always switching to admin
export async function authenticatedCall<T>(callback: () => Promise<T>): Promise<T> {
  try {
    // If already authenticated (user or admin), just use existing auth
    if (pb.authStore.isValid) {
      console.log('🔍 [authenticatedCall] Using existing authentication:', {
        userId: pb.authStore.model?.id,
        email: pb.authStore.model?.email,
        type: pb.authStore.model?.collectionName || pb.authStore.model?.type || 'unknown'
      });
      
      try {
        // Try the operation with current auth first
        const result = await callback();
        console.log('✅ [authenticatedCall] Operation succeeded with current auth');
        return result;
      } catch (callbackError) {
        console.error('❌ [authenticatedCall] Operation failed with current auth:', {
          error: callbackError instanceof Error ? callbackError.message : String(callbackError),
          currentUser: pb.authStore.model?.email,
          currentAuthType: pb.authStore.model?.collectionName || pb.authStore.model?.type || 'unknown'
        });
        
        // **CRITICAL: DO NOT fall back to admin auth if user is logged in**
        // This was causing the user switching issue
        throw callbackError;
      }
    }
    
    // Only authenticate as admin if no user is logged in at all
    console.log('🔑 [authenticatedCall] No existing auth, attempting admin login...');
    await authenticateAdmin();
    
    return await callback();
  } catch (error) {
    if (error instanceof Error) {
      console.error('❌ [authenticatedCall] Final error:', {
        message: error.message,
        url: pb.baseUrl,
        currentUser: pb.authStore.model?.email,
        stack: error.stack?.split('\n').slice(0, 3)
      });
    }
    throw error;
  }
}

// Fetch orders with proper authentication (smart auth preserves user session)
export async function fetchOrders(): Promise<OrdersResponse[]> {
  return authenticatedCall(async () => {
    const orders = await pb.collection('orders').getFullList<OrdersResponse>();
    
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

// User-specific data fetching that works with regular user permissions
export async function fetchUserOrders(): Promise<OrdersResponse[]> {
  try {
    // Direct call without authenticatedCall wrapper for regular users
    console.log('🔍 [fetchUserOrders] Fetching orders with user permissions');
    
    if (!pb.authStore.isValid) {
      throw new Error('User not authenticated');
    }
    
    const orders = await pb.collection('orders').getFullList<OrdersResponse>();
    console.log(`✅ [fetchUserOrders] Successfully fetched ${orders.length} orders`);
    
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
  } catch (error) {
    console.error('❌ [fetchUserOrders] Failed to fetch orders with user permissions:', error);
    throw error;
  }
}

// Helper to logout a user
export function logoutUser() {
  console.log('🚪 [PocketBase] Logout initiated, clearing auth state');
  
  try {
    // Clear the PocketBase auth store first
    pb.authStore.clear();
    
    // Browser-only operations
    if (typeof window !== 'undefined') {
      // Clear localStorage
      safeLocalStorage.removeItem('pocketbase_auth');
      console.log('✅ [PocketBase] Auth cleared from localStorage');
      
      // Force a redirect to login to ensure all state is reset
      console.log('🔄 [PocketBase] Redirecting to login after logout');
      window.location.href = `/${window.location.pathname.split('/')[1] || 'en'}/login`;
    }
  } catch (err) {
    console.error('❌ [PocketBase] Error during logout:', err);
    
    // Last resort - if there's an error, try a very basic logout
    if (typeof window !== 'undefined') {
      safeLocalStorage.removeItem('pocketbase_auth');
      window.location.href = '/login';
    }
  }
}

// Helper to get current user
export function getCurrentUser() {
  if (pb.authStore.isValid) {
    return pb.authStore.model;
  }
  return null;
}

// Helper to check if user is authenticated
export function isAuthenticated() {
  console.log('🔍 [PocketBase] isAuthenticated check', {
    isValid: pb.authStore.isValid,
    model: pb.authStore.model,
    token: pb.authStore.token ? 'exists' : 'missing'
  });
  return pb.authStore.isValid;
}

// Optional: Add a method to check if admin is authenticated
export function isAdminAuthenticated() {
  return pb.authStore.isValid && pb.authStore.model?.type === 'admin';
}

// Export utilities
export { safeLocalStorage };

// Export default PocketBase instance
export default pocketBase;