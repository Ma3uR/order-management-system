import PocketBase from 'pocketbase';
import { UsersRoleOptions } from '../types/pocketbase-types';
import { UsersResponse } from '../types/pocketbase-types';
import * as dotenv from 'dotenv';
dotenv.config();

// Cookie helper functions for authentication
const setCookieAuth = (token: string, model: Record<string, unknown>) => {
  if (typeof document !== 'undefined') {
    try {
      // Set authentication cookie with auth data
      const isProduction = window.location.protocol === 'https:';
      const securityFlags = isProduction ? '; Secure; HttpOnly' : '';
      document.cookie = `pb_auth=${JSON.stringify({ token, model })}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax${securityFlags}`;
      console.log('✅ [PocketBase] Auth cookie set', { isProduction, securityFlags });
    } catch (err) {
      console.error('❌ [PocketBase] Error setting auth cookie:', err);
    }
  }
};

const clearCookieAuth = () => {
  if (typeof document !== 'undefined') {
    try {
      document.cookie = 'pb_auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      console.log('🗑️ [PocketBase] Auth cookie cleared');
    } catch (err) {
      console.error('❌ [PocketBase] Error clearing auth cookie:', err);
    }
  }
};

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
                    // Save to localStorage
                    safeLocalStorage.setItem('pocketbase_auth', JSON.stringify({
                        token: pb.authStore.token,
                        model: pb.authStore.model
                    }));
                    
                    // Also save to cookies for server-side API access
                    if (pb.authStore.model) {
                        setCookieAuth(pb.authStore.token, pb.authStore.model as Record<string, unknown>);
                    }
                    
                    console.log('✅ [PocketBase] Auth saved to localStorage and cookies:', {
                        userId: pb.authStore.model?.id,
                        email: pb.authStore.model?.email,
                        isValid: pb.authStore.isValid
                    });
                } catch (err) {
                    console.error('❌ [PocketBase] Error saving auth data:', err);
                }
            } else {
                safeLocalStorage.removeItem('pocketbase_auth');
                clearCookieAuth();
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

// Helper to logout a user
export function logoutUser() {
  console.log('😊 [PocketBase] Logout initiated, clearing auth state');
  
  try {
    // Clear the PocketBase auth store first
    pb.authStore.clear();
    
    // Browser-only operations
    if (typeof window !== 'undefined') {
      // Clear localStorage
      safeLocalStorage.removeItem('pocketbase_auth');
      
      // Clear auth cookies
      clearCookieAuth();
      
      console.log('✅ [PocketBase] Auth cleared from localStorage and cookies');
      
      // Force a redirect to login to ensure all state is reset
      console.log('🔄 [PocketBase] Redirecting to login after logout');
      window.location.href = `/${window.location.pathname.split('/')[1] || 'en'}/login`;
    }
  } catch (err) {
    console.error('❌ [PocketBase] Error during logout:', err);
    
    // Last resort - if there's an error, try a very basic logout
    if (typeof window !== 'undefined') {
      safeLocalStorage.removeItem('pocketbase_auth');
      clearCookieAuth();
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

// Export the PocketBase instance
export { pb };

// Export default PocketBase instance
export default pocketBase;
