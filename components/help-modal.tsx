"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  HelpCircle,
  Key,
  FileText,
  Shield,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  Download,
  User,
} from "lucide-react"

export function HelpModal() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-slate-400 hover:text-slate-200">
          <HelpCircle className="h-4 w-4 mr-2" />
          Help & Instructions
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[85vh] bg-slate-800 border-slate-700">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-xl text-slate-200">Help & Instructions</DialogTitle>
          <DialogDescription className="text-slate-400">
            Complete guide on how to use Steam Account Checker effectively
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[65vh] pr-6">
          <div className="space-y-8 text-sm text-slate-300">
            <section>
              <h3 className="font-semibold text-lg text-slate-200 mb-4 flex items-center gap-2">
                <Key className="h-5 w-5 text-yellow-400" />
                1. Getting Started - Steam Web API Key
              </h3>
              <div className="space-y-3 ml-7">
                <p className="text-slate-300">Before using the checker, you need a Steam Web API key:</p>
                <ol className="list-decimal list-inside space-y-2 ml-4 text-slate-400">
                  <li>
                    Visit{" "}
                    <a
                      href="https://steamcommunity.com/dev/apikey"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 underline inline-flex items-center gap-1"
                    >
                      steamcommunity.com/dev/apikey <ExternalLink className="h-3 w-3" />
                    </a>
                  </li>
                  <li>Log in with your Steam account</li>
                  <li>Enter any domain name (e.g., "localhost" for testing)</li>
                  <li>Copy the generated API key</li>
                  <li>Go to the Settings tab and paste your API key</li>
                </ol>
                <Alert className="border-yellow-500/50 bg-yellow-500/10 mt-4">
                  <AlertTriangle className="h-4 w-4 text-yellow-400" />
                  <AlertDescription className="text-yellow-200">
                    <strong>Keep your API key secure and never share it with others!</strong>
                  </AlertDescription>
                </Alert>
              </div>
            </section>

            <section>
              <h3 className="font-semibold text-lg text-slate-200 mb-4 flex items-center gap-2">
                <User className="h-5 w-5 text-blue-400" />
                2. Steam Authentication (Recommended)
              </h3>
              <div className="space-y-3 ml-7">
                <p className="text-slate-300">For better inventory access and to bypass API restrictions:</p>
                <ol className="list-decimal list-inside space-y-2 ml-4 text-slate-400">
                  <li>Go to the Settings tab and find the "Steam Authentication" section</li>
                  <li>Click "Login with Steam" to authenticate with your Steam account</li>
                  <li>You'll be redirected to Steam's official login page</li>
                  <li>After successful login, you'll be redirected back with authentication</li>
                  <li>Your authenticated session will allow access to inventory data</li>
                </ol>
                <Alert className="border-blue-500/50 bg-blue-500/10 mt-4">
                  <CheckCircle className="h-4 w-4 text-blue-400" />
                  <AlertDescription className="text-blue-200">
                    <strong>Benefits:</strong> Steam authentication bypasses "Auth Required" limitations and provides
                    access to inventory data that would otherwise be blocked.
                  </AlertDescription>
                </Alert>
              </div>
            </section>

            <section>
              <h3 className="font-semibold text-lg text-slate-200 mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-400" />
                3. Adding Steam Tokens
              </h3>
              <div className="space-y-4 ml-7">
                <p className="text-slate-300">The checker supports multiple token formats:</p>
                <div className="space-y-3">
                  <div>
                    <Badge className="bg-green-600/30 text-green-200 border-green-500/50 mb-2">Username format:</Badge>
                    <code className="block bg-slate-900 p-3 rounded text-xs text-green-400 break-all">
                      username----eyJhbGciOiJFRFJTQSIsInR5cCI6IkpXVCJ9...
                    </code>
                  </div>
                  <div>
                    <Badge className="bg-blue-600/30 text-blue-200 border-blue-500/50 mb-2">Direct JWT:</Badge>
                    <code className="block bg-slate-900 p-3 rounded text-xs text-blue-400 break-all">
                      eyJhbGciOiJFRFJTQSIsInR5cCI6IkpXVCJ9...
                    </code>
                  </div>
                  <div>
                    <Badge className="bg-purple-600/30 text-purple-200 border-purple-500/50 mb-2">Cookie format:</Badge>
                    <code className="block bg-slate-900 p-3 rounded text-xs text-purple-400 break-all">
                      steamLoginSecure=76561198123456789%7C%7CeyJhbGciOiJFRFJTQSIsInR5cCI6IkpXVCJ9...
                    </code>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-slate-300 font-medium">You can:</p>
                  <ul className="list-disc list-inside space-y-1 ml-4 text-slate-400">
                    <li>Paste tokens directly into the text area (one per line)</li>
                    <li>Import from a .txt or .csv file using "Import File"</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h3 className="font-semibold text-lg text-slate-200 mb-4 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-400" />
                4. Running the Check
              </h3>
              <div className="space-y-3 ml-7">
                <ol className="list-decimal list-inside space-y-2 text-slate-400">
                  <li>Add your tokens using one of the methods above</li>
                  <li>Ensure your Steam Web API key is configured in Settings</li>
                  <li>(Optional) Login with Steam for better inventory access</li>
                  <li>Click "Check Accounts" to start the validation process</li>
                  <li>Monitor the progress bar as accounts are processed</li>
                  <li>View results in the Results tab once complete</li>
                </ol>
              </div>
            </section>

            <section>
              <h3 className="font-semibold text-lg text-slate-200 mb-4 flex items-center gap-2">
                <Download className="h-5 w-5 text-indigo-400" />
                5. Exporting Results
              </h3>
              <div className="space-y-3 ml-7">
                <p className="text-slate-300">After checking, you can export your results:</p>
                <ul className="list-disc list-inside space-y-1 ml-4 text-slate-400">
                  <li>
                    <strong>Export Valid Tokens:</strong> Downloads only working tokens in TXT format
                  </li>
                  <li>
                    <strong>Export CSV:</strong> Downloads complete results with all account details
                  </li>
                </ul>
              </div>
            </section>

            <section>
              <h3 className="font-semibold text-lg text-slate-200 mb-4 flex items-center gap-2">
                <Shield className="h-5 w-5 text-red-400" />
                6. Understanding Results
              </h3>
              <div className="space-y-3 ml-7">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-slate-200 mb-2">Account Status:</h4>
                    <ul className="space-y-1 text-xs">
                      <li className="flex items-center gap-2">
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Valid</Badge>
                        <span className="text-slate-400">Account is active and accessible</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Badge variant="destructive" className="bg-red-500/20 text-red-400 border-red-500/30">
                          Invalid
                        </Badge>
                        <span className="text-slate-400">Token is invalid or expired</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Expired</Badge>
                        <span className="text-slate-400">Session has expired</span>
                      </li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-200 mb-2">Ban Status:</h4>
                    <ul className="space-y-1 text-xs">
                      <li className="flex items-center gap-2">
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">No</Badge>
                        <span className="text-slate-400">No bans detected</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Badge variant="destructive" className="bg-red-500/20 text-red-400 border-red-500/30">
                          Yes
                        </Badge>
                        <span className="text-slate-400">Account has bans</span>
                      </li>
                    </ul>
                  </div>
                </div>
                <div className="mt-4">
                  <h4 className="font-medium text-slate-200 mb-2">Inventory Status:</h4>
                  <ul className="space-y-1 text-xs">
                    <li className="flex items-center gap-2">
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Loaded</Badge>
                      <span className="text-slate-400">Inventory data successfully retrieved</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Private</Badge>
                      <span className="text-slate-400">Inventory is set to private</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Auth Required</Badge>
                      <span className="text-slate-400">Steam authentication needed for access</span>
                    </li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h3 className="font-semibold text-lg text-slate-200 mb-4 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-400" />
                7. Troubleshooting
              </h3>
              <div className="space-y-3 ml-7">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-slate-200 mb-2">Common Issues:</h4>
                    <ul className="list-disc list-inside space-y-1 ml-4 text-slate-400 text-xs">
                      <li>
                        <strong>"Please enter your Steam Web API key":</strong> Configure your API key in Settings tab
                      </li>
                      <li>
                        <strong>"Invalid API key":</strong> Verify your API key is correct and active
                      </li>
                      <li>
                        <strong>"Auth Required" for inventory:</strong> Use Steam Authentication in Settings for better
                        access
                      </li>
                      <li>
                        <strong>"Rate limit exceeded":</strong> Wait a few minutes before checking more accounts
                      </li>
                      <li>
                        <strong>"Network error":</strong> Check your internet connection and try again
                      </li>
                      <li>
                        <strong>Steam login not working:</strong> Ensure popups are enabled and try again
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <h3 className="font-semibold text-lg text-slate-200 mb-4 flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-400" />
                8. Security & Privacy
              </h3>
              <div className="space-y-3 ml-7">
                <ul className="list-disc list-inside space-y-1 ml-4 text-slate-400 text-xs">
                  <li>Your Steam API key is stored locally in your browser only</li>
                  <li>Steam authentication uses official Steam OpenID protocol</li>
                  <li>No tokens or account data are stored on external servers</li>
                  <li>All API calls are made directly to Steam's official servers</li>
                  <li>Use this tool responsibly and only with accounts you own</li>
                </ul>
                <Alert className="border-blue-500/50 bg-blue-500/10 mt-4">
                  <Shield className="h-4 w-4 text-blue-400" />
                  <AlertDescription className="text-blue-200">
                    <strong>Privacy:</strong> This tool processes data locally in your browser. Steam authentication is
                    handled through official Steam services with no third-party involvement.
                  </AlertDescription>
                </Alert>
              </div>
            </section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
