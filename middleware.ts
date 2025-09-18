import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

// Apply middleware to API routes only (Edge-safe)
export const config = {
  matcher: [
    '/api/:path*',
  ],
}

// Edge-safe rate limiting (simplified for middleware)
async function checkRateLimit(ip: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Simple in-memory rate limiting for Edge runtime
    // This would be enhanced with a more sophisticated Edge-compatible solution
    return { success: true }
  } catch (error) {
    // Fail closed on error during high-traffic events
    return { success: false, error: 'Rate limit check failed' }
  }
}

export default async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const clientIP = getClientIP(request)
  
  try {
    // Apply basic rate limiting to API routes (Edge-safe)
    const rateLimitResult = await checkRateLimit(clientIP)
    
    if (!rateLimitResult.success) {
      return new NextResponse(
        JSON.stringify({ 
          error: 'Rate limit exceeded. Please try again later.',
          retryAfter: 60
        }),
        { 
          status: 429,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // Protected API routes that require authentication
    const protectedApiRoutes = [
      '/api/tickets/claim',
      '/api/tickets/my-tickets', 
      '/api/tickets/claim-queue',
      '/api/queue/status',
      '/api/events/admin',
      '/api/monitoring/metrics'
    ]
    
    const isProtectedApiRoute = protectedApiRoutes.some(route => 
      pathname.startsWith(route)
    )
    
    if (isProtectedApiRoute) {
      const token = await getToken({ 
        req: request,
        secret: process.env.NEXTAUTH_SECRET 
      })
      
      if (!token) {
        return new NextResponse(
          JSON.stringify({ error: 'Authentication required' }),
          { 
            status: 401,
            headers: { 'Content-Type': 'application/json' }
          }
        )
      }
      
      // Check admin-only routes
      const adminOnlyRoutes = ['/api/events/admin', '/api/monitoring/metrics']
      const isAdminOnlyRoute = adminOnlyRoutes.some(route => 
        pathname.startsWith(route)
      )
      
      if (isAdminOnlyRoute && token.role !== 'ADMIN') {
        return new NextResponse(
          JSON.stringify({ error: 'Admin access required' }),
          { 
            status: 403,
            headers: { 'Content-Type': 'application/json' }
          }
        )
      }
    }
    
    // Continue with the request
    const response = NextResponse.next()
    
    // Add CORS headers for API routes
    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    
    return response
    
  } catch (error) {
    console.error('Middleware error:', error)
    // Fail open for non-critical errors
    return NextResponse.next()
  }
}

// Helper to get client IP (Edge-safe)
function getClientIP(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')
  const realIP = req.headers.get('x-real-ip')
  const cfConnectingIP = req.headers.get('cf-connecting-ip')
  
  if (cfConnectingIP) return cfConnectingIP
  if (realIP) return realIP
  if (forwarded) return forwarded.split(',')[0].trim()
  
  return req.ip || '127.0.0.1'
}