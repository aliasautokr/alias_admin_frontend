import axios from 'axios'

// Server-side only API client for auth flows (no localStorage/token utils)
// Used by NextAuth callbacks to call the backend without importing client modules

const baseURL = process.env.NEXT_PUBLIC_API_URL || 'https://api.aliasauto.kr/api/v1'

const serverAxios = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
})

export const serverApiClient = {
  async googleLogin(idToken: string) {
    const response = await serverAxios.post('/auth/google', { idToken })
    return response.data.data
  },
}


