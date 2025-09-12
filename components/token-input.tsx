"use client"

import type React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { FileText, Upload, Download, Trash2, CheckCircle, Clock, AlertTriangle } from "lucide-react"
import { SecurityUtils } from "@/lib/security"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useState } from "react"

interface TokenInputProps {
  tokens: string
  setTokens: (tokens: string) => void
  isChecking: boolean
  onCheck: () => void
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void
  onExportTokens: () => void
  onClearTokens: () => void
  canCheck: boolean
}

export function TokenInput({
  tokens,
  setTokens,
  isChecking,
  onCheck,
  onFileUpload,
  onExportTokens,
  onClearTokens,
  canCheck,
}: TokenInputProps) {
  const [validationError, setValidationError] = useState("")

  const tokenCount = tokens.split("\n").filter((t) => t.trim()).length

  const validTokenCount = tokens.split("\n").filter((t) => {
    const trimmed = t.trim()
    return trimmed && SecurityUtils.validateSteamToken(trimmed)
  }).length

  const handleTokenChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value

    // Basic length check to prevent excessive input
    if (newValue.length > 1024 * 1024) {
      // 1MB limit
      setValidationError("Input too large. Maximum size is 1MB.")
      return
    }

    // Clear validation error if input is valid
    if (validationError) {
      setValidationError("")
    }

    setTokens(newValue)
  }

  const handleSecureFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log("[v0] TokenInput file upload triggered")

    // Clear any existing validation errors
    if (validationError) {
      setValidationError("")
    }

    // Pass the event directly to the main handler which has comprehensive validation
    onFileUpload(event)
  }

  const triggerFileUpload = () => {
    console.log("[v0] Triggering file upload click")
    const fileInput = document.getElementById("file-upload") as HTMLInputElement
    if (fileInput) {
      fileInput.click()
    } else {
      console.log("[v0] File input element not found")
    }
  }

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-slate-200">
          <FileText className="h-5 w-5 text-blue-400" />
          Steam Token Management
        </CardTitle>
        <CardDescription className="text-slate-400">
          Import tokens via text input or file upload. Supports multiple formats including username----JWT and direct
          JWT tokens. All input is validated for security.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {validationError && (
          <Alert variant="destructive" className="border-red-500/50 bg-red-500/10">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{validationError}</AlertDescription>
          </Alert>
        )}

        <div className="flex items-center gap-2 mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={triggerFileUpload}
            className="border-slate-600 hover:bg-slate-700 bg-transparent"
            disabled={isChecking}
          >
            <Upload className="h-4 w-4 mr-2" />
            Import File
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onExportTokens}
            disabled={!tokens.trim() || isChecking}
            className="border-slate-600 hover:bg-slate-700 bg-transparent"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Tokens
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onClearTokens}
            disabled={!tokens.trim() || isChecking}
            className="border-red-600 hover:bg-red-600/20 text-red-400 bg-transparent"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear All
          </Button>
          <input
            id="file-upload"
            type="file"
            accept=".txt,.csv,.log,text/plain,text/csv,application/csv"
            onChange={handleSecureFileUpload}
            className="hidden"
            multiple={false}
            autoComplete="off"
          />
        </div>

        <Textarea
          placeholder={`Enter Steam tokens here (one per line). Supported formats:

• username----eyJhbGciOiJFRFJTQSIsInR5cCI6IkpXVCJ9...
• eyJhbGciOiJFRFJTQSIsInR5cCI6IkpXVCJ9...
• steamLoginSecure=76561198123456789%7C%7CeyJhbGciOiJFRFJTQSIsInR5cCI6IkpXVCJ9...

Paste your tokens below or use the Import File button above.`}
          value={tokens}
          onChange={handleTokenChange}
          className="min-h-[400px] font-mono text-xs bg-slate-900/50 border-slate-600 text-slate-200 placeholder:text-slate-500 resize-none overflow-auto"
          disabled={isChecking}
          style={{
            lineHeight: "1.5",
            wordBreak: "break-all",
            overflowWrap: "anywhere",
            whiteSpace: "pre-wrap",
          }}
          autoComplete="off"
          spellCheck={false}
          maxLength={1024 * 1024} // 1MB limit
        />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="border-slate-600 text-slate-300">
              {tokenCount} tokens loaded
            </Badge>
            {tokenCount > 0 && (
              <>
                <Badge variant="outline" className="border-green-600 text-green-400">
                  {validTokenCount} valid tokens
                </Badge>
                {validTokenCount !== tokenCount && (
                  <Badge variant="outline" className="border-yellow-600 text-yellow-400">
                    {tokenCount - validTokenCount} invalid tokens
                  </Badge>
                )}
              </>
            )}
            {validTokenCount > 0 && (
              <Badge variant="outline" className="border-blue-600 text-blue-400">
                Ready to check
              </Badge>
            )}
          </div>
          <Button
            onClick={onCheck}
            disabled={!canCheck || isChecking || validTokenCount === 0}
            className="min-w-[140px] bg-blue-600 hover:bg-blue-700"
          >
            {isChecking ? (
              <>
                <Clock className="h-4 w-4 mr-2 animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Check Accounts
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
