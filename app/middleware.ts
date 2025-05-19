import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const cookies = request.cookies;
  const path = request.nextUrl.pathname;
  
  // Get PocketBase auth cookie
  const authCookie = cookies.get('pb_auth');
  
  // Define protected paths that require authentication
  const protectedPaths = [
    '/dashboard',
    '/orders',
    '/settings',
    '/blacklist',
  ];
  
  // Define public paths (like login) that should redirect to dashboard if already authenticated
  const publicPaths = ['/login'];
  
  // Check if the current path requires authentication
  const requiresAuth = protectedPaths.some(protectedPath => 
    path.includes(protectedPath)
  );
  
  // Check if it's a public path like login
  const isPublicPath = publicPaths.some(publicPath => 
    path.includes(publicPath)
  );

  const locale = path.split('/')[1] || 'en';

  // If path requires auth but no auth cookie exists, redirect to login
  if (requiresAuth && !authCookie) {
    console.log('Auth required but no cookie found, redirecting to login');
    const loginUrl = new URL(`/${locale}/login`, request.url);
    return NextResponse.redirect(loginUrl);
  }
  
  // If already authenticated and trying to access login page, redirect to dashboard
  if (isPublicPath && authCookie) {
    console.log('Already authenticated, redirecting to dashboard');
    return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url));
  }
  
  return NextResponse.next();
} 