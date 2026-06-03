import { useState, useEffect } from 'react'
import { Transforms, Node as SlateNode } from 'slate'
import { ReactEditor, useSlateStatic, useFocused } from 'slate-react'
import type { RenderElementProps, RenderLeafProps } from 'slate-react'
import Prism from 'prismjs'
import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-typescript'
import 'prismjs/components/prism-python'
import 'prismjs/components/prism-java'
import 'prismjs/components/prism-css'
import 'prismjs/components/prism-json'
import 'prismjs/components/prism-markup'
import 'prismjs/components/prism-sql'
import 'prismjs/components/prism-go'
import 'prismjs/components/prism-rust'
import 'prismjs/components/prism-c'
import 'prismjs/components/prism-cpp'
import 'prismjs/components/prism-php'
import 'prismjs/components/prism-ruby'
import 'prismjs/components/prism-swift'
import 'prismjs/components/prism-kotlin'
import 'prismjs/components/prism-bash'
import 'prismjs/components/prism-yaml'
import katex from 'katex'
import { cn } from '@/utils/cn'
import { GripVertical, Trash2, Pencil } from 'lucide-react'
import type { CodeBlockElement, FormulaElement, TableElement, TableRowElement } from '@/utils/editor'

const codeLanguages = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'css', label: 'CSS' },
  { value: 'html', label: 'HTML' },
  { value: 'json', label: 'JSON' },
  { value: 'sql', label: 'SQL' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
  { value: 'c', label: 'C' },
  { value: 'cpp', label: 'C++' },
  { value: 'php', label: 'PHP' },
  { value: 'ruby', label: 'Ruby' },
  { value: 'swift', label: 'Swift' },
  { value: 'kotlin', label: 'Kotlin' },
  { value: 'bash', label: 'Bash' },
  { value: 'yaml', label: 'YAML' },
]

export const EditableElement = (props: RenderElementProps) => {
  const { attributes, children, element } = props

  switch (element.type) {
    case 'heading-one':
      return (
        <h1 className="text-3xl font-bold my-4" {...attributes}>
          {children}
        </h1>
      )
    case 'heading-two':
      return (
        <h2 className="text-2xl font-bold my-3" {...attributes}>
          {children}
        </h2>
      )
    case 'heading-three':
      return (
        <h3 className="text-xl font-semibold my-2" {...attributes}>
          {children}
        </h3>
      )
    case 'heading-four':
      return (
        <h4 className="text-lg font-semibold my-2" {...attributes}>
          {children}
        </h4>
      )
    case 'heading-five':
      return (
        <h5 className="text-base font-semibold my-1" {...attributes}>
          {children}
        </h5>
      )
    case 'heading-six':
      return (
        <h6 className="text-sm font-semibold my-1" {...attributes}>
          {children}
        </h6>
      )
    case 'block-quote':
      return (
        <blockquote 
          className="border-l-4 border-gray-300 pl-4 my-4 italic text-gray-600"
          {...attributes}
        >
          {children}
        </blockquote>
      )
    case 'bulleted-list':
      return (
        <ul className="list-disc list-inside my-4 ml-4" {...attributes}>
          {children}
        </ul>
      )
    case 'numbered-list':
      return (
        <ol className="list-decimal list-inside my-4 ml-4" {...attributes}>
          {children}
        </ol>
      )
    case 'list-item':
      return (
        <li className="my-1" {...attributes}>
          {children}
        </li>
      )
    case 'code-block':
      return <CodeBlockElementComponent {...props} />
    case 'table':
      return <TableElementComponent {...props} />
    case 'table-row':
      return (
        <tr className="border-b border-gray-200" {...attributes}>
          {children}
        </tr>
      )
    case 'table-cell':
      return (
        <td className="border border-gray-300 px-3 py-2 min-w-[100px]" {...attributes}>
          {children}
        </td>
      )
    case 'image':
      return <ImageElementComponent {...props} />
    case 'video':
      return <VideoElementComponent {...props} />
    case 'divider':
      return (
        <div className="my-6" {...attributes}>
          <hr className="border-gray-300" />
          {children}
        </div>
      )
    case 'formula':
      return <FormulaElementComponent {...props} />
    default:
      return (
        <p className="my-2" {...attributes}>
          {children}
        </p>
      )
  }
}

const CodeBlockElementComponent = ({ attributes, children, element }: RenderElementProps) => {
  const editor = useSlateStatic()
  const codeBlock = element as CodeBlockElement
  const [showLanguagePicker, setShowLanguagePicker] = useState(false)
  const [highlightedCode, setHighlightedCode] = useState('')

  useEffect(() => {
    const text = SlateNode.string(element)
    const lang = codeBlock.language || 'javascript'
    try {
      const grammar = Prism.languages[lang] || Prism.languages.javascript
      const highlighted = Prism.highlight(text, grammar, lang)
      setHighlightedCode(highlighted)
    } catch {
      setHighlightedCode(text)
    }
  }, [element, codeBlock.language])

  const changeLanguage = (language: string) => {
    const path = ReactEditor.findPath(editor, element)
    Transforms.setNodes(
      editor,
      { language },
      { at: path }
    )
    setShowLanguagePicker(false)
  }

  const deleteBlock = () => {
    const path = ReactEditor.findPath(editor, element)
    Transforms.removeNodes(editor, { at: path })
  }

  return (
    <div className="my-4 group relative">
      <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <div className="relative">
          <button
            onClick={() => setShowLanguagePicker(!showLanguagePicker)}
            className="bg-gray-700 text-white text-xs px-2 py-1 rounded hover:bg-gray-600"
          >
            {codeLanguages.find(l => l.value === codeBlock.language)?.label || 'JavaScript'}
          </button>
          {showLanguagePicker && (
            <div className="absolute top-full right-0 mt-1 bg-white border rounded shadow-lg max-h-60 overflow-y-auto z-20">
              {codeLanguages.map(lang => (
                <button
                  key={lang.value}
                  onClick={() => changeLanguage(lang.value)}
                  className="block w-full text-left px-3 py-1 text-sm hover:bg-gray-100"
                >
                  {lang.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={deleteBlock}
          className="bg-red-500 text-white text-xs px-2 py-1 rounded hover:bg-red-600"
        >
          <Trash2 size={14} />
        </button>
      </div>
      <pre
        className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto font-mono text-sm"
        {...attributes}
      >
        <code
          dangerouslySetInnerHTML={{ __html: highlightedCode || ' ' }}
          className="hidden"
        />
        {children}
      </pre>
    </div>
  )
}

const TableElementComponent = ({ attributes, children, element }: RenderElementProps) => {
  const editor = useSlateStatic()
  const [showMenu, setShowMenu] = useState(false)

  const addRow = () => {
    const path = ReactEditor.findPath(editor, element)
    const table = SlateNode.get(editor, path) as TableElement
    const rows = table.children.length
    const cols = (table.children[0] as TableRowElement)?.children?.length || 3
    
    const newRow = {
      type: 'table-row' as const,
      children: Array.from({ length: cols }, () => ({
        type: 'table-cell' as const,
        children: [{ text: '' }]
      }))
    }
    
    Transforms.insertNodes(editor, newRow, {
      at: [...path, rows]
    })
  }

  const addColumn = () => {
    const path = ReactEditor.findPath(editor, element)
    const table = SlateNode.get(editor, path) as TableElement
    
    table.children.forEach((row: TableRowElement, index: number) => {
      const newCell = {
        type: 'table-cell' as const,
        children: [{ text: '' }]
      }
      Transforms.insertNodes(editor, newCell, {
        at: [...path, index, row.children.length]
      })
    })
  }

  const deleteTable = () => {
    const path = ReactEditor.findPath(editor, element)
    Transforms.removeNodes(editor, { at: path })
  }

  return (
    <div className="my-4 group relative">
      <div className="absolute -top-8 right-0 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="bg-gray-100 border rounded px-2 py-1 hover:bg-gray-200 text-sm flex items-center gap-1"
          >
            <GripVertical size={14} />
            表格操作
          </button>
          {showMenu && (
            <div className="absolute top-full right-0 mt-1 bg-white border rounded shadow-lg z-20">
              <button
                onClick={() => { addRow(); setShowMenu(false) }}
                className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
              >
                添加行
              </button>
              <button
                onClick={() => { addColumn(); setShowMenu(false) }}
                className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
              >
                添加列
              </button>
              <button
                onClick={() => { deleteTable(); setShowMenu(false) }}
                className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 text-red-500"
              >
                删除表格
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="border-collapse w-full" {...attributes}>
          <tbody>{children}</tbody>
        </table>
      </div>
    </div>
  )
}

const ImageElementComponent = ({ attributes, children, element }: RenderElementProps) => {
  const editor = useSlateStatic()
  const focused = useFocused()
  const imageEl = element as { type: string; url: string; alt?: string }
  const [isEditing, setIsEditing] = useState(false)
  const [url, setUrl] = useState(imageEl.url)

  const saveUrl = () => {
    const path = ReactEditor.findPath(editor, element)
    Transforms.setNodes(
      editor,
      { url },
      { at: path }
    )
    setIsEditing(false)
  }

  const deleteImage = () => {
    const path = ReactEditor.findPath(editor, element)
    Transforms.removeNodes(editor, { at: path })
  }

  return (
    <div 
      className={cn(
        "my-4 relative inline-block",
        focused && "ring-2 ring-blue-500 ring-offset-2"
      )}
      {...attributes}
    >
      {isEditing ? (
        <div className="flex gap-2 p-4 border rounded">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="输入图片URL"
            className="flex-1 px-3 py-2 border rounded"
          />
          <button
            onClick={saveUrl}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            确定
          </button>
        </div>
      ) : (
        <div className="group relative">
          <img
            src={imageEl.url}
            alt={imageEl.alt || 'image'}
            className="max-w-full h-auto rounded"
            onClick={() => setIsEditing(true)}
          />
          <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => setIsEditing(true)}
              className="bg-white shadow rounded p-1 hover:bg-gray-100"
            >
              <Pencil size={16} />
            </button>
            <button
              onClick={deleteImage}
              className="bg-red-500 text-white shadow rounded p-1 hover:bg-red-600"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      )}
      {children}
    </div>
  )
}

const VideoElementComponent = ({ attributes, children, element }: RenderElementProps) => {
  const editor = useSlateStatic()
  const videoEl = element as { type: string; url: string }
  const [isEditing, setIsEditing] = useState(true)
  const [url, setUrl] = useState(videoEl.url)
  const [embedUrl, setEmbedUrl] = useState('')

  useEffect(() => {
    let embed = videoEl.url
    if (videoEl.url.includes('youtube.com/watch')) {
      const videoId = new URL(videoEl.url).searchParams.get('v')
      if (videoId) embed = `https://www.youtube.com/embed/${videoId}`
    } else if (videoEl.url.includes('youtu.be/')) {
      const videoId = videoEl.url.split('youtu.be/')[1]?.split('?')[0]
      if (videoId) embed = `https://www.youtube.com/embed/${videoId}`
    } else if (videoEl.url.includes('bilibili.com/video/')) {
      const match = videoEl.url.match(/video\/([^/?]+)/)
      if (match) embed = `https://player.bilibili.com/player.html?bvid=${match[1]}`
    }
    setEmbedUrl(embed)
  }, [videoEl.url])

  const saveUrl = () => {
    const path = ReactEditor.findPath(editor, element)
    Transforms.setNodes(
      editor,
      { url },
      { at: path }
    )
    setIsEditing(false)
  }

  const deleteVideo = () => {
    const path = ReactEditor.findPath(editor, element)
    Transforms.removeNodes(editor, { at: path })
  }

  return (
    <div className="my-4 group relative" {...attributes}>
      {isEditing && !videoEl.url ? (
        <div className="flex gap-2 p-4 border rounded">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="输入视频链接 (YouTube, Bilibili 等)"
            className="flex-1 px-3 py-2 border rounded"
          />
          <button
            onClick={saveUrl}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            插入
          </button>
        </div>
      ) : (
        <div className="relative">
          <div className="aspect-video bg-black rounded overflow-hidden">
            <iframe
              src={embedUrl}
              className="w-full h-full"
              allowFullScreen
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            />
          </div>
          <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => setIsEditing(true)}
              className="bg-white shadow rounded p-1 hover:bg-gray-100"
            >
              <Pencil size={16} />
            </button>
            <button
              onClick={deleteVideo}
              className="bg-red-500 text-white shadow rounded p-1 hover:bg-red-600"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      )}
      {children}
    </div>
  )
}

const FormulaElementComponent = ({ attributes, children, element }: RenderElementProps) => {
  const editor = useSlateStatic()
  const formulaEl = element as FormulaElement
  const [isEditing, setIsEditing] = useState(true)
  const [expression, setExpression] = useState(formulaEl.expression)
  const [renderedHtml, setRenderedHtml] = useState('')

  useEffect(() => {
    try {
      const html = katex.renderToString(formulaEl.expression, {
        throwOnError: false,
        displayMode: true
      })
      setRenderedHtml(html)
    } catch {
      setRenderedHtml(formulaEl.expression)
    }
  }, [formulaEl.expression])

  const saveFormula = () => {
    const path = ReactEditor.findPath(editor, element)
    Transforms.setNodes(
      editor,
      { expression },
      { at: path }
    )
    setIsEditing(false)
  }

  const deleteFormula = () => {
    const path = ReactEditor.findPath(editor, element)
    Transforms.removeNodes(editor, { at: path })
  }

  const commonFormulas = [
    'E = mc^2',
    '\\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}',
    '\\int_0^\\infty e^{-x^2} dx',
    '\\sum_{n=1}^{\\infty} \\frac{1}{n^2}',
    'a^2 + b^2 = c^2',
    '\\sin^2\\theta + \\cos^2\\theta = 1'
  ]

  return (
    <div className="my-4 group relative" {...attributes}>
      {isEditing ? (
        <div className="border rounded p-4 bg-gray-50">
          <div className="mb-3">
            <label className="block text-sm font-medium mb-1">公式表达式 (LaTeX)</label>
            <input
              type="text"
              value={expression}
              onChange={(e) => setExpression(e.target.value)}
              className="w-full px-3 py-2 border rounded font-mono"
            />
          </div>
          <div className="mb-3">
            <label className="block text-sm font-medium mb-1">常用公式</label>
            <div className="flex flex-wrap gap-2">
              {commonFormulas.map((f, i) => (
                <button
                  key={i}
                  onClick={() => setExpression(f)}
                  className="px-2 py-1 text-sm bg-white border rounded hover:bg-gray-100"
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={saveFormula}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              插入
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
            >
              取消
            </button>
          </div>
        </div>
      ) : (
        <div className="py-4 overflow-x-auto">
          <div dangerouslySetInnerHTML={{ __html: renderedHtml }} />
          <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => setIsEditing(true)}
              className="bg-white shadow rounded p-1 hover:bg-gray-100"
            >
              <Pencil size={16} />
            </button>
            <button
              onClick={deleteFormula}
              className="bg-red-500 text-white shadow rounded p-1 hover:bg-red-600"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      )}
      {children}
    </div>
  )
}

export const EditableLeaf = ({ attributes, children, leaf }: RenderLeafProps) => {
  let content = children

  if (leaf.bold) {
    content = <strong>{content}</strong>
  }

  if (leaf.italic) {
    content = <em>{content}</em>
  }

  if (leaf.underline) {
    content = <u>{content}</u>
  }

  if (leaf.strikethrough) {
    content = <s>{content}</s>
  }

  if (leaf.code) {
    content = (
      <code className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono text-red-600">
        {content}
      </code>
    )
  }

  if (leaf.color) {
    content = <span style={{ color: leaf.color }}>{content}</span>
  }

  if (leaf.backgroundColor) {
    content = <span style={{ backgroundColor: leaf.backgroundColor }}>{content}</span>
  }

  if (leaf.commentId) {
    content = (
      <span className="bg-yellow-100 border-b-2 border-yellow-400 cursor-pointer">
        {content}
      </span>
    )
  }

  return <span {...attributes}>{content}</span>
}
