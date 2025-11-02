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

  return (
    <div className="h-screen bg-background flex flex-col">
        {/* Fixed Header */}
        <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        
        <div className="flex flex-1 overflow-hidden">
        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black bg-opacity-50 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        
        {/* Fixed Sidebar */}
        <div
          className={cn(
            "fixed inset-y-0 left-0 z-50 w-64 transform bg-background border-r transition-transform duration-200 ease-in-out md:translate-x-0 md:static md:inset-0 overflow-hidden",
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="flex h-full flex-col pt-16 md:pt-0 overflow-hidden">
            <Sidebar />
          </div>
        </div>

        {/* Scrollable Main content */}
        <div className="flex-1 md:ml-0 overflow-y-auto">
          <main className="p-4 sm:p-6 pt-6 max-w-7xl mx-auto min-h-full">
            {children}
          </main>
        </div>
        </div>
      </div>
  )
}
