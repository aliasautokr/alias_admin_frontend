"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Skeleton } from "@/components/ui/skeleton"
import { Pagination } from "@/components/ui/pagination"
import { apiClient } from "@/lib/api-client"
import { useSession } from "next-auth/react"
import { useMemo, useState } from "react"
import { ROLES } from "@/lib/rbac"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"

export default function UsersPage() {
  const { data: session, status } = useSession()
  const queryClient = useQueryClient()
  const [currentPage, setCurrentPage] = useState(1)

  const { data, isLoading, error } = useQuery({
    queryKey: ["users", currentPage],
    queryFn: () => apiClient.listUsers({ page: currentPage, limit: 20 }),
    enabled: status === "authenticated",
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    retry: 1
  })

  const isSuperAdmin = useMemo(() => session?.user?.role === "SUPER_ADMIN", [session?.user?.role])

  const updateRole = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) => apiClient.updateUserRole(userId, role),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  })

  const deleteUser = useMutation({
    mutationFn: (userId: string) => apiClient.deleteUser(userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  })

  // Normalize users BEFORE any early returns; not a hook
  const users = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : [])
  const pagination = data?.pagination || { page: 1, totalPages: 1, total: 0 }
  const [pendingDelete, setPendingDelete] = useState<null | { id: string; email: string }>(null)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  // Loading state while session resolves
  if (status === "loading") {
    return (
      <div className="h-[60vh] flex items-center justify-center text-muted-foreground">Loading...</div>
    )
  }

  // If role is USER, show access pending page
  if (session?.user?.role === "USER") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-lg w-full">
          <CardHeader>
            <CardTitle>Access Pending</CardTitle>
            <CardDescription>Your access is pending. Please contact an administrator.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Your account currently has basic access. If you believe this is a mistake, please reach out to your admin to request elevated permissions.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Users</CardTitle>
        <CardDescription>View and manage all user accounts</CardDescription>
      </CardHeader>
      <CardContent>
        {error ? (
          <div className="h-[300px] flex items-center justify-center text-red-500">Failed to load users.</div>
        ) : isLoading ? (
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
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b">
                  <th className="py-2">Name</th>
                  <th className="py-2">Email</th>
                  <th className="py-2">Role</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Delete</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u: any) => (
                  <tr key={u.id} className="border-b border-border/50">
                    <td className="py-2">{u.name || "—"}</td>
                    <td className="py-2">{u.email}</td>
                    <td className="py-2">
                      {isSuperAdmin ? (
                        <select
                          className="h-9 rounded-md border bg-background px-2"
                          value={u.role}
                          onChange={(e) => updateRole.mutate({ userId: u.id, role: e.target.value })}
                          disabled={updateRole.isPending}
                        >
                          {[ROLES.USER, ROLES.SALES, ROLES.MARKETING, ROLES.SUPER_ADMIN].map((r) => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                      ) : (
                        u.role
                      )}
                    </td>
                    <td className="py-2">{u.isActive ? "Active" : "Inactive"}</td>
                    <td className="py-2">
                      {isSuperAdmin ? (
                        <button
                          className="text-red-500 hover:underline"
                          onClick={() => setPendingDelete({ id: u.id, email: u.email })}
                          disabled={deleteUser.isPending}
                        >
                          Delete
                        </button>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
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
      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete user?"
        description={pendingDelete ? `Delete ${pendingDelete.email}? This cannot be undone.` : undefined}
        confirmText="Delete"
        cancelText="Cancel"
        confirmLoading={deleteUser.isPending}
        onConfirm={() => {
          if (pendingDelete) {
            deleteUser.mutate(pendingDelete.id, {
              onSettled: () => setPendingDelete(null),
            })
          }
        }}
        onClose={() => setPendingDelete(null)}
      />
    </Card>
  )
}
