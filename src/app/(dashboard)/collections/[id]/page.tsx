"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { HybridImageDropzone } from "@/components/collections/HybridImageDropzone"
import { EditorJs } from "@/components/collections/EditorJs"
import { apiClient } from "@/lib/api-client"
import { useQueryClient } from "@tanstack/react-query"

export default function EditCollectionPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params?.id
  const qc = useQueryClient()

  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState("")
  const [existingImages, setExistingImages] = useState<string[]>([])
  const [newFiles, setNewFiles] = useState<File[]>([])
  const [contentBlocks, setContentBlocks] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    async function load() {
      if (!id) return
      try {
        setError(null)
        const item = await apiClient.getCollection(String(id))
        if (!mounted) return
            if (item) {
              setTitle(item.title)
              setExistingImages(item.images || [])
              setContentBlocks(item.description || null)
            }
      } catch (error) {
        console.error("Failed to load collection:", error)
        setError("Failed to load collection")
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [id])

  async function onSave() {
    if (!id) return
    if (!title.trim()) return
    setSaving(true)
    try {
      // Upload new files to S3 and get URLs
      const newImageUrls: string[] = []
      for (const file of newFiles) {
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
        
        newImageUrls.push(imageUrl)
      }

      // Combine existing and new images
      const allImages = [...existingImages, ...newImageUrls]

      await apiClient.updateCollection(String(id), {
        title: title.trim(),
        images: allImages,
        description: contentBlocks,
      })
      await qc.invalidateQueries({ queryKey: ["collections"] })
      router.push("/collections")
    } catch (error) {
      console.error("Failed to update collection:", error)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="h-[60vh] flex items-center justify-center text-muted-foreground">Loading…</div>
  }

  if (error) {
    return <div className="h-[60vh] flex items-center justify-center text-red-500">{error}</div>
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Edit Collection</CardTitle>
          <CardDescription>Update images and description</CardDescription>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
          <Button className="bg-gradient-to-r from-amber-500 to-orange-600 text-white" onClick={onSave} disabled={saving || !title.trim()}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <label className="text-sm text-muted-foreground">Title</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
            <div>
              <label className="text-sm text-muted-foreground">Images</label>
              <HybridImageDropzone 
                existingImages={existingImages}
                newFiles={newFiles}
                onExistingImagesChange={setExistingImages}
                onNewFilesChange={setNewFiles}
              />
            </div>
        <div>
          <label className="text-sm text-muted-foreground">Description</label>
          <EditorJs key={id || 'new'} value={contentBlocks} onChange={setContentBlocks} />
        </div>
      </CardContent>
    </Card>
  )
}


