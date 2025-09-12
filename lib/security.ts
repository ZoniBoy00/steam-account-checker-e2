export class SecurityUtils {
  static sanitizeInput(input: string): string {
    if (typeof input !== "string") return ""

    return input
      .replace(/[<>]/g, "") // Remove potential HTML tags
      .replace(/javascript:/gi, "") // Remove javascript: protocol
      .replace(/on\w+=/gi, "") // Remove event handlers
      .replace(/data:/gi, "") // Remove data: protocol
      .replace(/vbscript:/gi, "") // Remove vbscript: protocol
      .replace(/[\x00-\x1f\x7f-\x9f]/g, "") // Remove control characters
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

  static validateFileContent(content: string, maxSize: number = 1024 * 1024): { valid: boolean; error?: string } {
    if (!content || typeof content !== "string") {
      return { valid: false, error: "Invalid file content" }
    }

    if (content.length > maxSize) {
      return { valid: false, error: "File too large" }
    }

    // Enhanced malicious content detection
    const maliciousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+=/i,
      /<iframe/i,
      /<object/i,
      /<embed/i,
      /data:/i,
      /vbscript:/i,
      /<form/i,
      /<input/i,
      /eval\(/i,
      /Function\(/i,
      /setTimeout/i,
      /setInterval/i,
      /document\./i,
      /window\./i,
      /location\./i,
    ]

    for (const pattern of maliciousPatterns) {
      if (pattern.test(content)) {
        return { valid: false, error: "File contains potentially malicious content" }
      }
    }

    return { valid: true }
  }

  static encryptForStorage(data: string, key = "steam_checker_key_v2"): string {
    try {
      // Enhanced XOR encryption with salt
      const salt = Math.random().toString(36).substring(2, 15)
      const derivedKey = key + salt
      let encrypted = salt + ":"

      for (let i = 0; i < data.length; i++) {
        encrypted += String.fromCharCode(data.charCodeAt(i) ^ derivedKey.charCodeAt(i % derivedKey.length))
      }
      return btoa(encrypted)
    } catch {
      return data // Fallback to plain text if encryption fails
    }
  }

  static decryptFromStorage(encryptedData: string, key = "steam_checker_key_v2"): string {
    try {
      const encrypted = atob(encryptedData)
      const saltEndIndex = encrypted.indexOf(":")
      if (saltEndIndex === -1) return encryptedData

      const salt = encrypted.substring(0, saltEndIndex)
      const derivedKey = key + salt
      const encryptedContent = encrypted.substring(saltEndIndex + 1)

      let decrypted = ""
      for (let i = 0; i < encryptedContent.length; i++) {
        decrypted += String.fromCharCode(encryptedContent.charCodeAt(i) ^ derivedKey.charCodeAt(i % derivedKey.length))
      }
      return decrypted
    } catch {
      return encryptedData // Fallback to treating as plain text
    }
  }

  static createRateLimiter(maxCalls: number, windowMs: number) {
    const calls: number[] = []
    const blockedUntil = { time: 0 }

    return {
      canMakeCall(): boolean {
        const now = Date.now()

        // Check if currently blocked
        if (now < blockedUntil.time) {
          return false
        }

        // Remove calls outside the window
        while (calls.length > 0 && calls[0] <= now - windowMs) {
          calls.shift()
        }

        if (calls.length >= maxCalls) {
          // Block for 5 minutes on rate limit exceeded
          blockedUntil.time = now + 5 * 60 * 1000
          return false
        }

        calls.push(now)
        return true
      },
      getRemainingCalls(): number {
        const now = Date.now()

        if (now < blockedUntil.time) {
          return 0
        }

        // Remove calls outside the window
        while (calls.length > 0 && calls[0] <= now - windowMs) {
          calls.shift()
        }
        return Math.max(0, maxCalls - calls.length)
      },
      isBlocked(): boolean {
        return Date.now() < blockedUntil.time
      },
    }
  }

  static generateCSRFToken(): string {
    const array = new Uint8Array(32)
    crypto.getRandomValues(array)
    return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("")
  }

  static validateCSRFToken(token: string, storedToken: string): boolean {
    if (!token || !storedToken || typeof token !== "string" || typeof storedToken !== "string") {
      return false
    }
    return token === storedToken
  }

  static validateInputLength(input: string, maxLength = 1000): boolean {
    return typeof input === "string" && input.length <= maxLength
  }
}
