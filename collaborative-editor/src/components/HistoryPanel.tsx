import { useState } from 'react'
import {
  X,
  Clock,
  RotateCcw,
  Eye,
  Save,
  Calendar,
  User,
  ChevronRight,
} from 'lucide-react'
import { useAppStore } from '@/store'
import { cn } from '@/utils/cn'
import type { Version } from '@/types'

interface HistoryPanelProps {
  documentId: string
  onClose: () => void
  onRestoreVersion: (version: Version) => void
}

export const HistoryPanel = ({
  documentId,
  onClose,
  onRestoreVersion,
}: HistoryPanelProps) => {
  const { versions, currentUser, addVersion } = useAppStore()
  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null)
  const [showPreview, setShowPreview] = useState(false)

  const docVersions = versions
    .filter(v => v.documentId === documentId)
    .sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime())

  const handleSaveVersion = () => {
    const newVersion: Version = {
      id: 'version-' + Date.now(),
      documentId,
      content: [],
      title: '',
      savedBy: currentUser.id,
      savedAt: new Date(),
      isAuto: false,
      description: '手动保存版本'
    }
    addVersion(newVersion)
  }

  const formatDate = (date: Date | string) => {
    const d = new Date(date)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (hours < 1) return '刚刚'
    if (hours < 24) return `${hours}小时前`
    if (days < 7) return `${days}天前`
    return d.toLocaleDateString('zh-CN')
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative ml-auto w-96 bg-white shadow-xl flex flex-col h-full">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">历史版本</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4 border-b">
          <button
            onClick={handleSaveVersion}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <Save size={18} />
            保存当前版本
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {docVersions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <Clock size={48} className="mb-4" />
              <p>暂无历史版本</p>
              <p className="text-sm mt-2">系统每5分钟自动保存一次</p>
            </div>
          ) : (
            <div className="divide-y">
              {docVersions.map((version) => (
                <div
                  key={version.id}
                  className={cn(
                    'p-4 hover:bg-gray-50 cursor-pointer transition-colors',
                    selectedVersion?.id === version.id && 'bg-blue-50'
                  )}
                  onClick={() => setSelectedVersion(version)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        'px-2 py-0.5 text-xs rounded',
                        version.isAuto
                          ? 'bg-gray-100 text-gray-600'
                          : 'bg-blue-100 text-blue-600'
                      )}>
                        {version.isAuto ? '自动保存' : '手动保存'}
                      </span>
                      <span className="text-sm text-gray-500">
                        {formatDate(version.savedAt)}
                      </span>
                    </div>
                    <ChevronRight size={16} className="text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-700 truncate">
                    {version.description || '未命名版本'}
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <User size={12} />
                      {version.savedBy}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar size={12} />
                      {new Date(version.savedAt).toLocaleString('zh-CN')}
                    </span>
                  </div>

                  {selectedVersion?.id === version.id && (
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setShowPreview(true)
                        }}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 border rounded text-sm hover:bg-gray-50"
                      >
                        <Eye size={14} />
                        查看
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onRestoreVersion(version)
                        }}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                      >
                        <RotateCcw size={14} />
                        恢复
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showPreview && selectedVersion && (
        <div className="fixed inset-0 z-60 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowPreview(false)} />
          <div className="relative w-4/5 max-w-4xl h-4/5 bg-white rounded-lg shadow-2xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold">版本预览 - {selectedVersion.description || '未命名'}</h3>
              <button
                onClick={() => setShowPreview(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-8 bg-gray-50">
              <div className="bg-white p-8 shadow rounded max-w-3xl mx-auto">
                <div className="text-gray-400 text-center py-12">
                  版本内容预览区域
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-4 border-t">
              <button
                onClick={() => setShowPreview(false)}
                className="px-4 py-2 border rounded hover:bg-gray-50"
              >
                关闭
              </button>
              <button
                onClick={() => {
                  onRestoreVersion(selectedVersion)
                  setShowPreview(false)
                }}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                恢复此版本
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
