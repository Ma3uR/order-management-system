import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const locales = ['ua', 'en']

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Check if path starts with a locale
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  )

  if (!pathnameHasLocale) {
    // Redirect to default locale if no locale is present
    const url = new URL(`/ua${pathname}`, request.url)
    return NextResponse.redirect(url)
  }

  // For language switcher: handle paths that have double locales like /ua/en/dashboard
  for (const locale of locales) {
    // Check if URL has a pattern like /ua/en/... or /en/ua/...
    const hasDoubleLocale = locales.some(
      (otherLocale) => pathname.startsWith(`/${locale}/${otherLocale}/`)
    )

    if (hasDoubleLocale) {
      // Remove the first locale and keep the intended one
      const cleanPath = pathname.replace(/^\/[^/]+/, '')
      const url = new URL(cleanPath, request.url)
      return NextResponse.redirect(url)
    }
  }

  return NextResponse.next()
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
