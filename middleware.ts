import { type NextRequest } from "next/server"
import { updateSession } from "@/lib/supabase/middleware"
import { NextResponse } from "next/server"

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request)

  const isProtected = request.nextUrl.pathname.startsWith("/dashboard")
    || request.nextUrl.pathname.startsWith("/bookings")
    || request.nextUrl.pathname.startsWith("/settings")

  if (isProtected && !user) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    url.searchParams.set("redirect", request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  const isAuthRoute = request.nextUrl.pathname.startsWith("/login")
    || request.nextUrl.pathname.startsWith("/signup")

  if (isAuthRoute && user) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}


