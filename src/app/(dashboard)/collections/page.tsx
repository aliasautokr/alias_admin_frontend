"use client"

import Link from "next/link"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { apiClient } from "@/lib/api-client"
import { useSession } from "next-auth/react"

export default function CollectionsPage() {
  const { status } = useSession()
  const queryClient = useQueryClient()
  const { data, isLoading, error } = useQuery({ 
    queryKey: ["collections"], 
    queryFn: () => apiClient.listCollections(),
    select: (data) => data.items || [],
    enabled: status === "authenticated",
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    retry: 1
  })
  const items = Array.isArray(data) ? data : []
  
  const del = useMutation({
    mutationFn: (id: string) => apiClient.deleteCollection(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["collections"] }),
  })

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Collections</CardTitle>
          <CardDescription>Add and manage collections</CardDescription>
        </div>
        <Button asChild className="bg-gradient-to-r from-amber-500 to-orange-600 text-white">
          <Link href="/collections/new">Add Collection</Link>
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
            Failed to load collections. Please try again.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b">
                  <th className="py-2">Title</th>
                  <th className="py-2">Images</th>
                  <th className="py-2">Author</th>
                  <th className="py-2">Updated</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((c) => (
                  <tr key={c.id} className="border-b border-border/50">
                    <td className="py-2">{c.title}</td>
                    <td className="py-2">{c.images.length}</td>
                    <td className="py-2">
                      {c.author?.name || c.author?.email || '—'}
                    </td>
                    <td className="py-2">{new Date(c.updatedAt).toLocaleString()}</td>
                    <td className="py-2">
                      <div className="flex gap-3">
                        <Link href={`/collections/${c.id}`} className="text-amber-500 hover:underline">Edit</Link>
                        <button
                          className="text-red-500 hover:underline"
                          onClick={() => del.mutate(c.id)}
                          disabled={del.isPending}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}


