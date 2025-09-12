import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { Suspense } from "react"
import "./globals.css"

export const metadata: Metadata = {
  title: "Steam Account Checker - Professional Token Validation",
  description:
    "Professional Steam session token validation with comprehensive account analysis and ban detection. Secure, fast, and reliable Steam account verification tool.",
  keywords: ["Steam", "Account Checker", "Token Validation", "Steam API", "Account Verification"],
  authors: [{ name: "Steam Account Checker" }],
  creator: "Steam Account Checker",
  publisher: "Steam Account Checker",
  robots: "index, follow",
  viewport: "width=device-width, initial-scale=1",
  themeColor: "#1f2937",
    generator: 'v0.app'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <Suspense fallback={null}>{children}</Suspense>
        <Analytics />
      </body>
    </html>
  )
}
