"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ImageDropzone } from "@/components/collections/ImageDropzone"
import { apiClient } from "@/lib/api-client"
import { useQueryClient } from "@tanstack/react-query"

export default function NewCompanyPage() {
  const router = useRouter()
  const qc = useQueryClient()
  const [name, setName] = useState("")
  const [address, setAddress] = useState("")
  const [phone, setPhone] = useState("")
  const [logoFiles, setLogoFiles] = useState<File[]>([])
  const [sealFiles, setSealFiles] = useState<File[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSave() {
    if (!name.trim() || !address.trim() || !phone.trim()) {
      setError("All fields are required")
      return
    }
    
    setSaving(true)
    setError(null)
    
    try {
      let logoUrl: string | undefined
      let sealUrl: string | undefined

      // Upload logo if provided
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

      // Upload seal if provided
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

      // Create company with S3 URLs
      await apiClient.createCompany({
        name: name.trim(),
        address: address.trim(),
        phone: phone.trim(),
        logoUrl,
        sealUrl,
      })
      await qc.invalidateQueries({ queryKey: ["companies"] })
      router.push("/companies")
    } catch (error: any) {
      console.error("Failed to create company:", error)
      setError(error?.response?.data?.error || error?.message || "Failed to create company")
    } finally {
      setSaving(false)
    }
  }

  const isFormValid = name.trim() && address.trim() && phone.trim()

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>New Company</CardTitle>
          <CardDescription>Add a new company</CardDescription>
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
        {error && (
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
          <ImageDropzone files={logoFiles} onFilesChange={(files) => setLogoFiles(files.slice(0, 1))} />
        </div>
        <div className="space-y-2">
          <Label>Seal</Label>
          <ImageDropzone files={sealFiles} onFilesChange={(files) => setSealFiles(files.slice(0, 1))} />
        </div>
      </CardContent>
    </Card>
  )
}

