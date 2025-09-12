"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Key, Save, Trash2, Eye, EyeOff, AlertTriangle, Shield, CheckCircle } from "lucide-react"
import { SecurityUtils } from "@/lib/security"

interface SettingsPanelProps {
  apiKey: string
  setApiKey: (key: string) => void
  onSaveApiKey: () => void
  onClearApiKey: () => void
}

export function SettingsPanel({ apiKey, setApiKey, onSaveApiKey, onClearApiKey }: SettingsPanelProps) {
  const [showApiKey, setShowApiKey] = useState(false)
  const [keyValidation, setKeyValidation] = useState<{ isValid: boolean; message: string }>({
    isValid: false,
    message: "",
  })

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newKey = e.target.value

    // Sanitize input to prevent XSS
    const sanitizedKey = SecurityUtils.sanitizeInput(newKey)
    setApiKey(sanitizedKey)

    // Real-time validation
    if (!sanitizedKey) {
      setKeyValidation({ isValid: false, message: "" })
    } else if (sanitizedKey.length < 32) {
      setKeyValidation({ isValid: false, message: "API key must be 32 characters long" })
    } else if (sanitizedKey.length > 32) {
      setKeyValidation({ isValid: false, message: "API key is too long (32 characters expected)" })
    } else if (!SecurityUtils.validateApiKey(sanitizedKey)) {
      setKeyValidation({ isValid: false, message: "Invalid API key format (must be hexadecimal)" })
    } else {
      setKeyValidation({ isValid: true, message: "Valid API key format" })
    }
  }

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-slate-200">
          <Key className="h-5 w-5 text-yellow-400" />
          Steam Web API Configuration
        </CardTitle>
        <CardDescription className="text-slate-400">
          Configure your Steam Web API key for account validation. Your key is encrypted and stored locally, never
          shared.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert className="border-yellow-500/50 bg-yellow-500/10">
          <AlertTriangle className="h-4 w-4 text-yellow-400" />
          <AlertDescription className="text-yellow-200">
            <strong>Security Notice:</strong> Keep your API key secure and never share it with others! Your key is
            encrypted and stored locally in your browser and is not transmitted to any third-party services.
          </AlertDescription>
        </Alert>

        <Alert className="border-green-500/50 bg-green-500/10">
          <Shield className="h-4 w-4 text-green-400" />
          <AlertDescription className="text-green-200">
            <strong>Enhanced Security:</strong> API keys are now encrypted before storage, validated in real-time, and
            all input is sanitized to prevent security vulnerabilities.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="api-key" className="text-slate-200">
              Steam Web API Key
            </Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="api-key"
                  type={showApiKey ? "text" : "password"}
                  placeholder="Enter your Steam Web API key..."
                  value={apiKey}
                  onChange={handleApiKeyChange}
                  className="bg-slate-900/50 border-slate-600 text-slate-200 pr-10"
                  autoComplete="off"
                  spellCheck={false}
                  maxLength={32}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-slate-700"
                >
                  {showApiKey ? (
                    <EyeOff className="h-4 w-4 text-slate-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-slate-400" />
                  )}
                </Button>
              </div>
              <Button
                onClick={onSaveApiKey}
                disabled={!keyValidation.isValid}
                className="bg-green-600 hover:bg-green-700"
              >
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
              <Button
                onClick={onClearApiKey}
                variant="outline"
                disabled={!apiKey}
                className="border-red-600 hover:bg-red-600/20 text-red-400 bg-transparent"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear
              </Button>
            </div>

            {keyValidation.message && (
              <div
                className={`flex items-center gap-2 text-sm ${
                  keyValidation.isValid ? "text-green-400" : "text-red-400"
                }`}
              >
                {keyValidation.isValid ? <CheckCircle className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                {keyValidation.message}
              </div>
            )}
          </div>

          <div className="text-sm text-slate-400 space-y-2">
            <p>
              <strong>How to get your Steam Web API Key:</strong>
            </p>
            <ol className="list-decimal list-inside space-y-1 ml-4">
              <li>
                Visit{" "}
                <a
                  href="https://steamcommunity.com/dev/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 underline"
                >
                  steamcommunity.com/dev/apikey
                </a>
              </li>
              <li>Log in with your Steam account</li>
              <li>Enter any domain name (e.g., "localhost" for testing)</li>
              <li>Copy the generated API key</li>
              <li>Paste it in the field above and click Save</li>
            </ol>

            <div className="mt-4 p-3 bg-slate-900/50 rounded border border-slate-600">
              <p className="font-semibold text-slate-300 mb-2">Security Best Practices:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Never share your API key with anyone</li>
                <li>Use this tool only on trusted devices</li>
                <li>Clear your API key when using public computers</li>
                <li>Regenerate your key if you suspect it's compromised</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
