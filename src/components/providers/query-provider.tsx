"use client"

import React, { useState, useEffect } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useSession } from "next-auth/react"
import { TokenManager } from "@/lib/token-utils"

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            retry: (failureCount, error: any) => {
              if (error?.response?.status === 401) {
                return false // Don't retry on auth errors
              }
              return failureCount < 3
            },
          },
          mutations: {
            retry: (failureCount, error: any) => {
              if (error?.response?.status === 401) {
                return false // Don't retry on auth errors
              }
              return failureCount < 2
            },
          },
        },
      })
  )

  // Token syncing is handled by TokenSyncProvider
  // No need to duplicate here

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
