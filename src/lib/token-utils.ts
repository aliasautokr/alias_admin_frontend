"use client"

const ACCESS_TOKEN_KEY = "accessToken"
const REFRESH_TOKEN_KEY = "refreshToken"

let memoryAccessToken: string | null = null
let memoryRefreshToken: string | null = null

function writeToStorage(key: string, value: string) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(key, value)
}

function readFromStorage(key: string): string | null {
  if (typeof window === "undefined") return null
  return window.localStorage.getItem(key)
}

function removeFromStorage(key: string) {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(key)
}

export function setTokens(tokens: { accessToken: string; refreshToken: string }) {
  memoryAccessToken = tokens.accessToken
  memoryRefreshToken = tokens.refreshToken

  writeToStorage(ACCESS_TOKEN_KEY, tokens.accessToken)
  writeToStorage(REFRESH_TOKEN_KEY, tokens.refreshToken)
}

export function getAccessToken(): string | null {
  if (memoryAccessToken) return memoryAccessToken

  const stored = readFromStorage(ACCESS_TOKEN_KEY)
  memoryAccessToken = stored
  return stored
}

export function getRefreshToken(): string | null {
  if (memoryRefreshToken) return memoryRefreshToken

  const stored = readFromStorage(REFRESH_TOKEN_KEY)
  memoryRefreshToken = stored
  return stored
}

export function clearTokens() {
  memoryAccessToken = null
  memoryRefreshToken = null

  removeFromStorage(ACCESS_TOKEN_KEY)
  removeFromStorage(REFRESH_TOKEN_KEY)
}
