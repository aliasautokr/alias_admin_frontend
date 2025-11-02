"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { apiClient } from "@/lib/api-client"
import { useQueryClient } from "@tanstack/react-query"
import { cn } from "@/lib/utils"

export default function EditPortInfoPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params?.id
  const qc = useQueryClient()

  const [loading, setLoading] = useState(true)
  const [shortAddress, setShortAddress] = useState("")
  const [description, setDescription] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    async function load() {
      if (!id) return
      try {
        setError(null)
        const item = await apiClient.getPortInfo(String(id))
        if (!mounted) return
        if (item) {
          setShortAddress(item.shortAddress || "")
          setDescription(item.description || "")
        }
      } catch (error) {
        console.error("Failed to load port info:", error)
        setError("Failed to load port info")
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [id])

  async function onSave() {
    if (!id) return
    if (!shortAddress.trim() || !description.trim()) {
      setError("All fields are required")
      return
    }
    
    setSaving(true)
    setError(null)
    
    try {
      await apiClient.updatePortInfo(String(id), {
        shortAddress: shortAddress.trim(),
        description: description.trim(),
      })
      await qc.invalidateQueries({ queryKey: ["port-infos"] })
      router.push("/port-infos")
    } catch (error: any) {
      console.error("Failed to update port info:", error)
      setError(error?.response?.data?.error || "Failed to update port info")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="h-[60vh] flex items-center justify-center text-muted-foreground">Loading…</div>
  }

  if (error && !loading) {
    return <div className="h-[60vh] flex items-center justify-center text-red-500">{error}</div>
  }

  const isFormValid = shortAddress.trim() && description.trim()

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Edit Port Info</CardTitle>
          <CardDescription>Update port information</CardDescription>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
          <Button 
            className="bg-gradient-to-r from-amber-500 to-orange-600 text-white" 
            onClick={onSave} 
            disabled={saving || !isFormValid}
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && !loading && (
          <div className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-950 rounded-md">
            {error}
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="shortAddress">Port Short Address</Label>
          <Input 
            id="shortAddress"
            value={shortAddress} 
            onChange={(e) => setShortAddress(e.target.value)} 
            placeholder="e.g. NYC, LAX, LON" 
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter port description with support for new lines..."
            className={cn(
              "flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y"
            )}
            rows={6}
          />
        </div>
      </CardContent>
    </Card>
  )
}

