"use client"

import React, { useCallback, useState, useRef, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import ReactCrop, { Crop, PixelCrop, makeAspectCrop, centerCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import { UploadCloud, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface ImageExtractDropzoneProps {
  onExtract: (file: File) => Promise<any>
  extractedImageUrl?: string | null
  isLoading?: boolean
  onReset?: () => void
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ACCEPTED_IMAGE_TYPES = {
  'image/jpeg': [],
  'image/png': [],
  'image/gif': [],
  'image/webp': [],
}

function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number,
) {
  return centerCrop(
    makeAspectCrop(
      {
        unit: '%',
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight,
    ),
    mediaWidth,
    mediaHeight,
  )
}

export function ImageExtractDropzone({ 
  onExtract, 
  extractedImageUrl, 
  isLoading = false,
  onReset
}: ImageExtractDropzoneProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [crop, setCrop] = useState<Crop>()
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>()
  const [extracting, setExtracting] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Reset local state when extractedImageUrl is cleared
  useEffect(() => {
    if (!extractedImageUrl) {
      setSelectedFile(null)
      setImageSrc(null)
      setCrop(undefined)
      setCompletedCrop(undefined)
    }
  }, [extractedImageUrl])

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return
    
    const file = acceptedFiles[0]
    
    // Validate file
    if (file.size > MAX_FILE_SIZE) {
      console.error(`File ${file.name} exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit.`)
      return
    }
    if (!Object.keys(ACCEPTED_IMAGE_TYPES).includes(file.type)) {
      console.error(`File ${file.name} has invalid type. Only JPEG, PNG, GIF, WEBP are allowed.`)
      return
    }

    setSelectedFile(file)
    
    // Create preview URL
    const reader = new FileReader()
    reader.onload = () => {
      setImageSrc(reader.result as string)
      setCrop(undefined)
    }
    reader.readAsDataURL(file)
  }, [])

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget
    setCrop(centerAspectCrop(width, height, 1))
  }

  const getCroppedImg = async (
    image: HTMLImageElement,
    crop: PixelCrop,
  ): Promise<File | null> => {
    const canvas = document.createElement('canvas')
    const scaleX = image.naturalWidth / image.width
    const scaleY = image.naturalHeight / image.height
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      return null
    }

    // Calculate the actual dimensions in natural (full resolution) coordinates
    const cropX = crop.x * scaleX
    const cropY = crop.y * scaleY
    const cropWidth = crop.width * scaleX
    const cropHeight = crop.height * scaleY

    // Set canvas to natural dimensions to preserve full resolution
    canvas.width = cropWidth
    canvas.height = cropHeight

    // Draw the cropped portion at full resolution
    ctx.drawImage(
      image,
      cropX,
      cropY,
      cropWidth,
      cropHeight,
      0,
      0,
      cropWidth,
      cropHeight,
    )

    return new Promise((resolve) => {
      // Use original file type or PNG if unknown to preserve quality
      const mimeType = selectedFile?.type || 'image/png'
      // Quality parameter only applies to JPEG; use 1.0 for maximum quality
      const quality = mimeType === 'image/jpeg' ? 1.0 : undefined
      
      canvas.toBlob((blob) => {
        if (!blob) {
          resolve(null)
          return
        }
        const file = new File([blob], selectedFile?.name || 'cropped-image.png', {
          type: mimeType,
        })
        resolve(file)
      }, mimeType, quality) // Use quality only for JPEG to avoid unnecessary compression
    })
  }

  const handleExtract = async () => {
    if (!selectedFile || !completedCrop || !imgRef.current) return

    setExtracting(true)
    try {
      const croppedFile = await getCroppedImg(imgRef.current, completedCrop)
      if (!croppedFile) {
        throw new Error('Failed to crop image')
      }

      await onExtract(croppedFile)
    } catch (error) {
      console.error('Extraction error:', error)
    } finally {
      setExtracting(false)
    }
  }

  const handleReset = () => {
    setSelectedFile(null)
    setImageSrc(null)
    setCrop(undefined)
    setCompletedCrop(undefined)
    if (onReset) {
      onReset()
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_IMAGE_TYPES,
    maxSize: MAX_FILE_SIZE,
    multiple: false,
    disabled: !!extractedImageUrl,
  })

  // Show extracted image if available
  if (extractedImageUrl) {
    return (
      <div className="space-y-4">
        <div className="relative border-2 border-border rounded-md overflow-hidden">
          <img
            src={extractedImageUrl}
            alt="Extracted image"
            className="w-full h-auto max-h-[600px] object-contain"
          />
        </div>
        <Button 
          variant="outline" 
          onClick={handleReset}
          className="w-full"
        >
          <X className="mr-2 h-4 w-4" />
          Upload New Image
        </Button>
      </div>
    )
  }

  // Show cropping interface if image is selected
  if (imageSrc && selectedFile) {
    return (
      <div className="space-y-4">
        <div className="border-2 border-border rounded-md overflow-hidden">
          <ReactCrop
            crop={crop}
            onChange={(_, percentCrop) => setCrop(percentCrop)}
            onComplete={(c) => setCompletedCrop(c)}
            aspect={undefined}
            minWidth={50}
          >
            <img
              ref={imgRef}
              alt="Crop me"
              src={imageSrc}
              onLoad={onImageLoad}
              className="max-h-[600px] w-full object-contain"
            />
          </ReactCrop>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleReset}
            className="flex-1"
          >
            <X className="mr-2 h-4 w-4" />
            Reset
          </Button>
          <Button
            onClick={handleExtract}
            disabled={!completedCrop || extracting || isLoading}
            className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600 text-white"
          >
            {extracting || isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Extracting...
              </>
            ) : (
              'Extract'
            )}
          </Button>
        </div>
      </div>
    )
  }

  // Show dropzone if no image is selected
  return (
    <div
      {...getRootProps()}
      className={cn(
        "flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-md cursor-pointer transition-colors bg-card hover:bg-muted/50 min-h-[300px]",
        isDragActive ? "border-amber-500 bg-amber-500/5" : "border-border"
      )}
    >
      <input {...getInputProps()} />
      <UploadCloud className="h-12 w-12 text-muted-foreground mb-4" />
      <p className="text-sm text-muted-foreground text-center mb-1">
        Drag 'n' drop an image here, or click to select
      </p>
      <p className="text-xs text-muted-foreground">
        (Max {MAX_FILE_SIZE / (1024 * 1024)}MB, JPEG, PNG, GIF, WEBP)
      </p>
    </div>
  )
}

