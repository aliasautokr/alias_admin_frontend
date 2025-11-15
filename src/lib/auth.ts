import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { serverApiClient } from "./server-api"

interface BackendAuthResponse {
  accessToken: string
  refreshToken: string
  expiresIn?: number
  user: Record<string, unknown>
}

async function refreshBackendToken(token: any) {
  if (!token?.refreshToken) {
    console.error("Refresh token missing, cannot refresh access token")
    token.error = "RefreshAccessTokenError"
    return token
  }

  try {
    const response: BackendAuthResponse = await serverApiClient.refresh(token.refreshToken as string)
    token.accessToken = response.accessToken
    token.refreshToken = response.refreshToken ?? token.refreshToken
    token.accessExpiresAt = Date.now() + (response.expiresIn ?? 0) * 1000
    // Update backendUser with fresh data from refresh response
    if (response.user) {
      token.backendUser = response.user
    }
    delete token.error
  } catch (error) {
    console.error("Failed to refresh backend token:", error)
    token.error = "RefreshAccessTokenError"
  }

  return token
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account?.provider === "google" && account.id_token) {
        try {
          const backendResponse = await serverApiClient.googleLogin(account.id_token)
          token.accessToken = backendResponse.accessToken
          token.refreshToken = backendResponse.refreshToken
          token.backendUser = backendResponse.user
          token.accessExpiresAt = Date.now() + (backendResponse.expiresIn ?? 0) * 1000
        } catch (error) {
          console.error("Failed to exchange Google token with backend:", error)
        }
        return token
      }

      if (token.accessExpiresAt && Date.now() < (token.accessExpiresAt as number)) {
        return token
      }

      return refreshBackendToken(token)
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string | undefined
      session.refreshToken = token.refreshToken as string | undefined
      session.user.id = (token.sub as string | undefined) ?? session.user.id
      if (typeof token.name === "string") {
        session.user.name = token.name
      } else if (session.user.name === undefined) {
        session.user.name = null
      }

      if (typeof token.email === "string") {
        session.user.email = token.email
      }

      if (typeof token.picture === "string") {
        session.user.image = token.picture
      } else if (session.user.image === undefined) {
        session.user.image = null
      }

      if (token.backendUser) {
        const backendUser = token.backendUser as any
        session.user.role = typeof backendUser.role === 'string' ? backendUser.role : undefined
        session.user.isActive = backendUser.isActive
        session.user.backendId = backendUser.id
      }

      if (typeof window !== "undefined" && token.accessToken && token.refreshToken) {
        const { setTokens } = await import("./token-utils")
        setTokens({
          accessToken: token.accessToken as string,
          refreshToken: token.refreshToken as string,
        })
      }

      if (token.error) {
        (session as any).error = token.error
      }

      return session
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`
      if (new URL(url).origin === baseUrl) return url
      return baseUrl
    },
  },
  events: {
    async signOut() {
      if (typeof window !== "undefined") {
        const { clearTokens } = await import("./token-utils")
        clearTokens()
      }
    },
  },
})
