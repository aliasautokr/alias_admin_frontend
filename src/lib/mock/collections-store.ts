"use client"

// Simple localStorage-backed mock store for Collections

export interface CollectionImage {
  id: string
  name: string
  mimeType: string
  size: number
  dataUrl: string // base64 data URL for persistence
}

export interface CollectionItem {
  id: string
  title: string
  contentHtml: string
  contentJson?: any
  images: CollectionImage[]
  author?: {
    id?: string
    name?: string | null
    email?: string | null
    image?: string | null
  }
  createdAt: string
  updatedAt: string
}

const STORAGE_KEY = "mock_collections"

function readAll(): CollectionItem[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw)
  } catch {
    return []
  }
}

function writeAll(items: CollectionItem[]): void {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

export function listCollections(): Promise<CollectionItem[]> {
  return Promise.resolve(readAll())
}

export async function createCollection(input: {
  title: string
  contentHtml: string
  contentJson?: any
  images: CollectionImage[]
  author?: { id?: string; name?: string | null; email?: string | null; image?: string | null }
}): Promise<CollectionItem> {
  const now = new Date().toISOString()
  const item: CollectionItem = {
    id: crypto.randomUUID(),
    title: input.title,
    contentHtml: input.contentHtml,
    contentJson: input.contentJson,
    images: input.images,
    author: input.author,
    createdAt: now,
    updatedAt: now,
  }
  const all = readAll()
  all.unshift(item)
  writeAll(all)
  return item
}

export async function deleteCollection(id: string): Promise<void> {
  const all = readAll().filter((c) => c.id !== id)
  writeAll(all)
}

export async function getCollection(id: string): Promise<CollectionItem | null> {
  return readAll().find((c) => c.id === id) ?? null
}

export async function updateCollection(id: string, input: {
  title?: string
  contentHtml?: string
  contentJson?: any
  images?: CollectionImage[]
}): Promise<CollectionItem | null> {
  const all = readAll()
  const idx = all.findIndex((c) => c.id === id)
  if (idx === -1) return null
  const current = all[idx]
  const updated: CollectionItem = {
    ...current,
    title: input.title ?? current.title,
    contentHtml: input.contentHtml ?? current.contentHtml,
    contentJson: input.contentJson ?? current.contentJson,
    images: input.images ?? current.images,
    updatedAt: new Date().toISOString(),
  }
  all[idx] = updated
  writeAll(all)
  return updated
}


