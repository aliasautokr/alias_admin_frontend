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
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user, account, trigger }) {
      // Initial login - store tokens
      if (user && account) {
        // Store Google user info
        token.id = user.id
        token.name = user.name
        token.email = user.email
        token.image = user.image
        
        // If this is a Google OAuth login, send to backend
        if (account.provider === "google" && account.id_token) {
          try {
            const backendResponse = await serverApiClient.googleLogin(account.id_token)
            token.backendUser = backendResponse.user
            token.accessToken = backendResponse.accessToken
            token.refreshToken = backendResponse.refreshToken
            token.tokenExpiry = Date.now() + (backendResponse.expiresIn || 900) * 1000
            
            // Sync tokens to localStorage for api-client
            if (typeof window !== 'undefined') {
              const { TokenManager } = await import('./token-utils')
              TokenManager.setTokens({
                accessToken: backendResponse.accessToken,
                refreshToken: backendResponse.refreshToken,
                expiresIn: backendResponse.expiresIn || 900
              })
            }
          } catch (error) {
            console.error("Backend authentication failed:", error)
            // Still allow login but without backend integration
          }
        }
      }
      
      // Check if access token is expired and refresh it
      if (token.accessToken && token.refreshToken) {
        const tokenExpiry = token.tokenExpiry as number || 0
        const now = Date.now()
        const bufferTime = 60 * 1000 // Refresh 1 minute before expiry
        
        // If token is expired or about to expire, refresh it
        if (now >= (tokenExpiry - bufferTime)) {
          try {
            console.log('🔄 Refreshing token via NextAuth callback...')
            const refreshResponse = await serverApiClient.refreshToken(token.refreshToken as string)
            
            token.accessToken = refreshResponse.accessToken
            token.refreshToken = refreshResponse.refreshToken
            token.tokenExpiry = Date.now() + (refreshResponse.expiresIn || 900) * 1000
            
            // Sync refreshed tokens to localStorage
            if (typeof window !== 'undefined') {
              const { TokenManager } = await import('./token-utils')
              TokenManager.setTokens({
                accessToken: refreshResponse.accessToken,
                refreshToken: refreshResponse.refreshToken,
                expiresIn: refreshResponse.expiresIn || 900
              })
            }
            
            console.log('✅ Token refreshed successfully in NextAuth callback')
          } catch (error) {
            console.error('❌ Token refresh failed in NextAuth callback:', error)
            // Clear tokens on refresh failure
            token.accessToken = undefined
            token.refreshToken = undefined
            token.tokenExpiry = undefined
            if (typeof window !== 'undefined') {
              const { TokenManager } = await import('./token-utils')
              TokenManager.clearTokens()
            }
          }
        }
      }
      
      // Only sync from localStorage if we don't have tokens (initial load)
      // This prevents circular updates that cause flickering
      if (typeof window !== 'undefined' && (!token.accessToken || !token.refreshToken)) {
        try {
          const { TokenManager } = await import('./token-utils')
          const storedAccessToken = TokenManager.getAccessToken()
          const storedRefreshToken = TokenManager.getRefreshToken()
          
          // Only sync if we have stored tokens and no token in JWT
          if (storedAccessToken && storedRefreshToken) {
            token.accessToken = storedAccessToken
            token.refreshToken = storedRefreshToken
            const expiryTime = localStorage.getItem('tokenExpiry')
            if (expiryTime) {
              token.tokenExpiry = parseInt(expiryTime)
            }
          }
        } catch (error) {
          console.warn('Failed to sync tokens from localStorage:', error)
        }
      }
      
      return token
    },
    async session({ session, token }) {
      if (token) {
        // expose tokens for client syncing
        session.accessToken = token.accessToken as string | undefined
        session.refreshToken = token.refreshToken as string | undefined
        session.user.id = token.id as string
        session.user.name = token.name as string
        session.user.email = token.email as string
        session.user.image = token.image as string
        
        // Add backend user data if available
        if (token.backendUser) {
          session.user.role = (token.backendUser as any).role
          session.user.isActive = (token.backendUser as any).isActive
          session.user.backendId = (token.backendUser as any).id
        }
        
        // Sync tokens to localStorage on session update (optimized - only if changed)
        if (typeof window !== 'undefined' && token.accessToken && token.refreshToken) {
          const { TokenManager } = await import('./token-utils')
          const storedToken = TokenManager.getAccessToken()
          
          // Only update if token changed to avoid unnecessary localStorage writes
          if (storedToken !== token.accessToken) {
            let expiresIn = 900 // Default 15 minutes
            const tokenExpiry = token.tokenExpiry as number | undefined
            
            if (tokenExpiry) {
              const now = Date.now()
              expiresIn = Math.max(0, Math.floor((tokenExpiry - now) / 1000))
            }
            
            TokenManager.setTokens({
              accessToken: token.accessToken as string,
              refreshToken: token.refreshToken as string,
              expiresIn: expiresIn
            })
          }
        }
      }
      return session
    },
    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) return url
      return baseUrl
    },
  },
})
