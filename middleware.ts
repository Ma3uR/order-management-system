import createMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { locales, defaultLocale } from './i18n';

// Create next-intl middleware with the latest approach
const intlMiddleware = createMiddleware({
  // Use the locales and defaultLocale from i18n.ts
  locales: locales,
  defaultLocale: defaultLocale,
  localePrefix: 'always'
});

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const cookies = request.cookies;

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
  
  // Extract locale from the pathname if it exists
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  // Redirect from old auth page to new login page
  if (pathname.includes('/auth/signin')) {
    const url = new URL(pathname.replace('/auth/signin', '/login'), request.url);
    return NextResponse.redirect(url);
  }

  if (!pathnameHasLocale) {
    // Redirect to default locale if no locale is present
    const url = new URL(`/${defaultLocale}${pathname}`, request.url);
    return NextResponse.redirect(url);
  }

  // For language switcher: handle paths that have double locales
  for (const locale of locales) {
    const hasDoubleLocale = locales.some(
      (otherLocale) => pathname.startsWith(`/${locale}/${otherLocale}/`)
    );

    if (hasDoubleLocale) {
      const cleanPath = pathname.replace(/^\/[^/]+/, '');
      const url = new URL(cleanPath, request.url);
      return NextResponse.redirect(url);
    }
  }

  // Get the locale from the pathname
  const segments = pathname.split('/');
  const locale = segments.length > 1 ? segments[1] : defaultLocale;

  // Check if the current path requires authentication
  const requiresAuth = protectedPaths.some(protectedPath => 
    pathname.includes(protectedPath)
  );
  
  // Check if it's a public path like login
  const isPublicPath = publicPaths.some(publicPath => 
    pathname.includes(publicPath)
  );

  // If path requires auth but no auth cookie exists, redirect to login
  if (requiresAuth && !authCookie) {
    console.log('Auth required but no cookie found, redirecting to login');
    const loginUrl = new URL(`/${locale}/login`, request.url);
    loginUrl.searchParams.set('callbackUrl', request.url);
    return NextResponse.redirect(loginUrl);
  }
  
  // If already authenticated and trying to access login page, redirect to dashboard
  if (isPublicPath && authCookie) {
    console.log('Already authenticated, redirecting to dashboard');
    return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url));
  }
  
  // Run next-intl middleware after our custom logic
  return intlMiddleware(request);
}

export const config = {
  matcher: [
    // Match all paths except those starting with:
    // - api (API routes)
    // - _next/static (static files)
    // - _next/image (image optimization files)
    // - favicon.ico (favicon file)
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
