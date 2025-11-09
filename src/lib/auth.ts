import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { serverApiClient } from "./server-api"

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
      }

      if (profile) {
        token.name = profile.name
        token.email = profile.email
        token.picture = profile.picture
      }

      return token
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string | undefined
      session.refreshToken = token.refreshToken as string | undefined
      session.user.id = (token.sub as string | undefined) ?? session.user.id
      session.user.name = token.name as string | null
      session.user.email = token.email as string | null
      session.user.image = (token.picture as string | null) ?? null

      if (token.backendUser) {
        session.user.role = (token.backendUser as any).role
        session.user.isActive = (token.backendUser as any).isActive
        session.user.backendId = (token.backendUser as any).id
      }

      if (typeof window !== "undefined" && token.accessToken && token.refreshToken) {
        const { setTokens } = await import("./token-utils")
        setTokens({
          accessToken: token.accessToken as string,
          refreshToken: token.refreshToken as string,
        })
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
