import { useState } from 'react'
import {
  X,
  Type,
  Minus,
  Square,
  Eye,
  Moon,
  Sun,
} from 'lucide-react'
import { useAppStore } from '@/store'
import { cn } from '@/utils/cn'

interface SettingsPanelProps {
  onClose: () => void
}

export const SettingsPanel = ({ onClose }: SettingsPanelProps) => {
  const { editorSettings, shortcuts, updateEditorSettings, updateShortcut } = useAppStore()
  const [activeTab, setActiveTab] = useState<'editor' | 'shortcuts'>('editor')
  const [editingShortcut, setEditingShortcut] = useState<string | null>(null)
  const [recordingKeys, setRecordingKeys] = useState<string[]>([])

  const fontSizes = [12, 14, 16, 18, 20, 24, 28, 32]
  const lineHeights = [1.0, 1.2, 1.4, 1.6, 1.8, 2.0]
  const pageMargins = [20, 30, 40, 50, 60, 80, 100]

  const handleShortcutKeyDown = (e: React.KeyboardEvent, shortcutId: string) => {
    e.preventDefault()
    
    const keys: string[] = []
    if (e.ctrlKey) keys.push('Ctrl')
    if (e.metaKey) keys.push('Cmd')
    if (e.altKey) keys.push('Alt')
    if (e.shiftKey) keys.push('Shift')
    
    if (!['Control', 'Meta', 'Alt', 'Shift'].includes(e.key)) {
      keys.push(e.key.toUpperCase())
    }
    
    setRecordingKeys(keys)
    
    if (keys.length > 0 && !['Control', 'Meta', 'Alt', 'Shift'].includes(e.key)) {
      const keyString = keys.join('+')
      updateShortcut(shortcutId, keyString)
      setEditingShortcut(null)
      setRecordingKeys([])
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative ml-auto w-[480px] bg-white shadow-xl flex flex-col h-full">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">设置</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('editor')}
            className={cn(
              'flex-1 px-4 py-3 text-sm font-medium transition-colors',
              activeTab === 'editor' && 'border-b-2 border-blue-500 text-blue-600'
            )}
          >
            编辑器
          </button>
          <button
            onClick={() => setActiveTab('shortcuts')}
            className={cn(
              'flex-1 px-4 py-3 text-sm font-medium transition-colors',
              activeTab === 'shortcuts' && 'border-b-2 border-blue-500 text-blue-600'
            )}
          >
            快捷键
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'editor' && (
            <div className="space-y-6">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium mb-3">
                  <Type size={16} />
                  字号
                </label>
                <div className="flex flex-wrap gap-2">
                  {fontSizes.map((size) => (
                    <button
                      key={size}
                      onClick={() => updateEditorSettings({ fontSize: size })}
                      className={cn(
                        'px-3 py-1.5 rounded border text-sm transition-colors',
                        editorSettings.fontSize === size
                          ? 'bg-blue-500 text-white border-blue-500'
                          : 'hover:bg-gray-100'
                      )}
                    >
                      {size}px
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium mb-3">
                  <Minus size={16} />
                  行高
                </label>
                <div className="flex flex-wrap gap-2">
                  {lineHeights.map((height) => (
                    <button
                      key={height}
                      onClick={() => updateEditorSettings({ lineHeight: height })}
                      className={cn(
                        'px-3 py-1.5 rounded border text-sm transition-colors',
                        editorSettings.lineHeight === height
                          ? 'bg-blue-500 text-white border-blue-500'
                          : 'hover:bg-gray-100'
                      )}
                    >
                      {height}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium mb-3">
                  <Square size={16} />
                  页边距
                </label>
                <div className="flex flex-wrap gap-2">
                  {pageMargins.map((margin) => (
                    <button
                      key={margin}
                      onClick={() => updateEditorSettings({ pageMargin: margin })}
                      className={cn(
                        'px-3 py-1.5 rounded border text-sm transition-colors',
                        editorSettings.pageMargin === margin
                          ? 'bg-blue-500 text-white border-blue-500'
                          : 'hover:bg-gray-100'
                      )}
                    >
                      {margin}px
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium mb-3">
                  <Eye size={16} />
                  主题
                </label>
                <div className="flex gap-3">
                  <button
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded border bg-blue-500 text-white border-blue-500"
                  >
                    <Sun size={18} />
                    浅色
                  </button>
                  <button
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded border hover:bg-gray-100"
                  >
                    <Moon size={18} />
                    深色
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'shortcuts' && (
            <div className="space-y-2">
              {shortcuts.map((shortcut) => (
                <div
                  key={shortcut.id}
                  className="flex items-center justify-between py-3 border-b last:border-0"
                >
                  <span className="text-sm">{shortcut.name}</span>
                  {editingShortcut === shortcut.id ? (
                    <input
                      type="text"
                      value={recordingKeys.join('+')}
                      placeholder="按下快捷键..."
                      className="px-2 py-1 border rounded text-sm text-center w-32 bg-gray-50"
                      onKeyDown={(e) => handleShortcutKeyDown(e, shortcut.id)}
                      onBlur={() => {
                        setEditingShortcut(null)
                        setRecordingKeys([])
                      }}
                      autoFocus
                    />
                  ) : (
                    <button
                      onClick={() => setEditingShortcut(shortcut.id)}
                      className="px-3 py-1 bg-gray-100 rounded text-sm font-mono hover:bg-gray-200 transition-colors"
                    >
                      {shortcut.keys}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  )
}
