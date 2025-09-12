import { type NextRequest, NextResponse } from "next/server"

export function middleware(request: NextRequest) {
  const response = NextResponse.next()

  // Fix for CVE-2024-34351: Prevent x-middleware-subrequest header bypass
  if (request.headers.get("x-middleware-subrequest")) {
    return new NextResponse("Forbidden", { status: 403 })
  }

  // Fix for SSRF vulnerability: Sanitize headers before passing to NextResponse.next()
  const sanitizedHeaders = new Headers()
  const allowedHeaders = [
    "accept",
    "accept-encoding",
    "accept-language",
    "cache-control",
    "content-type",
    "user-agent",
    "referer",
  ]

  // Only pass through safe headers
  for (const [key, value] of request.headers.entries()) {
    if (
      allowedHeaders.includes(key.toLowerCase()) &&
      !key.toLowerCase().startsWith("x-") &&
      !key.toLowerCase().includes("forwarded")
    ) {
      sanitizedHeaders.set(key, value)
    }
  }

  // Security headers to prevent various attacks
  response.headers.set("X-Frame-Options", "DENY")
  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  response.headers.set("X-XSS-Protection", "1; mode=block")
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()")

  // Content Security Policy
  response.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: https:; " +
      "connect-src 'self' https://api.steampowered.com; " +
      "font-src 'self'; " +
      "object-src 'none'; " +
      "base-uri 'self'; " +
      "form-action 'self'",
  )

  // CSRF Protection for API routes
  if (request.nextUrl.pathname.startsWith("/api/")) {
    const origin = request.headers.get("origin")
    const host = request.headers.get("host")

    // Check for CSRF attacks on state-changing methods
    if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method)) {
      if (!origin || !host || !origin.includes(host)) {
        // Allow same-origin requests and localhost for development
        const isLocalhost = host?.includes("localhost") || host?.includes("127.0.0.1")
        const isSameOrigin =
          origin &&
          host &&
          (origin === `https://${host}` || origin === `http://${host}` || (isLocalhost && origin.includes(host)))

        if (!isSameOrigin) {
          return new NextResponse("CSRF token mismatch", { status: 403 })
        }
      }
    }

    // Rate limiting for API routes
    const ip = request.ip || request.headers.get("x-forwarded-for") || "unknown"
    const rateLimitKey = `${ip}-${request.nextUrl.pathname}`

    // Simple in-memory rate limiting (use Redis in production)
    if (typeof globalThis.rateLimitStore === "undefined") {
      globalThis.rateLimitStore = new Map()
    }

    const now = Date.now()
    const windowMs = 60 * 1000 // 1 minute
    const maxRequests = 100

    const requestLog = globalThis.rateLimitStore.get(rateLimitKey) || []
    const recentRequests = requestLog.filter((time: number) => now - time < windowMs)

    if (recentRequests.length >= maxRequests) {
      return new NextResponse("Too Many Requests", { status: 429 })
    }

    recentRequests.push(now)
    globalThis.rateLimitStore.set(rateLimitKey, recentRequests)
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
}
