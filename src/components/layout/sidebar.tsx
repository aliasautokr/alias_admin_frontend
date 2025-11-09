"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useSession, signOut } from "next-auth/react"
import { filterNavByRole } from "@/lib/rbac"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import {
  LayoutDashboard,
  Users,
  Package,
  Settings,
  LogOut,
  FileText,
  FileSpreadsheet,
  Car,
  Building2,
  Anchor,
} from "lucide-react"

const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Users",
    href: "/users",
    icon: Users,
  },
  {
    name: "Collections",
    href: "/collections",
    icon: Package,
  },
  {
    name: "Invoices",
    href: "/invoices",
    icon: FileText,
  },
  {
    name: "Invoice Templates",
    href: "/invoice-templates",
    icon: FileSpreadsheet,
  },
  {
    name: "Inspections",
    href: "/inspections",
    icon: FileText,
  },
  {
    name: "Car Records",
    href: "/car-records",
    icon: Car,
  },
  {
    name: "Company",
    href: "/companies",
    icon: Building2,
  },
  {
    name: "Port Info",
    href: "/port-infos",
    icon: Anchor,
  },
  {
    name: "Content",
    href: "/content",
    icon: Settings,
  },
  {
    name: "Settings",
    href: "/settings",
    icon: Settings,
  },
]

interface SidebarProps {
  className?: string
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const queryClient = useQueryClient()

  const items = filterNavByRole(session?.user?.role, navigation)

  // Prefetch data on hover for better performance (optimized - debounced)
  const prefetchMap: Record<string, () => void> = {
    "/collections": () => queryClient.prefetchQuery({
      queryKey: ["collections"],
      queryFn: () => apiClient.listCollections(),
      staleTime: 5 * 60 * 1000,
    }),
    "/users": () => queryClient.prefetchQuery({
      queryKey: ["users"],
      queryFn: () => apiClient.listUsers(),
      staleTime: 5 * 60 * 1000,
    }),
    "/inspections": () => queryClient.prefetchQuery({
      queryKey: ["inspections"],
      queryFn: () => apiClient.listInspections(),
      staleTime: 5 * 60 * 1000,
    }),
    "/car-records": () => queryClient.prefetchQuery({
      queryKey: ["car-records"],
      queryFn: () => apiClient.listCarRecords(),
      staleTime: 5 * 60 * 1000,
    }),
    "/companies": () => queryClient.prefetchQuery({
      queryKey: ["companies"],
      queryFn: () => apiClient.listCompanies(),
      staleTime: 5 * 60 * 1000,
    }),
    "/port-infos": () => queryClient.prefetchQuery({
      queryKey: ["port-infos"],
      queryFn: () => apiClient.listPortInfos(),
      staleTime: 5 * 60 * 1000,
    }),
    "/invoices": () => queryClient.prefetchQuery({
      queryKey: ["invoices"],
      queryFn: () => apiClient.listInvoices(),
      staleTime: 5 * 60 * 1000,
    }),
    "/invoice-templates": () => queryClient.prefetchQuery({
      queryKey: ["invoice-templates"],
      queryFn: () => apiClient.listInvoiceTemplates(),
      staleTime: 5 * 60 * 1000,
    }),
  }
  
  const prefetchData = (href: string) => {
    const prefetchFn = prefetchMap[href]
    if (prefetchFn) {
      prefetchFn()
    }
  }

  return (
    <div className={cn("flex h-full flex-col overflow-hidden", className)}>
      {/* Navigation */}
      <div className="flex-1 px-3 py-4 overflow-hidden">
        <nav className="space-y-1">
          {items.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link key={item.name} href={item.href}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start h-10 px-3",
                    isActive && "bg-gradient-to-r from-amber-500/10 to-orange-600/10 border-l-2 border-amber-500"
                  )}
                  onMouseEnter={() => prefetchData(item.href)}
                >
                  <item.icon className="mr-3 h-4 w-4" />
                  {item.name}
                </Button>
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Sidebar Footer */}
      <div className="px-3 py-4 border-t">
        <Button 
          variant="ghost" 
          className="w-full justify-start h-10 px-3 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950" 
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="mr-3 h-4 w-4" />
          Logout
        </Button>
      </div>
    </div>
  )
}
