"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ImageDropzone } from "@/components/collections/ImageDropzone"
import { EditorJs } from "@/components/collections/EditorJs"
import { apiClient } from "@/lib/api-client"

export default function NewInspectionPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  
  const [title, setTitle] = useState("")
  const [customerName, setCustomerName] = useState("")
  const [images, setImages] = useState<File[]>([])
  const [description, setDescription] = useState<any>(null)

  const createInspection = useMutation({
    mutationFn: async () => {
      // Upload images to S3 first
      const imageUrls: string[] = []
      
      for (const file of images) {
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
        
        imageUrls.push(imageUrl)
      }

      // Create inspection with S3 URLs
      return apiClient.createInspection({
        title,
        images: imageUrls,
        description,
        customerName: customerName || undefined,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inspections"] })
      router.push("/inspections")
    },
  })

  const handleSave = () => {
    if (!title.trim()) {
      alert("Please enter a title")
      return
    }
    if (images.length === 0) {
      alert("Please add at least one image")
      return
    }
    createInspection.mutate()
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create New Inspection</CardTitle>
          <CardDescription>Add vehicle inspection details and images</CardDescription>
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
            <Label>Images *</Label>
            <ImageDropzone
              files={images}
              onFilesChange={setImages}
            />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <EditorJs
              key="new-inspection"
              value={description}
              onChange={setDescription}
            />
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleSave}
              disabled={createInspection.isPending}
              className="bg-gradient-to-r from-amber-500 to-orange-600 text-white"
            >
              {createInspection.isPending ? "Creating..." : "Create Inspection"}
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
