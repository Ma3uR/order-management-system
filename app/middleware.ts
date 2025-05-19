// Middleware has been removed as we're now using client-side authentication.
// All authentication checks are performed in the useAuth hook.

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
};

export default function middleware() {
  // Leave empty - no-op middleware
  // We're using client-side authentication via the useAuth hook
  return;
} 