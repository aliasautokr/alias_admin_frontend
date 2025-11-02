"use client"

import { useEffect, useRef } from "react"

interface EditorJsProps {
  value: any
  onChange: (data: any) => void
}

export function EditorJs({ value, onChange }: EditorJsProps) {
  const holderRef = useRef<HTMLDivElement | null>(null)
  const editorRef = useRef<any>(null)
  const saveTimerRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    let isMounted = true
    async function load() {
      const EditorJS = (await import("@editorjs/editorjs")).default
      const Header = (await import("@editorjs/header")).default
      const List = (await import("@editorjs/list")).default

      if (!isMounted) return

      editorRef.current = new EditorJS({
        holder: holderRef.current!,
        placeholder: "Write description...",
        inlineToolbar: true,
        tools: {
          header: Header,
          list: List,
        },
        data: value || { blocks: [] },
        onChange(api) {
          if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current)
          saveTimerRef.current = window.setTimeout(async () => {
            const saved = await api.saver.save()
            onChange(saved)
          }, 300)
        },
      })
    }
    load()
    return () => {
      isMounted = false
      if (editorRef.current?.destroy) editorRef.current.destroy()
      editorRef.current = null
    }
  }, [])

  return (
    <div className="border rounded-md bg-background p-2 sm:p-3">
      <div ref={holderRef} className="min-h-[260px] text-sm leading-relaxed" />
    </div>
  )
}


