"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useSession, signOut } from "next-auth/react"
import { filterNavByRole } from "@/lib/rbac"
import { Button } from "@/components/ui/button"
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
  ChevronsLeft,
  ChevronsRight,
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
  collapsed?: boolean
  onToggleCollapse?: () => void
}

export function Sidebar({ className, collapsed = false, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const queryClient = useQueryClient()

  const items = filterNavByRole(session?.user?.role, navigation)

  const prefetchMap: Record<string, () => void> = {
    "/collections": () =>
      queryClient.prefetchQuery({
        queryKey: ["collections"],
        queryFn: () => apiClient.listCollections(),
        staleTime: 5 * 60 * 1000,
      }),
    "/users": () =>
      queryClient.prefetchQuery({
        queryKey: ["users"],
        queryFn: () => apiClient.listUsers(),
        staleTime: 5 * 60 * 1000,
      }),
    "/inspections": () =>
      queryClient.prefetchQuery({
        queryKey: ["inspections"],
        queryFn: () => apiClient.listInspections(),
        staleTime: 5 * 60 * 1000,
      }),
    "/car-records": () =>
      queryClient.prefetchQuery({
        queryKey: ["car-records"],
        queryFn: () => apiClient.listCarRecords(),
        staleTime: 5 * 60 * 1000,
      }),
    "/companies": () =>
      queryClient.prefetchQuery({
        queryKey: ["companies"],
        queryFn: () => apiClient.listCompanies(),
        staleTime: 5 * 60 * 1000,
      }),
    "/port-infos": () =>
      queryClient.prefetchQuery({
        queryKey: ["port-infos"],
        queryFn: () => apiClient.listPortInfos(),
        staleTime: 5 * 60 * 1000,
      }),
    "/invoices": () =>
      queryClient.prefetchQuery({
        queryKey: ["invoices"],
        queryFn: () => apiClient.listInvoices(),
        staleTime: 5 * 60 * 1000,
      }),
    "/invoice-templates": () =>
      queryClient.prefetchQuery({
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
      <div className="flex-1 space-y-1 overflow-y-auto px-2 py-4">
        {items.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link key={item.name} href={item.href}>
              <Button
                variant={isActive ? "secondary" : "ghost"}
                className={cn(
                  "w-full h-10",
                  collapsed ? "justify-center px-0" : "justify-start px-3",
                  isActive &&
                    "bg-gradient-to-r from-amber-500/10 to-orange-600/10 border-l-2 border-amber-500"
                )}
                onMouseEnter={() => prefetchData(item.href)}
              >
                <item.icon className={cn("h-4 w-4", collapsed ? "" : "mr-3")}
                />
                {!collapsed && <span>{item.name}</span>}
              </Button>
            </Link>
          )
        })}
      </div>

      <div className="border-t px-2 py-3 space-y-2">
        {onToggleCollapse && (
          <Button
            variant="ghost"
            className={cn("w-full h-10", collapsed ? "justify-center" : "justify-start px-3")}
            onClick={onToggleCollapse}
          >
            {collapsed ? (
              <ChevronsRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronsLeft className="mr-3 h-4 w-4" />
                <span>Collapse sidebar</span>
              </>
            )}
          </Button>
        )}
        <Button
          variant="ghost"
          className={cn(
            "w-full h-10 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950",
            collapsed ? "justify-center" : "justify-start px-3"
          )}
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className={cn("h-4 w-4", collapsed ? "" : "mr-3")}
          />
          {!collapsed && <span>Logout</span>}
        </Button>
      </div>
    </div>
  )
}
