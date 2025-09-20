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
  const apiKey = searchParams.get("apiKey")

  if (!steamId) {
    return NextResponse.json({ error: "Steam ID is required" }, { status: 400 })
  }

  const sanitizedSteamId = sanitizeInput(steamId)

  if (!validateSteamId(sanitizedSteamId)) {
    return NextResponse.json({ error: "Invalid Steam ID format" }, { status: 400 })
  }

  const steamAuth = request.cookies.get("steam_auth")
  const isAuthenticated = !!steamAuth?.value

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => {
      controller.abort()
    }, 15000) // 15 seconds timeout

    const inventoryMethods = [
      // Method 1: Steam Web API (requires API key but most reliable)
      ...(apiKey
        ? [
            {
              url: `https://api.steampowered.com/IEconService/GetInventoryItemsWithDescriptions/v1/?key=${apiKey}&steamid=${sanitizedSteamId}&appid=${CS2_APP_ID}&contextid=2&count=5000`,
              type: "webapi" as const,
            },
          ]
        : []),

      // Method 2: SkinBackpack API (reliable third-party service)
      {
        url: `https://skinbackpack.com/api/cs2/inventory/${sanitizedSteamId}`,
        type: "skinbackpack" as const,
      },

      // Method 3: Community inventory JSON endpoint (new format) - Try authenticated first
      ...(isAuthenticated
        ? [
            {
              url: `https://steamcommunity.com/inventory/${sanitizedSteamId}/${CS2_APP_ID}/2?l=english&count=5000`,
              type: "community_new_auth" as const,
            },
          ]
        : []),

      // Method 4: Community inventory JSON endpoint (new format) - Public access
      {
        url: `https://steamcommunity.com/inventory/${sanitizedSteamId}/${CS2_APP_ID}/2?l=english&count=5000`,
        type: "community_new" as const,
      },

      // Method 5: Community inventory JSON endpoint (legacy format)
      {
        url: `https://steamcommunity.com/profiles/${sanitizedSteamId}/inventory/json/${CS2_APP_ID}/2?l=english&count=5000`,
        type: "community_legacy" as const,
      },
    ]

    let response: Response | null = null
    let lastError = ""

    for (const method of inventoryMethods) {
      try {
        const headers: Record<string, string> = {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "application/json, text/plain, */*",
          "Accept-Language": "en-US,en;q=0.9",
          "Accept-Encoding": "gzip, deflate, br",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        }

        // Add Steam authentication for community endpoints
        if (method.type.includes("community") && isAuthenticated && steamAuth?.value) {
          headers["Cookie"] = `steamLoginSecure=${steamAuth.value}`
          headers["Referer"] = `https://steamcommunity.com/profiles/${sanitizedSteamId}/inventory/`
          headers["Origin"] = "https://steamcommunity.com"
          headers["Sec-Fetch-Dest"] = "empty"
          headers["Sec-Fetch-Mode"] = "cors"
          headers["Sec-Fetch-Site"] = "same-origin"
        }

        response = await Promise.race([
          fetch(method.url, {
            headers,
            signal: controller.signal,
          }),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Connection timeout")), 8000)),
        ])

        if (response.ok) {
          const responseText = await response.text()

          let data
          try {
            data = JSON.parse(responseText)
          } catch (parseError) {
            if (
              responseText.includes("This profile is private") ||
              responseText.includes("inventory is private") ||
              responseText.includes("This inventory is currently private")
            ) {
              lastError = "Private inventory detected"
              continue
            }
            throw new Error("Invalid JSON response")
          }

          // Handle SkinBackpack API response
          if (method.type === "skinbackpack") {
            // SkinBackpack API format
            if (data.steamUser && data.inventory) {
              const inventoryValue = data.inventory.inventoryValue || data.steamUser.inventoryValue || 0
              const itemCount = data.inventory.skins ? data.inventory.skins.length : 0

              clearTimeout(timeoutId)
              return NextResponse.json(
                {
                  inventoryValue: Math.round(inventoryValue * 100) / 100,
                  itemCount,
                  isPrivate: false,
                  error: null,
                  method: "SkinBackpack API",
                },
                {
                  headers: {
                    "X-RateLimit-Remaining": rateLimit.remaining.toString(),
                    "Cache-Control": "private, no-cache",
                  },
                },
              )
            } else if (data.error) {
              if (data.error.includes("private") || data.error.includes("Private")) {
                lastError = "Private inventory"
                continue
              }
              lastError = data.error
              continue
            } else {
              lastError = "No inventory data from SkinBackpack"
              continue
            }
          } else if (method.type === "webapi") {
            // Steam Web API format
            if (data.response && data.response.success === 1) {
              const items = data.response.items || []
              const descriptions = data.response.descriptions || []

              clearTimeout(timeoutId)
              return NextResponse.json(
                {
                  inventoryValue: calculateInventoryValue(items, descriptions),
                  itemCount: items.length,
                  isPrivate: false,
                  error: null,
                  method: "Steam Web API",
                },
                {
                  headers: {
                    "X-RateLimit-Remaining": rateLimit.remaining.toString(),
                    "Cache-Control": "private, no-cache",
                  },
                },
              )
            } else if (data.response && data.response.success === 15) {
              // Private inventory
              lastError = "Private inventory"
              continue
            }
          } else {
            // Community API format
            if (data.success === false) {
              if (data.Error && (data.Error.includes("private") || data.Error.includes("Private"))) {
                lastError = "Private inventory"
                continue
              }
              lastError = data.Error || "No inventory data available"
              continue
            }

            if (!data.assets && !data.rgInventory && !data.items) {
              clearTimeout(timeoutId)
              return NextResponse.json(
                {
                  inventoryValue: 0,
                  itemCount: 0,
                  isPrivate: false,
                  error: null,
                  method: method.type,
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
              assets = Object.values(assets)
            }

            const itemCount = assets.length

            clearTimeout(timeoutId)
            return NextResponse.json(
              {
                inventoryValue: calculateInventoryValue(assets, descriptions),
                itemCount,
                isPrivate: false,
                error: null,
                method: method.type,
              },
              {
                headers: {
                  "X-RateLimit-Remaining": rateLimit.remaining.toString(),
                  "Cache-Control": "private, no-cache",
                },
              },
            )
          }
        } else if (response.status === 403) {
          try {
            const errorText = await response.text()
            if (errorText.includes("private") || errorText.includes("Private")) {
              lastError = "Private inventory"
            } else {
              lastError = "API blocked"
            }
          } catch {
            lastError = "403 Forbidden"
          }
          response = null
        } else if (response.status === 400) {
          lastError = "400 Bad Request"
          response = null
        } else {
          lastError = `HTTP ${response.status}`
          response = null
        }
      } catch (error) {
        lastError = error instanceof Error ? error.message : "Unknown error"
        response = null
      }
    }

    clearTimeout(timeoutId)

    if (lastError.includes("Private inventory") || lastError.includes("private")) {
      return NextResponse.json(
        {
          error: "This inventory is set to private",
          inventoryValue: 0,
          itemCount: 0,
          isPrivate: true,
        },
        {
          status: 200,
          headers: {
            "X-RateLimit-Remaining": rateLimit.remaining.toString(),
          },
        },
      )
    }

    if (lastError.includes("403") || lastError.includes("400") || lastError.includes("API blocked")) {
      if (isAuthenticated) {
        return NextResponse.json(
          {
            error: "Unable to access inventory. Try using a Steam Web API key for better reliability.",
            inventoryValue: 0,
            itemCount: 0,
            isPrivate: null,
            suggestion: "Add a Steam Web API key in settings for improved access",
          },
          {
            status: 200,
            headers: {
              "X-RateLimit-Remaining": rateLimit.remaining.toString(),
            },
          },
        )
      } else {
        return NextResponse.json(
          {
            error: "Steam authentication required to access inventory data",
            inventoryValue: 0,
            itemCount: 0,
            isPrivate: null,
            requiresAuth: true,
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

    return NextResponse.json(
      {
        error: "Steam inventory temporarily unavailable. Try again later or use a Steam Web API key.",
        inventoryValue: 0,
        itemCount: 0,
        isPrivate: false,
        suggestion: "Add a Steam Web API key in settings for better reliability",
      },
      {
        status: 200,
        headers: {
          "X-RateLimit-Remaining": rateLimit.remaining.toString(),
        },
      },
    )
  } catch (error) {
    console.error("Error fetching Steam inventory:", error)

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
        error: "Steam inventory temporarily unavailable. Try again later.",
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
      const typeTag = tags.find((tag: any) => tag.category === "Type")

      if (rarityTag && typeTag) {
        const rarity = rarityTag.localized_tag_name || rarityTag.name
        const multiplier = rarityMultipliers[rarity] || 0.1

        const itemAssets = assets.filter((asset: any) => asset.classid === item.classid)
        estimatedValue += itemAssets.length * multiplier
      }
    }
  }

  return Math.round(estimatedValue * 100) / 100
}

interface InventoryInfo {
  inventoryValue: number
  itemCount: number
  isPrivate: boolean
  error: string | null
  debugInfo: string
}

async function getInventoryInfo(steamId: string): Promise<InventoryInfo> {
  const maxRetries = 2
  let lastError: Error | null = null
  const debugInfo: string[] = []

  debugInfo.push(`Starting inventory check for Steam ID: ${steamId}`)

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      debugInfo.push(`Attempt ${attempt + 1}/${maxRetries + 1}`)

      const response = await fetch(`/api/steam/inventory?steamId=${steamId}`)

      if (response.status === 429) {
        debugInfo.push(`Rate limited on attempt ${attempt + 1}`)
        // Rate limited, wait and retry
        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 2000 * (attempt + 1)))
          continue
        }
      }

      if (!response.ok) {
        debugInfo.push(`HTTP ${response.status}: ${response.statusText}`)
        throw new Error(`Inventory API request failed: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      debugInfo.push(`Response received: ${JSON.stringify(data).substring(0, 200)}...`)

      if (data.error) {
        debugInfo.push(`API returned error: ${data.error}`)

        // Check if it's a private inventory
        if (data.isPrivate) {
          return {
            inventoryValue: 0,
            itemCount: 0,
            isPrivate: true,
            error: "Private inventory",
            debugInfo: debugInfo.join(" | "),
          }
        }

        // Check if authentication is required
        if (data.requiresAuth) {
          return {
            inventoryValue: 0,
            itemCount: 0,
            isPrivate: false,
            error: "Steam authentication required",
            debugInfo: debugInfo.join(" | "),
          }
        }
      }

      debugInfo.push(`Success: Value=${data.inventoryValue}, Items=${data.itemCount}`)

      return {
        inventoryValue: data.inventoryValue || 0,
        itemCount: data.itemCount || 0,
        isPrivate: data.isPrivate || false,
        error: data.error || null,
        debugInfo: debugInfo.join(" | "),
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Unknown error")
      debugInfo.push(`Error on attempt ${attempt + 1}: ${lastError.message}`)

      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)))
        continue
      }
    }
  }

  debugInfo.push(`All attempts failed. Last error: ${lastError?.message}`)

  return {
    inventoryValue: 0,
    itemCount: 0,
    isPrivate: false,
    error: lastError?.message || "Failed to fetch inventory",
    debugInfo: debugInfo.join(" | "),
  }
}
