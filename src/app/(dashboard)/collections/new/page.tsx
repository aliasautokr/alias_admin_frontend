"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ImageDropzone } from "@/components/collections/ImageDropzone"
import { LocalizedField } from "@/components/collections/LocalizedField"
import { apiClient } from "@/lib/api-client"
import {
  createEmptyLocalizedString,
  languages,
  LocalizedString,
  translateFromRussian,
  normalizeLocalizedFromServer,
} from "@/lib/translation"

const generateListingId = () => Math.floor(10000000 + Math.random() * 90000000).toString()

const fuelTypeOptions = [
  { value: "gasoline", label: "Gasoline / Бензин" },
  { value: "diesel", label: "Diesel / Дизель" },
  { value: "hybrid", label: "Hybrid / Гибрид" },
  { value: "electric", label: "Electric / Электро" },
] as const

const transmissionOptions = [
  { value: "automatic", label: "Automatic / Автомат" },
  { value: "manual", label: "Manual / Механика" },
  { value: "cvt", label: "CVT / Вариатор" },
  { value: "dct", label: "Dual Clutch / Робот" },
] as const

type FuelType = (typeof fuelTypeOptions)[number]["value"]
type TransmissionType = (typeof transmissionOptions)[number]["value"]

type TextFieldKey = "make" | "model" | "trim" | "color" | "interiorColor" | "description"

const localizedFieldKeys: TextFieldKey[] = ["make", "model", "trim", "color", "interiorColor", "description"]

interface SpecsState {
  year: string
  mileageKm: string
  fuelType: FuelType | ""
  transmission: TransmissionType | ""
  engineDisplacementCc: string
  priceKRW: string
  currency: string
}

const defaultSpecs: SpecsState = {
  year: "",
  mileageKm: "",
  fuelType: "",
  transmission: "",
  engineDisplacementCc: "",
  priceKRW: "",
  currency: "KRW",
}

const defaultInspectionHistory = {
  accidents: false,
  maintenanceHistory: createEmptyLocalizedString(),
}

function normalizeLocalizedString(value: LocalizedString): LocalizedString {
  const normalized = createEmptyLocalizedString()
  languages.forEach((lang) => {
    normalized[lang] = value[lang].trim()
  })
  if (!normalized.ru) {
    const fallback = languages.find((lang) => lang !== "ru" && normalized[lang])
    normalized.ru = fallback ? normalized[fallback] : ""
  }
  languages.forEach((lang) => {
    if (lang !== "ru" && !normalized[lang]) {
      normalized[lang] = normalized.ru
    }
  })
  return normalized
}

function normalizeLocalizedOptional(value: LocalizedString): LocalizedString | undefined {
  const normalized = normalizeLocalizedString(value)
  const hasContent = languages.some((lang) => normalized[lang])
  if (!hasContent) return undefined

  if (!normalized.ru) {
    const fallback = languages.find((lang) => lang !== "ru" && normalized[lang])
    if (fallback) {
      normalized.ru = normalized[fallback]
    }
  }
  return normalized
}

function parseNumeric(value: string): number | undefined {
  if (!value.trim()) return undefined
  const parsed = Number(value)
  if (Number.isNaN(parsed)) return undefined
  return parsed
}

export default function NewCollectionPage() {
  const router = useRouter()
  const queryClient = useQueryClient()

  const [listingId, setListingId] = useState("")
  const [specs, setSpecs] = useState<SpecsState>(defaultSpecs)
  const [texts, setTexts] = useState<Record<TextFieldKey, LocalizedString>>(() =>
    localizedFieldKeys.reduce(
      (acc, key) => {
        acc[key] = createEmptyLocalizedString()
        return acc
      },
      {} as Record<TextFieldKey, LocalizedString>
    )
  )
  const [additionalOptions, setAdditionalOptions] = useState<LocalizedString[]>([])
  const [inspectionHistory, setInspectionHistory] = useState(defaultInspectionHistory)
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [translatingField, setTranslatingField] = useState<Record<string, boolean>>({})
  const [optionTranslating, setOptionTranslating] = useState<Record<number, boolean>>({})
  const [translatingMaintenance, setTranslatingMaintenance] = useState(false)
  const [aiPrompt, setAiPrompt] = useState("")
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    setListingId((prev) => prev || generateListingId())
  }, [])

  const combinedImageCount = useMemo(() => imageFiles.length, [imageFiles.length])

  async function handleTranslateField(field: TextFieldKey) {
    const base = texts[field].ru.trim()
    if (!base) return

    setTranslatingField((prev) => ({ ...prev, [field]: true }))
    try {
      const translations = await translateFromRussian(base)
      setTexts((prev) => {
        const next = { ...prev }
        const localized = createEmptyLocalizedString()
        languages.forEach((lang) => {
          if (lang === "ru") {
            localized[lang] = base
          } else {
            localized[lang] = translations[lang] ?? prev[field][lang]
          }
        })
        next[field] = localized
        return next
      })
    } catch (translationError) {
      console.error("Failed to translate field", field, translationError)
    } finally {
      setTranslatingField((prev) => ({ ...prev, [field]: false }))
    }
  }

  async function handleTranslateOption(index: number) {
    const base = additionalOptions[index]?.ru.trim()
    if (!base) return

    setOptionTranslating((prev) => ({ ...prev, [index]: true }))
    try {
      const translations = await translateFromRussian(base)
      setAdditionalOptions((prev) => {
        const next = [...prev]
        const updated = createEmptyLocalizedString()
        languages.forEach((lang) => {
          updated[lang] = lang === "ru" ? base : translations[lang] ?? prev[index][lang]
        })
        next[index] = updated
        return next
      })
    } catch (translationError) {
      console.error("Failed to translate option", translationError)
    } finally {
      setOptionTranslating((prev) => ({ ...prev, [index]: false }))
    }
  }

  async function handleTranslateMaintenance() {
    const base = inspectionHistory.maintenanceHistory.ru.trim()
    if (!base) return

    setTranslatingMaintenance(true)
    try {
      const translations = await translateFromRussian(base)
      setInspectionHistory((prev) => ({
        ...prev,
        maintenanceHistory: {
          ...prev.maintenanceHistory,
          ...translations,
          ru: base,
        },
      }))
    } catch (translationError) {
      console.error("Failed to translate maintenance history", translationError)
    } finally {
      setTranslatingMaintenance(false)
    }
  }

  function updateTextField(field: TextFieldKey, lang: string, value: string) {
    setTexts((prev) => ({
      ...prev,
      [field]: {
        ...prev[field],
        [lang]: value,
      },
    }))
  }

  function updateOptionField(index: number, lang: string, value: string) {
    setAdditionalOptions((prev) => {
      const next = [...prev]
      next[index] = {
        ...next[index],
        [lang]: value,
      }
      return next
    })
  }

  async function onSave() {
    if (!listingId.trim()) {
      setError("Listing ID is required")
      return
    }

    if (!texts.make.ru.trim() || !texts.model.ru.trim()) {
      setError("Please provide make and model in Russian.")
      return
    }

    if (!specs.fuelType || !specs.transmission) {
      setError("Fuel type and transmission are required.")
      return
    }

    if (combinedImageCount === 0) {
      setError("Add at least one image.")
      return
    }

    setError(null)
    setSaving(true)

    try {
      const uploadedImageUrls: string[] = []

      for (const file of imageFiles) {
        // Use optimized upload endpoint
        const { imageUrl, originalSize, optimizedSize, compressionRatio } = await apiClient.uploadImage(file)
        console.log(`Uploaded ${file.name}: ${(originalSize / 1024 / 1024).toFixed(2)}MB → ${(optimizedSize / 1024 / 1024).toFixed(2)}MB (${compressionRatio} reduction)`)
        uploadedImageUrls.push(imageUrl)
      }

      const additionalOptionPayload = additionalOptions
        .map((option) => normalizeLocalizedOptional(option))
        .filter((option): option is LocalizedString => Boolean(option?.ru))

      const payload = {
        listingId: listingId.trim(),
        data: {
          specs: {
            year: parseNumeric(specs.year),
            mileageKm: parseNumeric(specs.mileageKm),
            fuelType: specs.fuelType,
            transmission: specs.transmission,
            engineDisplacementCc: parseNumeric(specs.engineDisplacementCc),
            priceKRW: parseNumeric(specs.priceKRW),
            currency: specs.currency.trim() || "KRW",
          },
          text: {
            make: normalizeLocalizedString(texts.make),
            model: normalizeLocalizedString(texts.model),
            trim: normalizeLocalizedOptional(texts.trim),
            color: normalizeLocalizedOptional(texts.color),
            interiorColor: normalizeLocalizedOptional(texts.interiorColor),
            description: normalizeLocalizedOptional(texts.description),
          },
          additionalOptions: additionalOptionPayload.length > 0 ? additionalOptionPayload : undefined,
          inspectionHistory: {
            accidents: inspectionHistory.accidents,
            maintenanceHistory: normalizeLocalizedOptional(inspectionHistory.maintenanceHistory),
          },
          images: uploadedImageUrls,
        },
      }

      await apiClient.createCollection(payload)
      await queryClient.invalidateQueries({ queryKey: ["collections"] })
      router.push("/collections")
    } catch (submitError) {
      console.error("Failed to create collection:", submitError)
      setError("Failed to create collection. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  async function handleGenerateFromPrompt() {
    if (!aiPrompt.trim()) {
      setError("Please enter car information in the prompt area.")
      return
    }

    setError(null)
    setGenerating(true)

    try {
      const extractedData = await apiClient.extractCarDataFromText(aiPrompt.trim())
      
      // Fill form fields from extracted data
      // Note: listingId is generated internally, ignore from GPT response

      // Fill specs
      if (extractedData.specs) {
        setSpecs((prev) => ({
          ...prev,
          year: extractedData.specs.year ? String(extractedData.specs.year) : prev.year,
          mileageKm: extractedData.specs.mileageKm ? String(extractedData.specs.mileageKm) : prev.mileageKm,
          fuelType: extractedData.specs.fuelType || prev.fuelType,
          transmission: extractedData.specs.transmission || prev.transmission,
          engineDisplacementCc: extractedData.specs.engineDisplacementCc ? String(extractedData.specs.engineDisplacementCc) : prev.engineDisplacementCc,
          priceKRW: extractedData.specs.priceKRW ? String(extractedData.specs.priceKRW) : prev.priceKRW,
          currency: extractedData.specs.currency || prev.currency,
        }))
      }

      // Fill text fields (localized)
      if (extractedData.text) {
        const textData = extractedData.text
        setTexts((prev) => ({
          ...prev,
          make: textData.make ? normalizeLocalizedFromServer(textData.make) : prev.make,
          model: textData.model ? normalizeLocalizedFromServer(textData.model) : prev.model,
          trim: textData.trim ? normalizeLocalizedFromServer(textData.trim) : prev.trim,
          color: textData.color ? normalizeLocalizedFromServer(textData.color) : prev.color,
          interiorColor: textData.interiorColor ? normalizeLocalizedFromServer(textData.interiorColor) : prev.interiorColor,
          description: textData.description ? normalizeLocalizedFromServer(textData.description) : prev.description,
        }))
      }

      // Fill additional options
      if (extractedData.additionalOptions && Array.isArray(extractedData.additionalOptions)) {
        setAdditionalOptions(extractedData.additionalOptions.map((opt: any) => normalizeLocalizedFromServer(opt)))
      }

      // Fill inspection history
      if (extractedData.inspectionHistory) {
        setInspectionHistory((prev) => ({
          ...prev,
          accidents: extractedData.inspectionHistory.accidents ?? prev.accidents,
          maintenanceHistory: extractedData.inspectionHistory.maintenanceHistory 
            ? normalizeLocalizedFromServer(extractedData.inspectionHistory.maintenanceHistory) 
            : prev.maintenanceHistory,
        }))
      }
    } catch (extractError: any) {
      console.error("Failed to extract car data:", extractError)
      setError(extractError?.response?.data?.error || extractError?.message || "Failed to extract car data. Please try again.")
    } finally {
      setGenerating(false)
    }
  }

  function handleClearPrompt() {
    setAiPrompt("")
  }

  function handleClearForm() {
    // Reset all form fields to default values
    setListingId(generateListingId())
    setSpecs(defaultSpecs)
    setTexts(
      localizedFieldKeys.reduce(
        (acc, key) => {
          acc[key] = createEmptyLocalizedString()
          return acc
        },
        {} as Record<TextFieldKey, LocalizedString>
      )
    )
    setAdditionalOptions([])
    setInspectionHistory(defaultInspectionHistory)
    setImageFiles([])
    setError(null)
    setAiPrompt("")
  }

  return (
    <div className="pb-16 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* AI Prompt Card */}
      <Card className="mx-auto max-w-5xl">
        <CardHeader>
          <CardTitle>AI Car Information Extractor</CardTitle>
          <CardDescription>
            Paste car information in text format (from listings, spec sheets, etc.) and let AI extract and fill all fields automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Car Information Text</label>
            <Textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder={`Paste car information here... For example:
Mercedes-Benz E-Class 2022
Automatic transmission, Gasoline engine
15000 km, 2000cc
Price: 35000000 KRW
Exterior: Black, Interior: Brown
Full service history, no accidents`}
              rows={8}
              className="font-mono text-sm"
            />
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleGenerateFromPrompt}
              disabled={generating || !aiPrompt.trim()}
              className="bg-gradient-to-r from-blue-500 to-purple-600 text-white"
            >
              {generating ? "Generating…" : "Generate & Fill Form"}
            </Button>
            <Button
              variant="outline"
              onClick={handleClearPrompt}
              disabled={generating || !aiPrompt.trim()}
            >
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="mx-auto max-w-5xl">
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle>New Collection</CardTitle>
            <CardDescription>Provide car details in Russian, auto translate, and upload assets.</CardDescription>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button 
              variant="outline" 
              onClick={handleClearForm}
              disabled={saving}
            >
              Clear Form
            </Button>
            <Button
              className="bg-gradient-to-r from-amber-500 to-orange-600 text-white"
              onClick={onSave}
              disabled={saving}
            >
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </CardHeader>
        <CardContent className="space-y-10">
        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30 p-3 text-sm text-red-600">
            {error}
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Fields marked with <span className="text-destructive">*</span> are required.
        </p>
        <p className="text-xs text-muted-foreground">
          Each collection must include at least one image before saving.
        </p>

          <section className="space-y-4">
            <label className="flex items-center gap-1 text-sm text-muted-foreground">
              <span>Images</span>
              <span className="text-destructive">*</span>
            </label>
            <ImageDropzone files={imageFiles} onFilesChange={setImageFiles} />
            {combinedImageCount > 0 && (
              <p className="text-xs text-muted-foreground">
                {combinedImageCount} image{combinedImageCount > 1 ? "s" : ""} selected. They upload on save.
              </p>
            )}
          </section>

          <section className="space-y-6">
            <LocalizedField
              label="Make"
              required
              value={texts.make}
              onChange={(lang, value) => updateTextField("make", lang, value)}
              onAutoTranslate={() => handleTranslateField("make")}
              translating={Boolean(translatingField.make)}
              helperText="Введите на русском, затем используйте автоматический перевод для остальных языков."
            />
            <LocalizedField
              label="Model"
              required
              value={texts.model}
              onChange={(lang, value) => updateTextField("model", lang, value)}
              onAutoTranslate={() => handleTranslateField("model")}
              translating={Boolean(translatingField.model)}
            />
            <LocalizedField
              label="Trim / Package"
              value={texts.trim}
              onChange={(lang, value) => updateTextField("trim", lang, value)}
              onAutoTranslate={() => handleTranslateField("trim")}
              translating={Boolean(translatingField.trim)}
            />
            <LocalizedField
              label="Exterior Color"
              value={texts.color}
              onChange={(lang, value) => updateTextField("color", lang, value)}
              onAutoTranslate={() => handleTranslateField("color")}
              translating={Boolean(translatingField.color)}
            />
            <LocalizedField
              label="Interior Color"
              value={texts.interiorColor}
              onChange={(lang, value) => updateTextField("interiorColor", lang, value)}
              onAutoTranslate={() => handleTranslateField("interiorColor")}
              translating={Boolean(translatingField.interiorColor)}
            />
          </section>

          <section className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
          <div className="space-y-2">
            <label className="flex items-center gap-1 text-sm text-muted-foreground">
              <span>Fuel Type</span>
              <span className="text-destructive">*</span>
            </label>
            <Select
              value={specs.fuelType}
              onValueChange={(value: FuelType) => setSpecs((prev) => ({ ...prev, fuelType: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select fuel type" />
              </SelectTrigger>
              <SelectContent>
                {fuelTypeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-1 text-sm text-muted-foreground">
              <span>Transmission</span>
              <span className="text-destructive">*</span>
            </label>
            <Select
              value={specs.transmission}
              onValueChange={(value: TransmissionType) =>
                setSpecs((prev) => ({ ...prev, transmission: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select transmission" />
              </SelectTrigger>
              <SelectContent>
                {transmissionOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Year</span>
              <span className="text-xs text-muted-foreground opacity-70">Optional</span>
            </label>
            <Input
                value={specs.year}
                onChange={(event) => setSpecs((prev) => ({ ...prev, year: event.target.value }))}
              placeholder="2022"
            />
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Mileage (km)</span>
              <span className="text-xs text-muted-foreground opacity-70">Optional</span>
            </label>
            <Input
                value={specs.mileageKm}
                onChange={(event) => setSpecs((prev) => ({ ...prev, mileageKm: event.target.value }))}
              placeholder="120000"
            />
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Engine Displacement (cc)</span>
              <span className="text-xs text-muted-foreground opacity-70">Optional</span>
            </label>
            <Input
                value={specs.engineDisplacementCc}
                onChange={(event) =>
                  setSpecs((prev) => ({ ...prev, engineDisplacementCc: event.target.value }))
                }
              placeholder="1600"
            />
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Price (KRW)</span>
              <span className="text-xs text-muted-foreground opacity-70">Optional</span>
            </label>
            <Input
                value={specs.priceKRW}
                onChange={(event) => setSpecs((prev) => ({ ...prev, priceKRW: event.target.value }))}
              placeholder="25000000"
            />
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Currency</span>
              <span className="text-xs text-muted-foreground opacity-70">Optional</span>
            </label>
            <Input
                value={specs.currency}
                onChange={(event) => setSpecs((prev) => ({ ...prev, currency: event.target.value }))}
              placeholder="KRW"
            />
          </div>
          </section>

          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Additional Options</span>
                <span className="text-xs text-muted-foreground opacity-70">Optional</span>
              </label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAdditionalOptions((prev) => [...prev, createEmptyLocalizedString()])}
              >
                Add option
              </Button>
            </div>
            {additionalOptions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No options added yet.</p>
            ) : (
              <div className="space-y-4">
                {additionalOptions.map((option, index) => (
                  <div key={index} className="rounded-lg border p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-muted-foreground">Option {index + 1}</h4>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setAdditionalOptions((prev) => prev.filter((_, optionIndex) => optionIndex !== index))
                        }
                      >
                        Remove
                      </Button>
            </div>
                    <LocalizedField
                      label="Title"
                      value={option}
                      onChange={(lang, value) => updateOptionField(index, lang, value)}
                      onAutoTranslate={() => handleTranslateOption(index)}
                      translating={Boolean(optionTranslating[index])}
              />
            </div>
                ))}
          </div>
            )}
          </section>

          <section className="space-y-6">
            <LocalizedField
              label="Description"
              value={texts.description}
              onChange={(lang, value) => updateTextField("description", lang, value)}
              onAutoTranslate={() => handleTranslateField("description")}
              translating={Boolean(translatingField.description)}
              multiline
            />
          </section>

          <section className="space-y-4">
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Inspection History</span>
              <span className="text-xs text-muted-foreground opacity-70">Optional</span>
            </label>
            <div className="space-y-4">
              <div className="space-y-2 max-w-xs">
                <label className="text-xs text-muted-foreground block">Accidents</label>
                <Select
                  value={inspectionHistory.accidents ? "true" : "false"}
                  onValueChange={(value) =>
                    setInspectionHistory((prev) => ({ ...prev, accidents: value === "true" }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="false">No</SelectItem>
                    <SelectItem value="true">Yes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <LocalizedField
                  label="Maintenance History"
                  value={inspectionHistory.maintenanceHistory}
                  onChange={(lang, value) =>
                    setInspectionHistory((prev) => ({
                      ...prev,
                      maintenanceHistory: {
                        ...prev.maintenanceHistory,
                        [lang]: value,
                      },
                    }))
                  }
                  onAutoTranslate={handleTranslateMaintenance}
                  translating={translatingMaintenance}
                  multiline
                />
              </div>
            </div>
          </section>
      </CardContent>
    </Card>
    </div>
  )
}