"use client"

import { useSession } from "next-auth/react"
import { useEffect } from "react"
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from "@/lib/token-utils"

export function TokenStoreProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()

  useEffect(() => {
    if (status === "loading") return

    if (status === "unauthenticated") {
      clearTokens()
      return
    }

    const sessionAccess = session?.accessToken
    const sessionRefresh = session?.refreshToken
    const storedAccess = getAccessToken()
    const storedRefresh = getRefreshToken()
    const effectiveRefresh = sessionRefresh || storedRefresh

    if (sessionAccess && effectiveRefresh) {
      if (storedAccess !== sessionAccess || storedRefresh !== effectiveRefresh) {
        setTokens({
          accessToken: sessionAccess,
          refreshToken: effectiveRefresh,
        })
      }
    }
  }, [session?.accessToken, session?.refreshToken, status])

  return <>{children}</>
}

