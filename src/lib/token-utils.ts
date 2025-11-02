"use client"

export interface TokenData {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

export class TokenManager {
  private static readonly ACCESS_TOKEN_KEY = 'accessToken'
  private static readonly REFRESH_TOKEN_KEY = 'refreshToken'
  private static readonly TOKEN_EXPIRY_KEY = 'tokenExpiry'

  static setTokens(tokenData: TokenData): void {
    if (typeof window === 'undefined') return
    
    localStorage.setItem(this.ACCESS_TOKEN_KEY, tokenData.accessToken)
    localStorage.setItem(this.REFRESH_TOKEN_KEY, tokenData.refreshToken)
    
    // Calculate expiry time (expiresIn is in seconds)
    const expiryTime = Date.now() + (tokenData.expiresIn * 1000)
    localStorage.setItem(this.TOKEN_EXPIRY_KEY, expiryTime.toString())
  }

  static getAccessToken(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(this.ACCESS_TOKEN_KEY)
  }

  static getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(this.REFRESH_TOKEN_KEY)
  }

  static isTokenExpired(): boolean {
    if (typeof window === 'undefined') return true
    
    const expiryTime = localStorage.getItem(this.TOKEN_EXPIRY_KEY)
    if (!expiryTime) return true
    
    return Date.now() >= parseInt(expiryTime)
  }

  static clearTokens(): void {
    if (typeof window === 'undefined') return
    
    localStorage.removeItem(this.ACCESS_TOKEN_KEY)
    localStorage.removeItem(this.REFRESH_TOKEN_KEY)
    localStorage.removeItem(this.TOKEN_EXPIRY_KEY)
  }

  static hasValidTokens(): boolean {
    const accessToken = this.getAccessToken()
    const refreshToken = this.getRefreshToken()
    
    return !!(accessToken && refreshToken && !this.isTokenExpired())
  }

  static getTokenInfo(): {
    hasAccessToken: boolean
    hasRefreshToken: boolean
    isExpired: boolean
    isValid: boolean
  } {
    return {
      hasAccessToken: !!this.getAccessToken(),
      hasRefreshToken: !!this.getRefreshToken(),
      isExpired: this.isTokenExpired(),
      isValid: this.hasValidTokens()
    }
  }
}

export const tokenManager = TokenManager
