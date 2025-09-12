"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Key, Save, Trash2, Eye, EyeOff, AlertTriangle } from "lucide-react"

interface SettingsPanelProps {
  apiKey: string
  setApiKey: (key: string) => void
  onSaveApiKey: () => void
  onClearApiKey: () => void
}

export function SettingsPanel({ apiKey, setApiKey, onSaveApiKey, onClearApiKey }: SettingsPanelProps) {
  const [showApiKey, setShowApiKey] = useState(false)

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-slate-200">
          <Key className="h-5 w-5 text-yellow-400" />
          Steam Web API Configuration
        </CardTitle>
        <CardDescription className="text-slate-400">
          Configure your Steam Web API key for account validation. Your key is stored locally and never shared.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert className="border-yellow-500/50 bg-yellow-500/10">
          <AlertTriangle className="h-4 w-4 text-yellow-400" />
          <AlertDescription className="text-yellow-200">
            <strong>Security Notice:</strong> Keep your API key secure and never share it with others! Your key is
            stored locally in your browser and is not transmitted to any third-party services.
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
                  onChange={(e) => setApiKey(e.target.value)}
                  className="bg-slate-900/50 border-slate-600 text-slate-200 pr-10"
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
              <Button onClick={onSaveApiKey} disabled={!apiKey.trim()} className="bg-green-600 hover:bg-green-700">
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
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
