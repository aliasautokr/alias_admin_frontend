import axios from "axios"
import { getSession } from "next-auth/react"

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "https://api.aliasauto.kr/api/v1",
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
})

// Track if we're currently refreshing to avoid multiple refresh calls
let isRefreshing = false
let failedQueue: Array<{
  resolve: (value?: any) => void
  reject: (error?: any) => void
}> = []

const processQueue = (error: any = null, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token)
    }
  })
  
  failedQueue = []
}

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    // Check localStorage first for token (api-client might have refreshed it)
    if (typeof window !== 'undefined') {
      const { TokenManager } = await import('./token-utils')
      const accessToken = TokenManager.getAccessToken()
      
      if (accessToken && !TokenManager.isTokenExpired()) {
        config.headers.Authorization = `Bearer ${accessToken}`
        return config
      }
    }
    
    // Fallback to session token
    const session = await getSession()
    if ((session as any)?.accessToken) {
      config.headers.Authorization = `Bearer ${(session as any).accessToken}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for error handling with token refresh
api.interceptors.response.use(
  (response) => {
    return response
  },
  async (error) => {
    const originalRequest = error.config

    // If it's a 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then((token: any) => {
          originalRequest.headers.Authorization = `Bearer ${token}`
          return api(originalRequest)
        }).catch(err => {
          return Promise.reject(err)
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        // Get refresh token from localStorage or session
        let refreshToken: string | null = null
        
        if (typeof window !== 'undefined') {
          const { TokenManager } = await import('./token-utils')
          refreshToken = TokenManager.getRefreshToken()
        }
        
        if (!refreshToken) {
          const session = await getSession()
          refreshToken = (session as any)?.refreshToken || null
        }

        if (!refreshToken) {
          throw new Error('No refresh token available')
        }

        // Call refresh endpoint
        const response = await axios.post(
          `${api.defaults.baseURL}/auth/refresh`,
          { refreshToken }
        )

        const { accessToken, refreshToken: newRefreshToken, expiresIn } = response.data.data

        // Update tokens in localStorage
        if (typeof window !== 'undefined') {
          const { TokenManager } = await import('./token-utils')
          TokenManager.setTokens({
            accessToken,
            refreshToken: newRefreshToken,
            expiresIn: expiresIn || 900
          })
          
          // Session will be updated automatically via NextAuth on next request
          // The tokens are already stored in localStorage
        }

        // Process queued requests
        processQueue(null, accessToken)

        // Update the original request with new token
        originalRequest.headers.Authorization = `Bearer ${accessToken}`
        
        isRefreshing = false
        return api(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError, null)
        isRefreshing = false
        
        // Clear tokens on refresh failure
        if (typeof window !== 'undefined') {
          const { TokenManager } = await import('./token-utils')
          TokenManager.clearTokens()
        }
        
        // Redirect to login
        if (typeof window !== 'undefined') {
          window.location.href = "/login"
        }
        
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)

export default api
