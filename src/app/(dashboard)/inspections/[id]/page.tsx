"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { HybridImageDropzone } from "@/components/collections/HybridImageDropzone"
import { EditorJs } from "@/components/collections/EditorJs"
import { apiClient } from "@/lib/api-client"

interface EditInspectionPageProps {
  params: Promise<{ id: string }>
}

export default function EditInspectionPage({ params }: EditInspectionPageProps) {
  const resolvedParams = use(params)
  const router = useRouter()
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  
  const [title, setTitle] = useState("")
  const [customerName, setCustomerName] = useState("")
  const [existingImages, setExistingImages] = useState<string[]>([])
  const [newFiles, setNewFiles] = useState<File[]>([])
  const [description, setDescription] = useState<any>(null)
  const [inspectorName, setInspectorName] = useState("")

  const { data: inspection, isLoading, error } = useQuery({
    queryKey: ["inspection", resolvedParams.id],
    queryFn: () => apiClient.getInspection(resolvedParams.id),
    enabled: !!resolvedParams.id,
  })

  useEffect(() => {
    if (inspection) {
      setTitle(inspection.title)
      setCustomerName(inspection.customerName || "")
      setInspectorName(inspection.inspectorName || "")
      setExistingImages(inspection.images || [])
      setDescription(inspection.description)
    }
  }, [inspection])

  const updateInspection = useMutation({
    mutationFn: async () => {
      // Upload new files to S3
      const newImageUrls: string[] = []
      
      for (const file of newFiles) {
        const { uploadUrl, imageUrl } = await apiClient.getInspectionUploadUrl(
          file.name,
          file.type
        )
        
        // Upload to S3
        const uploadResponse = await fetch(uploadUrl, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': file.type,
          },
        })
        
        if (!uploadResponse.ok) {
          throw new Error('Failed to upload image')
        }
        
        newImageUrls.push(imageUrl)
      }

      // Combine existing and new images
      const allImages = [...existingImages, ...newImageUrls]

      // Update inspection
      return apiClient.updateInspection(resolvedParams.id, {
        title,
        images: allImages,
        description,
        customerName: customerName || undefined,
        inspectorName: inspectorName || undefined,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inspections"] })
      queryClient.invalidateQueries({ queryKey: ["inspection", resolvedParams.id] })
      router.push("/inspections")
    },
  })

  const handleSave = () => {
    if (!title.trim()) {
      alert("Please enter a title")
      return
    }
    if (existingImages.length === 0 && newFiles.length === 0) {
      alert("Please add at least one image")
      return
    }
    updateInspection.mutate()
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-[200px]" />
            <Skeleton className="h-4 w-[300px]" />
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Skeleton className="h-4 w-[100px]" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-[100px]" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-[100px]" />
              <Skeleton className="h-32 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-[60vh] flex items-center justify-center text-red-500">
        Failed to load inspection. Please try again.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Edit Inspection</CardTitle>
          <CardDescription>Update inspection details and images</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter inspection title"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="customerName">Customer Name</Label>
            <Input
              id="customerName"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Enter customer name (optional)"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="inspectorName">Inspector Name</Label>
            <Input
              id="inspectorName"
              value={inspectorName}
              onChange={(e) => setInspectorName(e.target.value)}
              placeholder="Enter inspector name"
            />
          </div>

          <div className="space-y-2">
            <Label>Images *</Label>
            <HybridImageDropzone
              existingImages={existingImages}
              newFiles={newFiles}
              onExistingImagesChange={setExistingImages}
              onNewFilesChange={setNewFiles}
            />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <EditorJs
              key={inspection?.id || 'new'}
              value={description}
              onChange={setDescription}
            />
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleSave}
              disabled={updateInspection.isPending}
              className="bg-gradient-to-r from-amber-500 to-orange-600 text-white"
            >
              {updateInspection.isPending ? "Updating..." : "Update Inspection"}
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push("/inspections")}
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
