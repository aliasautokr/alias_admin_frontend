import axios from "axios"
import { getSession } from "next-auth/react"
import { getAccessToken } from "./token-utils"

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "https://api.aliasauto.kr/api/v1",
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
})

api.interceptors.request.use(
  async (config) => {
    // Don't set Content-Type for FormData - let axios handle it automatically
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type']
    }

    const accessToken = getAccessToken()

    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`
      return config
    }

    const session = await getSession()
    const sessionToken = (session as any)?.accessToken

    if (sessionToken) {
      config.headers.Authorization = `Bearer ${sessionToken}`
    }

    return config
  },
  (error) => Promise.reject(error)
)

export default api
