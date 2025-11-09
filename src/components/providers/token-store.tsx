"use client"

import { useSession } from "next-auth/react"
import { useEffect } from "react"
import { clearTokens, setTokens } from "@/lib/token-utils"

export function TokenStoreProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()

  useEffect(() => {
    if (status === "loading") return

    if (session?.accessToken && session?.refreshToken) {
      setTokens({
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
      })
    } else {
      clearTokens()
    }
  }, [session?.accessToken, session?.refreshToken, status])

  return <>{children}</>
}

