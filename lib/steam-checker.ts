import type { SteamAccount, CheckStats, TokenInfo, JWTValidation, UserProfile, BanInfo, InventoryInfo } from "./types"

export async function checkSteamAccounts(
  tokens: string[],
  apiKey: string,
  onProgress?: (current: number, total: number) => void,
  checkInventory = false,
): Promise<{ accounts: SteamAccount[]; stats: CheckStats }> {
  if (!apiKey || apiKey.trim().length === 0) {
    throw new Error("Steam Web API key is required. Please set it in the Settings tab.")
  }

  const accounts: SteamAccount[] = []
  const stats: CheckStats = {
    total: tokens.length,
    valid: 0,
    invalid: 0,
    expired: 0,
    vac_banned: 0,
    community_banned: 0,
    economy_banned: 0,
    account_not_found: 0,
    limited_profile: 0,
  }

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]
    onProgress?.(i + 1, tokens.length)

    try {
      const account = await processToken(token, i + 1, apiKey, checkInventory)
      accounts.push(account)

      // Update stats
      switch (account.status.toLowerCase()) {
        case "valid":
          stats.valid++
          break
        case "expired":
          stats.expired++
          break
        case "invalid":
          stats.invalid++
          break
        case "invalid jwt":
          stats.invalid++
          break
        case "account not found":
          stats.account_not_found++
          break
        case "limited profile":
          stats.limited_profile++
          break
        default:
          stats.invalid++
          break
      }

      if (account.vacBanned) stats.vac_banned++
      if (account.communityBanned) stats.community_banned++
      if (account.economyBanned !== "none") stats.economy_banned++

      if (i < tokens.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500))
      }
    } catch (error) {
      console.error(`Error processing token ${i + 1}:`, error)

      // Add error account
      accounts.push({
        accountNumber: i + 1,
        status: "Error",
        steamId: "Error",
        username: "Error",
        realName: "Error",
        vacBanned: false,
        communityBanned: false,
        economyBanned: "error",
        vacCount: 0,
        accountCreated: "Error",
        lastOnline: "Error",
        expires: "Error",
        jwtValid: false,
        jwtExpired: false,
        profileUrl: "",
        daysSinceLastBan: 0,
        gameBans: 0,
        personaState: 0,
        originalToken: token.trim(),
      })

      stats.invalid++
    }
  }

  return { accounts, stats }
}

async function processToken(
  token: string,
  accountNumber: number,
  apiKey: string,
  checkInventory = false,
): Promise<SteamAccount> {
  console.log(`[v0] Processing token ${accountNumber}:`, token.substring(0, 50) + "...")

  const tokenInfo = parseTokenFormat(token)
  console.log("[v0] Token info parsed:", {
    username: tokenInfo.username,
    has_jwt: !!tokenInfo.jwt_token,
    jwt_preview: tokenInfo.jwt_token?.substring(0, 30) + "...",
  })

  const jwtValidation = tokenInfo.jwt_token ? validateJWTToken(tokenInfo.jwt_token) : null

  if (jwtValidation) {
    console.log("[v0] JWT validation result:", {
      is_valid: jwtValidation.is_valid,
      is_expired: jwtValidation.is_expired,
      steam_id: jwtValidation.steam_id,
      error: jwtValidation.error,
    })
  }

  // Extract Steam ID
  let steamId = ""
  if (jwtValidation?.steam_id) {
    steamId = jwtValidation.steam_id
  } else {
    steamId = extractSteamIdFromToken(token) || ""
  }

  const userProfile = await getUserProfile(steamId, apiKey)
  const banInfo = await getBanInfo(steamId, apiKey)

  let inventoryInfo: InventoryInfo | undefined
  if (checkInventory && steamId && steamId !== "Error" && steamId !== "Unknown") {
    inventoryInfo = await getInventoryInfo(steamId)
  }

  let status = "Valid"
  if (jwtValidation) {
    if (jwtValidation.is_expired) {
      status = "Expired"
    } else if (!jwtValidation.is_valid) {
      status = "Invalid JWT"
    } else {
      // JWT is valid, but check if Steam account actually exists
      const hasValidProfile = userProfile.time_created > 0 || userProfile.username !== "Unknown"
      const profileNotFound = userProfile.username === "Unknown" && userProfile.time_created === 0

      if (profileNotFound) {
        status = "Account Not Found"
      } else if (!hasValidProfile) {
        status = "Limited Profile"
      }
      // If profile exists and JWT is valid and not expired, keep "Valid"
    }
  } else if (!steamId) {
    status = "Invalid"
  } else {
    // No JWT but we have Steam ID, check if account exists
    const hasValidProfile = userProfile.time_created > 0 || userProfile.username !== "Unknown"
    if (!hasValidProfile) {
      status = "Account Not Found"
    }
  }

  const expires = jwtValidation?.expires_at ? formatTimestamp(jwtValidation.expires_at) : "Unknown"

  return {
    accountNumber,
    status,
    steamId: steamId || "Unknown",
    username: tokenInfo.username || userProfile.username,
    realName: userProfile.real_name,
    vacBanned: banInfo.VACBanned,
    communityBanned: banInfo.CommunityBanned,
    economyBanned: banInfo.EconomyBan,
    vacCount: banInfo.NumberOfVACBans,
    accountCreated: formatTimestamp(userProfile.time_created),
    lastOnline: formatTimestamp(userProfile.last_logoff),
    expires,
    jwtValid: jwtValidation?.is_valid || false,
    jwtExpired: jwtValidation?.is_expired || false,
    profileUrl: userProfile.profile_url,
    daysSinceLastBan: banInfo.DaysSinceLastBan,
    gameBans: banInfo.NumberOfGameBans,
    personaState: userProfile.persona_state,
    originalToken: token.trim(),
    inventory: inventoryInfo,
  }
}

async function getInventoryInfo(steamId: string): Promise<InventoryInfo> {
  const maxRetries = 2
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[v0] Fetching inventory for Steam ID: ${steamId}`)
      const response = await fetch(`/api/steam/inventory?steamId=${steamId}`)

      if (response.status === 429) {
        // Rate limited, wait and retry
        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 2000 * (attempt + 1)))
          continue
        }
      }

      if (!response.ok) {
        throw new Error(`Inventory API request failed: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      console.log(`[v0] Inventory info received for ${steamId}:`, {
        inventoryValue: data.inventoryValue,
        itemCount: data.itemCount,
        isPrivate: data.isPrivate,
        error: data.error,
      })

      return {
        inventoryValue: data.inventoryValue || 0,
        itemCount: data.itemCount || 0,
        isPrivate: data.isPrivate || false,
        error: data.error || null,
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Unknown error")

      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)))
        continue
      }
    }
  }

  console.error("Error fetching inventory info after retries:", lastError)
  return {
    inventoryValue: 0,
    itemCount: 0,
    isPrivate: false,
    error: lastError?.message || "Failed to fetch inventory",
  }
}

function parseTokenFormat(tokenString: string): TokenInfo {
  const tokenInfo: TokenInfo = {
    username: undefined,
    jwt_token: undefined,
    cookies: {},
    raw_token: tokenString,
  }

  try {
    // Handle username----JWT format
    if (tokenString.includes("----")) {
      const parts = tokenString.split("----", 2)
      if (parts.length === 2) {
        tokenInfo.username = parts[0].trim()
        tokenInfo.jwt_token = parts[1].trim()
        tokenInfo.cookies["steamLoginSecure"] = tokenInfo.jwt_token
        return tokenInfo
      }
    }

    // Handle steamLoginSecure= format
    if (tokenString.includes("steamLoginSecure=")) {
      const match = tokenString.match(/steamLoginSecure=([^;]+)/)
      if (match) {
        const jwtValue = match[1].trim()
        tokenInfo.jwt_token = jwtValue
        tokenInfo.cookies["steamLoginSecure"] = jwtValue

        const username = extractUsernameFromJWT(jwtValue)
        if (username) {
          tokenInfo.username = username
        }

        return tokenInfo
      }
    }

    // Handle direct JWT token
    if (tokenString.split(".").length === 3) {
      tokenInfo.jwt_token = tokenString.trim()
      tokenInfo.cookies["steamLoginSecure"] = tokenString.trim()

      const username = extractUsernameFromJWT(tokenString)
      if (username) {
        tokenInfo.username = username
      }

      return tokenInfo
    }

    // Fallback: parse as cookie string
    tokenInfo.cookies = parseCookiesFromLine(tokenString)
  } catch (error) {
    console.error("Error parsing token format:", error)
  }

  return tokenInfo
}

function validateJWTToken(jwtToken: string): JWTValidation | null {
  console.log("[v0] Validating JWT token:", jwtToken.substring(0, 50) + "...")

  const validation: JWTValidation = {
    is_valid: false,
    is_expired: false,
    steam_id: undefined,
    username: undefined,
    expires_at: undefined,
    issued_at: undefined,
    error: undefined,
    payload: undefined,
  }

  try {
    const parts = jwtToken.split(".")
    if (parts.length !== 3) {
      validation.error = "Invalid JWT format - wrong number of parts"
      console.log("[v0] JWT validation failed:", validation.error)
      return validation
    }

    let payloadPart = parts[1]

    // Add padding if needed
    while (payloadPart.length % 4 !== 0) {
      payloadPart += "="
    }

    console.log("[v0] Decoding JWT payload part:", payloadPart.substring(0, 20) + "...")

    try {
      // Handle URL-safe base64
      const normalizedPayload = payloadPart.replace(/-/g, "+").replace(/_/g, "/")
      const payloadBytes = atob(normalizedPayload)

      let payloadData
      try {
        payloadData = JSON.parse(payloadBytes)
      } catch (jsonError) {
        console.log("[v0] Primary JSON parsing failed, attempting recovery:", jsonError)

        // Try to fix common JSON issues
        let fixedPayload = payloadBytes

        // Fix missing quotes around property names
        fixedPayload = fixedPayload.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":')

        // Fix unescaped quotes in values
        fixedPayload = fixedPayload.replace(/:\s*"([^"]*)"([^",}]*)"([^",}]*)/g, ':"$1\\"$2\\"$3"')

        // Fix trailing commas
        fixedPayload = fixedPayload.replace(/(,\s*[}\]])/g, "$1")

        // Fix missing commas between properties
        fixedPayload = fixedPayload.replace(/"\s*([a-zA-Z_])/g, '", "$1')

        // Try parsing the fixed payload
        try {
          payloadData = JSON.parse(fixedPayload)
          console.log("[v0] JSON recovery successful")
        } catch (recoveryError) {
          console.log("[v0] JSON recovery failed:", recoveryError)

          const subMatch = payloadBytes.match(/"sub":\s*"([^"]+)"/i)
          const expMatch = payloadBytes.match(/"exp":\s*(\d+)/i)
          const iatMatch = payloadBytes.match(/"iat":\s*(\d+)/i)

          if (subMatch || expMatch) {
            payloadData = {}
            if (subMatch) {
              // Clean and validate Steam ID
              let steamId = subMatch[1]
              // Remove any non-digit characters except for the Steam ID prefix
              steamId = steamId.replace(/[^\d]/g, "")

              // Ensure it starts with 7656119 and is 17 digits
              if (steamId.length >= 10) {
                // If it doesn't start with 7656119, try to reconstruct it
                if (!steamId.startsWith("7656119")) {
                  // Extract the last 10 digits and prepend 7656119
                  const suffix = steamId.slice(-10)
                  steamId = "7656119" + suffix
                }
                // Ensure exactly 17 digits
                if (steamId.length > 17) {
                  steamId = steamId.substring(0, 17)
                } else if (steamId.length < 17 && steamId.startsWith("7656119")) {
                  // Pad with zeros if needed
                  steamId = steamId.padEnd(17, "0")
                }
              }

              // Final validation - must be exactly 17 digits starting with 7656119
              if (/^7656119\d{10}$/.test(steamId)) {
                payloadData.sub = steamId
                console.log("[v0] Cleaned and validated Steam ID:", steamId)
              } else {
                console.log("[v0] Could not extract valid Steam ID from:", subMatch[1])
              }
            }
            if (expMatch) payloadData.exp = Number.parseInt(expMatch[1])
            if (iatMatch) payloadData.iat = Number.parseInt(iatMatch[1])
            console.log("[v0] Extracted basic info using regex fallback:", payloadData)
          } else {
            validation.error = `JWT payload parsing failed: ${jsonError}`
            console.log("[v0] JWT payload decoding failed:", jsonError)
            return validation
          }
        }
      }

      console.log("[v0] JWT payload decoded successfully:", {
        sub: payloadData.sub,
        exp: payloadData.exp,
        iat: payloadData.iat,
        iss: payloadData.iss,
      })

      validation.payload = payloadData

      const steamId = payloadData.sub
      if (steamId) {
        const cleanSteamId = String(steamId).replace(/[^\d]/g, "")
        // Validate Steam ID format: exactly 17 digits starting with 7656119
        if (/^7656119\d{10}$/.test(cleanSteamId) && cleanSteamId.length === 17) {
          validation.steam_id = cleanSteamId
          console.log("[v0] Steam ID extracted and validated:", validation.steam_id)
        } else {
          console.log("[v0] Invalid Steam ID format:", steamId, "cleaned:", cleanSteamId)
          validation.error = "Invalid Steam ID format in JWT"
        }
      } else {
        console.log("[v0] No Steam ID found in JWT payload")
        validation.error = "No Steam ID found in JWT"
      }

      // Extract expiration
      const expTimestamp = payloadData.exp
      if (expTimestamp) {
        validation.expires_at = expTimestamp
        const currentTime = Math.floor(Date.now() / 1000)
        validation.is_expired = currentTime > expTimestamp
        console.log("[v0] JWT expiration check:", {
          expires_at: expTimestamp,
          current_time: currentTime,
          is_expired: validation.is_expired,
        })
      }

      // Extract issued at
      const iatTimestamp = payloadData.iat
      if (iatTimestamp) {
        validation.issued_at = iatTimestamp
      }

      validation.is_valid = validation.steam_id !== undefined

      if (validation.is_expired) {
        validation.error = "Token has expired"
        validation.is_valid = false
      } else if (!validation.steam_id) {
        validation.error = "No valid Steam ID found in token"
      } else {
        console.log("[v0] JWT validation successful")
      }
    } catch (decodeError) {
      validation.error = `JWT payload decoding error: ${decodeError}`
      console.log("[v0] JWT payload decoding failed:", decodeError)
    }
  } catch (error) {
    validation.error = `JWT parsing error: ${error}`
    console.log("[v0] JWT parsing failed:", error)
  }

  console.log("[v0] JWT validation result:", validation)
  return validation
}

function extractUsernameFromJWT(jwtToken: string): string | undefined {
  try {
    const parts = jwtToken.split(".")
    if (parts.length >= 2) {
      let payloadPart = parts[1]
      payloadPart += "=".repeat(4 - (payloadPart.length % 4))

      const payloadBytes = atob(payloadPart.replace(/-/g, "+").replace(/_/g, "/"))
      const payloadData = JSON.parse(payloadBytes)

      // Look for username-like fields
      for (const field of ["username", "name", "persona", "personaname"]) {
        if (payloadData[field]) {
          return payloadData[field]
        }
      }
    }
  } catch (error) {
    // Ignore parsing errors
  }
  return undefined
}

function extractSteamIdFromToken(tokenString: string): string | undefined {
  try {
    // Try to extract from JWT
    if (tokenString.includes(".")) {
      const parts = tokenString.split(".")
      if (parts.length >= 2) {
        let payloadPart = parts[1]
        payloadPart += "=".repeat(4 - (payloadPart.length % 4))

        try {
          const payloadBytes = atob(payloadPart.replace(/-/g, "+").replace(/_/g, "/"))
          const payloadData = JSON.parse(payloadBytes)

          const steamId = payloadData.sub || payloadData.steamid
          if (steamId) {
            const cleanSteamId = String(steamId).replace(/[^\d]/g, "")
            if (/^7656119\d{10}$/.test(cleanSteamId) && cleanSteamId.length === 17) {
              return cleanSteamId
            }
          }
        } catch (error) {
          // Continue to other methods
        }
      }
    }

    const steamIdMatch = tokenString.match(/7656119\d{10}/)
    if (steamIdMatch) {
      const steamId = steamIdMatch[0]
      // Double-check it's exactly 17 digits
      if (steamId.length === 17) {
        return steamId
      }
    }
  } catch (error) {
    console.error("Token parsing error:", error)
  }

  return undefined
}

function parseCookiesFromLine(cookieLine: string): Record<string, string> {
  const cookies: Record<string, string> = {}
  if (!cookieLine) return cookies

  const parts = cookieLine.trim().split(";")
  for (const part of parts) {
    const trimmedPart = part.trim()
    if (trimmedPart.includes("=")) {
      const [key, value] = trimmedPart.split("=", 2)
      cookies[key.trim()] = value.trim()
    }
  }
  return cookies
}

function formatTimestamp(timestamp: number): string {
  if (timestamp && timestamp > 0) {
    return new Date(timestamp * 1000).toLocaleString()
  }
  return "Never"
}

async function getUserProfile(steamId: string, apiKey: string): Promise<UserProfile> {
  if (!steamId || steamId === "Unknown" || steamId === "Error") {
    return {
      username: "Unknown",
      real_name: "Not specified",
      avatar: "",
      profile_url: "",
      time_created: 0,
      last_logoff: 0,
      persona_state: 0,
    }
  }

  const maxRetries = 2
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(`/api/steam/profile?steamId=${steamId}&apiKey=${encodeURIComponent(apiKey)}`)

      if (response.status === 429) {
        // Rate limited, wait and retry
        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)))
          continue
        }
      }

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      return data
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Unknown error")

      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)))
        continue
      }
    }
  }

  console.error("Error fetching user profile after retries:", lastError)
  return {
    username: "Unknown",
    real_name: "Not specified",
    avatar: "",
    profile_url: `https://steamcommunity.com/profiles/${steamId}`,
    time_created: 0,
    last_logoff: 0,
    persona_state: 0,
  }
}

async function getBanInfo(steamId: string, apiKey: string): Promise<BanInfo> {
  if (!steamId || steamId === "Unknown" || steamId === "Error") {
    return {
      VACBanned: false,
      CommunityBanned: false,
      EconomyBan: "none",
      NumberOfVACBans: 0,
      DaysSinceLastBan: 0,
      NumberOfGameBans: 0,
      SteamID: "",
    }
  }

  const maxRetries = 2
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[v0] Fetching ban info for Steam ID: ${steamId}`)
      const response = await fetch(`/api/steam/bans?steamId=${steamId}&apiKey=${encodeURIComponent(apiKey)}`)

      if (response.status === 429) {
        // Rate limited, wait and retry
        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)))
          continue
        }
      }

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      console.log(`[v0] Ban info received for ${steamId}:`, {
        VACBanned: data.VACBanned,
        CommunityBanned: data.CommunityBanned,
        EconomyBan: data.EconomyBan,
        NumberOfVACBans: data.NumberOfVACBans,
        NumberOfGameBans: data.NumberOfGameBans,
        DaysSinceLastBan: data.DaysSinceLastBan,
      })

      if (data.error) {
        throw new Error(data.error)
      }

      return data
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Unknown error")

      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)))
        continue
      }
    }
  }

  console.error("Error fetching ban info after retries:", lastError)
  return {
    VACBanned: false,
    CommunityBanned: false,
    EconomyBan: "none",
    NumberOfVACBans: 0,
    DaysSinceLastBan: 0,
    NumberOfGameBans: 0,
    SteamID: steamId,
  }
}
