import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"
import { canAccessPath } from "@/lib/rbac"

export default auth((req) => {
  const { nextUrl } = req
  const session = req.auth
  const isLoggedIn = !!session

  const isAuthPage = nextUrl.pathname.startsWith("/login")
  const isApiAuth = nextUrl.pathname.startsWith("/api/auth")
  const isAccessPendingPage = nextUrl.pathname.startsWith("/access-pending")
  const isDashboardPage = nextUrl.pathname.startsWith("/dashboard") || 
                         nextUrl.pathname.startsWith("/users") ||
                         nextUrl.pathname.startsWith("/collections") ||
                         nextUrl.pathname.startsWith("/invoices") ||
                         nextUrl.pathname.startsWith("/inspections") ||
                         nextUrl.pathname.startsWith("/car-records") ||
                         nextUrl.pathname.startsWith("/companies") ||
                         nextUrl.pathname.startsWith("/port-infos") ||
                         nextUrl.pathname.startsWith("/content") ||
                         nextUrl.pathname.startsWith("/settings")

  // Allow API auth routes
  if (isApiAuth) {
    return NextResponse.next()
  }

  // Redirect authenticated users away from login
  if (isAuthPage) {
    if (isLoggedIn) {
      if (session?.user?.role === 'USER') {
        return NextResponse.redirect(new URL("/access-pending", nextUrl))
      }
      return NextResponse.redirect(new URL("/dashboard", nextUrl))
    }
    return NextResponse.next()
  }

  // Protect dashboard routes
  if (isDashboardPage) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/login", nextUrl))
    }
    // Restrict basic users to the access pending page
    if (session?.user?.role === 'USER') {
      return NextResponse.redirect(new URL("/access-pending", nextUrl))
    }

    // Role-based access check
    if (!canAccessPath(session?.user?.role, nextUrl.pathname)) {
      return NextResponse.redirect(new URL("/access-pending", nextUrl))
    }
    
    // Check if user has backend integration
    if (session?.user?.backendId) {
      // User has backend integration, allow access
      return NextResponse.next()
    }
    
    // User doesn't have backend integration but is logged in via NextAuth
    // Allow access but they might have limited functionality
    return NextResponse.next()
  }

  // Redirect root to dashboard if logged in, otherwise to login
  if (nextUrl.pathname === "/") {
    if (isLoggedIn) {
      if (session?.user?.role === 'USER') {
        return NextResponse.redirect(new URL("/access-pending", nextUrl))
      }
      return NextResponse.redirect(new URL("/dashboard", nextUrl))
    } else {
      return NextResponse.redirect(new URL("/login", nextUrl))
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
