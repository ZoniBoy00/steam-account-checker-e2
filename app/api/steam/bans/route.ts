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
    const timeoutId = setTimeout(() => controller.abort(), 8000) // Reduced timeout for better UX

    const apiUrl = new URL("https://api.steampowered.com/ISteamUser/GetPlayerBans/v1/")
    apiUrl.searchParams.set("key", sanitizedApiKey)
    apiUrl.searchParams.set("steamids", sanitizedSteamId)

    const response = await fetch(apiUrl.toString(), {
      headers: {
        "User-Agent": "Steam Account Checker/2.0",
        Accept: "application/json",
        "Cache-Control": "no-cache",
      },
      signal: controller.signal,
    })

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

    if (data?.players?.length > 0) {
      const player = data.players[0]

      const sanitizedResponse = {
        VACBanned: Boolean(player.VACBanned),
        CommunityBanned: Boolean(player.CommunityBanned),
        EconomyBan: sanitizeInput(player.EconomyBan || "none"),
        NumberOfVACBans: Number(player.NumberOfVACBans) || 0,
        DaysSinceLastBan: Number(player.DaysSinceLastBan) || 0,
        NumberOfGameBans: Number(player.NumberOfGameBans) || 0,
        SteamID: sanitizedSteamId,
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
        VACBanned: false,
        CommunityBanned: false,
        EconomyBan: "none",
        NumberOfVACBans: 0,
        DaysSinceLastBan: 0,
        NumberOfGameBans: 0,
        SteamID: sanitizedSteamId,
      },
      {
        headers: {
          "X-RateLimit-Remaining": rateLimit.remaining.toString(),
        },
      },
    )
  } catch (error) {
    console.error("Error fetching Steam bans:", error)

    if (error instanceof Error && error.name === "AbortError") {
      return NextResponse.json({ error: "Request timeout. Please try again." }, { status: 408 })
    }

    return NextResponse.json({ error: "Failed to fetch Steam ban information" }, { status: 500 })
  }
}
