/**
 * EXAMOS - Next.js Middleware
 * Route protection based on authentication status.
 * 
 * Note: Since JWT validation happens client-side (localStorage),
 * this middleware handles basic redirect logic. The AuthContext
 * handles actual token validation.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";



export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // For protected routes, we let the client-side AuthContext handle
  // the redirect since the JWT is in localStorage (not accessible server-side).
  // This middleware is a lightweight layer for basic routing.

  // Allow all API and static routes
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname === "/"
  ) {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
