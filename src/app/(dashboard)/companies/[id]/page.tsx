"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ImageDropzone } from "@/components/collections/ImageDropzone"
import { apiClient } from "@/lib/api-client"
import { useQueryClient } from "@tanstack/react-query"

export default function EditCompanyPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params?.id
  const qc = useQueryClient()

  const [loading, setLoading] = useState(true)
  const [name, setName] = useState("")
  const [address, setAddress] = useState("")
  const [phone, setPhone] = useState("")
  const [existingLogoUrl, setExistingLogoUrl] = useState<string | null>(null)
  const [existingSealUrl, setExistingSealUrl] = useState<string | null>(null)
  const [logoFiles, setLogoFiles] = useState<File[]>([])
  const [sealFiles, setSealFiles] = useState<File[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    async function load() {
      if (!id) return
      try {
        setError(null)
        const item = await apiClient.getCompany(String(id))
        if (!mounted) return
        if (item) {
          setName(item.name || "")
          setAddress(item.address || "")
          setPhone(item.phone || "")
          setExistingLogoUrl(item.logoUrl || null)
          setExistingSealUrl(item.sealUrl || null)
        }
      } catch (error) {
        console.error("Failed to load company:", error)
        setError("Failed to load company")
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [id])

  async function onSave() {
    if (!id) return
    if (!name.trim() || !address.trim() || !phone.trim()) {
      setError("All fields are required")
      return
    }
    
    setSaving(true)
    setError(null)
    
    try {
      let logoUrl: string | undefined = existingLogoUrl || undefined
      let sealUrl: string | undefined = existingSealUrl || undefined

      // Upload new logo if provided
      if (logoFiles.length > 0) {
        const logoFile = logoFiles[0]
        const { uploadUrl, imageUrl } = await apiClient.getCompanyUploadUrl(logoFile.name, logoFile.type)
        
        const response = await fetch(uploadUrl, {
          method: 'PUT',
          body: logoFile,
          headers: { 'Content-Type': logoFile.type },
        })
        
        if (!response.ok) {
          throw new Error(`Failed to upload logo`)
        }
        
        logoUrl = imageUrl
      }

      // Upload new seal if provided
      if (sealFiles.length > 0) {
        const sealFile = sealFiles[0]
        const { uploadUrl, imageUrl } = await apiClient.getCompanyUploadUrl(sealFile.name, sealFile.type)
        
        const response = await fetch(uploadUrl, {
          method: 'PUT',
          body: sealFile,
          headers: { 'Content-Type': sealFile.type },
        })
        
        if (!response.ok) {
          throw new Error(`Failed to upload seal`)
        }
        
        sealUrl = imageUrl
      }

      await apiClient.updateCompany(String(id), {
        name: name.trim(),
        address: address.trim(),
        phone: phone.trim(),
        logoUrl,
        sealUrl,
      })
      await qc.invalidateQueries({ queryKey: ["companies"] })
      router.push("/companies")
    } catch (error: any) {
      console.error("Failed to update company:", error)
      setError(error?.response?.data?.error || error?.message || "Failed to update company")
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

  const isFormValid = name.trim() && address.trim() && phone.trim()

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Edit Company</CardTitle>
          <CardDescription>Update company information</CardDescription>
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
          <Label htmlFor="name">Company Name</Label>
          <Input 
            id="name"
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            placeholder="e.g. Acme Corporation" 
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="address">Address</Label>
          <Input 
            id="address"
            value={address} 
            onChange={(e) => setAddress(e.target.value)} 
            placeholder="e.g. 123 Main St, City, Country" 
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input 
            id="phone"
            value={phone} 
            onChange={(e) => setPhone(e.target.value)} 
            placeholder="e.g. +1 234 567 8900" 
          />
        </div>
        <div className="space-y-2">
          <Label>Logo</Label>
          {existingLogoUrl && (
            <div className="mb-2">
              <img src={existingLogoUrl} alt="Current logo" className="h-20 w-20 object-cover rounded border" />
              <p className="text-xs text-muted-foreground mt-1">Current logo</p>
            </div>
          )}
          <ImageDropzone files={logoFiles} onFilesChange={(files) => setLogoFiles(files.slice(0, 1))} />
        </div>
        <div className="space-y-2">
          <Label>Seal</Label>
          {existingSealUrl && (
            <div className="mb-2">
              <img src={existingSealUrl} alt="Current seal" className="h-20 w-20 object-cover rounded border" />
              <p className="text-xs text-muted-foreground mt-1">Current seal</p>
            </div>
          )}
          <ImageDropzone files={sealFiles} onFilesChange={(files) => setSealFiles(files.slice(0, 1))} />
        </div>
      </CardContent>
    </Card>
  )
}

