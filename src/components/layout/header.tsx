"use client"

import { useState } from "react"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
import { apiClient } from "@/lib/api-client"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Menu, User, Sun, Moon, ChevronRight, LogOut } from "lucide-react"
import { useTheme } from "next-themes"

interface HeaderProps {
  onMenuClick?: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  const [isOpen, setIsOpen] = useState(false)
  const { theme, setTheme } = useTheme()
  const { data: session } = useSession()
  const pathname = usePathname()

  const getPageTitle = () => {
    const segments = pathname.split('/').filter(Boolean)
    if (segments.length === 0) return "Dashboard"
    return segments[segments.length - 1].charAt(0).toUpperCase() + segments[segments.length - 1].slice(1)
  }

  const handleLogout = async () => {
    try {
      // Call backend logout if available
      if (session?.user?.backendId) {
        await apiClient.logout()
      }
    } catch (error) {
      console.error("Backend logout error:", error)
    } finally {
      // Always sign out from NextAuth
      await signOut({ callbackUrl: "/login" })
    }
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex-shrink-0">
      <div className="flex h-16 items-center px-4 lg:px-6">
        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="icon"
          className="mr-2 md:hidden"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
        </Button>
        
        {/* Logo */}
        <div className="flex items-center mr-6 relative">
          <Image
            src="/logo_light.png"
            alt="Logo"
            width={120}
            height={32}
            className="h-8 w-auto dark:hidden"
            priority
          />
          <Image
            src="/logo_dark.png"
            alt="Logo"
            width={120}
            height={32}
            className="h-8 w-auto hidden dark:block"
            priority
          />
        </div>

        {/* Breadcrumb */}
        <div className="hidden md:flex items-center space-x-2 text-sm text-muted-foreground">
          <span>Dashboard</span>
          {pathname !== '/dashboard' && (
            <>
              <ChevronRight className="h-4 w-4" />
              <span className="text-foreground font-medium">{getPageTitle()}</span>
            </>
          )}
        </div>

        {/* Right side actions */}
        <div className="ml-auto flex items-center space-x-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>
          
          <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={session?.user?.image || ""} alt={session?.user?.name || "User"} />
                  <AvatarFallback className="bg-gradient-to-r from-amber-500 to-orange-600 text-white">
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {session?.user?.name || "User"}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {session?.user?.email || "user@example.com"}
                    </p>
                    {session?.user?.role && (
                      <p className="text-xs leading-none text-amber-500 font-medium">
                        {session.user.role}
                      </p>
                    )}
                  </div>
                </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950">
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
