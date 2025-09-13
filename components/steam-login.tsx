"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { LogIn, User, Info } from "lucide-react"

interface SteamLoginProps {
  onAuthChange?: (isAuthenticated: boolean, steamId?: string) => void
}

export function SteamLogin({ onAuthChange }: SteamLoginProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [steamId, setSteamId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [authMessage, setAuthMessage] = useState<string | null>(null)

  useEffect(() => {
    // Check for authentication status on mount
    checkAuthStatus()

    // Check for auth callback parameters
    const urlParams = new URLSearchParams(window.location.search)
    const authStatus = urlParams.get("auth")

    if (authStatus) {
      switch (authStatus) {
        case "success":
          setAuthMessage("Successfully logged in with Steam!")
          setTimeout(() => setAuthMessage(null), 5000)
          checkAuthStatus()
          break
        case "failed":
          setAuthMessage("Steam authentication failed. Please try again.")
          setTimeout(() => setAuthMessage(null), 5000)
          break
        case "error":
          setAuthMessage("An error occurred during Steam authentication.")
          setTimeout(() => setAuthMessage(null), 5000)
          break
        case "invalid":
          setAuthMessage("Invalid Steam authentication response.")
          setTimeout(() => setAuthMessage(null), 5000)
          break
      }

      // Clean up URL parameters
      const newUrl = window.location.pathname
      window.history.replaceState({}, document.title, newUrl)
    }
  }, [])

  const checkAuthStatus = async () => {
    try {
      const response = await fetch("/api/auth/status")
      if (response.ok) {
        const data = await response.json()
        setIsAuthenticated(data.authenticated)
        setSteamId(data.steamId)
        onAuthChange?.(data.authenticated, data.steamId)
      }
    } catch (error) {
      console.log("[v0] Error checking auth status:", error)
    }
  }

  const handleLogin = () => {
    // setIsLoading(true)
    // const steamWindow = window.open(
    //   "/api/auth/steam",
    //   "steamLogin",
    //   "width=800,height=600,scrollbars=yes,resizable=yes",
    // )
    // // Listen for the window to close (user completed or cancelled login)
    // const checkClosed = setInterval(() => {
    //   if (steamWindow?.closed) {
    //     clearInterval(checkClosed)
    //     setIsLoading(false)
    //     // Check auth status after window closes
    //     setTimeout(() => checkAuthStatus(), 1000)
    //   }
    // }, 1000)
    // // Fallback timeout
    // setTimeout(() => {
    //   if (!steamWindow?.closed) {
    //     clearInterval(checkClosed)
    //     setIsLoading(false)
    //   }
    // }, 300000) // 5 minutes timeout
  }

  const handleLogout = async () => {
    // setIsLoading(true)
    // try {
    //   const response = await fetch("/api/auth/logout", {
    //     method: "POST",
    //   })
    //   if (response.ok) {
    //     setIsAuthenticated(false)
    //     setSteamId(null)
    //     onAuthChange?.(false)
    //     setAuthMessage("Successfully logged out from Steam.")
    //     setTimeout(() => setAuthMessage(null), 3000)
    //   }
    // } catch (error) {
    //   console.log("[v0] Error during logout:", error)
    //   setAuthMessage("Error during logout. Please try again.")
    //   setTimeout(() => setAuthMessage(null), 3000)
    // } finally {
    //   setIsLoading(false)
    // }
  }

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <User className="h-5 w-5 text-blue-400" />
          Steam Authentication
        </CardTitle>
        <CardDescription>Login with Steam to access inventory data and bypass API restrictions</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="border-orange-500/50 bg-orange-500/10">
          <Info className="h-4 w-4 text-orange-400" />
          <AlertDescription className="text-orange-400">
            <strong>Coming Soon:</strong> Steam authentication is currently under development. This feature will allow
            you to login with Steam to access private inventory data and bypass API restrictions.
          </AlertDescription>
        </Alert>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="bg-slate-600/30 text-slate-300 border-slate-500/50">
              Feature Coming Soon
            </Badge>
          </div>

          <Button
            disabled={true}
            className="bg-slate-600 text-slate-400 cursor-not-allowed"
            title="Steam authentication coming soon"
          >
            <LogIn className="h-4 w-4 mr-2" />
            Coming Soon
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
