"use client"

import Link from "next/link"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { apiClient } from "@/lib/api-client"
import { useSession } from "next-auth/react"

export default function CompaniesPage() {
  const { status } = useSession()
  const queryClient = useQueryClient()
  const { data, isLoading, error } = useQuery({ 
    queryKey: ["companies"], 
    queryFn: () => apiClient.listCompanies(),
    select: (data) => data.items || [],
    enabled: status === "authenticated",
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    retry: 1
  })
  const items = Array.isArray(data) ? data : []
  
  const del = useMutation({
    mutationFn: (id: string) => apiClient.deleteCompany(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["companies"] }),
  })

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Companies</CardTitle>
          <CardDescription>Manage company information</CardDescription>
        </div>
        <Button asChild className="bg-gradient-to-r from-amber-500 to-orange-600 text-white">
          <Link href="/companies/new">Create New Company</Link>
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-[250px]" />
              <Skeleton className="h-4 w-[200px]" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
          </div>
        ) : error ? (
          <div className="h-[300px] flex items-center justify-center text-red-500">
            Failed to load companies. Please try again.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b">
                  <th className="py-2">Company Name</th>
                  <th className="py-2">Address</th>
                  <th className="py-2">Phone</th>
                  <th className="py-2">Logo</th>
                  <th className="py-2">Seal</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground">
                      No companies found. Create your first company.
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id} className="border-b border-border/50">
                      <td className="py-2">{item.name}</td>
                      <td className="py-2">{item.address}</td>
                      <td className="py-2">{item.phone}</td>
                      <td className="py-2">
                        {item.logoUrl ? (
                          <img src={item.logoUrl} alt="Logo" className="h-10 w-10 object-cover rounded" />
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-2">
                        {item.sealUrl ? (
                          <img src={item.sealUrl} alt="Seal" className="h-10 w-10 object-cover rounded" />
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-2">
                        <div className="flex gap-3">
                          <Link href={`/companies/${item.id}`} className="text-amber-500 hover:underline">Edit</Link>
                          <button
                            className="text-red-500 hover:underline"
                            onClick={() => del.mutate(item.id)}
                            disabled={del.isPending}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

