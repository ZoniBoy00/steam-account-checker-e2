"use client"

import type React from "react"
import { useState, useEffect, useCallback, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Shield, Users, CheckCircle, XCircle, Download, FileText, Settings, Scale, Lock, Github } from "lucide-react"
import { AccountTable } from "@/components/account-table"
import { StatsCards } from "@/components/stats-cards"
import { TokenInput } from "@/components/token-input"
import { ProgressDisplay } from "@/components/progress-display"
import { SettingsPanel } from "@/components/settings-panel"
import { HelpModal } from "@/components/help-modal"
import { SteamLogin } from "@/components/steam-login"
import { checkSteamAccounts } from "@/lib/steam-checker"
import { SecurityUtils } from "@/lib/security"
import { useToast } from "@/hooks/use-toast"
import type { SteamAccount, CheckStats } from "@/lib/types"

export default function SteamCheckerPage() {
  const [tokens, setTokens] = useState("")
  const [apiKey, setApiKey] = useState("")
  const [accounts, setAccounts] = useState<SteamAccount[]>([])
  const [stats, setStats] = useState<CheckStats>({
    total: 0,
    valid: 0,
    invalid: 0,
    expired: 0,
    vac_banned: 0,
    community_banned: 0,
    economy_banned: 0,
  })
  const [isChecking, setIsChecking] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentAccount, setCurrentAccount] = useState(0)
  const [checkInventory, setCheckInventory] = useState(false)
  const [steamAuthenticated, setSteamAuthenticated] = useState(false)
  const [authenticatedSteamId, setAuthenticatedSteamId] = useState<string | null>(null)
  const { toast } = useToast()
  const [error, setError] = useState("") // Declare setError variable

  const tokenCount = useMemo(() => {
    return tokens.split("\n").filter((t) => t.trim()).length
  }, [tokens])

  const canCheck = useMemo(() => {
    return tokens.trim() && apiKey.trim() && !isChecking
  }, [tokens, apiKey, isChecking])

  useEffect(() => {
    const savedApiKey = localStorage.getItem("steam_api_key")
    if (savedApiKey) {
      try {
        const decryptedKey = SecurityUtils.decryptFromStorage(savedApiKey)
        if (SecurityUtils.validateApiKey(decryptedKey)) {
          setApiKey(decryptedKey)
        } else {
          localStorage.removeItem("steam_api_key")
        }
      } catch {
        if (SecurityUtils.validateApiKey(savedApiKey)) {
          setApiKey(savedApiKey)
        } else {
          localStorage.removeItem("steam_api_key")
        }
      }
    }

    const savedInventoryPref = localStorage.getItem("check_inventory")
    if (savedInventoryPref === "true") {
      setCheckInventory(true)
    }
  }, [])

  useEffect(() => {
    localStorage.setItem("check_inventory", checkInventory.toString())
  }, [checkInventory])

  const showError = (message: string, title?: string) => {
    toast({
      variant: "destructive",
      title: title || "Error",
      description: message,
    })
  }

  const showSuccess = (message: string, title?: string) => {
    toast({
      variant: "success",
      title: title || "Success",
      description: message,
    })
  }

  const showWarning = (message: string, title?: string) => {
    toast({
      variant: "warning",
      title: title || "Warning",
      description: message,
    })
  }

  const showInfo = (message: string, title?: string) => {
    toast({
      variant: "info",
      title: title || "Info",
      description: message,
    })
  }

  const saveApiKey = useCallback(() => {
    const sanitizedKey = SecurityUtils.sanitizeInput(apiKey.trim())
    if (sanitizedKey && SecurityUtils.validateApiKey(sanitizedKey)) {
      const encryptedKey = SecurityUtils.encryptForStorage(sanitizedKey)
      localStorage.setItem("steam_api_key", encryptedKey)
      showSuccess("Steam API key saved successfully!")
    } else {
      showError("Invalid Steam API key format. Please check your key.", "Invalid API Key")
    }
  }, [apiKey])

  const clearApiKey = useCallback(() => {
    localStorage.removeItem("steam_api_key")
    setApiKey("")
    showSuccess("Steam API key cleared!")
  }, [])

  const handleFileUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) {
        return
      }

      event.target.value = ""

      if (file.size > 5 * 1024 * 1024) {
        showError("File too large. Maximum size is 5MB.", "File Upload Error")
        return
      }

      const allowedExtensions = [".txt", ".csv", ".log"]
      const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf("."))
      const isValidExtension = allowedExtensions.includes(fileExtension)

      const isValidMimeType =
        file.type === "" ||
        file.type === "text/plain" ||
        file.type.startsWith("text/") ||
        file.type === "application/octet-stream"

      if (!isValidExtension && !isValidMimeType) {
        showError(
          `Invalid file type. Please upload a text file (.txt, .csv, .log). File: ${file.name}`,
          "Invalid File Type",
        )
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        const content = e.target?.result as string
        if (!content) {
          showError("File appears to be empty or unreadable.", "File Read Error")
          return
        }

        const validation = SecurityUtils.validateFileContent(content)
        if (!validation.valid) {
          showError(validation.error || "Invalid file content", "File Validation Error")
          return
        }

        const lines = content.split(/\r?\n/).filter((line) => line.trim())
        const parsedTokens: string[] = []

        for (const line of lines) {
          const trimmedLine = line.trim()
          if (!trimmedLine) continue

          if (trimmedLine.includes("----")) {
            parsedTokens.push(trimmedLine)
          } else {
            parsedTokens.push(trimmedLine)
          }
        }

        if (parsedTokens.length === 0) {
          showError(
            "No valid tokens found in file. Expected format: 'username----token' or just tokens.",
            "No Valid Tokens",
          )
          return
        }

        const sanitizedTokens = parsedTokens
          .map((token) => SecurityUtils.sanitizeInput(token))
          .filter((token) => token.length > 0)

        const existingTokens = tokens.trim()
        const newTokens = existingTokens
          ? `${existingTokens}\n${sanitizedTokens.join("\n")}`
          : sanitizedTokens.join("\n")

        setTokens(newTokens)
        showSuccess(`Successfully imported ${sanitizedTokens.length} tokens from ${file.name}`, "File Import Success")
      }

      reader.onerror = () => {
        showError("Failed to read file. Please try again.", "File Read Error")
      }

      reader.readAsText(file)
    },
    [tokens],
  )

  const clearTokens = useCallback(() => {
    setTokens("")
    showSuccess("All tokens cleared!")
  }, [])

  const exportTokens = useCallback(() => {
    if (!tokens.trim()) return

    const blob = new Blob([tokens], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `steam_tokens_${new Date().toISOString().split("T")[0]}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    showSuccess(`Exported ${tokenCount} tokens to file`, "Export Complete")
  }, [tokens, tokenCount])

  const handleCheck = useCallback(async () => {
    if (!canCheck) {
      showError("Please enter tokens and configure your Steam API key", "Missing Configuration")
      return
    }

    const sanitizedApiKey = SecurityUtils.sanitizeInput(apiKey.trim())
    if (!SecurityUtils.validateApiKey(sanitizedApiKey)) {
      showError("Invalid Steam API key format", "Invalid API Key")
      return
    }

    setError("")
    setIsChecking(true)
    setProgress(0)
    setCurrentAccount(0)
    setAccounts([])

    showInfo("Starting Steam account validation...", "Check Started")

    try {
      const tokenList = tokens
        .split("\n")
        .map((token) => {
          const sanitized = SecurityUtils.sanitizeInput(token.trim())
          return sanitized
        })
        .filter((token) => {
          const isValid = token.length > 0 && SecurityUtils.validateSteamToken(token)
          return isValid
        })

      if (tokenList.length === 0) {
        showError("No valid tokens found. Please check your token format.", "No Valid Tokens")
        return
      }

      const results = await checkSteamAccounts(
        tokenList,
        sanitizedApiKey,
        (current, total) => {
          setCurrentAccount(current)
          setProgress((current / total) * 100)
        },
        checkInventory,
      )

      setAccounts(results.accounts)
      setStats(results.stats)

      const validAccounts = results.stats.valid
      const bannedAccounts = results.stats.vac_banned + results.stats.community_banned

      showSuccess(
        `Found ${validAccounts} valid accounts${bannedAccounts > 0 ? `, ${bannedAccounts} with bans` : ""}`,
        "Check Complete",
      )

      if (results.stats.expired > 0) {
        showWarning(`${results.stats.expired} tokens have expired and need renewal`, "Expired Tokens")
      }

      if (results.stats.invalid > 0) {
        showWarning(`${results.stats.invalid} tokens are invalid or malformed`, "Invalid Tokens")
      }

      const inventoryIssues = results.accounts.filter(
        (account) =>
          account.inventoryError &&
          !account.inventoryError.includes("private") &&
          !account.inventoryError.includes("Private"),
      ).length

      if (inventoryIssues > 0 && checkInventory) {
        showInfo(
          `${inventoryIssues} accounts had inventory access issues. This is normal for some Steam configurations.`,
          "Inventory Access Info",
        )
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred while checking accounts"
      showError(errorMessage, "Check Failed")
    } finally {
      setIsChecking(false)
      setProgress(0)
      setCurrentAccount(0)
    }
  }, [canCheck, tokens, apiKey, checkInventory])

  const exportResults = useCallback(() => {
    if (accounts.length === 0) return

    const csvHeaders = [
      "Account Number",
      "Status",
      "Steam ID",
      "Username",
      "Real Name",
      "VAC Banned",
      "VAC Count",
      "Community Banned",
      "Economy Banned",
      "Game Bans",
      "Account Created",
      "Last Online",
      "JWT Expires",
      "Profile URL",
    ]

    const csvData = accounts.map((account) => [
      account.accountNumber,
      account.status,
      account.steamId,
      account.username,
      account.realName,
      account.vacBanned ? "Yes" : "No",
      account.vacCount,
      account.communityBanned ? "Yes" : "No",
      account.economyBanned,
      account.gameBans || 0,
      account.accountCreated,
      account.lastOnline,
      account.expires,
      account.profileUrl || "",
    ])

    const csvContent = [csvHeaders, ...csvData].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `steam_accounts_${new Date().toISOString().split("T")[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    showSuccess(`Exported ${accounts.length} accounts to CSV`, "Export Complete")
  }, [accounts])

  const exportValidTokens = useCallback(() => {
    const validAccounts = accounts.filter(
      (account) =>
        account.status.toLowerCase() === "valid" &&
        !account.vacBanned &&
        !account.communityBanned &&
        account.gameBans === 0,
    )

    if (validAccounts.length === 0) {
      showError("No valid tokens without gameplay-affecting bans to export", "No Clean Tokens")
      return
    }

    const validTokens = validAccounts
      .map((account) => account.originalToken)
      .filter((token) => token)
      .join("\n")

    const blob = new Blob([validTokens], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `clean_steam_tokens_${new Date().toISOString().split("T")[0]}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    showSuccess(`Exported ${validAccounts.length} clean tokens (no gameplay bans) to file`, "Clean Tokens Exported")
  }, [accounts])

  const handleSteamAuthChange = useCallback((isAuthenticated: boolean, steamId?: string) => {
    setSteamAuthenticated(isAuthenticated)
    setAuthenticatedSteamId(steamId || null)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Primary floating orbs with enhanced glow */}
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-gradient-to-r from-blue-500/15 to-cyan-500/10 rounded-full blur-3xl animate-pulse-glow"></div>
        <div className="absolute top-3/4 right-1/4 w-96 h-96 bg-gradient-to-r from-purple-500/12 to-pink-500/8 rounded-full blur-3xl animate-pulse-glow delay-1000"></div>
        <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-gradient-to-r from-cyan-500/10 to-blue-500/15 rounded-full blur-3xl animate-pulse-glow delay-2000"></div>

        {/* Secondary smaller orbs for depth */}
        <div className="absolute top-1/2 right-1/3 w-48 h-48 bg-gradient-to-r from-indigo-500/8 to-purple-500/6 rounded-full blur-2xl animate-pulse-glow delay-500"></div>
        <div className="absolute bottom-1/3 right-1/4 w-64 h-64 bg-gradient-to-r from-teal-500/6 to-cyan-500/8 rounded-full blur-2xl animate-pulse-glow delay-1500"></div>

        {/* Enhanced animated grid pattern with shimmer effect */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.04)_1px,transparent_1px)] bg-[size:60px_60px] animate-drift"></div>

        {/* Diagonal grid overlay for more complexity */}
        <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(139,92,246,0.02)_1px,transparent_1px),linear-gradient(-45deg,rgba(139,92,246,0.02)_1px,transparent_1px)] bg-[size:80px_80px] animate-drift delay-1000 opacity-50"></div>

        {/* Enhanced floating particles with varied sizes and colors */}
        <div className="absolute top-10 left-10 w-3 h-3 bg-blue-400/40 rounded-full animate-float shadow-lg shadow-blue-400/20"></div>
        <div className="absolute top-1/3 right-20 w-2 h-2 bg-purple-400/50 rounded-full animate-float-reverse shadow-lg shadow-purple-400/25"></div>
        <div className="absolute bottom-1/3 left-1/2 w-2.5 h-2.5 bg-cyan-400/45 rounded-full animate-float delay-1000 shadow-lg shadow-cyan-400/20"></div>
        <div className="absolute top-2/3 right-1/3 w-1.5 h-1.5 bg-blue-300/35 rounded-full animate-float-reverse delay-500 shadow-lg shadow-blue-300/15"></div>
        <div className="absolute top-1/6 left-2/3 w-2 h-2 bg-indigo-400/40 rounded-full animate-float delay-2000 shadow-lg shadow-indigo-400/20"></div>
        <div className="absolute bottom-1/6 right-1/6 w-1 h-1 bg-teal-400/30 rounded-full animate-float-reverse delay-1500 shadow-lg shadow-teal-400/15"></div>

        {/* Subtle light rays */}
        <div className="absolute top-0 left-1/4 w-px h-full bg-gradient-to-b from-transparent via-blue-400/10 to-transparent animate-pulse delay-3000"></div>
        <div className="absolute top-0 right-1/3 w-px h-full bg-gradient-to-b from-transparent via-purple-400/8 to-transparent animate-pulse delay-4000"></div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 relative z-10">
        <div className="text-center mb-6 sm:mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-2 sm:p-3 bg-blue-600/20 rounded-xl border border-blue-500/30">
              <Shield className="h-6 w-6 sm:h-8 sm:w-8 text-blue-400" />
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-balance text-white">
              Steam Account Checker
            </h1>
          </div>
          <p className="text-slate-400 text-sm sm:text-base lg:text-lg max-w-2xl mx-auto px-4">
            Professional Steam session token validation with comprehensive account analysis and ban detection
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 mt-4">
            <Badge
              variant="secondary"
              className="bg-green-600/30 text-green-200 border-green-500/50 text-xs sm:text-sm"
            >
              <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-400" />
              Secure
            </Badge>
            <Badge variant="secondary" className="bg-blue-600/30 text-blue-200 border-blue-500/50 text-xs sm:text-sm">
              <Shield className="h-3 w-3 sm:h-4 sm:w-4" />
              Professional
            </Badge>
            <Badge
              variant="secondary"
              className="bg-purple-600/30 text-purple-200 border-purple-500/50 text-xs sm:text-sm"
            >
              <Users className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              Bulk Processing
            </Badge>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 mt-4 sm:mt-6">
            <HelpModal />
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-400 hover:text-slate-200 text-xs sm:text-sm"
              asChild
            >
              <a
                href="https://github.com/ZoniBoy00"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center"
              >
                <Github className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                GitHub
              </a>
            </Button>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-slate-400 hover:text-slate-200 text-xs sm:text-sm">
                  <Scale className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Terms of Service</span>
                  <span className="sm:hidden">Terms</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[80vh] bg-slate-800 border-slate-700">
                <DialogHeader>
                  <DialogTitle className="text-xl text-slate-200">Terms of Service</DialogTitle>
                  <DialogDescription className="text-slate-400">
                    Please read and understand these terms before using Steam Account Checker
                  </DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-[60vh] pr-6">
                  <div className="space-y-6 text-sm text-slate-300">
                    <section>
                      <h3 className="font-semibold text-lg text-slate-200 mb-3">1. Acceptance of Terms</h3>
                      <p className="text-slate-400 leading-relaxed">
                        By using Steam Account Checker, you agree to comply with and be bound by these Terms of Service.
                        If you do not agree to these terms, please do not use this service.
                      </p>
                    </section>

                    <section>
                      <h3 className="font-semibold text-lg text-slate-200 mb-3">2. Permitted Use</h3>
                      <ul className="list-disc list-inside space-y-2 text-slate-400 ml-4">
                        <li>
                          You may only use this tool with Steam accounts that you own or have explicit permission to
                          access
                        </li>
                        <li>This tool is intended for legitimate account management and verification purposes only</li>
                        <li>You must comply with Steam's Terms of Service and Community Guidelines</li>
                        <li>Commercial use requires explicit written permission</li>
                      </ul>
                    </section>

                    <section>
                      <h3 className="font-semibold text-lg text-slate-200 mb-3">3. Prohibited Activities</h3>
                      <ul className="list-disc list-inside space-y-2 text-slate-400 ml-4">
                        <li>Using this tool to access accounts without proper authorization</li>
                        <li>Attempting to circumvent Steam's security measures</li>
                        <li>Using the tool for any illegal or unauthorized purposes</li>
                        <li>Sharing or distributing Steam API keys or account credentials</li>
                        <li>Reverse engineering or attempting to modify the tool's functionality</li>
                      </ul>
                    </section>

                    <section>
                      <h3 className="font-semibold text-lg text-slate-200 mb-3">4. Data Security</h3>
                      <ul className="list-disc list-inside space-y-2 text-slate-400 ml-4">
                        <li>Your Steam API key is stored locally in your browser only</li>
                        <li>No account data or tokens are transmitted to third-party servers</li>
                        <li>You are responsible for keeping your API key and account credentials secure</li>
                        <li>We recommend using this tool only on trusted devices</li>
                      </ul>
                    </section>

                    <section>
                      <h3 className="font-semibold text-lg text-slate-200 mb-3">5. Disclaimer</h3>
                      <p className="text-slate-400 leading-relaxed">
                        This tool is provided "as is" without any warranties. We are not responsible for any account
                        suspensions, bans, or other consequences that may result from using this tool. Use at your own
                        risk.
                      </p>
                    </section>

                    <section>
                      <h3 className="font-semibold text-lg text-slate-200 mb-3">6. Limitation of Liability</h3>
                      <p className="text-slate-400 leading-relaxed">
                        We shall not be liable for any direct, indirect, incidental, special, or consequential damages
                        resulting from the use or inability to use this tool.
                      </p>
                    </section>
                  </div>
                </ScrollArea>
              </DialogContent>
            </Dialog>

            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-slate-400 hover:text-slate-200 text-xs sm:text-sm">
                  <Lock className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Privacy Policy</span>
                  <span className="sm:hidden">Privacy</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[80vh] bg-slate-800 border-slate-700">
                <DialogHeader>
                  <DialogTitle className="text-xl text-slate-200">Privacy Policy</DialogTitle>
                  <DialogDescription className="text-slate-400">
                    How we handle your data and protect your privacy
                  </DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-[60vh] pr-6">
                  <div className="space-y-6 text-sm text-slate-300">
                    <section>
                      <h3 className="font-semibold text-lg text-slate-200 mb-3">1. Data Collection</h3>
                      <p className="text-slate-400 leading-relaxed mb-3">
                        Steam Account Checker is designed with privacy in mind. We collect minimal data:
                      </p>
                      <ul className="list-disc list-inside space-y-2 text-slate-400 ml-4">
                        <li>Steam API key (stored locally in your browser only)</li>
                        <li>Steam tokens you input (processed locally, not stored)</li>
                        <li>No personal information is collected or transmitted</li>
                      </ul>
                    </section>

                    <section>
                      <h3 className="font-semibold text-lg text-slate-200 mb-3">2. Data Processing</h3>
                      <ul className="list-disc list-inside space-y-2 text-slate-400 ml-4">
                        <li>All token validation is performed locally in your browser</li>
                        <li>API calls are made directly to Steam's official servers</li>
                        <li>No data is sent to our servers or third-party services</li>
                        <li>Results are displayed locally and not stored permanently</li>
                      </ul>
                    </section>

                    <section>
                      <h3 className="font-semibold text-lg text-slate-200 mb-3">3. Data Storage</h3>
                      <ul className="list-disc list-inside space-y-2 text-slate-400 ml-4">
                        <li>Steam API key is stored in your browser's local storage</li>
                        <li>No account data or tokens are stored on external servers</li>
                        <li>You can clear stored data at any time using the "Clear" button</li>
                        <li>Data is automatically cleared when you clear your browser data</li>
                      </ul>
                    </section>

                    <section>
                      <h3 className="font-semibold text-lg text-slate-200 mb-3">4. Third-Party Services</h3>
                      <p className="text-slate-400 leading-relaxed">
                        This tool only communicates with Steam's official API servers. We do not use analytics,
                        tracking, or advertising services that would compromise your privacy.
                      </p>
                    </section>

                    <section>
                      <h3 className="font-semibold text-lg text-slate-200 mb-3">5. Security</h3>
                      <ul className="list-disc list-inside space-y-2 text-slate-400 ml-4">
                        <li>All connections to Steam API use HTTPS encryption</li>
                        <li>Your API key never leaves your browser</li>
                        <li>No login or account creation is required</li>
                        <li>Tool operates entirely client-side for maximum security</li>
                      </ul>
                    </section>

                    <section>
                      <h3 className="font-semibold text-lg text-slate-200 mb-3">6. Your Rights</h3>
                      <ul className="list-disc list-inside space-y-2 text-slate-400 ml-4">
                        <li>You can delete your stored API key at any time</li>
                        <li>No account or profile is created, so no data deletion is necessary</li>
                        <li>You have full control over what data you input into the tool</li>
                      </ul>
                    </section>

                    <section>
                      <h3 className="font-semibold text-lg text-slate-200 mb-3">7. Contact</h3>
                      <p className="text-slate-400 leading-relaxed">
                        If you have any questions about this Privacy Policy or how your data is handled, please contact
                        us through the appropriate channels.
                      </p>
                    </section>
                  </div>
                </ScrollArea>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Tabs defaultValue="checker" className="space-y-4 sm:space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 h-auto rounded-xl shadow-lg">
            <TabsTrigger
              value="checker"
              className="data-[state=active]:bg-blue-600/40 data-[state=active]:text-blue-100 data-[state=active]:shadow-md text-slate-300 hover:text-slate-200 transition-all duration-200 flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium rounded-lg"
            >
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Token Checker</span>
              <span className="sm:hidden">Checker</span>
            </TabsTrigger>
            <TabsTrigger
              value="results"
              className="data-[state=active]:bg-blue-600/40 data-[state=active]:text-blue-100 data-[state=active]:shadow-md text-slate-300 hover:text-slate-200 transition-all duration-200 flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium rounded-lg"
            >
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Results ({accounts.length})</span>
              <span className="sm:hidden">Results ({accounts.length})</span>
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              className="data-[state=active]:bg-blue-600/40 data-[state=active]:text-blue-100 data-[state=active]:shadow-md text-slate-300 hover:text-slate-200 transition-all duration-200 flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium rounded-lg"
            >
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Settings</span>
              <span className="sm:hidden">Settings</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="checker" className="space-y-4 sm:space-y-6">
            <TokenInput
              tokens={tokens}
              setTokens={setTokens}
              isChecking={isChecking}
              onCheck={handleCheck}
              onFileUpload={handleFileUpload}
              onExportTokens={exportTokens}
              onClearTokens={clearTokens}
              canCheck={canCheck}
              checkInventory={checkInventory}
              setCheckInventory={setCheckInventory}
            />

            {isChecking && (
              <ProgressDisplay progress={progress} currentAccount={currentAccount} totalAccounts={tokenCount} />
            )}
          </TabsContent>

          <TabsContent value="results" className="space-y-4 sm:space-y-6">
            {accounts.length > 0 ? (
              <>
                <StatsCards stats={stats} />
                <Card>
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <CardTitle className="text-lg sm:text-xl">Account Results</CardTitle>
                        <CardDescription className="text-sm">
                          Detailed information about each checked Steam account
                        </CardDescription>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Button
                          onClick={exportValidTokens}
                          variant="outline"
                          size="sm"
                          className="bg-green-600/20 border-green-600/50 text-green-400 hover:bg-green-600/30 text-xs sm:text-sm"
                        >
                          <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                          <span className="hidden sm:inline">Export Valid Tokens</span>
                          <span className="sm:hidden">Valid Tokens</span>
                        </Button>
                        <Button
                          onClick={exportResults}
                          variant="outline"
                          size="sm"
                          className="text-xs sm:text-sm bg-transparent"
                        >
                          <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                          <span className="hidden sm:inline">Export CSV</span>
                          <span className="sm:hidden">CSV</span>
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-2 sm:p-6">
                    <AccountTable accounts={accounts} />
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <XCircle className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Results Yet</h3>
                  <p className="text-muted-foreground text-center">
                    Switch to the Token Checker tab to validate Steam accounts
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="settings" className="space-y-4 sm:space-y-6">
            <SteamLogin onAuthChange={handleSteamAuthChange} />

            <SettingsPanel
              apiKey={apiKey}
              setApiKey={setApiKey}
              onSaveApiKey={saveApiKey}
              onClearApiKey={clearApiKey}
              checkInventory={checkInventory}
              setCheckInventory={setCheckInventory}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
