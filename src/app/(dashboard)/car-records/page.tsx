"use client"

import Link from "next/link"
import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Pagination } from "@/components/ui/pagination"
import { apiClient } from "@/lib/api-client"
import { useSession } from "next-auth/react"

// Helper function to format numbers with commas
function formatNumber(value: string | null | undefined): string {
  if (!value) return 'N/A'
  // Remove any non-numeric characters except decimal point
  const numericValue = value.replace(/[^\d.]/g, '')
  // Parse to float for decimals, or parseInt for whole numbers
  const num = numericValue.includes('.') ? parseFloat(numericValue) : parseInt(numericValue, 10)
  if (isNaN(num)) return value
  // Format with commas, removing decimal if it's a whole number
  return num.toLocaleString('en-US', { maximumFractionDigits: 2 })
}

export default function CarRecordsPage() {
  const { status } = useSession()
  const queryClient = useQueryClient()
  const [currentPage, setCurrentPage] = useState(1)
  
  const { data, isLoading, error } = useQuery({ 
    queryKey: ["car-records", currentPage], 
    queryFn: () => apiClient.listCarRecords({ page: currentPage, limit: 20 }),
    enabled: status === "authenticated",
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    retry: 1
  })
  
  const items = Array.isArray(data?.items) ? data.items : []
  const pagination = data?.pagination || { page: 1, totalPages: 1, total: 0 }
  
  const del = useMutation({
    mutationFn: (id: string) => apiClient.deleteCarRecord(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["car-records"] }),
  })

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Car Records</CardTitle>
          <CardDescription>Manage car records</CardDescription>
        </div>
        <Button asChild className="bg-gradient-to-r from-amber-500 to-orange-600 text-white">
          <Link href="/car-records/new">Create New Car Record</Link>
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
            Failed to load car records. Please try again.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b">
                  <th className="py-2">Car Name</th>
                  <th className="py-2">VIN Number</th>
                  <th className="py-2">Fuel Type</th>
                  <th className="py-2">Weight</th>
                  <th className="py-2">CC</th>
                  <th className="py-2">Date</th>
                  <th className="py-2">Price</th>
                  <th className="py-2">Author</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-muted-foreground">
                      No car records found. Create your first car record.
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id} className="border-b border-border/50">
                      <td className="py-2">{item.car_model}</td>
                      <td className="py-2">{item.vin}</td>
                      <td className="py-2">{item.fuel_type || 'Gasoline'}</td>
                      <td className="py-2">{formatNumber(item.weight)}</td>
                      <td className="py-2">{formatNumber(item.engine_cc)}</td>
                      <td className="py-2">{item.manufacture_date?.substring(0, 4) || item.manufacture_date}</td>
                      <td className="py-2">{formatNumber(item.price)}</td>
                      <td className="py-2">{(item as any).User?.name || (item as any).User?.email || 'N/A'}</td>
                      <td className="py-2">
                        <div className="flex gap-3">
                          <Link href={`/car-records/${item.id}`} className="text-amber-500 hover:underline">Edit</Link>
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
            {!isLoading && !error && pagination.totalPages > 1 && (
              <Pagination
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                onPageChange={handlePageChange}
              />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

