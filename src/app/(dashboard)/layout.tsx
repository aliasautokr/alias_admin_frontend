"use client"

import { useState } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { cn } from "@/lib/utils"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const desktopSidebarWidth = sidebarCollapsed ? "md:w-20" : "md:w-64"

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar */}
      <div
        className={cn(
          "fixed inset-0 z-40 flex md:hidden transition-opacity",
          sidebarOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
      >
        <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
        <aside
          className={cn(
            "relative z-50 w-64 max-w-full transform bg-background shadow-lg transition-transform",
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <Sidebar className="h-full" onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)} collapsed={false} />
        </aside>
      </div>

      {/* Header */}
      <div className="sticky top-0 z-50 border-b bg-background">
        <Header onMenuClick={() => setSidebarOpen(true)} />
      </div>

      <div className="flex min-h-[calc(100vh-4rem)]">
        {/* Desktop sidebar */}
        <aside
          className={cn(
            "hidden md:fixed md:top-16 md:bottom-0 md:flex md:flex-col md:border-r md:bg-background md:z-30 md:transition-all md:duration-200",
            desktopSidebarWidth
          )}
        >
          <Sidebar
            className="h-full"
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
          />
        </aside>

        <div className={cn("flex-1 transition-all md:ml-0", sidebarCollapsed ? "md:pl-20" : "md:pl-64")}
        >
          <main className="mx-auto max-w-6xl p-4 sm:p-6 md:p-8">{children}</main>
        </div>
      </div>
    </div>
  )
}
