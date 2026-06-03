import { useState } from 'react'
import { useSlate } from 'slate-react'
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading1,
  List,
  ListOrdered,
  Quote,
  Code,
  Table,
  Image,
  Video,
  Minus,
  Sigma,
  Undo,
  Redo,
  Palette,
  Highlighter,
  ChevronDown,
} from 'lucide-react'
import {
  toggleMark,
  toggleBlock,
  insertCodeBlock,
  insertTable,
  insertImage,
  insertVideo,
  insertDivider,
  insertFormula,
  isMarkActive,
  isBlockActive,
  type CustomEditor,
} from '@/utils/editor'
import { cn } from '@/utils/cn'

const ToolbarButton = ({
  active,
  onClick,
  children,
  title,
}: {
  active?: boolean
  onClick: () => void
  children: React.ReactNode
  title: string
}) => (
  <button
    onClick={onClick}
    title={title}
    className={cn(
      'p-2 rounded hover:bg-gray-100 transition-colors',
      active && 'bg-blue-100 text-blue-600'
    )}
  >
    {children}
  </button>
)

const ToolbarDivider = () => <div className="w-px h-6 bg-gray-300 mx-1" />

const textColors = [
  '#000000', '#374151', '#6B7280', '#9CA3AF',
  '#EF4444', '#F97316', '#F59E0B', '#84CC16',
  '#10B981', '#06B6D4', '#3B82F6', '#6366F1',
  '#8B5CF6', '#A855F7', '#D946EF', '#EC4899',
]

const bgColors = [
  'transparent', '#FEE2E2', '#FEF3C7', '#D1FAE5',
  '#DBEAFE', '#E0E7FF', '#F3E8FF', '#FCE7F3',
  '#F3F4F6', '#FEF9C3', '#D9F99D', '#BFDBFE',
]

export const Toolbar = () => {
  const editor = useSlate() as CustomEditor
  const [showTextColor, setShowTextColor] = useState(false)
  const [showBgColor, setShowBgColor] = useState(false)
  const [showHeading, setShowHeading] = useState(false)
  const [imageUrl, setImageUrl] = useState('')
  const [showImageInput, setShowImageInput] = useState(false)

  const handleTextColor = (color: string) => {
    editor.addMark('color', color)
    setShowTextColor(false)
  }

  const handleBgColor = (color: string) => {
    if (color === 'transparent') {
      editor.removeMark('backgroundColor')
    } else {
      editor.addMark('backgroundColor', color)
    }
    setShowBgColor(false)
  }

  const handleInsertImage = () => {
    if (imageUrl) {
      insertImage(editor, imageUrl)
      setImageUrl('')
      setShowImageInput(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1 p-2 bg-white border-b border-gray-200 sticky top-0 z-20">
      <ToolbarButton
        active={isMarkActive(editor, 'bold')}
        onClick={() => toggleMark(editor, 'bold')}
        title="加粗 (Ctrl+B)"
      >
        <Bold size={18} />
      </ToolbarButton>
      <ToolbarButton
        active={isMarkActive(editor, 'italic')}
        onClick={() => toggleMark(editor, 'italic')}
        title="斜体 (Ctrl+I)"
      >
        <Italic size={18} />
      </ToolbarButton>
      <ToolbarButton
        active={isMarkActive(editor, 'underline')}
        onClick={() => toggleMark(editor, 'underline')}
        title="下划线 (Ctrl+U)"
      >
        <Underline size={18} />
      </ToolbarButton>
      <ToolbarButton
        active={isMarkActive(editor, 'strikethrough')}
        onClick={() => toggleMark(editor, 'strikethrough')}
        title="删除线"
      >
        <Strikethrough size={18} />
      </ToolbarButton>
      <ToolbarButton
        active={isMarkActive(editor, 'code')}
        onClick={() => toggleMark(editor, 'code')}
        title="行内代码"
      >
        <Code size={18} />
      </ToolbarButton>

      <ToolbarDivider />

      <div className="relative">
        <button
          onClick={() => setShowHeading(!showHeading)}
          className="flex items-center gap-1 p-2 rounded hover:bg-gray-100 transition-colors"
          title="标题"
        >
          <Heading1 size={18} />
          <ChevronDown size={14} />
        </button>
        {showHeading && (
          <div className="absolute top-full left-0 mt-1 bg-white border rounded shadow-lg z-30 py-1 min-w-[150px]">
            <button
              onClick={() => { toggleBlock(editor, 'heading-one'); setShowHeading(false) }}
              className={cn(
                'block w-full text-left px-4 py-2 hover:bg-gray-100',
                isBlockActive(editor, 'heading-one') && 'bg-blue-50 text-blue-600'
              )}
            >
              <span className="text-2xl font-bold">H1</span> 标题 1
            </button>
            <button
              onClick={() => { toggleBlock(editor, 'heading-two'); setShowHeading(false) }}
              className={cn(
                'block w-full text-left px-4 py-2 hover:bg-gray-100',
                isBlockActive(editor, 'heading-two') && 'bg-blue-50 text-blue-600'
              )}
            >
              <span className="text-xl font-bold">H2</span> 标题 2
            </button>
            <button
              onClick={() => { toggleBlock(editor, 'heading-three'); setShowHeading(false) }}
              className={cn(
                'block w-full text-left px-4 py-2 hover:bg-gray-100',
                isBlockActive(editor, 'heading-three') && 'bg-blue-50 text-blue-600'
              )}
            >
              <span className="text-lg font-semibold">H3</span> 标题 3
            </button>
            <button
              onClick={() => { toggleBlock(editor, 'paragraph'); setShowHeading(false) }}
              className={cn(
                'block w-full text-left px-4 py-2 hover:bg-gray-100',
                isBlockActive(editor, 'paragraph') && 'bg-blue-50 text-blue-600'
              )}
            >
              正文
            </button>
          </div>
        )}
      </div>

      <ToolbarDivider />

      <ToolbarButton
        active={isBlockActive(editor, 'bulleted-list')}
        onClick={() => toggleBlock(editor, 'bulleted-list')}
        title="无序列表"
      >
        <List size={18} />
      </ToolbarButton>
      <ToolbarButton
        active={isBlockActive(editor, 'numbered-list')}
        onClick={() => toggleBlock(editor, 'numbered-list')}
        title="有序列表"
      >
        <ListOrdered size={18} />
      </ToolbarButton>
      <ToolbarButton
        active={isBlockActive(editor, 'block-quote')}
        onClick={() => toggleBlock(editor, 'block-quote')}
        title="引用"
      >
        <Quote size={18} />
      </ToolbarButton>

      <ToolbarDivider />

      <div className="relative">
        <button
          onClick={() => setShowTextColor(!showTextColor)}
          className="flex items-center gap-1 p-2 rounded hover:bg-gray-100 transition-colors"
          title="文字颜色"
        >
          <Palette size={18} />
          <div className="w-4 h-1 bg-current rounded" />
        </button>
        {showTextColor && (
          <div className="absolute top-full left-0 mt-1 bg-white border rounded shadow-lg z-30 p-2">
            <div className="grid grid-cols-8 gap-1">
              {textColors.map((color) => (
                <button
                  key={color}
                  onClick={() => handleTextColor(color)}
                  className="w-6 h-6 rounded border"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="relative">
        <button
          onClick={() => setShowBgColor(!showBgColor)}
          className="flex items-center gap-1 p-2 rounded hover:bg-gray-100 transition-colors"
          title="背景颜色"
        >
          <Highlighter size={18} />
        </button>
        {showBgColor && (
          <div className="absolute top-full left-0 mt-1 bg-white border rounded shadow-lg z-30 p-2">
            <div className="grid grid-cols-6 gap-1">
              {bgColors.map((color) => (
                <button
                  key={color}
                  onClick={() => handleBgColor(color)}
                  className="w-6 h-6 rounded border"
                  style={{ backgroundColor: color === 'transparent' ? 'white' : color }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <ToolbarDivider />

      <ToolbarButton
        onClick={() => insertCodeBlock(editor)}
        title="代码块"
      >
        <Code size={18} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => insertTable(editor)}
        title="插入表格"
      >
        <Table size={18} />
      </ToolbarButton>

      <div className="relative">
        <ToolbarButton
          onClick={() => setShowImageInput(!showImageInput)}
          title="插入图片"
        >
          <Image size={18} />
        </ToolbarButton>
        {showImageInput && (
          <div className="absolute top-full left-0 mt-1 bg-white border rounded shadow-lg z-30 p-2 min-w-[300px]">
            <div className="flex gap-2">
              <input
                type="text"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="输入图片URL"
                className="flex-1 px-2 py-1 border rounded text-sm"
              />
              <button
                onClick={handleInsertImage}
                className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
              >
                插入
              </button>
            </div>
          </div>
        )}
      </div>

      <ToolbarButton
        onClick={() => insertVideo(editor, '')}
        title="插入视频"
      >
        <Video size={18} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => insertDivider(editor)}
        title="分割线"
      >
        <Minus size={18} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => insertFormula(editor)}
        title="数学公式"
      >
        <Sigma size={18} />
      </ToolbarButton>

      <ToolbarDivider />

      <ToolbarButton
        onClick={() => (editor as any).undo?.()}
        title="撤销 (Ctrl+Z)"
      >
        <Undo size={18} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => (editor as any).redo?.()}
        title="重做 (Ctrl+Y)"
      >
        <Redo size={18} />
      </ToolbarButton>
    </div>
  )
}
