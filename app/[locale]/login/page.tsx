'use client';

import { useState, useEffect } from 'react';
import { loginUser } from '@/app/lib/pocketbase';
import { signIn as nextAuthSignIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Card } from "@/app/components/shared/ui/card";
import { Input } from "@/app/components/shared/ui/input";
import { Button } from "@/app/components/shared/ui/button";
import { SplineScene } from "@/app/components/shared/ui/spline-scene";
import { Spotlight } from "@/app/components/shared/ui/spotlight";
import { Lock, Mail, AlertCircle } from "lucide-react";
import LanguageSwitcher from '@/app/components/shared/ui/LanguageSwitcher';
import { ThemeToggle } from '@/app/components/shared/ui/ThemeToggle';
import { Footer } from '@/app/components/layouts/footer';
import AnimatedWordCycle from '@/app/components/shared/ui/animated-text-cycle';
import { useTheme } from 'next-themes';

export default function LoginPage() {
  const t = useTranslations('Auth');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginResult, setLoginResult] = useState<Record<string, unknown> | null>(null);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const { data: session } = useSession();
  const { theme, resolvedTheme } = useTheme();
  
  // After hydration, we can access the theme
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // If user is already authenticated, redirect to dashboard
  useEffect(() => {
    if (session) {
      router.push('/dashboard');
    }
  }, [session, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      // Try direct PocketBase login first
      const pocketBaseResult = await loginUser(email, password);
      setLoginResult(pocketBaseResult);
      
      if (pocketBaseResult.success) {
        // Also authenticate with next-auth for session compatibility
        const nextAuthResult = await nextAuthSignIn('credentials', {
          redirect: false,
          email,
          password,
        });
        
        if (nextAuthResult?.error) {
          console.warn('Next Auth login error after successful PocketBase login:', nextAuthResult.error);
          // Continue anyway since PocketBase login succeeded
        }
        
        // Navigate to dashboard after successful login
        console.log('Login successful, redirecting to dashboard');
        router.push('/dashboard');
        router.refresh();
      } else {
        setError(pocketBaseResult.error || t('loginError'));
      }
    } catch (err) {
      console.error('Login error:', err);
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
      
      {/* Footer */}
      <Footer />
    </div>
  );
} 