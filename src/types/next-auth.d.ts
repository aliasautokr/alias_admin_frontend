import NextAuth from "next-auth"

declare module "next-auth" {
  interface User {
    id: string
    name?: string | null
    email?: string | null
    image?: string | null
    role?: string
    isActive?: boolean
    backendId?: string
  }

  interface Session {
    accessToken?: string
    refreshToken?: string
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      role?: string
      isActive?: boolean
      backendId?: string
    }
  }
}
