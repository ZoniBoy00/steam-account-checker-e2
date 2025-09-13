import { type NextRequest, NextResponse } from "next/server"

const rateLimitMap = new Map<string, { count: number; resetTime: number; blocked: boolean }>()

function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const windowMs = 60 * 1000 // 1 minute window
  const maxRequests = 10 // Lower limit for inventory API due to complexity
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

// CS2 App ID
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
          "Retry-After": "300",
        },
      },
    )
  }

  const searchParams = request.nextUrl.searchParams
  const steamId = searchParams.get("steamId")

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
    }, 15000) // 15 seconds timeout

    const inventoryUrls = [
      `https://steamcommunity.com/inventory/${sanitizedSteamId}/${CS2_APP_ID}/2?l=english&count=5000`,
      `https://steamcommunity.com/profiles/${sanitizedSteamId}/inventory/json/${CS2_APP_ID}/2?l=english&count=5000`,
    ]

    let response: Response | null = null
    let lastError = ""

    for (const inventoryUrl of inventoryUrls) {
      console.log("[v0] Attempting to fetch inventory directly from Steam:", inventoryUrl)

      try {
        response = await Promise.race([
          fetch(inventoryUrl, {
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              Accept: "application/json, text/plain, */*",
              "Accept-Language": "en-US,en;q=0.9",
              "Accept-Encoding": "gzip, deflate, br",
              "Cache-Control": "no-cache",
              Connection: "keep-alive",
              "Sec-Fetch-Dest": "empty",
              "Sec-Fetch-Mode": "cors",
              "Sec-Fetch-Site": "same-origin",
              Referer: `https://steamcommunity.com/profiles/${sanitizedSteamId}/inventory/`,
              Origin: "https://steamcommunity.com",
            },
            signal: controller.signal,
          }),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Connection timeout")), 8000)),
        ])

        console.log("[v0] Steam API response status:", response.status)

        if (response.ok) {
          const data = await response.json()
          console.log("[v0] Inventory data structure:", Object.keys(data))

          if (!data || data.success === false) {
            console.log("[v0] API returned success: false or no data")
            lastError = data?.Error || "No inventory data available"
            continue
          }

          if (!data || (!data.assets && !data.rgInventory && !data.items)) {
            console.log("[v0] No inventory data found")
            clearTimeout(timeoutId)
            return NextResponse.json(
              {
                inventoryValue: 0,
                itemCount: 0,
                isPrivate: false,
                error: null,
              },
              {
                headers: {
                  "X-RateLimit-Remaining": rateLimit.remaining.toString(),
                },
              },
            )
          }

          let assets = data.assets || data.items || []
          let descriptions = data.descriptions || []

          // Legacy format support
          if (data.rgInventory && data.rgDescriptions) {
            assets = Object.values(data.rgInventory)
            descriptions = Object.values(data.rgDescriptions)
          }

          if (!Array.isArray(assets)) {
            console.log("[v0] Assets is not an array, converting...")
            assets = Object.values(assets)
          }

          const itemCount = assets.length
          console.log("[v0] Found", itemCount, "items in inventory")

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
              const typeTag = tags.find((tag: any) => tag.category === "Type")

              if (rarityTag && typeTag) {
                const rarity = rarityTag.localized_tag_name || rarityTag.name
                const multiplier = rarityMultipliers[rarity] || 0.1

                const itemAssets = assets.filter((asset: any) => asset.classid === item.classid)
                estimatedValue += itemAssets.length * multiplier
              }
            }
          }

          clearTimeout(timeoutId)
          return NextResponse.json(
            {
              inventoryValue: Math.round(estimatedValue * 100) / 100,
              itemCount,
              isPrivate: false,
              error: null,
            },
            {
              headers: {
                "X-RateLimit-Remaining": rateLimit.remaining.toString(),
                "Cache-Control": "private, no-cache",
              },
            },
          )
        } else if (response.status === 403) {
          console.log("[v0] 403 Forbidden - Could be private inventory or authentication required")
          lastError = "403 Forbidden"
          response = null // Continue to next endpoint
        } else if (response.status === 400) {
          console.log("[v0] 400 Bad Request - Authentication or parameter issue")
          lastError = "400 Bad Request"
          response = null // Continue to next endpoint
        } else {
          lastError = `HTTP ${response.status}`
          response = null // Reset for next attempt
        }
      } catch (error) {
        console.log("[v0] Error with Steam endpoint:", inventoryUrl, error)
        lastError = error instanceof Error ? error.message : "Unknown error"
        response = null
      }
    }

    clearTimeout(timeoutId)

    console.log("[v0] All inventory endpoints failed, last error:", lastError)

    if (lastError.includes("403") || lastError.includes("400")) {
      return NextResponse.json(
        {
          error: "Unable to access inventory - may be private or require authentication",
          inventoryValue: 0,
          itemCount: 0,
          isPrivate: null, // Unknown privacy status
        },
        {
          status: 200,
          headers: {
            "X-RateLimit-Remaining": rateLimit.remaining.toString(),
          },
        },
      )
    }

    return NextResponse.json(
      {
        error: "Steam inventory API is currently blocked. Inventory data unavailable.",
        inventoryValue: 0,
        itemCount: 0,
        isPrivate: false,
      },
      {
        status: 200,
        headers: {
          "X-RateLimit-Remaining": rateLimit.remaining.toString(),
        },
      },
    )
  } catch (error) {
    console.error("[v0] Error fetching Steam inventory:", error)

    if (error instanceof Error) {
      if (error.name === "AbortError" || error.message === "Connection timeout") {
        return NextResponse.json(
          {
            error: "Request timeout",
            inventoryValue: 0,
            itemCount: 0,
            isPrivate: false,
          },
          { status: 200 },
        )
      }
    }

    return NextResponse.json(
      {
        error: "Steam inventory API is currently blocked. Inventory data unavailable.",
        inventoryValue: 0,
        itemCount: 0,
        isPrivate: false,
      },
      {
        status: 200,
        headers: {
          "X-RateLimit-Remaining": rateLimit.remaining.toString(),
        },
      },
    )
  }
}
