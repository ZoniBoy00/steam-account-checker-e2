"use client"

import { useEffect } from "react"

export default function AuthFailedPage() {
  useEffect(() => {
    // Close the popup window and notify parent
    if (window.opener) {
      window.opener.postMessage({ type: "STEAM_AUTH_FAILED" }, "*")
      window.close()
    } else {
      // Fallback: redirect to main page
      window.location.href = "/?auth=failed"
    }
  }, [])

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-red-400 mb-4">Steam Login Failed</h1>
        <p className="text-slate-400">This window will close automatically...</p>
      </div>
    </div>
  )
}
