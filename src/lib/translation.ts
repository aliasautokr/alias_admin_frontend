"use client"

const SUPPORTED_LANGUAGES = ["ru", "en", "uz", "kz", "ko"] as const

export const languages = SUPPORTED_LANGUAGES
export type Language = (typeof SUPPORTED_LANGUAGES)[number]

export type LocalizedString = Record<Language, string>

export function createEmptyLocalizedString(initial?: Partial<LocalizedString>): LocalizedString {
  return SUPPORTED_LANGUAGES.reduce(
    (acc, lang) => ({
      ...acc,
      [lang]: initial?.[lang] ?? "",
    }),
    {} as LocalizedString
  )
}

export function normalizeLocalizedFromServer(input: unknown): LocalizedString {
  if (typeof input === "string") {
    const trimmed = input.trim()
    return createEmptyLocalizedString({
      ru: trimmed,
      en: trimmed,
      uz: trimmed,
      kz: trimmed,
      ko: trimmed,
    })
  }

  if (input && typeof input === "object") {
    const source = input as Record<string, unknown>
    const normalized = createEmptyLocalizedString()

    SUPPORTED_LANGUAGES.forEach((lang) => {
      const value = source[lang]
      if (typeof value === "string") {
        normalized[lang] = value.trim()
      }
    })

    if (!normalized.ru) {
      const fallback = SUPPORTED_LANGUAGES.find((lang) => lang !== "ru" && normalized[lang])
      if (fallback) {
        normalized.ru = normalized[fallback]
      }
    }

    return normalized
  }

  return createEmptyLocalizedString()
}

function createFallbackTranslation(text: string, targets: Language[]): Partial<Record<Language, string>> {
  const trimmed = text.trim()
  return targets.reduce((acc, lang) => {
    acc[lang] = trimmed
    return acc
  }, {} as Partial<Record<Language, string>>)
}

export async function translateFromRussian(
  text: string,
  options?: { targets?: Language[] }
): Promise<Partial<Record<Language, string>>> {
  const trimmed = text.trim()
  if (!trimmed) return {}

  // Use Next.js API route as proxy to avoid CORS issues
  const endpoint = "/api/translate"
  const targets = options?.targets ?? SUPPORTED_LANGUAGES.filter((lang) => lang !== "ru")

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: "ru",
        text: trimmed,
        targets,
      }),
    })

    if (!response.ok) {
      console.error("Translation request failed:", response.statusText)
      return createFallbackTranslation(trimmed, targets)
    }

    const data = await response.json()
    const translations = data?.translations
    if (!translations || typeof translations !== "object") {
      return createFallbackTranslation(trimmed, targets)
    }

    const result: Partial<Record<Language, string>> = {}
    targets.forEach((lang) => {
      const value = translations[lang]
      if (typeof value === "string" && value.trim()) {
        result[lang] = value.trim()
      } else {
        result[lang] = trimmed
      }
    })

    return result
  } catch (error) {
    console.error("Translation request threw:", error)
    return createFallbackTranslation(trimmed, targets)
  }
}


