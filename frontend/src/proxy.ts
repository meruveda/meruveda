import { type NextRequest, NextResponse } from 'next/server'

/**
 * Middleware — lightweight JWT cookie check.
 * Supabase has been replaced by a client-side mock auth system.
 * This middleware checks for the mock auth token cookie on protected paths.
 *
 * When the real backend is integrated, replace the cookie check
 * with a server-side JWT verification call.
 */
export async function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  const authToken =
    request.cookies.get('meruveda_auth_token')?.value ||
    // Fallback: check Authorization header (for future API use)
    request.headers.get('Authorization')?.replace('Bearer ', '');

  // Protect /account routes — unauthenticated users go to checkout, whose
  // OTP form doubles as the login. (/profile is currently disabled, so it
  // cannot serve as the login gate.)
  if (pathname.startsWith('/account')) {
    if (!authToken) {
      const url = request.nextUrl.clone();
      url.pathname = '/checkout';
      url.search = '';
      return NextResponse.redirect(url);
    }
  }

  // /checkout is intentionally public: guests may browse and check out, and
  // identity is collected by the OTP form on the page itself.

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|images|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
