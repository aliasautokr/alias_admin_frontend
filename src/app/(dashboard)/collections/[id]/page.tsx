"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
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
  normalizeLocalizedFromServer,
  translateFromRussian,
} from "@/lib/translation"

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

const localizedFieldKeys: TextFieldKey[] = [
  "make",
  "model",
  "trim",
  "color",
  "interiorColor",
  "description",
]

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
    if (fallback) normalized.ru = normalized[fallback]
  }
  return normalized
}

function parseNumeric(value: string): number | undefined {
  if (!value.trim()) return undefined
  const parsed = Number(value)
  return Number.isNaN(parsed) ? undefined : parsed
}

export default function EditCollectionPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id
  const router = useRouter()
  const queryClient = useQueryClient()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
  const [existingImages, setExistingImages] = useState<string[]>([])
  const [imageFiles, setImageFiles] = useState<File[]>([])

  const [translatingField, setTranslatingField] = useState<Record<string, boolean>>({})
  const [optionTranslating, setOptionTranslating] = useState<Record<number, boolean>>({})
  const [translatingMaintenance, setTranslatingMaintenance] = useState(false)

  // Store original loaded data for reset functionality
  const [originalData, setOriginalData] = useState<{
    listingId: string
    specs: SpecsState
    texts: Record<TextFieldKey, LocalizedString>
    additionalOptions: LocalizedString[]
    inspectionHistory: typeof defaultInspectionHistory
    existingImages: string[]
  } | null>(null)

  useEffect(() => {
    let mounted = true

    async function loadCollection() {
      if (!id) return
      try {
        setError(null)
        const response = await apiClient.getCollection(String(id))
        if (!mounted || !response) return

        setListingId(response.listingId ?? "")

        const rawData = response.data ?? {}
        const specsData = rawData.specs ?? rawData
        const textData = rawData.text ?? rawData

        setSpecs({
          year: specsData?.year != null ? String(specsData.year) : "",
          mileageKm: specsData?.mileageKm != null ? String(specsData.mileageKm) : "",
          fuelType: specsData?.fuelType ?? "",
          transmission: specsData?.transmission ?? "",
          engineDisplacementCc:
            specsData?.engineDisplacementCc != null ? String(specsData.engineDisplacementCc) : "",
          priceKRW: specsData?.priceKRW != null ? String(specsData.priceKRW) : "",
          currency: specsData?.currency ?? "KRW",
        })

        setTexts({
          make: normalizeLocalizedFromServer(textData?.make ?? rawData?.make),
          model: normalizeLocalizedFromServer(textData?.model ?? rawData?.model),
          trim: normalizeLocalizedFromServer(textData?.trim ?? rawData?.trim),
          color: normalizeLocalizedFromServer(textData?.color ?? rawData?.color),
          interiorColor: normalizeLocalizedFromServer(textData?.interiorColor ?? rawData?.interiorColor),
          description: normalizeLocalizedFromServer(textData?.description ?? rawData?.description),
        })

        const optionSource = rawData?.additionalOptions
        if (Array.isArray(optionSource)) {
          setAdditionalOptions(optionSource.map((value) => normalizeLocalizedFromServer(value)))
        } else {
          setAdditionalOptions([])
        }

        const inspection = rawData?.inspectionHistory ?? {}
        setInspectionHistory({
          accidents: Boolean(inspection?.accidents),
          maintenanceHistory: normalizeLocalizedFromServer(inspection?.maintenanceHistory) ?? createEmptyLocalizedString(),
        })

        const images = Array.isArray(rawData?.images) ? rawData.images : []
        setExistingImages(images)

        // Store original data for reset
        setOriginalData({
          listingId: response.listingId ?? "",
          specs: {
            year: specsData?.year != null ? String(specsData.year) : "",
            mileageKm: specsData?.mileageKm != null ? String(specsData.mileageKm) : "",
            fuelType: specsData?.fuelType ?? "",
            transmission: specsData?.transmission ?? "",
            engineDisplacementCc:
              specsData?.engineDisplacementCc != null ? String(specsData.engineDisplacementCc) : "",
            priceKRW: specsData?.priceKRW != null ? String(specsData.priceKRW) : "",
            currency: specsData?.currency ?? "KRW",
          },
          texts: {
            make: normalizeLocalizedFromServer(textData?.make ?? rawData?.make),
            model: normalizeLocalizedFromServer(textData?.model ?? rawData?.model),
            trim: normalizeLocalizedFromServer(textData?.trim ?? rawData?.trim),
            color: normalizeLocalizedFromServer(textData?.color ?? rawData?.color),
            interiorColor: normalizeLocalizedFromServer(textData?.interiorColor ?? rawData?.interiorColor),
            description: normalizeLocalizedFromServer(textData?.description ?? rawData?.description),
          },
          additionalOptions: Array.isArray(optionSource) 
            ? optionSource.map((value) => normalizeLocalizedFromServer(value))
            : [],
          inspectionHistory: {
            accidents: Boolean(inspection?.accidents),
            maintenanceHistory: normalizeLocalizedFromServer(inspection?.maintenanceHistory) ?? createEmptyLocalizedString(),
          },
          existingImages: images,
        })
      } catch (fetchError) {
        console.error("Failed to load collection:", fetchError)
        setError("Failed to load collection.")
      } finally {
        if (mounted) setLoading(false)
      }
    }

    loadCollection()

    return () => {
      mounted = false
    }
  }, [id])

  const combinedImageCount = useMemo(
    () => existingImages.length + imageFiles.length,
    [existingImages.length, imageFiles.length]
  )

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
          localized[lang] = lang === "ru" ? base : translations[lang] ?? prev[field][lang]
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
        const localized = createEmptyLocalizedString()
        languages.forEach((lang) => {
          localized[lang] = lang === "ru" ? base : translations[lang] ?? prev[index][lang]
        })
        next[index] = localized
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

  async function handleRemoveExistingImage(url: string) {
    try {
      await apiClient.deleteImage(url)
      setExistingImages((prev) => prev.filter((img) => img !== url))
    } catch (deleteError) {
      console.error("Failed to delete image:", deleteError)
      setError("Failed to delete image. Please try again.")
    }
  }

  function handleClearForm() {
    if (!originalData) return
    
    // Reset all form fields to original loaded values
    setListingId(originalData.listingId)
    setSpecs(originalData.specs)
    setTexts(originalData.texts)
    setAdditionalOptions([...originalData.additionalOptions])
    setInspectionHistory({ ...originalData.inspectionHistory })
    setExistingImages([...originalData.existingImages])
    setImageFiles([])
    setError(null)
  }

  async function onSave() {
    if (!id) return

    if (!listingId.trim()) {
      setError("Listing ID is required.")
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
      const uploadedUrls: string[] = []
      for (const file of imageFiles) {
        // Use optimized upload endpoint
        const { imageUrl, originalSize, optimizedSize, compressionRatio } = await apiClient.uploadImage(file)
        console.log(`Uploaded ${file.name}: ${(originalSize / 1024 / 1024).toFixed(2)}MB → ${(optimizedSize / 1024 / 1024).toFixed(2)}MB (${compressionRatio} reduction)`)
        uploadedUrls.push(imageUrl)
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
          images: [...existingImages, ...uploadedUrls],
        },
      }

      await apiClient.updateCollection(String(id), payload)
      await queryClient.invalidateQueries({ queryKey: ["collections"] })
      router.push("/collections")
    } catch (submitError: any) {
      console.error("Failed to update collection:", submitError)
      const errorMessage = submitError?.response?.data?.error || submitError?.message || "Failed to update collection. Please try again."
      setError(errorMessage)
    } finally {
      setSaving(false)
    }
  }

  async function onDelete() {
    if (!id) return

    const confirmed = window.confirm(
      "Are you sure you want to delete this collection? This action cannot be undone and will also delete all associated images from S3."
    )

    if (!confirmed) return

    setError(null)
    setDeleting(true)

    try {
      await apiClient.deleteCollection(String(id))
      await queryClient.invalidateQueries({ queryKey: ["collections"] })
      router.push("/collections")
    } catch (deleteError: any) {
      console.error("Failed to delete collection:", deleteError)
      const errorMessage = deleteError?.response?.data?.error || deleteError?.message || "Failed to delete collection. Please try again."
      setError(errorMessage)
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return <div className="h-[60vh] flex items-center justify-center text-muted-foreground">Loading…</div>
  }

  return (
    <div className="pb-16 px-4 sm:px-6 lg:px-8">
      <Card className="mx-auto max-w-5xl">
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Edit Collection</CardTitle>
            <CardDescription>Update vehicle details, translations, and images.</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="destructive" 
              onClick={onDelete}
              disabled={deleting || saving}
            >
              {deleting ? "Deleting…" : "Delete"}
            </Button>
            <Button variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button 
              variant="outline" 
              onClick={handleClearForm}
              disabled={saving || deleting || !originalData}
            >
              Clear Form
            </Button>
            <Button
              className="bg-gradient-to-r from-amber-500 to-orange-600 text-white"
              onClick={onSave}
              disabled={saving || deleting}
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
              <span>Existing Images</span>
              <span className="text-xs text-muted-foreground opacity-70">Optional</span>
            </label>
            {existingImages.length === 0 ? (
              <p className="text-sm text-muted-foreground">No images stored for this collection.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {existingImages.map((image) => (
                  <div key={image} className="relative group">
                    <img 
                      src={image} 
                      alt="Collection" 
                      className="h-32 w-full object-cover rounded-md border" 
                    />
                    <button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute top-1 right-1 text-xs bg-black/60 text-white rounded px-2 py-0.5 opacity-0 group-hover:opacity-100"
                      onClick={() => handleRemoveExistingImage(image)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-4">
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Upload Additional Images</span>
              <span className="text-xs text-muted-foreground opacity-70">Optional</span>
            </label>
            <ImageDropzone files={imageFiles} onFilesChange={setImageFiles} />
            {imageFiles.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {imageFiles.length} new image{imageFiles.length > 1 ? "s" : ""} selected. They upload on save.
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
              helperText="Обновите на русском и переведите, если изменили значения."
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
