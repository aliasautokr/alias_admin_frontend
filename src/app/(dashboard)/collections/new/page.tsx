"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ImageDropzone } from "@/components/collections/ImageDropzone"
import { EditorJs } from "@/components/collections/EditorJs"
import { apiClient } from "@/lib/api-client"
import { useQueryClient } from "@tanstack/react-query"
import { useSession } from "next-auth/react"

export default function NewCollectionPage() {
  const router = useRouter()
  const qc = useQueryClient()
  const { data: session } = useSession()
  const [title, setTitle] = useState("")
  const [files, setFiles] = useState<File[]>([])
  const [contentBlocks, setContentBlocks] = useState<any>(null)
  const [saving, setSaving] = useState(false)

  async function onSave() {
    if (!title.trim() || files.length === 0) return
    setSaving(true)
    try {
      // Upload files to S3 and get URLs
      const imageUrls: string[] = []
      for (const file of files) {
        const { uploadUrl, imageUrl } = await apiClient.getUploadUrl(file.name, file.type)
        
        // Upload to S3
        const response = await fetch(uploadUrl, {
          method: 'PUT',
          body: file,
          headers: { 'Content-Type': file.type },
        })
        
        if (!response.ok) {
          throw new Error(`Failed to upload ${file.name}`)
        }
        
        imageUrls.push(imageUrl)
      }

      // Create collection with S3 URLs
      await apiClient.createCollection({
        title: title.trim(),
        images: imageUrls,
        description: contentBlocks || { blocks: [] },
      })
      await qc.invalidateQueries({ queryKey: ["collections"] })
      router.push("/collections")
    } catch (error) {
      console.error("Failed to create collection:", error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>New Collection</CardTitle>
          <CardDescription>Add images and describe the car</CardDescription>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
          <Button className="bg-gradient-to-r from-amber-500 to-orange-600 text-white" onClick={onSave} disabled={saving || !title.trim() || files.length === 0}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <label className="text-sm text-muted-foreground">Title</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. 2019 BMW M3 Competition" />
        </div>
        <div>
          <label className="text-sm text-muted-foreground">Images</label>
          <ImageDropzone files={files} onFilesChange={setFiles} />
        </div>
        <div>
          <label className="text-sm text-muted-foreground">Description</label>
          <EditorJs key="new-collection" value={contentBlocks} onChange={setContentBlocks} />
        </div>
      </CardContent>
    </Card>
  )
}



