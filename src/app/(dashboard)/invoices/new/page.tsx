"use client"

import { useState, useEffect } from "react"
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
import { useQueryClient, useQuery } from "@tanstack/react-query"
import { Loader2, Search } from "lucide-react"

interface CarRecord {
  id: string
  vin: string
  car_model: string
  engine_cc: string
  weight: string
  manufacture_date: string
  price: string
}

export default function NewInvoicePage() {
  const router = useRouter()
  const qc = useQueryClient()
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("")
  const [selectedPortInfoId, setSelectedPortInfoId] = useState<string>("")
  const [selectedCarRecordId, setSelectedCarRecordId] = useState<string>("")
  const [selectedCarRecord, setSelectedCarRecord] = useState<CarRecord | null>(null)
  const [selectedCountry, setSelectedCountry] = useState<string>("")
  const [buyer, setBuyer] = useState({
    country: "",
    consignee_name: "",
    consignee_address: "",
    consignee_iin: "",
    consignee_tel: "",
  })
  const [vinSearch, setVinSearch] = useState("")
  const [searchingVin, setSearchingVin] = useState(false)
  const [vinSearchResults, setVinSearchResults] = useState<CarRecord[]>([])
  const [generatingConsignee, setGeneratingConsignee] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch companies
  const { data: companiesData } = useQuery({
    queryKey: ["companies"],
    queryFn: () => apiClient.listCompanies(),
    select: (data) => data.items || [],
  })
  const companies = Array.isArray(companiesData) ? companiesData : []

  // Fetch port infos
  const { data: portInfosData } = useQuery({
    queryKey: ["port-infos"],
    queryFn: () => apiClient.listPortInfos(),
    select: (data) => data.items || [],
  })
  const portInfos = Array.isArray(portInfosData) ? portInfosData : []

  // Fetch latest car record on mount
  const { data: latestCarRecord, isLoading: loadingLatestCar } = useQuery({
    queryKey: ["latest-car-record"],
    queryFn: () => apiClient.getLatestCarRecord(),
    retry: false,
  })

  // Set latest car record as default when loaded
  useEffect(() => {
    if (latestCarRecord && !selectedCarRecordId) {
      setSelectedCarRecordId(latestCarRecord.id)
      setSelectedCarRecord(latestCarRecord)
    }
  }, [latestCarRecord, selectedCarRecordId])

  const countries = ["Russia", "Uzbekistan", "Kazakhstan", "Kyrgyzstan"]

  const handleSearchVin = async () => {
    if (!vinSearch || vinSearch.length < 4 || vinSearch.length > 6) {
      setError("Please enter 4-6 digits for VIN search")
      return
    }

    setSearchingVin(true)
    setError(null)

    try {
      const response = await apiClient.searchCarRecordsByVinLastDigits(vinSearch)
      const results = response.items || []
      
      if (results.length === 0) {
        setError("No car records found with this VIN ending")
        setVinSearchResults([])
      } else {
        setVinSearchResults(results)
        // Auto-select if only one result
        if (results.length === 1) {
          setSelectedCarRecordId(results[0].id)
          setSelectedCarRecord(results[0])
          setVinSearchResults([])
        }
      }
    } catch (error: any) {
      console.error("Failed to search VIN:", error)
      setError(error?.response?.data?.error || "Failed to search car records")
      setVinSearchResults([])
    } finally {
      setSearchingVin(false)
    }
  }

  const handleSelectCarFromResults = (carRecord: CarRecord) => {
    setSelectedCarRecordId(carRecord.id)
    setSelectedCarRecord(carRecord)
    setVinSearchResults([])
    setVinSearch("")
  }

  const handleFillDummyData = () => {
    // Fill with dummy data for testing
    if (companies.length > 0) {
      setSelectedCompanyId(companies[0].id)
    }
    if (portInfos.length > 0) {
      setSelectedPortInfoId(portInfos[0].id)
    }
    setSelectedCountry("Russia")
    setBuyer({
      country: "Russia",
      consignee_name: "Ivan Petrov",
      consignee_address: "12 Tverskaya Ulitsa, Moscow, Russia, 125009",
      consignee_iin: "264592930755",
      consignee_tel: "+75635579147",
    })
  }

  const handleGenerateConsignee = async () => {
    if (!selectedCountry) {
      setError("Please select a country first")
      return
    }

    setGeneratingConsignee(true)
    setError(null)

    try {
      const response = await apiClient.generateConsignee(selectedCountry)
      
      if (response?.data) {
        setBuyer({
          country: selectedCountry,
          consignee_name: response.data.consignee_name || "",
          consignee_address: response.data.consignee_address || "",
          consignee_iin: response.data.consignee_iin || "",
          consignee_tel: response.data.consignee_tel || "",
        })
      }
    } catch (error: any) {
      console.error("Failed to generate consignee:", error)
      setError(error?.response?.data?.error || error?.message || "Failed to generate consignee data")
    } finally {
      setGeneratingConsignee(false)
    }
  }

  const handleGenerateInvoice = async () => {
    if (!selectedCompanyId || !selectedPortInfoId || !selectedCountry) {
      setError("Company, Port Info, and Country are required")
      return
    }

    if (!buyer.consignee_name || !buyer.consignee_address || !buyer.consignee_iin || !buyer.consignee_tel) {
      setError("Please generate consignee data first")
      return
    }

    setSaving(true)
    setError(null)

    try {
      await apiClient.createInvoice({
        companyId: selectedCompanyId,
        portInfoId: selectedPortInfoId,
        country: selectedCountry,
        carRecordId: selectedCarRecordId || undefined,
        buyer,
      })
      await qc.invalidateQueries({ queryKey: ["invoices"] })
      router.push("/invoices")
    } catch (error: any) {
      console.error("Failed to create invoice:", error)
      setError(error?.response?.data?.error || "Failed to create invoice")
    } finally {
      setSaving(false)
    }
  }

  const isFormValid = selectedCompanyId && selectedPortInfoId && selectedCountry && 
    buyer.consignee_name && buyer.consignee_address && buyer.consignee_iin && buyer.consignee_tel

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>New Invoice</CardTitle>
          <CardDescription>Create a new invoice</CardDescription>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="secondary" 
            onClick={handleFillDummyData}
            type="button"
          >
            Fill Dummy Data
          </Button>
          <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
          <Button 
            className="bg-gradient-to-r from-amber-500 to-orange-600 text-white" 
            onClick={handleGenerateInvoice} 
            disabled={saving || !isFormValid}
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              'Generate Invoice'
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-8">
        {error && (
          <div className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-950 rounded-md">
            {error}
          </div>
        )}

        {/* Info message */}
        <div className="p-3 text-sm text-muted-foreground bg-muted rounded-md">
          Invoice number will be auto-generated in format: <strong>{selectedCountry ? `${selectedCountry === 'Russia' ? 'RU' : selectedCountry === 'Uzbekistan' ? 'UZ' : selectedCountry === 'Kazakhstan' ? 'KZ' : 'KG'}-YYYYMMDD##` : 'COUNTRY-DATE##'}</strong>
        </div>

        {/* Section 1 & 2: Company Information and Port Info - Side by Side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t pt-6">
          {/* Section 1: Company Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Company Information</h3>
            <div className="space-y-2">
              <Label htmlFor="company">Select Company</Label>
              <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                <SelectTrigger id="company">
                  <SelectValue placeholder="Select a company" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Section 2: Port Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Port Info</h3>
            <div className="space-y-2">
              <Label htmlFor="portInfo">Select Port</Label>
              <Select value={selectedPortInfoId} onValueChange={setSelectedPortInfoId}>
                <SelectTrigger id="portInfo">
                  <SelectValue placeholder="Select a port" />
                </SelectTrigger>
                <SelectContent>
                  {portInfos.map((port) => (
                    <SelectItem key={port.id} value={port.id}>
                      {port.shortAddress}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Section 3: Car Info */}
        <div className="space-y-4 border-t pt-6">
          <h3 className="text-lg font-semibold">Car Information</h3>
          
          {/* VIN Search */}
          <div className="space-y-2">
            <Label htmlFor="vinSearch">Search by VIN (Last 4-6 digits)</Label>
            <div className="flex gap-2">
              <Input
                id="vinSearch"
                value={vinSearch}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 6)
                  setVinSearch(value)
                }}
                placeholder="Enter last 4-6 digits"
                maxLength={6}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleSearchVin}
                disabled={!vinSearch || vinSearch.length < 4 || vinSearch.length > 6 || searchingVin}
              >
                {searchingVin ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Search
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* VIN Search Results */}
          {vinSearchResults.length > 0 && (
            <div className="mt-4 p-4 border rounded-md bg-muted/50">
              <Label className="text-sm font-medium mb-2 block">Search Results ({vinSearchResults.length})</Label>
              <div className="space-y-2">
                {vinSearchResults.map((car) => (
                  <div
                    key={car.id}
                    className="p-3 border rounded-md cursor-pointer hover:bg-muted transition-colors"
                    onClick={() => handleSelectCarFromResults(car)}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">{car.car_model}</p>
                        <p className="text-sm text-muted-foreground">VIN: {car.vin}</p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleSelectCarFromResults(car)
                        }}
                      >
                        Select
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Selected Car Info Display */}
          {selectedCarRecord ? (
            <div className="mt-4 p-4 border rounded-md bg-muted/30">
              <Label className="text-sm font-medium mb-3 block">Selected Car</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">VIN:</span>
                  <p className="font-medium">{selectedCarRecord.vin}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Model:</span>
                  <p className="font-medium">{selectedCarRecord.car_model}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">CC:</span>
                  <p className="font-medium">{selectedCarRecord.engine_cc}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Weight:</span>
                  <p className="font-medium">{selectedCarRecord.weight}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Manufacture Date:</span>
                  <p className="font-medium">
                    {selectedCarRecord.manufacture_date 
                      ? selectedCarRecord.manufacture_date.split('-')[0].trim().replace(/\D/g, '').slice(0, 4)
                      : ''}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Price:</span>
                  <p className="font-medium">{selectedCarRecord.price}</p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => {
                  setSelectedCarRecordId("")
                  setSelectedCarRecord(null)
                }}
              >
                Clear Selection
              </Button>
            </div>
          ) : (
            loadingLatestCar ? (
              <div className="mt-4 p-4 border rounded-md text-center text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                Loading latest car record...
              </div>
            ) : (
              <div className="mt-4 p-4 border rounded-md text-center text-muted-foreground">
                No car selected. Search by VIN or the latest car will be used by default.
              </div>
            )
          )}
        </div>

        {/* Section 4: Buyer Info */}
        <div className="space-y-4 border-t pt-6">
          <h3 className="text-lg font-semibold">Buyer Info</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <div className="flex gap-2">
                <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                  <SelectTrigger id="country" className="flex-1">
                    <SelectValue placeholder="Select a country" />
                  </SelectTrigger>
                  <SelectContent>
                    {countries.map((country) => (
                      <SelectItem key={country} value={country}>
                        {country}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGenerateConsignee}
                  disabled={!selectedCountry || generatingConsignee}
                >
                  {generatingConsignee ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    'Generate'
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Buyer Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="consignee_name">Consignee Name</Label>
              <Input 
                id="consignee_name"
                value={buyer.consignee_name} 
                onChange={(e) => setBuyer({ ...buyer, consignee_name: e.target.value })} 
                placeholder="Consignee name"
                readOnly
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="consignee_address">Consignee Address</Label>
              <Input 
                id="consignee_address"
                value={buyer.consignee_address} 
                onChange={(e) => setBuyer({ ...buyer, consignee_address: e.target.value })} 
                placeholder="Consignee address"
                readOnly
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="consignee_iin">Consignee IIN</Label>
              <Input 
                id="consignee_iin"
                value={buyer.consignee_iin} 
                onChange={(e) => setBuyer({ ...buyer, consignee_iin: e.target.value })} 
                placeholder="Consignee IIN"
                readOnly
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="consignee_tel">Consignee Telephone</Label>
              <Input 
                id="consignee_tel"
                value={buyer.consignee_tel} 
                onChange={(e) => setBuyer({ ...buyer, consignee_tel: e.target.value })} 
                placeholder="Consignee telephone"
                readOnly
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
