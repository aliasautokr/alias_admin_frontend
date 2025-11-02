"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { apiClient } from "@/lib/api-client"
import { useQueryClient } from "@tanstack/react-query"
import { ImageExtractDropzone } from "@/components/car-records/ImageExtractDropzone"
import { cn } from "@/lib/utils"

export default function NewCarRecordPage() {
  const router = useRouter()
  const qc = useQueryClient()
  const [vin, setVin] = useState("")
  const [carModel, setCarModel] = useState("")
  const [engineCc, setEngineCc] = useState("")
  const [weight, setWeight] = useState("")
  const [manufactureDate, setManufactureDate] = useState("")
  const [price, setPrice] = useState("")
  const [fuelType, setFuelType] = useState<string>("Gasoline")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [extractedImageUrl, setExtractedImageUrl] = useState<string | null>(null)
  const [extracting, setExtracting] = useState(false)

  async function handleExtract(croppedFile: File) {
    setExtracting(true)
    setError(null)
    
    try {
      const response = await apiClient.extractCarData(croppedFile)
      
      // Auto-fill empty form fields from response
      if (response?.fields) {
        const fields = response.fields
        
        // Only fill fields that are currently empty
        if (!vin.trim() && fields.vin) {
          setVin(fields.vin)
        }
        if (!carModel.trim() && fields.car_model) {
          setCarModel(fields.car_model)
        }
        if (!engineCc.trim() && fields.engine_cc) {
          setEngineCc(fields.engine_cc)
        }
        if (!weight.trim() && fields.weight) {
          setWeight(fields.weight)
        }
        if (!manufactureDate.trim() && fields.manufacture_date) {
          setManufactureDate(fields.manufacture_date)
        }
        // Note: price is not in response, skip it
      }
      
      // Set extracted image URL
      const imageUrl = response?.s3_url || response?.fields?.image_url
      if (imageUrl) {
        setExtractedImageUrl(imageUrl)
      }
    } catch (error: any) {
      console.error("Failed to extract car data:", error)
      setError(error?.response?.data?.error || error?.message || "Failed to extract car data from image")
    } finally {
      setExtracting(false)
    }
  }

  async function onSave() {
    if (!vin.trim() || !carModel.trim() || !engineCc.trim() || !weight.trim() || !manufactureDate.trim() || !price.trim()) {
      setError("All fields are required")
      return
    }
    
    setSaving(true)
    setError(null)
    
    try {
      await apiClient.createCarRecord({
        vin: vin.trim(),
        car_model: carModel.trim(),
        engine_cc: engineCc.trim(),
        weight: weight.trim(),
        manufacture_date: manufactureDate.trim(),
        price: price.trim(),
        fuel_type: fuelType,
      })
      await qc.invalidateQueries({ queryKey: ["car-records"] })
      router.push("/car-records")
    } catch (error: any) {
      console.error("Failed to create car record:", error)
      setError(error?.response?.data?.error || "Failed to create car record")
    } finally {
      setSaving(false)
    }
  }

  const isFormValid = vin.trim() && carModel.trim() && engineCc.trim() && weight.trim() && manufactureDate.trim() && price.trim()

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>New Car Record</CardTitle>
          <CardDescription>Add a new car record</CardDescription>
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
      <CardContent>
        {error && (
          <div className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-950 rounded-md mb-6">
            {error}
          </div>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Form Fields */}
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="vin">VIN Number</Label>
              <Input 
                id="vin"
                value={vin} 
                onChange={(e) => setVin(e.target.value)} 
                placeholder="e.g. WAUZZZGU652022227"
                className={cn(
                  vin.trim().length > 0 && vin.trim().length !== 17 && "border-red-500 focus-visible:ring-red-500"
                )}
              />
              {vin.trim().length > 0 && vin.trim().length !== 17 && (
                <p className="text-sm text-red-500">VIN must be exactly 17 characters</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="fuelType">Fuel Type</Label>
              <Select value={fuelType} onValueChange={setFuelType}>
                <SelectTrigger id="fuelType">
                  <SelectValue placeholder="Select fuel type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Gasoline">Gasoline</SelectItem>
                  <SelectItem value="Diesel">Diesel</SelectItem>
                  <SelectItem value="Hybrid">Hybrid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="carModel">Car Model</Label>
              <Input 
                id="carModel"
                value={carModel} 
                onChange={(e) => setCarModel(e.target.value)} 
                placeholder="e.g. Q5 40 TDI quattro" 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="engineCc">Engine CC</Label>
              <Input 
                id="engineCc"
                value={engineCc} 
                onChange={(e) => setEngineCc(e.target.value)} 
                placeholder="e.g. 1968" 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="weight">Weight</Label>
              <Input 
                id="weight"
                value={weight} 
                onChange={(e) => setWeight(e.target.value)} 
                placeholder="e.g. 2370 kg" 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="manufactureDate">Manufacture Date</Label>
              <Input 
                id="manufactureDate"
                value={manufactureDate} 
                onChange={(e) => setManufactureDate(e.target.value)} 
                placeholder="e.g. 2025-04" 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">Price</Label>
              <Input 
                id="price"
                value={price} 
                onChange={(e) => setPrice(e.target.value)} 
                placeholder="e.g. 44500000" 
              />
            </div>
          </div>

          {/* Right Column - Image Extract Dropzone */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Image Extraction</Label>
              <ImageExtractDropzone 
                onExtract={handleExtract}
                extractedImageUrl={extractedImageUrl}
                isLoading={extracting}
                onReset={() => setExtractedImageUrl(null)}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

