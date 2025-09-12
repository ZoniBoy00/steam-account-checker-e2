import type { SteamAccount, CheckStats, TokenInfo, JWTValidation, UserProfile, BanInfo } from "./types"

export async function checkSteamAccounts(
  tokens: string[],
  apiKey: string,
  onProgress?: (current: number, total: number) => void,
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
  }

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]
    onProgress?.(i + 1, tokens.length)

    try {
      const account = await processToken(token, i + 1, apiKey)
      accounts.push(account)

      // Update stats
      switch (account.status.toLowerCase()) {
        case "valid":
          stats.valid++
          break
        case "expired":
          stats.expired++
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

async function processToken(token: string, accountNumber: number, apiKey: string): Promise<SteamAccount> {
  const tokenInfo = parseTokenFormat(token)
  const jwtValidation = tokenInfo.jwt_token ? validateJWTToken(tokenInfo.jwt_token) : null

  // Extract Steam ID
  let steamId = ""
  if (jwtValidation?.steam_id) {
    steamId = jwtValidation.steam_id
  } else {
    steamId = extractSteamIdFromToken(token) || ""
  }

  // Determine status
  let status = "Valid"
  if (jwtValidation) {
    if (jwtValidation.is_expired) {
      status = "Expired"
    } else if (!jwtValidation.is_valid) {
      status = "Invalid JWT"
    }
  } else if (!steamId) {
    status = "Invalid"
  }

  const userProfile = await getUserProfile(steamId, apiKey)
  const banInfo = await getBanInfo(steamId, apiKey)

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
      validation.error = "Invalid JWT format"
      return validation
    }

    // Decode payload
    let payloadPart = parts[1]
    payloadPart += "=".repeat(4 - (payloadPart.length % 4))

    const payloadBytes = atob(payloadPart.replace(/-/g, "+").replace(/_/g, "/"))
    const payloadData = JSON.parse(payloadBytes)

    validation.payload = payloadData

    // Extract Steam ID
    const steamId = payloadData.sub
    if (steamId && String(steamId).length === 17) {
      validation.steam_id = String(steamId)
    }

    // Extract expiration
    const expTimestamp = payloadData.exp
    if (expTimestamp) {
      validation.expires_at = expTimestamp
      const currentTime = Math.floor(Date.now() / 1000)
      validation.is_expired = currentTime > expTimestamp
    }

    // Extract issued at
    const iatTimestamp = payloadData.iat
    if (iatTimestamp) {
      validation.issued_at = iatTimestamp
    }

    // Check if token is structurally valid and not expired
    validation.is_valid = validation.steam_id !== undefined && !validation.is_expired

    if (validation.is_expired) {
      validation.error = "Token has expired"
    } else if (!validation.steam_id) {
      validation.error = "No valid Steam ID found in token"
    }
  } catch (error) {
    validation.error = `JWT parsing error: ${error}`
  }

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
          if (steamId && String(steamId).length === 17) {
            return String(steamId)
          }
        } catch (error) {
          // Continue to other methods
        }
      }
    }

    // Try to extract 17-digit Steam ID directly
    const steamIdMatch = tokenString.match(/(\d{17})/)
    if (steamIdMatch) {
      return steamIdMatch[1]
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
