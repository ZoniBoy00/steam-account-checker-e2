import { type NextRequest, NextResponse } from "next/server"

const rateLimitMap = new Map<string, { count: number; resetTime: number; blocked: boolean }>()

function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const windowMs = 60 * 1000 // 1 minute window
  const maxRequests = 20 // Reduced from 30 to 20 for better security
  const blockDuration = 5 * 60 * 1000 // 5 minutes block for abuse

  const current = rateLimitMap.get(ip)

  // Check if IP is currently blocked
  if (current?.blocked && now < current.resetTime) {
    return { allowed: false, remaining: 0 }
  }

  if (!current || now > current.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs, blocked: false })
    return { allowed: true, remaining: maxRequests - 1 }
  }

  if (current.count >= maxRequests) {
    // Block IP for repeated abuse
    current.blocked = true
    current.resetTime = now + blockDuration
    return { allowed: false, remaining: 0 }
  }

  current.count++
  return { allowed: true, remaining: maxRequests - current.count }
}

function validateSteamId(steamId: string): boolean {
  if (!steamId || typeof steamId !== "string") return false

  // Remove any potential XSS characters
  const sanitized = steamId.replace(/[<>'"&]/g, "")

  // Steam ID should be exactly 17 digits and start with 7656119
  return /^7656119\d{10}$/.test(sanitized)
}

function validateApiKey(apiKey: string): boolean {
  if (!apiKey || typeof apiKey !== "string") return false

  // Remove any potential XSS characters
  const sanitized = apiKey.replace(/[<>'"&]/g, "")

  // Steam API keys are exactly 32 character hex strings
  return /^[A-Fa-f0-9]{32}$/.test(sanitized) && sanitized.length === 32
}

function sanitizeInput(input: string): string {
  if (typeof input !== "string") return ""
  return input.replace(/[<>'"&]/g, "").trim()
}

export async function GET(request: NextRequest) {
  const contentLength = request.headers.get("content-length")
  if (contentLength && Number.parseInt(contentLength) > 1024) {
    // 1KB limit
    return NextResponse.json({ error: "Request too large" }, { status: 413 })
  }

  const forwarded = request.headers.get("x-forwarded-for")
  const ip = forwarded ? forwarded.split(",")[0].trim() : request.ip || "unknown"

  const rateLimit = checkRateLimit(ip)
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Please try again later." },
      {
        status: 429,
        headers: {
          "X-RateLimit-Remaining": "0",
          "Retry-After": "300",
        },
      },
    )
  }

  const searchParams = request.nextUrl.searchParams
  const steamId = searchParams.get("steamId")
  const apiKey = searchParams.get("apiKey")

  if (!steamId || !apiKey) {
    return NextResponse.json({ error: "Steam ID and API key are required" }, { status: 400 })
  }

  const sanitizedSteamId = sanitizeInput(steamId)
  const sanitizedApiKey = sanitizeInput(apiKey)

  if (!validateSteamId(sanitizedSteamId)) {
    return NextResponse.json({ error: "Invalid Steam ID format" }, { status: 400 })
  }

  if (!validateApiKey(sanitizedApiKey)) {
    return NextResponse.json({ error: "Invalid API key format" }, { status: 400 })
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => {
      controller.abort()
    }, 5000) // Reduced to 5 seconds to prevent DoS

    const apiUrl = new URL("https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/")
    apiUrl.searchParams.set("key", sanitizedApiKey)
    apiUrl.searchParams.set("steamids", sanitizedSteamId)

    const response = await Promise.race([
      fetch(apiUrl.toString(), {
        headers: {
          "User-Agent": "Steam Account Checker/2.0",
          Accept: "application/json",
          "Cache-Control": "no-cache",
          Connection: "close", // Prevent connection reuse attacks
        },
        signal: controller.signal,
      }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Connection timeout")), 3000)),
    ])

    clearTimeout(timeoutId)

    if (!response.ok) {
      if (response.status === 403) {
        return NextResponse.json({ error: "Invalid API key or insufficient permissions" }, { status: 403 })
      }
      if (response.status === 401) {
        return NextResponse.json({ error: "Unauthorized: Invalid API key" }, { status: 401 })
      }
      throw new Error(`Steam API request failed: ${response.status}`)
    }

    const data = await response.json()

    if (data?.response?.players?.length > 0) {
      const player = data.response.players[0]

      // Sanitize all output data
      const sanitizedResponse = {
        username: sanitizeInput(player.personaname || "Unknown"),
        real_name: sanitizeInput(player.realname || "Not specified"),
        avatar: sanitizeInput(player.avatar || ""),
        profile_url: sanitizeInput(player.profileurl || `https://steamcommunity.com/profiles/${sanitizedSteamId}`),
        time_created: Number(player.timecreated) || 0,
        last_logoff: Number(player.lastlogoff) || 0,
        persona_state: Number(player.personastate) || 0,
      }

      return NextResponse.json(sanitizedResponse, {
        headers: {
          "X-RateLimit-Remaining": rateLimit.remaining.toString(),
          "Cache-Control": "private, no-cache",
        },
      })
    }

    return NextResponse.json(
      {
        username: "Unknown",
        real_name: "Not specified",
        avatar: "",
        profile_url: `https://steamcommunity.com/profiles/${sanitizedSteamId}`,
        time_created: 0,
        last_logoff: 0,
        persona_state: 0,
      },
      {
        headers: {
          "X-RateLimit-Remaining": rateLimit.remaining.toString(),
        },
      },
    )
  } catch (error) {
    console.error("Error fetching Steam profile:", error)

    if (error instanceof Error) {
      if (error.name === "AbortError" || error.message === "Connection timeout") {
        return NextResponse.json({ error: "Request timeout. Please try again." }, { status: 408 })
      }
      if (error.message.includes("fetch")) {
        return NextResponse.json({ error: "Network error. Please check your connection." }, { status: 503 })
      }
    }

    return NextResponse.json({ error: "Failed to fetch Steam profile" }, { status: 500 })
  }
}
