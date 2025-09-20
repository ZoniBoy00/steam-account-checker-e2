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
  const tokenInfo = parseTokenFormat(token)
  const jwtValidation = tokenInfo.jwt_token ? validateJWTToken(tokenInfo.jwt_token) : null

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
    inventoryInfo = await getInventoryInfo(steamId, apiKey)
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

async function getInventoryInfo(steamId: string, apiKey?: string): Promise<InventoryInfo> {
  const maxRetries = 2 // Reduced retries for faster response
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const url = new URL("/api/steam/inventory", window.location.origin)
      url.searchParams.set("steamId", steamId)
      if (apiKey && apiKey.trim()) {
        url.searchParams.set("apiKey", apiKey.trim())
      }

      const response = await fetch(url.toString())

      if (response.status === 429) {
        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 1500 * (attempt + 1)))
          continue
        }
      }

      if (!response.ok) {
        throw new Error(`Inventory API request failed: ${response.status}`)
      }

      const data = await response.json()

      if (data.error) {
        if (data.isPrivate) {
          return {
            inventoryValue: 0,
            itemCount: 0,
            isPrivate: true,
            error: "Private inventory",
          }
        }

        return {
          inventoryValue: 0,
          itemCount: 0,
          isPrivate: false,
          error: data.error,
          suggestion: data.suggestion,
        }
      }

      return {
        inventoryValue: data.inventoryValue || 0,
        itemCount: data.itemCount || 0,
        isPrivate: data.isPrivate || false,
        error: data.error || null,
        method: data.method,
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Unknown error")

      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 800 * (attempt + 1)))
        continue
      }
    }
  }

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
    if (tokenString.includes("----")) {
      const parts = tokenString.split("----", 2)
      if (parts.length === 2) {
        tokenInfo.username = parts[0].trim()
        tokenInfo.jwt_token = parts[1].trim()
        tokenInfo.cookies["steamLoginSecure"] = tokenInfo.jwt_token
        return tokenInfo
      }
    }

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

    if (tokenString.split(".").length === 3) {
      tokenInfo.jwt_token = tokenString.trim()
      tokenInfo.cookies["steamLoginSecure"] = tokenString.trim()

      const username = extractUsernameFromJWT(tokenString)
      if (username) {
        tokenInfo.username = username
      }

      return tokenInfo
    }

    tokenInfo.cookies = parseCookiesFromLine(tokenString)
  } catch (error) {}

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
      validation.error = "Invalid JWT format - wrong number of parts"
      return validation
    }

    let payloadPart = parts[1]

    while (payloadPart.length % 4 !== 0) {
      payloadPart += "="
    }

    try {
      const normalizedPayload = payloadPart.replace(/-/g, "+").replace(/_/g, "/")
      const payloadBytes = atob(normalizedPayload)

      let payloadData
      try {
        payloadData = JSON.parse(payloadBytes)
      } catch (jsonError) {
        let fixedPayload = payloadBytes

        fixedPayload = fixedPayload.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":')

        fixedPayload = fixedPayload.replace(/:\s*"([^"]*)"([^",}]*)"([^",}]*)/g, ':"$1\\"$2\\"$3"')

        fixedPayload = fixedPayload.replace(/(,\s*[}\]])/g, "$1")

        fixedPayload = fixedPayload.replace(/"\s*([a-zA-Z_])/g, '", "$1')

        try {
          payloadData = JSON.parse(fixedPayload)
        } catch (recoveryError) {
          const subMatch = payloadBytes.match(/"sub":\s*"([^"]+)"/i)
          const expMatch = payloadBytes.match(/"exp":\s*(\d+)/i)
          const iatMatch = payloadBytes.match(/"iat":\s*(\d+)/i)

          if (subMatch || expMatch) {
            payloadData = {}
            if (subMatch) {
              let steamId = subMatch[1]
              steamId = steamId.replace(/[^\d]/g, "")

              if (steamId.length >= 10) {
                if (!steamId.startsWith("7656119")) {
                  const suffix = steamId.slice(-10)
                  steamId = "7656119" + suffix
                }
                if (steamId.length > 17) {
                  steamId = steamId.substring(0, 17)
                } else if (steamId.length < 17 && steamId.startsWith("7656119")) {
                  steamId = steamId.padEnd(17, "0")
                }
              }

              if (/^7656119\d{10}$/.test(steamId)) {
                payloadData.sub = steamId
              } else {
                validation.error = "Invalid Steam ID format in JWT"
              }
            }
            if (expMatch) payloadData.exp = Number.parseInt(expMatch[1])
            if (iatMatch) payloadData.iat = Number.parseInt(iatMatch[1])
          } else {
            validation.error = `JWT payload parsing failed`
            return validation
          }
        }
      }

      validation.payload = payloadData

      const steamId = payloadData.sub
      if (steamId) {
        const cleanSteamId = String(steamId).replace(/[^\d]/g, "")
        if (/^7656119\d{10}$/.test(cleanSteamId) && cleanSteamId.length === 17) {
          validation.steam_id = cleanSteamId
        } else {
          validation.error = "Invalid Steam ID format in JWT"
        }
      } else {
        validation.error = "No Steam ID found in JWT"
      }

      const expTimestamp = payloadData.exp
      if (expTimestamp) {
        validation.expires_at = expTimestamp
        const currentTime = Math.floor(Date.now() / 1000)
        validation.is_expired = currentTime > expTimestamp
      }

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
      }
    } catch (decodeError) {
      validation.error = `JWT payload decoding error: ${decodeError}`
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

      for (const field of ["username", "name", "persona", "personaname"]) {
        if (payloadData[field]) {
          return payloadData[field]
        }
      }
    }
  } catch (error) {}
  return undefined
}

function extractSteamIdFromToken(tokenString: string): string | undefined {
  try {
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
        } catch (error) {}
      }
    }

    const steamIdMatch = tokenString.match(/7656119\d{10}/)
    if (steamIdMatch) {
      const steamId = steamIdMatch[0]
      if (steamId.length === 17) {
        return steamId
      }
    }
  } catch (error) {}

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
        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)))
          continue
        }
      }

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`)
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
        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)))
          continue
        }
      }

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`)
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
