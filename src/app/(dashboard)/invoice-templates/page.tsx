"use client"

import { useRef } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { apiClient } from "@/lib/api-client"
import { toast } from "sonner"
import { Trash2, Upload, FileText } from "lucide-react"

const ALLOWED_TYPES = [
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
]

export default function InvoiceTemplatesPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: ["invoice-templates"],
    queryFn: () => apiClient.listInvoiceTemplates(),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  })

  const templates = Array.isArray(data) ? data : []

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!ALLOWED_TYPES.includes(file.type)) {
        throw new Error("Only Word documents (.docx) are allowed.")
      }

      const { uploadUrl, fileUrl, key } = await apiClient.getInvoiceTemplateUploadUrl(file.name, file.type)

      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      })

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload file to storage.")
      }

      await apiClient.createInvoiceTemplate({
        fileName: file.name,
        fileUrl,
        s3Key: key,
      })
    },
    onSuccess: () => {
      toast.success("Invoice template uploaded.")
      queryClient.invalidateQueries({ queryKey: ["invoice-templates"] })
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to upload invoice template.")
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.deleteInvoiceTemplate(id),
    onSuccess: () => {
      toast.success("Invoice template deleted.")
      queryClient.invalidateQueries({ queryKey: ["invoice-templates"] })
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to delete invoice template.")
    },
  })

  const handleSelectFile = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    uploadMutation.mutate(file)
    event.target.value = ""
  }

  const formatDate = (value: string) =>
    new Intl.DateTimeFormat("en", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value))

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Invoice Templates</CardTitle>
          <CardDescription>Upload and manage Word document templates used for invoicing.</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button
            onClick={handleSelectFile}
            disabled={uploadMutation.isPending}
            className="bg-gradient-to-r from-amber-500 to-orange-600 text-white"
          >
            {uploadMutation.isPending ? "Uploading…" : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload Template
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : error ? (
          <div className="rounded-md border border-red-200 bg-red-100/60 p-4 text-sm text-red-600">
            Failed to load invoice templates.
          </div>
        ) : (
          <div className="overflow-hidden rounded-md border">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">File name</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Uploaded by</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Uploaded at</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-background">
                {templates.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-center text-muted-foreground" colSpan={4}>
                      No invoice templates yet. Use the upload button to add one.
                    </td>
                  </tr>
                ) : (
                  templates.map((template: any) => (
                    <tr key={template.id}>
                      <td className="px-4 py-3">
                        <a
                          href={template.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline break-all"
                        >
                          {template.fileName}
                        </a>
                      </td>
                      <td className="px-4 py-3">
                        {template.uploadedBy?.name || template.uploadedBy?.email || "—"}
                      </td>
                      <td className="px-4 py-3">
                        {template.createdAt ? formatDate(template.createdAt) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => deleteMutation.mutate(template.id)}
                          disabled={deleteMutation.isPending && deleteMutation.variables === template.id}
                          title="Delete template"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
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

