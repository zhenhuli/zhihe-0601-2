import { useState, useCallback, useEffect } from 'react'
import { Slate, Editable } from 'slate-react'
import { createEditor, Transforms } from 'slate'
import { withHistory } from 'slate-history'
import { Toolbar } from './Toolbar'
import { EditableElement, EditableLeaf } from './EditableElement'
import { withCustom, type CustomEditor, type CustomElement } from '@/utils/editor'
import { useAppStore } from '@/store'
import { cn } from '@/utils/cn'

const initialValue: CustomElement[] = [
  {
    type: 'paragraph',
    children: [{ text: '开始编辑你的文档...' }]
  }
]

interface EditorProps {
  documentId?: string
  initialContent?: CustomElement[]
  onChange?: (content: CustomElement[]) => void
  readOnly?: boolean
}

export const Editor = ({
  documentId,
  initialContent,
  onChange,
  readOnly = false
}: EditorProps) => {
  const [value, setValue] = useState<any[]>(initialContent || initialValue)
  const [editorKey, setEditorKey] = useState(documentId || 'default')
  const { editorSettings } = useAppStore()

  const createNewEditor = useCallback(() => {
    return withCustom(withHistory(createEditor()))
  }, [])

  const [editor, setEditor] = useState<CustomEditor>(() => createNewEditor())

  useEffect(() => {
    const newKey = documentId || 'default'
    if (newKey !== editorKey) {
      setEditorKey(newKey)
      setEditor(createNewEditor())
      setValue(initialContent || initialValue)
    }
  }, [documentId, editorKey, createNewEditor, initialContent])

  useEffect(() => {
    if (initialContent) {
      setValue(initialContent)
      try {
        editor.children = initialContent as any
        Transforms.deselect(editor)
      } catch (e) {
        console.error('Reset editor error:', e)
      }
    }
  }, [initialContent, editor])

  const handleChange = useCallback((newValue: any[]) => {
    setValue(newValue)
    onChange?.(newValue)
  }, [onChange])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!e.ctrlKey && !e.metaKey) return

    switch (e.key.toLowerCase()) {
      case 'b':
        e.preventDefault()
        editor.addMark('bold', true)
        break
      case 'i':
        e.preventDefault()
        editor.addMark('italic', true)
        break
      case 'u':
        e.preventDefault()
        editor.addMark('underline', true)
        break
      case 's':
        e.preventDefault()
        break
    }
  }, [editor])

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault()
    
    const clipboardData = e.clipboardData
    const html = clipboardData.getData('text/html')
    const text = clipboardData.getData('text/plain')

    if (html) {
      const parser = new DOMParser()
      const doc = parser.parseFromString(html, 'text/html')
      const cleanContent = cleanPastedHtml(doc.body)
      Transforms.insertFragment(editor, cleanContent)
    } else if (text) {
      const lines = text.split('\n')
      const fragment: CustomElement[] = lines.map(line => ({
        type: 'paragraph',
        children: [{ text: line }]
      }))
      Transforms.insertFragment(editor, fragment as any)
    }
  }, [editor])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const files = e.dataTransfer.files
    
    for (const file of files) {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = (event) => {
          const url = event.target?.result as string
          const image = {
            type: 'image' as const,
            url,
            children: [{ text: '' }]
          }
          Transforms.insertNodes(editor, image)
        }
        reader.readAsDataURL(file)
      }
    }
  }, [editor])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  return (
    <div className="h-full flex flex-col bg-white">
      <Slate key={editorKey} editor={editor} initialValue={value} onChange={handleChange}>
        {!readOnly && <Toolbar />}
        <div 
          className="flex-1 overflow-auto p-8 bg-gray-50"
          style={{
            fontSize: `${editorSettings.fontSize}px`,
            lineHeight: editorSettings.lineHeight,
          }}
        >
          <div 
            className={cn(
              "max-w-4xl mx-auto bg-white shadow-lg rounded-lg",
              !readOnly && "min-h-[800px]"
            )}
            style={{
              padding: `${editorSettings.pageMargin}px`,
            }}
          >
            <Editable
              className={cn(
                "slate-editor outline-none",
                readOnly && "pointer-events-none"
              )}
              renderElement={(props) => <EditableElement {...props} />}
              renderLeaf={(props) => <EditableLeaf {...props} />}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              readOnly={readOnly}
              placeholder="开始输入..."
              spellCheck={false}
            />
          </div>
        </div>
      </Slate>
    </div>
  )
}

function cleanPastedHtml(element: HTMLElement): CustomElement[] {
  const result: CustomElement[] = []

  element.childNodes.forEach((node) => {
    if (node.nodeType === 3) {
      const text = node.textContent?.trim()
      if (text) {
        result.push({
          type: 'paragraph',
          children: [{ text }]
        })
      }
    } else if (node.nodeType === 1) {
      const el = node as HTMLElement
      const tagName = el.tagName.toLowerCase()

      switch (tagName) {
        case 'h1':
          result.push({
            type: 'heading-one',
            children: [{ text: el.textContent || '' }]
          })
          break
        case 'h2':
          result.push({
            type: 'heading-two',
            children: [{ text: el.textContent || '' }]
          })
          break
        case 'h3':
          result.push({
            type: 'heading-three',
            children: [{ text: el.textContent || '' }]
          })
          break
        case 'p':
        case 'div':
          result.push({
            type: 'paragraph',
            children: [{ text: el.textContent || '' }]
          })
          break
        case 'ul':
          const ulItems: any[] = []
          el.querySelectorAll('li').forEach(li => {
            ulItems.push({
              type: 'list-item',
              children: [{ text: li.textContent || '' }]
            })
          })
          result.push({
            type: 'bulleted-list',
            children: ulItems
          })
          break
        case 'ol':
          const olItems: any[] = []
          el.querySelectorAll('li').forEach(li => {
            olItems.push({
              type: 'list-item',
              children: [{ text: li.textContent || '' }]
            })
          })
          result.push({
            type: 'numbered-list',
            children: olItems
          })
          break
        case 'blockquote':
          result.push({
            type: 'block-quote',
            children: [{ text: el.textContent || '' }]
          })
          break
        case 'pre':
          result.push({
            type: 'code-block',
            language: 'javascript',
            children: [{ text: el.textContent || '' }]
          })
          break
        case 'table':
          const rows: any[] = []
          el.querySelectorAll('tr').forEach(tr => {
            const cells: any[] = []
            tr.querySelectorAll('td, th').forEach(td => {
              cells.push({
                type: 'table-cell',
                children: [{ text: td.textContent || '' }]
              })
            })
            rows.push({
              type: 'table-row',
              children: cells
            })
          })
          result.push({
            type: 'table',
            children: rows
          })
          break
        case 'br':
          result.push({
            type: 'paragraph',
            children: [{ text: '' }]
          })
          break
        default:
          result.push({
            type: 'paragraph',
            children: [{ text: el.textContent || '' }]
          })
      }
    }
  })

  return result.length > 0 ? result : [{
    type: 'paragraph',
    children: [{ text: element.textContent || '' }]
  }]
}
