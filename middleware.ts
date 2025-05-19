import createMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const locales = ['en', 'ua']
const defaultLocale = 'en'

// Create next-intl middleware
const nextIntlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always'
});

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Redirect from old auth page to new login page
  if (pathname.includes('/auth/signin')) {
    const url = new URL(pathname.replace('/auth/signin', '/login'), request.url);
    return NextResponse.redirect(url);
  }

  // Check if path starts with a locale
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  )

  if (!pathnameHasLocale) {
    // Redirect to default locale if no locale is present
    const url = new URL(`/${defaultLocale}${pathname}`, request.url)
    return NextResponse.redirect(url)
  }

  // For language switcher: handle paths that have double locales
  for (const locale of locales) {
    const hasDoubleLocale = locales.some(
      (otherLocale) => pathname.startsWith(`/${locale}/${otherLocale}/`)
    )

    if (hasDoubleLocale) {
      const cleanPath = pathname.replace(/^\/[^/]+/, '')
      const url = new URL(cleanPath, request.url)
      return NextResponse.redirect(url)
    }
  }

  // Run next-intl middleware after our custom logic
  return nextIntlMiddleware(request)
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
}
