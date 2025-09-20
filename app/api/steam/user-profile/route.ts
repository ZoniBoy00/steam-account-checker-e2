import { type NextRequest, NextResponse } from "next/server"

const rateLimitMap = new Map<string, { count: number; resetTime: number; blocked: boolean }>()

function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const windowMs = 60 * 1000 // 1 minute window
  const maxRequests = 20
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
  const sanitized = steamId.replace(/[<>'"&]/g, "")
  return /^7656119\d{10}$/.test(sanitized)
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
  const steamId = searchParams.get("steamid")

  if (!steamId) {
    return NextResponse.json({ error: "Steam ID is required" }, { status: 400 })
  }

  const sanitizedSteamId = sanitizeInput(steamId)

  if (!validateSteamId(sanitizedSteamId)) {
    return NextResponse.json({ error: "Invalid Steam ID format" }, { status: 400 })
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => {
      controller.abort()
    }, 5000)

    // Use Steam's public profile API
    const apiUrl = `https://steamcommunity.com/profiles/${sanitizedSteamId}/?xml=1`

    const response = await Promise.race([
      fetch(apiUrl, {
        headers: {
          "User-Agent": "Steam Account Checker/2.0",
          Accept: "application/xml, text/xml, */*",
          "Cache-Control": "no-cache",
          Connection: "close",
        },
        signal: controller.signal,
      }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Connection timeout")), 3000)),
    ])

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`Steam API request failed: ${response.status}`)
    }

    const xmlText = await response.text()

    // Parse basic info from XML
    const steamIdMatch = xmlText.match(/<steamID64>(\d+)<\/steamID64>/)
    const personaNameMatch = xmlText.match(/<steamID><!\[CDATA\[(.*?)\]\]><\/steamID>/)
    const avatarMatch = xmlText.match(/<avatarIcon><!\[CDATA\[(.*?)\]\]><\/avatarIcon>/)
    const avatarMediumMatch = xmlText.match(/<avatarMedium><!\[CDATA\[(.*?)\]\]><\/avatarMedium>/)
    const avatarFullMatch = xmlText.match(/<avatarFull><!\[CDATA\[(.*?)\]\]><\/avatarFull>/)

    if (steamIdMatch && personaNameMatch) {
      const userData = {
        response: {
          players: [
            {
              steamid: steamIdMatch[1],
              personaname: personaNameMatch[1],
              avatar: avatarMatch ? avatarMatch[1] : "",
              avatarmedium: avatarMediumMatch ? avatarMediumMatch[1] : "",
              avatarfull: avatarFullMatch ? avatarFullMatch[1] : "",
            },
          ],
        },
      }

      return NextResponse.json(userData, {
        headers: {
          "X-RateLimit-Remaining": rateLimit.remaining.toString(),
          "Cache-Control": "private, no-cache",
        },
      })
    }

    throw new Error("Could not parse Steam profile data")
  } catch (error) {
    console.error("Error fetching Steam user profile:", error)

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
