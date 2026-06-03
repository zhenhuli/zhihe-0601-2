import { useState, useEffect, useRef } from 'react'
import {
  FileText,
  Folder,
  FolderOpen,
  Plus,
  Search,
  Trash2,
  Settings,
  Clock,
  ChevronRight,
  ChevronDown,
  Edit,
  Move,
  Lock,
  Unlock,
  Share2,
  Check,
  X,
} from 'lucide-react'
import { useAppStore } from '@/store'
import type { Folder as FolderType } from '@/types'
import { cn } from '@/utils/cn'

interface SidebarProps {
  onDocumentSelect: (docId: string) => void
  currentDocId?: string | null
}

export const Sidebar = ({ onDocumentSelect, currentDocId }: SidebarProps) => {
  const {
    documents,
    folders,
    addDocument,
    addFolder,
    updateDocument,
    deleteDocument,
    updateFolder,
    deleteFolder,
    currentUser,
  } = useAppStore()

  const [searchQuery, setSearchQuery] = useState('')
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['root']))
  const [activeTab, setActiveTab] = useState<'docs' | 'trash'>('docs')
  const [contextMenu, setContextMenu] = useState<{
    type: 'document' | 'folder'
    id: string
    x: number
    y: number
  } | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [movingId, setMovingId] = useState<string | null>(null)
  const [movingType, setMovingType] = useState<'document' | 'folder' | null>(null)
  const [sharingDocId, setSharingDocId] = useState<string | null>(null)

  const renameInputRef = useRef<HTMLInputElement>(null)

  const trash = useAppStore((s) => s.trash)
  const restoreDocument = useAppStore((s) => s.restoreDocument)
  const permanentDeleteDocument = useAppStore((s) => s.permanentDeleteDocument)

  useEffect(() => {
    if (renamingId && renameInputRef.current) {
      renameInputRef.current.focus()
      renameInputRef.current.select()
    }
  }, [renamingId])

  useEffect(() => {
    const handleClick = () => setContextMenu(null)
    window.addEventListener('click', handleClick)
    return () => window.removeEventListener('click', handleClick)
  }, [])

  const toggleFolder = (folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev)
      if (next.has(folderId)) {
        next.delete(folderId)
      } else {
        next.add(folderId)
      }
      return next
    })
  }

  const handleCreateDocument = () => {
    const newDoc = {
      id: 'doc-' + Date.now(),
      title: '未命名文档',
      content: [
        {
          type: 'paragraph',
          children: [{ text: '' }]
        }
      ],
      folderId: 'root',
      isEncrypted: false,
      permissions: [{
        userId: currentUser.id,
        userName: currentUser.name,
        permission: 'manage' as const
      }],
      isPublic: false,
      publicPermission: 'readonly' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: currentUser.id,
      isDeleted: false
    }
    addDocument(newDoc)
    onDocumentSelect(newDoc.id)
  }

  const handleCreateFolder = () => {
    const newFolder = {
      id: 'folder-' + Date.now(),
      name: '新建文件夹',
      parentId: 'root',
      createdAt: new Date()
    }
    addFolder(newFolder)
    setRenamingId(newFolder.id)
    setRenameValue(newFolder.name)
  }

  const handleContextMenu = (
    e: React.MouseEvent,
    type: 'document' | 'folder',
    id: string
  ) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ type, id, x: e.clientX, y: e.clientY })
  }

  const handleStartRename = (id: string, currentName: string) => {
    setRenamingId(id)
    setRenameValue(currentName)
    setContextMenu(null)
  }

  const handleFinishRename = () => {
    if (!renamingId || !renameValue.trim()) {
      setRenamingId(null)
      return
    }

    const doc = documents.find(d => d.id === renamingId)
    if (doc) {
      updateDocument(renamingId, { title: renameValue.trim() })
    } else {
      const folder = folders.find(f => f.id === renamingId)
      if (folder) {
        updateFolder(renamingId, { name: renameValue.trim() })
      }
    }
    setRenamingId(null)
  }

  const handleDeleteDocument = (docId: string) => {
    deleteDocument(docId)
    setContextMenu(null)
  }

  const handleToggleEncrypt = (docId: string) => {
    const doc = documents.find(d => d.id === docId)
    if (doc) {
      updateDocument(docId, { isEncrypted: !doc.isEncrypted })
    }
    setContextMenu(null)
  }

  const handleMoveToFolder = (targetFolderId: string) => {
    if (movingType === 'document') {
      updateDocument(movingId!, { folderId: targetFolderId })
    } else if (movingType === 'folder') {
      if (movingId !== targetFolderId) {
        updateFolder(movingId!, { parentId: targetFolderId })
      }
    }
    setMovingId(null)
    setMovingType(null)
    setContextMenu(null)
  }

  const handleStartMove = (id: string, type: 'document' | 'folder') => {
    setMovingId(id)
    setMovingType(type)
    setContextMenu(null)
  }

  const handleDeleteFolder = (folderId: string) => {
    if (folderId === 'root') return
    documents
      .filter(doc => doc.folderId === folderId)
      .forEach(doc => deleteDocument(doc.id))
    folders
      .filter(f => f.parentId === folderId)
      .forEach(f => deleteFolder(f.id))
    deleteFolder(folderId)
    setContextMenu(null)
  }

  const filteredDocs = documents.filter(doc =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const renderFolder = (folder: FolderType, level: number = 0) => {
    const isExpanded = expandedFolders.has(folder.id)
    const folderDocs = filteredDocs.filter(doc => doc.folderId === folder.id)
    const childFolders = folders.filter(f => f.parentId === folder.id)
    const isRenaming = renamingId === folder.id

    return (
      <div key={folder.id}>
        <div
          className={cn(
            'flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-gray-100 transition-colors',
            movingId === folder.id && 'bg-blue-50'
          )}
          style={{ paddingLeft: `${level * 16 + 8}px` }}
          onClick={() => toggleFolder(folder.id)}
          onContextMenu={(e) => handleContextMenu(e, 'folder', folder.id)}
        >
          {isExpanded ? (
            <ChevronDown size={16} className="text-gray-500" />
          ) : (
            <ChevronRight size={16} className="text-gray-500" />
          )}
          {isExpanded ? (
            <FolderOpen size={18} className="text-yellow-500" />
          ) : (
            <Folder size={18} className="text-yellow-500" />
          )}
          {isRenaming ? (
            <div className="flex items-center gap-1 flex-1 min-w-0">
              <input
                ref={renameInputRef}
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleFinishRename()
                  if (e.key === 'Escape') setRenamingId(null)
                }}
                onBlur={handleFinishRename}
                className="flex-1 px-1 py-0.5 border border-blue-400 rounded text-sm outline-none min-w-0"
                onClick={(e) => e.stopPropagation()}
              />
              <button
                onClick={(e) => { e.stopPropagation(); handleFinishRename() }}
                className="p-0.5 hover:bg-gray-200 rounded"
              >
                <Check size={12} className="text-green-600" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setRenamingId(null) }}
                className="p-0.5 hover:bg-gray-200 rounded"
              >
                <X size={12} className="text-red-500" />
              </button>
            </div>
          ) : (
            <span className="text-sm font-medium truncate">{folder.name}</span>
          )}
        </div>
        {isExpanded && (
          <>
            {childFolders.map(f => renderFolder(f, level + 1))}
            {folderDocs.map(doc => {
              const isDocRenaming = renamingId === doc.id
              return (
                <div
                  key={doc.id}
                  className={cn(
                    'flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-gray-100 transition-colors',
                    currentDocId === doc.id && 'bg-blue-50 text-blue-600'
                  )}
                  style={{ paddingLeft: `${(level + 1) * 16 + 8}px` }}
                  onClick={() => onDocumentSelect(doc.id)}
                  onContextMenu={(e) => handleContextMenu(e, 'document', doc.id)}
                >
                  <FileText size={16} className="text-gray-400" />
                  {isDocRenaming ? (
                    <div className="flex items-center gap-1 flex-1 min-w-0">
                      <input
                        ref={renameInputRef}
                        type="text"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleFinishRename()
                          if (e.key === 'Escape') setRenamingId(null)
                        }}
                        onBlur={handleFinishRename}
                        className="flex-1 px-1 py-0.5 border border-blue-400 rounded text-sm outline-none min-w-0"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <button
                        onClick={(e) => { e.stopPropagation(); handleFinishRename() }}
                        className="p-0.5 hover:bg-gray-200 rounded"
                      >
                        <Check size={12} className="text-green-600" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setRenamingId(null) }}
                        className="p-0.5 hover:bg-gray-200 rounded"
                      >
                        <X size={12} className="text-red-500" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="text-sm truncate flex-1">{doc.title}</span>
                      {doc.isEncrypted && <Lock size={12} className="text-gray-400" />}
                    </>
                  )}
                </div>
              )
            })}
          </>
        )}
      </div>
    )
  }

  const currentContextDoc = contextMenu?.type === 'document'
    ? documents.find(d => d.id === contextMenu.id)
    : null

  const currentContextFolder = contextMenu?.type === 'folder'
    ? folders.find(f => f.id === contextMenu.id)
    : null

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-full">
      <div className="p-4 border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-800 mb-4">协同文档</h1>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="搜索文档..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="p-2 border-b border-gray-200">
        <button
          onClick={handleCreateDocument}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
        >
          <Plus size={16} />
          新建文档
        </button>
        <button
          onClick={handleCreateFolder}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 mt-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
        >
          <Folder size={16} />
          新建文件夹
        </button>
      </div>

      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('docs')}
          className={cn(
            'flex-1 px-4 py-2 text-sm font-medium transition-colors',
            activeTab === 'docs' && 'border-b-2 border-blue-500 text-blue-600'
          )}
        >
          文档
        </button>
        <button
          onClick={() => setActiveTab('trash')}
          className={cn(
            'flex-1 px-4 py-2 text-sm font-medium transition-colors',
            activeTab === 'trash' && 'border-b-2 border-blue-500 text-blue-600'
          )}
        >
          回收站
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {activeTab === 'docs' ? (
          <>
            {folders
              .filter(f => f.parentId === null)
              .map(folder => renderFolder(folder))}
          </>
        ) : (
          <div className="space-y-1">
            {trash.map(doc => (
              <div
                key={doc.id}
                className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-gray-100 transition-colors"
              >
                <FileText size={16} className="text-gray-400" />
                <span className="text-sm truncate flex-1">{doc.title}</span>
                <button
                  onClick={() => restoreDocument(doc.id)}
                  className="p-1 hover:bg-gray-200 rounded text-xs"
                  title="恢复"
                >
                  <Clock size={14} />
                </button>
                <button
                  onClick={() => permanentDeleteDocument(doc.id)}
                  className="p-1 hover:bg-gray-200 rounded text-xs text-red-400"
                  title="永久删除"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            {trash.length === 0 && (
              <p className="text-gray-400 text-sm text-center py-4">回收站为空</p>
            )}
          </div>
        )}
      </div>

      {contextMenu && (
        <div
          className="fixed bg-white border rounded-lg shadow-lg py-1 z-50 min-w-[160px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.type === 'document' && currentContextDoc && (
            <>
              <button
                className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100"
                onClick={() => handleStartRename(contextMenu.id, currentContextDoc.title)}
              >
                <Edit size={14} />
                重命名
              </button>
              <button
                className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100"
                onClick={() => handleStartMove(contextMenu.id, 'document')}
              >
                <Move size={14} />
                移动到
              </button>
              <button
                className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100"
                onClick={() => { setSharingDocId(contextMenu.id); setContextMenu(null) }}
              >
                <Share2 size={14} />
                分享设置
              </button>
              <button
                className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100"
                onClick={() => handleToggleEncrypt(contextMenu.id)}
              >
                {currentContextDoc.isEncrypted ? <Unlock size={14} /> : <Lock size={14} />}
                {currentContextDoc.isEncrypted ? '取消加密' : '加密文档'}
              </button>
              <hr className="my-1" />
              <button
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-500 hover:bg-red-50"
                onClick={() => handleDeleteDocument(contextMenu.id)}
              >
                <Trash2 size={14} />
                删除
              </button>
            </>
          )}

          {contextMenu.type === 'folder' && currentContextFolder && (
            <>
              {currentContextFolder.id !== 'root' && (
                <>
                  <button
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100"
                    onClick={() => handleStartRename(contextMenu.id, currentContextFolder.name)}
                  >
                    <Edit size={14} />
                    重命名
                  </button>
                  <button
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100"
                    onClick={() => handleStartMove(contextMenu.id, 'folder')}
                  >
                    <Move size={14} />
                    移动到
                  </button>
                  <hr className="my-1" />
                  <button
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-500 hover:bg-red-50"
                    onClick={() => handleDeleteFolder(contextMenu.id)}
                  >
                    <Trash2 size={14} />
                    删除文件夹
                  </button>
                </>
              )}
              {currentContextFolder.id === 'root' && (
                <button
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100"
                  onClick={() => { handleCreateDocument(); setContextMenu(null) }}
                >
                  <Plus size={14} />
                  新建文档
                </button>
              )}
            </>
          )}
        </div>
      )}

      {sharingDocId && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center" onClick={() => setSharingDocId(null)}>
          <div className="bg-white rounded-lg shadow-xl p-5 w-[360px]" onClick={(e) => e.stopPropagation()}>
            {(() => {
              const doc = documents.find(d => d.id === sharingDocId)
              if (!doc) return null
              return (
                <>
                  <h3 className="text-base font-semibold text-gray-800 mb-4">分享设置 - {doc.title}</h3>

                  <div className="mb-4">
                    <label className="text-sm font-medium text-gray-700 mb-2 block">公开访问</label>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => updateDocument(sharingDocId, { isPublic: true })}
                        className={cn(
                          'px-3 py-1.5 rounded text-sm',
                          doc.isPublic ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'
                        )}
                      >
                        公开
                      </button>
                      <button
                        onClick={() => updateDocument(sharingDocId, { isPublic: false })}
                        className={cn(
                          'px-3 py-1.5 rounded text-sm',
                          !doc.isPublic ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'
                        )}
                      >
                        私有
                      </button>
                    </div>
                  </div>

                  {doc.isPublic && (
                    <div className="mb-4">
                      <label className="text-sm font-medium text-gray-700 mb-2 block">公开权限</label>
                      <select
                        value={doc.publicPermission}
                        onChange={(e) => updateDocument(sharingDocId, { publicPermission: e.target.value as any })}
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                      >
                        <option value="readonly">只读</option>
                        <option value="edit">可编辑</option>
                        <option value="manage">可管理</option>
                      </select>
                    </div>
                  )}

                  <div className="mb-4">
                    <label className="text-sm font-medium text-gray-700 mb-2 block">用户权限</label>
                    {doc.permissions.map((p, idx) => (
                      <div key={idx} className="flex items-center gap-2 mb-2">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs"
                          style={{ backgroundColor: '#6B7280' }}
                        >
                          {p.userName.charAt(0)}
                        </div>
                        <span className="text-sm flex-1">{p.userName}</span>
                        <select
                          value={p.permission}
                          onChange={(e) => {
                            const newPermissions = [...doc.permissions]
                            newPermissions[idx] = { ...newPermissions[idx], permission: e.target.value as any }
                            updateDocument(sharingDocId, { permissions: newPermissions })
                          }}
                          className="px-2 py-1 border rounded text-xs"
                        >
                          <option value="readonly">只读</option>
                          <option value="edit">可编辑</option>
                          <option value="manage">可管理</option>
                        </select>
                      </div>
                    ))}
                    <div className="flex gap-2 mt-2">
                      <input
                        type="text"
                        placeholder="输入用户名添加"
                        className="flex-1 px-2 py-1 border rounded text-sm"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const input = e.currentTarget
                            const name = input.value.trim()
                            if (name) {
                              const newPermissions = [...doc.permissions, {
                                userId: 'user-' + Date.now(),
                                userName: name,
                                permission: 'edit' as const
                              }]
                              updateDocument(sharingDocId, { permissions: newPermissions })
                              input.value = ''
                            }
                          }
                        }}
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => setSharingDocId(null)}
                    className="w-full py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600"
                  >
                    完成
                  </button>
                </>
              )
            })()}
          </div>
        </div>
      )}

      {movingId && (() => {
        const movingItemName = movingType === 'document'
          ? documents.find(d => d.id === movingId)?.title
          : folders.find(f => f.id === movingId)?.name

        const renderFolderTree = (parentId: string | null, level: number = 0): React.ReactNode[] => {
          return folders
            .filter(f => f.parentId === parentId)
            .flatMap(f => {
              const isSelf = f.id === movingId
              return [
                <button
                  key={f.id}
                  disabled={isSelf}
                  onClick={() => handleMoveToFolder(f.id)}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors text-left',
                    isSelf
                      ? 'opacity-40 cursor-not-allowed'
                      : 'hover:bg-blue-50 hover:text-blue-600'
                  )}
                  style={{ paddingLeft: `${level * 20 + 12}px` }}
                >
                  <Folder size={16} className="text-yellow-500 flex-shrink-0" />
                  <span className="truncate">{f.name}</span>
                  {isSelf && <span className="text-xs text-gray-400 ml-auto">当前位置</span>}
                </button>,
                ...renderFolderTree(f.id, level + 1)
              ]
            })
        }

        return (
          <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center" onClick={() => { setMovingId(null); setMovingType(null) }}>
            <div className="bg-white rounded-lg shadow-xl w-[360px] max-h-[480px] flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="px-5 pt-5 pb-3">
                <h3 className="text-base font-semibold text-gray-800">移动到文件夹</h3>
                <p className="text-sm text-gray-500 mt-1">将「{movingItemName}」移动到：</p>
              </div>
              <div className="flex-1 overflow-y-auto px-3 pb-3">
                {renderFolderTree(null)}
              </div>
              <div className="px-5 py-3 border-t border-gray-100">
                <button
                  onClick={() => { setMovingId(null); setMovingType(null) }}
                  className="w-full py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      <div className="p-3 border-t border-gray-200">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
            style={{ backgroundColor: currentUser.color }}
          >
            {currentUser.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{currentUser.name}</p>
            <p className="text-xs text-gray-500">在线</p>
          </div>
          <button className="p-1 hover:bg-gray-100 rounded">
            <Settings size={16} className="text-gray-500" />
          </button>
        </div>
      </div>
    </div>
  )
}
