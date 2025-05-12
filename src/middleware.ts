import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Middleware that doesn't check auth state - we'll rely on client-side auth checks
export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // Skip favicon and other asset requests
  if (pathname.includes('.') || pathname.startsWith('/_next')) {
    return NextResponse.next();
  }
  return NextResponse.next();
}

// Apply middleware only to specific routes
export const config = {
  matcher: [
    '/',
    '/login',
    '/register'
  ],
}; 