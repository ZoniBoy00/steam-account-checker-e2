import { type NextRequest, NextResponse } from "next/server"

// Simple in-memory rate limiting (shared with profile route)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const windowMs = 60 * 1000 // 1 minute window
  const maxRequests = 30 // Max 30 requests per minute per IP

  const current = rateLimitMap.get(ip)

  if (!current || now > current.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs })
    return true
  }

  if (current.count >= maxRequests) {
    return false
  }

  current.count++
  return true
}

function validateSteamId(steamId: string): boolean {
  return /^\d{17}$/.test(steamId)
}

function validateApiKey(apiKey: string): boolean {
  return /^[A-Fa-f0-9]{32}$/.test(apiKey)
}

export async function GET(request: NextRequest) {
  const ip = request.ip || request.headers.get("x-forwarded-for") || "unknown"
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: "Rate limit exceeded. Please try again later." }, { status: 429 })
  }

  const searchParams = request.nextUrl.searchParams
  const steamId = searchParams.get("steamId")
  const apiKey = searchParams.get("apiKey")

  if (!steamId || !apiKey) {
    return NextResponse.json({ error: "Steam ID and API key are required" }, { status: 400 })
  }

  if (!validateSteamId(steamId)) {
    return NextResponse.json({ error: "Invalid Steam ID format" }, { status: 400 })
  }

  if (!validateApiKey(apiKey)) {
    return NextResponse.json({ error: "Invalid API key format" }, { status: 400 })
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

    const response = await fetch(
      `https://api.steampowered.com/ISteamUser/GetPlayerBans/v1/?key=${apiKey}&steamids=${steamId}`,
      {
        headers: {
          "User-Agent": "Steam Account Checker/1.0",
        },
        signal: controller.signal,
      },
    )

    clearTimeout(timeoutId)

    if (!response.ok) {
      if (response.status === 403) {
        return NextResponse.json({ error: "Invalid API key or insufficient permissions" }, { status: 403 })
      }
      throw new Error(`Steam API request failed: ${response.status}`)
    }

    const data = await response.json()

    if (data.players && data.players.length > 0) {
      const player = data.players[0]
      return NextResponse.json({
        VACBanned: player.VACBanned || false,
        CommunityBanned: player.CommunityBanned || false,
        EconomyBan: player.EconomyBan || "none",
        NumberOfVACBans: player.NumberOfVACBans || 0,
        DaysSinceLastBan: player.DaysSinceLastBan || 0,
        NumberOfGameBans: player.NumberOfGameBans || 0,
        SteamID: steamId,
      })
    }

    return NextResponse.json({
      VACBanned: false,
      CommunityBanned: false,
      EconomyBan: "none",
      NumberOfVACBans: 0,
      DaysSinceLastBan: 0,
      NumberOfGameBans: 0,
      SteamID: steamId,
    })
  } catch (error) {
    console.error("Error fetching Steam bans:", error)

    if (error instanceof Error && error.name === "AbortError") {
      return NextResponse.json({ error: "Request timeout. Please try again." }, { status: 408 })
    }

    return NextResponse.json({ error: "Failed to fetch Steam ban information" }, { status: 500 })
  }
}
