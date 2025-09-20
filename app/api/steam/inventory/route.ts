import { type NextRequest, NextResponse } from "next/server"

const rateLimitMap = new Map<string, { count: number; resetTime: number; blocked: boolean }>()

function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const windowMs = 60 * 1000 // 1 minute window
  const maxRequests = 15 // Increased limit
  const blockDuration = 2 * 60 * 1000 // 2 minutes block for abuse

  const current = rateLimitMap.get(ip)

  if (current?.blocked && now < current.resetTime) {
    return { allowed: false, remaining: 0 }
  }

  if (!current || now > current.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs, blocked: false })
    return { allowed: true, remaining: maxRequests - 1 }
  }

  if (current.count >= maxRequests) {
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

const CS2_APP_ID = "730"

export async function GET(request: NextRequest) {
  const contentLength = request.headers.get("content-length")
  if (contentLength && Number.parseInt(contentLength) > 1024) {
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
          "Retry-After": "120",
        },
      },
    )
  }

  const searchParams = request.nextUrl.searchParams
  const steamId = searchParams.get("steamId")
  const apiKey = searchParams.get("apiKey")

  if (!steamId) {
    return NextResponse.json({ error: "Steam ID is required" }, { status: 400 })
  }

  const sanitizedSteamId = sanitizeInput(steamId)

  if (!validateSteamId(sanitizedSteamId)) {
    return NextResponse.json({ error: "Invalid Steam ID format" }, { status: 400 })
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 12000)

    const inventoryMethods = [
      // Method 1: Direct community inventory access (most reliable)
      {
        url: `https://steamcommunity.com/inventory/${sanitizedSteamId}/${CS2_APP_ID}/2?l=english&count=5000`,
        type: "community_direct" as const,
        timeout: 8000,
      },

      // Method 2: Steam Web API (if available)
      ...(apiKey
        ? [
            {
              url: `https://api.steampowered.com/IEconService/GetInventoryItemsWithDescriptions/v1/?key=${apiKey}&steamid=${sanitizedSteamId}&appid=${CS2_APP_ID}&contextid=2&count=5000`,
              type: "steam_api" as const,
              timeout: 6000,
            },
          ]
        : []),

      // Method 3: Alternative community endpoint
      {
        url: `https://steamcommunity.com/profiles/${sanitizedSteamId}/inventory/json/${CS2_APP_ID}/2?l=english&count=5000`,
        type: "community_legacy" as const,
        timeout: 8000,
      },
    ]

    let bestResult: any = null
    let isPrivate = false
    const errors: string[] = []

    for (const method of inventoryMethods) {
      try {
        const headers: Record<string, string> = {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "application/json, text/plain, */*",
          "Accept-Language": "en-US,en;q=0.9",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        }

        const response = await Promise.race([
          fetch(method.url, { headers, signal: controller.signal }),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Method timeout")), method.timeout)),
        ])

        if (response.ok) {
          const responseText = await response.text()

          // Check for private inventory indicators
          if (
            responseText.includes("This profile is private") ||
            responseText.includes("inventory is private") ||
            responseText.includes("This inventory is currently private")
          ) {
            isPrivate = true
            errors.push(`${method.type}: Private inventory`)
            continue
          }

          let data
          try {
            data = JSON.parse(responseText)
          } catch {
            errors.push(`${method.type}: Invalid response format`)
            continue
          }

          // Handle different response formats
          if (method.type === "steam_api") {
            if (data.response?.success === 1) {
              bestResult = {
                items: data.response.items || [],
                descriptions: data.response.descriptions || [],
                method: "Steam Web API",
              }
              break
            } else if (data.response?.success === 15) {
              isPrivate = true
              continue
            }
          } else {
            // Community API format
            if (data.success === false) {
              if (data.Error?.includes("private")) {
                isPrivate = true
                continue
              }
              errors.push(`${method.type}: ${data.Error || "Access denied"}`)
              continue
            }

            const assets = data.assets || data.items || Object.values(data.rgInventory || {})
            const descriptions = data.descriptions || Object.values(data.rgDescriptions || {})

            if (Array.isArray(assets) || Object.keys(assets).length > 0) {
              bestResult = {
                items: Array.isArray(assets) ? assets : Object.values(assets),
                descriptions: Array.isArray(descriptions) ? descriptions : Object.values(descriptions),
                method: method.type,
              }
              break
            }
          }
        } else if (response.status === 403) {
          const errorText = await response.text().catch(() => "")
          if (errorText.includes("private")) {
            isPrivate = true
          }
          errors.push(`${method.type}: Access forbidden (${response.status})`)
        } else {
          errors.push(`${method.type}: HTTP ${response.status}`)
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error"
        errors.push(`${method.type}: ${errorMsg}`)
      }
    }

    clearTimeout(timeoutId)

    // Return results based on what we found
    if (isPrivate) {
      return NextResponse.json(
        {
          error: "This inventory is set to private",
          inventoryValue: 0,
          itemCount: 0,
          isPrivate: true,
          method: "private_inventory_detected",
        },
        {
          headers: { "X-RateLimit-Remaining": rateLimit.remaining.toString() },
        },
      )
    }

    if (bestResult) {
      const inventoryValue = calculateInventoryValue(bestResult.items, bestResult.descriptions)
      const itemCount = bestResult.items.length

      return NextResponse.json(
        {
          inventoryValue,
          itemCount,
          isPrivate: false,
          error: null,
          method: bestResult.method,
        },
        {
          headers: { "X-RateLimit-Remaining": rateLimit.remaining.toString() },
        },
      )
    }

    // No successful results - provide helpful error message
    return NextResponse.json(
      {
        error: "Unable to access inventory data. This may be due to Steam server issues or inventory privacy settings.",
        inventoryValue: 0,
        itemCount: 0,
        isPrivate: null,
        method: "access_unavailable",
        suggestion:
          "Try again in a few minutes. If the issue persists, the inventory may be private or Steam servers may be experiencing issues.",
      },
      {
        headers: { "X-RateLimit-Remaining": rateLimit.remaining.toString() },
      },
    )
  } catch (error) {
    return NextResponse.json(
      {
        error: "Steam inventory service temporarily unavailable",
        inventoryValue: 0,
        itemCount: 0,
        isPrivate: null,
        method: "service_error",
        suggestion: "Please try again later",
      },
      {
        status: 200,
        headers: { "X-RateLimit-Remaining": rateLimit.remaining.toString() },
      },
    )
  }
}

function calculateInventoryValue(assets: any[], descriptions: any[]): number {
  const rarityMultipliers: Record<string, number> = {
    "Consumer Grade": 0.1,
    "Industrial Grade": 0.5,
    "Mil-Spec Grade": 2,
    Restricted: 10,
    Classified: 50,
    Covert: 200,
    Extraordinary: 1000,
  }

  let estimatedValue = 0

  if (Array.isArray(descriptions)) {
    for (const item of descriptions) {
      const tags = item.tags || []
      const rarityTag = tags.find((tag: any) => tag.category === "Rarity")

      if (rarityTag) {
        const rarity = rarityTag.localized_tag_name || rarityTag.name
        const multiplier = rarityMultipliers[rarity] || 0.1

        const itemAssets = assets.filter((asset: any) => asset.classid === item.classid)
        estimatedValue += itemAssets.length * multiplier
      }
    }
  }

  return Math.round(estimatedValue * 100) / 100
}
