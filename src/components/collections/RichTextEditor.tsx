"use client"

import { useEffect, useState } from "react"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Link from "@tiptap/extension-link"

interface RichTextEditorProps {
  value: string
  onChange: (html: string) => void
}

export function RichTextEditor({ value, onChange }: RichTextEditorProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const editor = useEditor(
    {
      extensions: [StarterKit, Link.configure({ openOnClick: true })],
      content: mounted ? value : "",
      immediatelyRender: false,
      editable: mounted,
      onUpdate: ({ editor }) => onChange(editor.getHTML()),
      editorProps: {
        attributes: {
          class: "prose prose-invert max-w-none focus:outline-none min-h-[200px]",
        },
      },
    },
    [mounted, value]
  )

  if (!mounted || !editor) {
    return <div className="border rounded-md p-3 min-h-[200px] text-sm text-muted-foreground">Loading editor…</div>
  }

  return (
    <div className="border rounded-md">
      <div className="flex gap-2 p-2 border-b">
        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')}>Bold</ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')}>Italic</ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')}>Bullets</ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')}>Numbers</ToolbarButton>
      </div>
      <div className="p-3">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}

function ToolbarButton({ onClick, active, children }: { onClick: () => void; active?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-xs px-2 py-1 rounded border ${active ? 'bg-amber-500/20 border-amber-500 text-amber-500' : 'border-border text-muted-foreground'}`}
    >
      {children}
    </button>
  )
}


