"use client"

import { useEffect } from "react"

export default function AuthSuccessPage() {
  useEffect(() => {
    // Close the popup window and refresh the parent
    if (window.opener) {
      window.opener.postMessage({ type: "STEAM_AUTH_SUCCESS" }, "*")
      window.close()
    } else {
      // Fallback: redirect to main page
      window.location.href = "/?auth=success"
    }
  }, [])

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-green-400 mb-4">Steam Login Successful!</h1>
        <p className="text-slate-400">This window will close automatically...</p>
      </div>
    </div>
  )
}
