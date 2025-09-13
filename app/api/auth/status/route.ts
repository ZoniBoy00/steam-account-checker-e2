import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const steamAuth = request.cookies.get("steam_auth")

  if (steamAuth?.value) {
    return NextResponse.json({
      authenticated: true,
      steamId: steamAuth.value,
    })
  }

  return NextResponse.json({
    authenticated: false,
    steamId: null,
  })
}
