'use client';

import { useState, useEffect, Suspense } from 'react';
import { loginUser } from '@/app/lib/pocketbase';
import { redirect, useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { Card } from "@/app/components/shared/ui/card";
import { Input } from "@/app/components/shared/ui/input";
import { Button } from "@/app/components/shared/ui/button";
import { SplineScene } from "@/app/components/shared/ui/spline-scene";
import { Spotlight } from "@/app/components/shared/ui/spotlight";
import { Lock, Mail, AlertCircle } from "lucide-react";
import LanguageSwitcher from '@/app/components/shared/ui/LanguageSwitcher';
import { ThemeToggle } from '@/app/components/shared/ui/ThemeToggle';
import AnimatedWordCycle from '@/app/components/shared/ui/animated-text-cycle';
import { useTheme } from 'next-themes';
import { useSession } from '@/app/components/features/dashboard/useSession';

// Add these debug functions at the top after imports

// Debug helper to log and inspect all session information
function logSessionState(isAuthenticated: boolean, isLoading: boolean, message: string) {
  console.log(`[LoginPage] ${message}:`, {
    isAuthenticated,
    isLoading,
    pathname: typeof window !== 'undefined' ? window.location.pathname : 'SSR',
    href: typeof window !== 'undefined' ? window.location.href : 'SSR',
    hydrated: typeof window !== 'undefined',
    timestamp: new Date().toISOString()
  });
}

// Create a separate component that uses searchParams
function LoginForm() {
  const t = useTranslations('Auth');
  const locale = useLocale();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { isAuthenticated, isLoading, checkAuthState } = useSession();
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [redirectAttempted, setRedirectAttempted] = useState(false);
  
  // After hydration, we can access the theme
  useEffect(() => {
    setMounted(true);
    console.log('[LoginPage] Component mounted');
  }, []);
  
  // If user is already authenticated, redirect to dashboard
  useEffect(() => {
    // Track state for debugging
    logSessionState(isAuthenticated, isLoading, 'Redirect effect triggered');
    
    // Only redirect after loading is complete and we know user is authenticated
    if (!isLoading && isAuthenticated) {
      console.log('[LoginPage] User authenticated, attempting redirect to dashboard');
      
      // To avoid infinite redirect loops, only attempt redirect once
      if (!redirectAttempted) {
        setRedirectAttempted(true);
        
        // Get the current origin
        const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
        console.log('[LoginPage] Current origin:', currentOrigin);
        
        // Check if there's a callback URL in the query parameters
        let dashboardUrl = `/${locale}/dashboard`;
        
        if (typeof window !== 'undefined') {
          // Parse the URL to check for callback parameter
          const urlParams = new URLSearchParams(window.location.search);
          const callbackUrl = urlParams.get('callbackUrl');
          
          if (callbackUrl) {
            console.log('[LoginPage] Found callback URL:', callbackUrl);
            
            try {
              // Parse the callback URL to check its origin
              const callbackUrlObj = new URL(callbackUrl);
              
              // Only use callback if it's from the same origin or doesn't contain localhost
              if (callbackUrlObj.origin === currentOrigin || 
                  (!callbackUrlObj.origin.includes('localhost') && !currentOrigin.includes('localhost'))) {
                console.log('[LoginPage] Using callback URL path:', callbackUrlObj.pathname);
                dashboardUrl = callbackUrlObj.pathname + callbackUrlObj.search;
              } else {
                console.log('[LoginPage] Ignoring callback URL with different origin');
              }
            } catch (e) {
              console.error('[LoginPage] Invalid callback URL:', e);
            }
          }
        }
        
        // Log the final redirect URL
        console.log('[LoginPage] Final redirect URL:', dashboardUrl);
        
        // Try Next.js router first
        console.log('[LoginPage] Attempting router.push to:', dashboardUrl);
        router.push(dashboardUrl);
        
        // Force an auth state check after attempting redirect
        setTimeout(() => {
          console.log('[LoginPage] Verifying auth state after redirect attempt');
          checkAuthState();
        }, 300);
        
        // Fallback to direct navigation after a delay
        console.log('[LoginPage] Setting up fallback redirect');
        setTimeout(() => {
          // Double check we're still on login page before hard redirect
          if (typeof window !== 'undefined' && 
              window.location.pathname.includes('/login')) {
            console.log('[LoginPage] Router.push failed, using direct location change');
            window.location.href = dashboardUrl;
          }
        }, 1000);
      } else {
        console.log('[LoginPage] Redirect already attempted, waiting...');
      }
    }
  }, [isAuthenticated, isLoading, router, locale, redirectAttempted, checkAuthState]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      console.log('[LoginPage] Login attempt for:', email);
      // Login with PocketBase
      const result = await loginUser(email, password);
      
      if (result.success) {
        // Navigate to dashboard after successful login
        console.log('[LoginPage] Login successful, preparing redirect to dashboard');
        
        // Reset redirect attempted on successful login
        setRedirectAttempted(false);
        
        // Force a short delay to ensure cookie is set properly before redirect
        setTimeout(() => {
          const dashboardUrl = `/${locale}/dashboard`;
          console.log('[LoginPage] Executing redirect to:', dashboardUrl);
          router.push(dashboardUrl);
          
          // Fallback redirect
          setTimeout(() => {
            if (typeof window !== 'undefined' && 
                window.location.pathname.includes('/login')) {
              console.log('[LoginPage] Using fallback direct redirect');
              window.location.href = dashboardUrl;
            }
          }, 1000);
        }, 100);
      } else {
        console.log('[LoginPage] Login failed:', result.error);
        setError(result.error || t('loginError'));
      }
    } catch (err) {
      console.error('[LoginPage] Login error:', err);
      setError(err instanceof Error ? err.message : t('loginError'));
    } finally {
      setLoading(false);
    }
  };

  // Use the resolvedTheme for more accurate theme detection
  const currentTheme = mounted ? (resolvedTheme || theme) : undefined;
  const isDarkTheme = currentTheme === 'dark';

  if (!mounted) {
    // Render a placeholder with matching structure to avoid layout shift
    return (
      <div className="min-h-screen flex flex-col">
        <div className="login-bg"></div>
        <div className="login-bg-overlay"></div>
        <div className="absolute top-4 right-4 z-10"></div>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-[calc(72rem+10rem)] h-[600px] bg-transparent"></div>
        </div>
      </div>
    );
  }

  // If already authenticated and still loading, show a loading indicator
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="ml-2">Loading authentication state...</p>
      </div>
    );
  }
  
  // If already authenticated (but hasn't redirected yet), show a message
  if (isAuthenticated) {
    return redirect(`/${locale}/dashboard`);
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Background elements */}
      <div className="login-bg"></div>
      <div className="login-bg-overlay"></div>
      
      {/* Header with Language and Theme Switchers */}
      <div className="absolute top-4 right-4 z-10 flex items-center space-x-2">
        <div className="flex items-center p-1 rounded-md bg-white/20 backdrop-blur-md border border-white/10 shadow-lg">
          <LanguageSwitcher />
          <div className="theme-toggle-wrapper">
            <ThemeToggle />
          </div>
        </div>
      </div>
      
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-[calc(72rem+10rem)] bg-transparent backdrop-blur-xl shadow-2xl border border-slate-500/20 dark:border-slate-700/20 relative overflow-hidden">
          <Spotlight
            className="-top-40 left-0 md:-top-20"
            fill={isDarkTheme ? 'white' : 'rgba(0, 50, 150, 0.5)'}
          />
          
          <div className="flex flex-col md:flex-row h-[600px]">
            {/* Left: Login Form */}
            <div className="flex-1 p-8 relative z-10 flex flex-col justify-center">
              <div className="space-y-6">
                <div className="space-y-2 text-center mb-8">
                  <h1 className="text-3xl font-bold">
                    <AnimatedWordCycle 
                      words={[
                        t("orderManagement"),
                        t("automateWorkflows"),
                        t("streamlineOrders"),
                        t("boostEfficiency")
                      ]}
                      interval={3000}
                      className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-indigo-600 dark:from-blue-400 dark:to-indigo-500"
                    />
                  </h1>
                  <p className="text-slate-700 dark:text-slate-200">
                    {t('loginSubtitle')}
                  </p>
                </div>
                
                {error && (
                  <div className="bg-red-100 dark:bg-red-500/20 border border-red-300 dark:border-red-500/50 text-red-600 dark:text-red-200 p-3 rounded-md flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    <span>{error}</span>
                  </div>
                )}
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm text-slate-700 dark:text-slate-200" htmlFor="email">
                      {t('emailLabel')}
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 dark:text-slate-400 h-4 w-4" />
                      <Input
                        id="email"
                        type="email"
                        className="pl-10 bg-white/80 dark:bg-white/10 border-slate-300 dark:border-slate-500/30 text-slate-900 dark:text-white"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={t('emailPlaceholder')}
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm text-slate-700 dark:text-slate-200" htmlFor="password">
                      {t('passwordLabel')}
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 dark:text-slate-400 h-4 w-4" />
                      <Input
                        id="password"
                        type="password"
                        className="pl-10 bg-white/80 dark:bg-white/10 border-slate-300 dark:border-slate-500/30 text-slate-900 dark:text-white"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={t('passwordPlaceholder')}
                        required
                      />
                    </div>
                  </div>
                  
                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                    disabled={loading}
                  >
                    {loading ? t('loggingIn') : t('login')}
                  </Button>
                </form>
              </div>
            </div>
            
            {/* Right: 3D Scene */}
            <div className="flex-1 relative hidden md:block">
              <SplineScene 
                scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
                className="w-full h-full"
              />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

// Loading fallback for Suspense
function LoginLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  );
}

// Main component with Suspense boundary
export default function LoginPage() {
  return (
    <Suspense fallback={<LoginLoading />}>
      <LoginForm />
    </Suspense>
  );
} 