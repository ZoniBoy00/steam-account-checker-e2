export class SecurityUtils {
  // Sanitize user input to prevent XSS attacks
  static sanitizeInput(input: string): string {
    if (typeof input !== "string") return ""

    return input
      .replace(/[<>]/g, "") // Remove potential HTML tags
      .replace(/javascript:/gi, "") // Remove javascript: protocol
      .replace(/on\w+=/gi, "") // Remove event handlers
      .trim()
  }

  // Validate Steam API key format
  static validateApiKey(apiKey: string): boolean {
    if (!apiKey || typeof apiKey !== "string") return false

    // Steam API keys are 32 character hexadecimal strings
    const apiKeyRegex = /^[A-Fa-f0-9]{32}$/
    return apiKeyRegex.test(apiKey.trim())
  }

  // Validate Steam token format
  static validateSteamToken(token: string): boolean {
    if (!token || typeof token !== "string") return false

    const sanitizedToken = this.sanitizeInput(token)

    // Check for JWT format
    const jwtRegex = /^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/

    // Check for username----JWT format
    const usernameJwtRegex = /^[a-zA-Z0-9_-]+----eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/

    // Check for cookie format
    const cookieRegex = /^steamLoginSecure=[0-9%]+\|\|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/

    return jwtRegex.test(sanitizedToken) || usernameJwtRegex.test(sanitizedToken) || cookieRegex.test(sanitizedToken)
  }

  // Validate file content before processing
  static validateFileContent(content: string, maxSize: number = 1024 * 1024): { valid: boolean; error?: string } {
    if (!content || typeof content !== "string") {
      return { valid: false, error: "Invalid file content" }
    }

    if (content.length > maxSize) {
      return { valid: false, error: "File too large" }
    }

    // Check for potentially malicious content
    const maliciousPatterns = [/<script/i, /javascript:/i, /on\w+=/i, /<iframe/i, /<object/i, /<embed/i]

    for (const pattern of maliciousPatterns) {
      if (pattern.test(content)) {
        return { valid: false, error: "File contains potentially malicious content" }
      }
    }

    return { valid: true }
  }

  // Encrypt sensitive data for localStorage
  static encryptForStorage(data: string, key = "steam_checker_key"): string {
    try {
      // Simple XOR encryption for localStorage (better than plain text)
      let encrypted = ""
      for (let i = 0; i < data.length; i++) {
        encrypted += String.fromCharCode(data.charCodeAt(i) ^ key.charCodeAt(i % key.length))
      }
      return btoa(encrypted)
    } catch {
      return data // Fallback to plain text if encryption fails
    }
  }

  // Decrypt sensitive data from localStorage
  static decryptFromStorage(encryptedData: string, key = "steam_checker_key"): string {
    try {
      const encrypted = atob(encryptedData)
      let decrypted = ""
      for (let i = 0; i < encrypted.length; i++) {
        decrypted += String.fromCharCode(encrypted.charCodeAt(i) ^ key.charCodeAt(i % key.length))
      }
      return decrypted
    } catch {
      return encryptedData // Fallback to treating as plain text
    }
  }

  // Rate limiting for API calls
  static createRateLimiter(maxCalls: number, windowMs: number) {
    const calls: number[] = []

    return {
      canMakeCall(): boolean {
        const now = Date.now()
        // Remove calls outside the window
        while (calls.length > 0 && calls[0] <= now - windowMs) {
          calls.shift()
        }

        if (calls.length >= maxCalls) {
          return false
        }

        calls.push(now)
        return true
      },
      getRemainingCalls(): number {
        const now = Date.now()
        // Remove calls outside the window
        while (calls.length > 0 && calls[0] <= now - windowMs) {
          calls.shift()
        }
        return Math.max(0, maxCalls - calls.length)
      },
    }
  }
}
