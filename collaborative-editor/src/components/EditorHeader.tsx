import { useState, useRef } from 'react'
import {
  Save,
  Share2,
  Download,
  History,
  Settings,
  Cloud,
  CloudOff,
  FileText,
  FileImage,
  FileCode,
} from 'lucide-react'
import { useAppStore } from '@/store'
import { cn } from '@/utils/cn'
import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'
import { saveAs } from 'file-saver'

interface EditorHeaderProps {
  documentId: string
  title: string
  onTitleChange: (title: string) => void
  onSave: () => void
  onShowHistory: () => void
  onShowSettings: () => void
  isSaving: boolean
  isOnline: boolean
}

export const EditorHeader = ({
  documentId,
  title,
  onTitleChange,
  onSave,
  onShowHistory,
  onShowSettings,
  isSaving,
  isOnline,
}: EditorHeaderProps) => {
  const { currentUser, documents } = useAppStore()
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [showShareMenu, setShowShareMenu] = useState(false)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const titleInputRef = useRef<HTMLInputElement>(null)

  const doc = documents.find(d => d.id === documentId)
  const collaborators = doc?.permissions || []

  const userColors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
  ]

  const handleExportPDF = async () => {
    const editorElement = document.querySelector('.slate-editor')
    if (!editorElement) return

    try {
      const canvas = await html2canvas(editorElement as HTMLElement, {
        scale: 2,
        useCORS: true,
      })
      
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()
      const imgWidth = canvas.width
      const imgHeight = canvas.height
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight)
      const imgX = (pdfWidth - imgWidth * ratio) / 2
      const imgY = 10

      pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio)
      pdf.save(`${title}.pdf`)
    } catch (error) {
      console.error('PDF export failed:', error)
    }
    setShowExportMenu(false)
  }

  const handleExportWord = () => {
    const editorElement = document.querySelector('.slate-editor')
    if (!editorElement) return

    const htmlContent = (editorElement as HTMLElement).innerHTML
    const blob = new Blob([`
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><title>${title}</title></head>
      <body>${htmlContent}</body>
      </html>
    `], { type: 'application/msword' })
    saveAs(blob, `${title}.doc`)
    setShowExportMenu(false)
  }

  const handleExportPNG = async () => {
    const editorElement = document.querySelector('.slate-editor')
    if (!editorElement) return

    try {
      const canvas = await html2canvas(editorElement as HTMLElement, {
        scale: 2,
        useCORS: true,
      })
      canvas.toBlob((blob) => {
        if (blob) saveAs(blob, `${title}.png`)
      })
    } catch (error) {
      console.error('PNG export failed:', error)
    }
    setShowExportMenu(false)
  }

  const handleExportText = () => {
    const editorElement = document.querySelector('.slate-editor')
    if (!editorElement) return

    const text = (editorElement as HTMLElement).innerText
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    saveAs(blob, `${title}.txt`)
    setShowExportMenu(false)
  }

  return (
    <div className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          {isEditingTitle ? (
            <input
              ref={titleInputRef}
              type="text"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              onBlur={() => setIsEditingTitle(false)}
              onKeyDown={(e) => e.key === 'Enter' && setIsEditingTitle(false)}
              className="text-lg font-semibold px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          ) : (
            <h1
              className="text-lg font-semibold cursor-pointer hover:bg-gray-100 px-2 py-1 rounded"
              onClick={() => setIsEditingTitle(true)}
            >
              {title || '未命名文档'}
            </h1>
          )}
        </div>
        <div className="flex items-center gap-1 text-sm text-gray-500">
          {isOnline ? (
            <>
              <Cloud size={14} className="text-green-500" />
              <span>{isSaving ? '保存中...' : '已保存'}</span>
            </>
          ) : (
            <>
              <CloudOff size={14} className="text-orange-500" />
              <span>离线 (本地缓存)</span>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex -space-x-2 mr-2">
          {collaborators.slice(0, 5).map((collab, index) => (
            <div
              key={collab.userId}
              className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-medium border-2 border-white",
                collab.userId === currentUser.id && "ring-2 ring-blue-500"
              )}
              style={{ backgroundColor: userColors[index % userColors.length] }}
              title={collab.userName}
            >
              {collab.userName.charAt(0)}
            </div>
          ))}
          {collaborators.length > 5 && (
            <div className="w-7 h-7 rounded-full bg-gray-300 flex items-center justify-center text-xs font-medium border-2 border-white">
              +{collaborators.length - 5}
            </div>
          )}
        </div>

        <button
          onClick={onSave}
          className="flex items-center gap-2 px-3 py-1.5 rounded hover:bg-gray-100 text-sm transition-colors"
          title="保存"
        >
          <Save size={16} />
          保存
        </button>

        <div className="relative">
          <button
            onClick={() => setShowShareMenu(!showShareMenu)}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm transition-colors"
          >
            <Share2 size={16} />
            分享
          </button>
          {showShareMenu && (
            <div className="absolute right-0 top-full mt-2 bg-white border rounded-lg shadow-lg py-2 z-50 min-w-[250px]">
              <div className="px-4 py-2 border-b">
                <p className="text-sm font-medium">分享设置</p>
              </div>
              <div className="px-4 py-2">
                <label className="flex items-center justify-between">
                  <span className="text-sm">公开访问</span>
                  <input type="checkbox" className="rounded" />
                </label>
              </div>
              <div className="px-4 py-2">
                <p className="text-sm font-medium mb-2">添加协作者</p>
                <div className="flex gap-2">
                  <input
                    type="email"
                    placeholder="输入邮箱"
                    className="flex-1 px-2 py-1 border rounded text-sm"
                  />
                  <button className="px-3 py-1 bg-blue-500 text-white rounded text-sm">
                    添加
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="flex items-center gap-2 px-3 py-1.5 rounded hover:bg-gray-100 text-sm transition-colors"
          >
            <Download size={16} />
            导出
          </button>
          {showExportMenu && (
            <div className="absolute right-0 top-full mt-2 bg-white border rounded-lg shadow-lg py-1 z-50 min-w-[180px]">
              <button
                onClick={handleExportPDF}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100"
              >
                <FileText size={16} className="text-red-500" />
                导出为 PDF
              </button>
              <button
                onClick={handleExportWord}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100"
              >
                <FileText size={16} className="text-blue-500" />
                导出为 Word
              </button>
              <button
                onClick={handleExportPNG}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100"
              >
                <FileImage size={16} className="text-green-500" />
                导出为 PNG
              </button>
              <button
                onClick={handleExportText}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100"
              >
                <FileCode size={16} className="text-gray-500" />
                导出为纯文本
              </button>
            </div>
          )}
        </div>

        <button
          onClick={onShowHistory}
          className="p-2 rounded hover:bg-gray-100 transition-colors"
          title="历史版本"
        >
          <History size={16} />
        </button>

        <button
          onClick={onShowSettings}
          className="p-2 rounded hover:bg-gray-100 transition-colors"
          title="设置"
        >
          <Settings size={16} />
        </button>
      </div>
    </div>
  )
}
