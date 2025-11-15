"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { languages, Language, LocalizedString } from "@/lib/translation"
import { cn } from "@/lib/utils"

interface LocalizedFieldProps {
  label: string
  value: LocalizedString
  onChange: (lang: Language, value: string) => void
  onAutoTranslate?: () => Promise<void>
  translating?: boolean
  required?: boolean
  multiline?: boolean
  helperText?: string
  className?: string
}

export function LocalizedField({
  label,
  value,
  onChange,
  onAutoTranslate,
  translating = false,
  required = false,
  multiline = false,
  helperText,
  className,
}: LocalizedFieldProps) {
  const [expanded, setExpanded] = useState(false)

  const FieldComponent = multiline ? Textarea : Input
  const basePlaceholder = multiline ? "Введите текст на русском" : "Введите на русском"

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <span>{label}</span>
          {required && <span className="text-destructive">*</span>}
        </div>
        <div className="flex items-center gap-2">
          {onAutoTranslate && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={translating || !value.ru.trim()}
              onClick={() => void onAutoTranslate()}
            >
              {translating ? "Translating…" : "Auto translate"}
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setExpanded((prev) => !prev)}
          >
            {expanded ? "Hide languages" : "Show languages"}
          </Button>
        </div>
      </div>

      <FieldComponent
        value={value.ru}
        onChange={(event) => onChange("ru", event.target.value)}
        placeholder={basePlaceholder}
        className={multiline ? "min-h-[120px]" : undefined}
      />
      {helperText && <p className="text-xs text-muted-foreground">{helperText}</p>}

      {expanded && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {languages
            .filter((lang) => lang !== "ru")
            .map((lang) => {
              const labelText = `${label} (${lang.toUpperCase()})`
              return (
                <div key={lang} className="space-y-1">
                  <label className="text-xs text-muted-foreground">{labelText}</label>
                  <FieldComponent
                    value={value[lang]}
                    onChange={(event) => onChange(lang, event.target.value)}
                    placeholder={`Enter ${label.toLowerCase()} in ${lang.toUpperCase()}`}
                    className={multiline ? "min-h-[100px]" : undefined}
                  />
                </div>
              )
            })}
        </div>
      )}
    </div>
  )
}


