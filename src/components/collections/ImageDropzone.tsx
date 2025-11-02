"use client"

import React, { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Image, X, UploadCloud } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ImageDropzoneProps {
  files: File[]
  onFilesChange: (files: File[]) => void
}

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ACCEPTED_IMAGE_TYPES = {
  'image/jpeg': [],
  'image/png': [],
  'image/gif': [],
  'image/webp': [],
}

export function ImageDropzone({ files, onFilesChange }: ImageDropzoneProps) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    // Validate files
    const validFiles = acceptedFiles.filter(file => {
      if (file.size > MAX_FILE_SIZE) {
        console.error(`File ${file.name} exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit.`)
        return false
      }
      if (!Object.keys(ACCEPTED_IMAGE_TYPES).includes(file.type)) {
        console.error(`File ${file.name} has invalid type. Only JPEG, PNG, GIF, WEBP are allowed.`)
        return false
      }
      return true
    })

    // Add new files to existing ones
    onFilesChange([...files, ...validFiles])
  }, [files, onFilesChange])

  const removeFile = (index: number) => {
    const updatedFiles = files.filter((_, i) => i !== index)
    onFilesChange(updatedFiles)
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_IMAGE_TYPES,
    maxSize: MAX_FILE_SIZE,
  })

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={cn(
          "flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-md cursor-pointer transition-colors bg-card hover:bg-muted/50",
          isDragActive ? "border-amber-500 bg-amber-500/5" : "border-border"
        )}
      >
        <input {...getInputProps()} />
        <UploadCloud className="h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground text-center">
          Drag 'n' drop some images here, or click to select files
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          (Max {MAX_FILE_SIZE / (1024 * 1024)}MB per image, JPEG, PNG, GIF, WEBP)
        </p>
      </div>

      {files.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {files.map((file, index) => (
            <div key={`${file.name}-${index}`} className="relative group">
              <img 
                src={URL.createObjectURL(file)} 
                alt={file.name} 
                className="h-32 w-full object-cover rounded-md border" 
              />
              <button
                type="button"
                className="absolute top-1 right-1 text-xs bg-black/60 text-white rounded px-2 py-0.5 opacity-0 group-hover:opacity-100"
                onClick={() => removeFile(index)}
              >
                Remove
              </button>
              <div className="absolute bottom-1 left-1 text-xs bg-black/60 text-white rounded px-2 py-0.5">
                {file.name}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}