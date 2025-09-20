import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  // If this is a callback from Steam
  if (searchParams.has("openid.mode")) {
    // Validate the OpenID response
    const mode = searchParams.get("openid.mode")
    const identity = searchParams.get("openid.identity")

    if (mode === "id_res" && identity) {
      // Extract Steam ID from identity URL
      const steamIdMatch = identity.match(/\/id\/(\d+)$/)
      if (steamIdMatch) {
        const steamId = steamIdMatch[1]

        // Verify the response with Steam
        const verifyParams = new URLSearchParams()
        for (const [key, value] of searchParams.entries()) {
          verifyParams.append(key, value)
        }
        verifyParams.set("openid.mode", "check_authentication")

        try {
          const verifyResponse = await fetch("https://steamcommunity.com/openid/login", {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: verifyParams.toString(),
          })

          const verifyText = await verifyResponse.text()

          if (verifyText.includes("is_valid:true")) {
            // Authentication successful
            const response = NextResponse.redirect(new URL("/auth-success", request.url))

            // Set a cookie to indicate successful Steam authentication
            response.cookies.set("steam_auth", steamId, {
              httpOnly: true,
              secure: process.env.NODE_ENV === "production",
              sameSite: "lax",
              maxAge: 60 * 60 * 24 * 7, // 7 days
            })

            return response
          } else {
            return NextResponse.redirect(new URL("/auth-failed", request.url))
          }
        } catch (error) {
          console.error("Error verifying Steam response:", error)
          return NextResponse.redirect(new URL("/auth-error", request.url))
        }
      }
    }

    return NextResponse.redirect(new URL("/auth-invalid", request.url))
  }

  // Initial Steam login redirect
  const url = new URL(request.url)
  const baseUrl = `${url.protocol}//${url.host}`

  const returnUrl = `${baseUrl}/api/auth/steam`

  const steamLoginParams = new URLSearchParams({
    "openid.ns": "http://specs.openid.net/auth/2.0",
    "openid.mode": "checkid_setup",
    "openid.return_to": returnUrl,
    "openid.realm": baseUrl,
    "openid.identity": "http://specs.openid.net/auth/2.0/identifier_select",
    "openid.claimed_id": "http://specs.openid.net/auth/2.0/identifier_select",
  })

  const steamLoginUrl = `https://steamcommunity.com/openid/login?${steamLoginParams.toString()}`

  return NextResponse.redirect(steamLoginUrl)
}
