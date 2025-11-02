"use client"

import { useSession } from "next-auth/react"
import { useEffect, useRef } from "react"
import { TokenManager } from "@/lib/token-utils"

export function TokenSyncProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession()
  const lastSyncedTokens = useRef<string>("")

  useEffect(() => {
    if (session?.accessToken && session?.refreshToken) {
      // Create a unique key for current tokens to avoid unnecessary syncing
      const currentTokens = `${session.accessToken}-${session.refreshToken}`
      
      // Only sync if tokens have actually changed
      if (currentTokens !== lastSyncedTokens.current) {
        // Parse JWT to get actual expiration time
        let expiresIn = 900 // Default 15 minutes
        try {
          const payload = JSON.parse(atob(session.accessToken.split('.')[1]))
          const now = Math.floor(Date.now() / 1000)
          expiresIn = payload.exp - now
          if (expiresIn < 0) expiresIn = 0
        } catch (error) {
          console.warn('Failed to parse JWT expiration, using default:', error)
        }
        
        TokenManager.setTokens({
          accessToken: session.accessToken,
          refreshToken: session.refreshToken,
          expiresIn: expiresIn
        })
        lastSyncedTokens.current = currentTokens
      }
    }
  }, [session?.accessToken, session?.refreshToken])

  return <>{children}</>
}
