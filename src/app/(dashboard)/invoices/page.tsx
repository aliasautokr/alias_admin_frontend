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
import { Download } from "lucide-react"

export default function InvoicesPage() {
  const { status } = useSession()
  const queryClient = useQueryClient()
  const [currentPage, setCurrentPage] = useState(1)
  
  const { data, isLoading, error } = useQuery({ 
    queryKey: ["invoices", currentPage], 
    queryFn: () => apiClient.listInvoices({ page: currentPage, limit: 20 }),
    enabled: status === "authenticated",
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    retry: 1
  })
  
  const items = Array.isArray(data?.items) ? data.items : []
  const pagination = data?.pagination || { page: 1, totalPages: 1, total: 0 }
  
  const del = useMutation({
    mutationFn: (id: string) => apiClient.deleteInvoice(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["invoices"] }),
  })

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleDownload = async (fileUrl: string, invoiceNumber: string, vin?: string, carModel?: string) => {
    try {
      // Fetch the file
      const response = await fetch(fileUrl)
      const blob = await response.blob()
      
      // Create filename: Invoice_{invoice_number}_{car_name}_{vin_last_6_digits}
      let filename = `${invoiceNumber}`
      
      if (carModel) {
        // Sanitize car model for filename (remove special characters, spaces -> underscores)
        const sanitizedCarModel = carModel.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').trim()
        filename += `_${sanitizedCarModel}`
      }
      
      if (vin && vin.length >= 6) {
        // Get last 6 digits of VIN
        const vinLast6 = vin.slice(-6)
        filename += `_${vinLast6}`
      }
      
      filename += '.docx'
      
      // Create a temporary URL and trigger download
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Download error:', error)
      // Fallback to opening in new tab if download fails
      window.open(fileUrl, '_blank')
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Invoices</CardTitle>
          <CardDescription>Manage and download invoices</CardDescription>
        </div>
        <Button asChild className="bg-gradient-to-r from-amber-500 to-orange-600 text-white">
          <Link href="/invoices/new">Create Invoice</Link>
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
            Failed to load invoices. Please try again.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b">
                  <th className="py-2">Date</th>
                  <th className="py-2">Invoice Number</th>
                  <th className="py-2">VIN Number</th>
                  <th className="py-2">Car Name</th>
                  <th className="py-2">Author</th>
                  <th className="py-2">Country</th>
                  <th className="py-2">File Download</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-muted-foreground">
                      No invoices found. Create your first invoice.
                    </td>
                  </tr>
                ) : (
                  items.map((item) => {
                    // Use direct carVin field or fallback to carRecord relation
                    const vin = (item as any).carVin || 
                               (item as any).carRecord?.vin || 
                               '—'
                    // Use direct carModel field or fallback to carRecord relation
                    const carModel = (item as any).carModel || 
                                   (item as any).carRecord?.car_model || 
                                   '—'
                    return (
                      <tr key={item.id} className="border-b border-border/50">
                        <td className="py-2">{new Date(item.date).toLocaleDateString()}</td>
                        <td className="py-2">{item.invoiceNumber}</td>
                        <td className="py-2">{vin}</td>
                        <td className="py-2">{carModel}</td>
                        <td className="py-2">
                          {(item as any).User?.name || (item as any).User?.email || '—'}
                        </td>
                        <td className="py-2">{item.country}</td>
                        <td className="py-2">
                          {item.fileUrl ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownload(
                                item.fileUrl, 
                                item.invoiceNumber, 
                                vin !== '—' ? vin : undefined,
                                carModel
                              )}
                              className="gap-2"
                            >
                              <Download className="h-4 w-4" />
                              Download
                            </Button>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="py-2">
                          <button
                            className="text-red-500 hover:underline"
                            onClick={() => del.mutate(item.id)}
                            disabled={del.isPending}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    )
                  })
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
