"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
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
import { cn } from "@/lib/utils"

export default function EditCarRecordPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params?.id
  const qc = useQueryClient()

  const [loading, setLoading] = useState(true)
  const [vin, setVin] = useState("")
  const [carModel, setCarModel] = useState("")
  const [engineCc, setEngineCc] = useState("")
  const [weight, setWeight] = useState("")
  const [manufactureDate, setManufactureDate] = useState("")
  const [price, setPrice] = useState("")
  const [fuelType, setFuelType] = useState<string>("Gasoline")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    async function load() {
      if (!id) return
      try {
        setError(null)
        const item = await apiClient.getCarRecord(String(id))
        if (!mounted) return
        if (item) {
          setVin(item.vin || "")
          setCarModel(item.car_model || "")
          setEngineCc(item.engine_cc || "")
          setWeight(item.weight || "")
          setManufactureDate(item.manufacture_date || "")
          setPrice(item.price || "")
          setFuelType(item.fuel_type || "Gasoline")
        }
      } catch (error) {
        console.error("Failed to load car record:", error)
        setError("Failed to load car record")
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [id])

  async function onSave() {
    if (!id) return
    if (!vin.trim() || !carModel.trim() || !engineCc.trim() || !weight.trim() || !manufactureDate.trim() || !price.trim()) {
      setError("All fields are required")
      return
    }
    
    setSaving(true)
    setError(null)
    
    try {
      await apiClient.updateCarRecord(String(id), {
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
      console.error("Failed to update car record:", error)
      setError(error?.response?.data?.error || "Failed to update car record")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="h-[60vh] flex items-center justify-center text-muted-foreground">Loading…</div>
  }

  if (error && loading === false) {
    return <div className="h-[60vh] flex items-center justify-center text-red-500">{error}</div>
  }

  const isFormValid = vin.trim() && carModel.trim() && engineCc.trim() && weight.trim() && manufactureDate.trim() && price.trim()

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Edit Car Record</CardTitle>
          <CardDescription>Update car record information</CardDescription>
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
      </CardContent>
    </Card>
  )
}

