"use client"

import { Button } from "@/components/ui/button"
import { signOut } from "next-auth/react"

export default function AccessPendingPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-lg w-full p-6">
        <div className="text-center space-y-3">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold">
            !
          </div>
          <h1 className="text-2xl font-semibold">Access Pending</h1>
          <p className="text-muted-foreground">
            Your account currently has limited access. Please contact an administrator to request additional permissions.
          </p>
          <div className="pt-2">
            <Button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="bg-gradient-to-r from-amber-500 to-orange-600 text-white"
            >
              Log out
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}


