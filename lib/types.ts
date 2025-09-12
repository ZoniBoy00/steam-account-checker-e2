export interface SteamAccount {
  accountNumber: number
  status:
    | "Valid"
    | "Invalid"
    | "Expired"
    | "Error"
    | "Invalid JWT"
    | "Session Invalid"
    | "Account Not Found"
    | "Limited Profile"
  steamId: string
  username: string
  realName: string
  vacBanned: boolean
  communityBanned: boolean
  economyBanned: "none" | "probation" | "banned" | "error"
  vacCount: number
  accountCreated: string
  lastOnline: string
  expires: string
  jwtValid: boolean
  jwtExpired: boolean
  profileUrl: string
  daysSinceLastBan: number
  gameBans: number
  personaState: number
  originalToken?: string
}

export interface CheckStats {
  total: number
  valid: number
  invalid: number
  expired: number
  vac_banned: number
  community_banned: number
  economy_banned: number
  account_not_found: number
  limited_profile: number
}

export interface TokenInfo {
  username?: string
  jwt_token?: string
  cookies: Record<string, string>
  raw_token: string
}

export interface JWTValidation {
  is_valid: boolean
  is_expired: boolean
  steam_id?: string
  username?: string
  expires_at?: number
  issued_at?: number
  error?: string
  payload?: Record<string, unknown>
}

export interface UserProfile {
  username: string
  real_name: string
  avatar: string
  profile_url: string
  time_created: number
  last_logoff: number
  persona_state: number
}

export interface BanInfo {
  VACBanned: boolean
  CommunityBanned: boolean
  EconomyBan: string
  NumberOfVACBans: number
  DaysSinceLastBan: number
  NumberOfGameBans: number
  SteamID: string
}

export interface ApiResponse<T> {
  data?: T
  error?: string
  status: number
}

export interface RateLimitInfo {
  count: number
  resetTime: number
}

export type PersonaState = 0 | 1 | 2 | 3 | 4 | 5 | 6

export interface SteamApiError {
  message: string
  code?: number
  type: "validation" | "api" | "network" | "timeout" | "rate_limit"
}
