import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Document, Folder, User, Version, EditorSettings, Shortcut, PermissionType } from '@/types'

interface AppState {
  currentUser: User
  documents: Document[]
  folders: Folder[]
  versions: Version[]
  currentDocumentId: string | null
  editorSettings: EditorSettings
  shortcuts: Shortcut[]
  trash: Document[]
  
  setCurrentDocument: (id: string | null) => void
  addDocument: (doc: Document) => void
  updateDocument: (id: string, updates: Partial<Document>) => void
  deleteDocument: (id: string) => void
  restoreDocument: (id: string) => void
  permanentDeleteDocument: (id: string) => void
  addFolder: (folder: Folder) => void
  updateFolder: (id: string, updates: Partial<Folder>) => void
  deleteFolder: (id: string) => void
  addVersion: (version: Version) => void
  updateEditorSettings: (settings: Partial<EditorSettings>) => void
  updateShortcut: (id: string, keys: string) => void
}

const userColors = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
]

const initialUser: User = {
  id: 'user-' + Math.random().toString(36).substr(2, 9),
  name: '用户' + Math.floor(Math.random() * 1000),
  avatar: '',
  color: userColors[Math.floor(Math.random() * userColors.length)]
}

const initialShortcuts: Shortcut[] = [
  { id: 'bold', name: '加粗', keys: 'Ctrl+B', action: 'bold' },
  { id: 'italic', name: '斜体', keys: 'Ctrl+I', action: 'italic' },
  { id: 'underline', name: '下划线', keys: 'Ctrl+U', action: 'underline' },
  { id: 'strikethrough', name: '删除线', keys: 'Ctrl+Shift+S', action: 'strikethrough' },
  { id: 'heading1', name: '一级标题', keys: 'Ctrl+Alt+1', action: 'heading1' },
  { id: 'heading2', name: '二级标题', keys: 'Ctrl+Alt+2', action: 'heading2' },
  { id: 'heading3', name: '三级标题', keys: 'Ctrl+Alt+3', action: 'heading3' },
  { id: 'save', name: '保存', keys: 'Ctrl+S', action: 'save' },
  { id: 'undo', name: '撤销', keys: 'Ctrl+Z', action: 'undo' },
  { id: 'redo', name: '重做', keys: 'Ctrl+Y', action: 'redo' },
]

const createSampleDocument = (): Document => ({
  id: 'doc-' + Date.now(),
  title: '欢迎使用协同文档编辑器',
  content: [
    {
      type: 'heading-one',
      children: [{ text: '欢迎使用协同文档编辑器' }]
    },
    {
      type: 'paragraph',
      children: [{ text: '这是一个功能完善的在线协同富文本编辑器，支持多人实时协作编辑。' }]
    },
    {
      type: 'heading-two',
      children: [{ text: '主要功能' }]
    },
    {
      type: 'bulleted-list',
      children: [
        { type: 'list-item', children: [{ text: '多级标题和文本格式化' }] },
        { type: 'list-item', children: [{ text: '表格插入与编辑' }] },
        { type: 'list-item', children: [{ text: '图片拖拽上传' }] },
        { type: 'list-item', children: [{ text: '代码块语法高亮' }] },
        { type: 'list-item', children: [{ text: '数学公式编辑' }] },
        { type: 'list-item', children: [{ text: '多人实时协同编辑' }] },
      ]
    },
    {
      type: 'paragraph',
      children: [{ text: '' }]
    }
  ],
  folderId: 'root',
  isEncrypted: false,
  permissions: [{
    userId: initialUser.id,
    userName: initialUser.name,
    permission: 'manage' as PermissionType
  }],
  isPublic: false,
  publicPermission: 'readonly' as PermissionType,
  createdAt: new Date(),
  updatedAt: new Date(),
  createdBy: initialUser.id,
  isDeleted: false
})

const initialFolders: Folder[] = [
  { id: 'root', name: '我的文档', parentId: null, createdAt: new Date() },
  { id: 'folder-1', name: '工作文档', parentId: 'root', createdAt: new Date() },
  { id: 'folder-2', name: '个人文档', parentId: 'root', createdAt: new Date() },
]

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      currentUser: initialUser,
      documents: [createSampleDocument()],
      folders: initialFolders,
      versions: [],
      currentDocumentId: null,
      editorSettings: {
        fontSize: 16,
        lineHeight: 1.6,
        pageMargin: 40
      },
      shortcuts: initialShortcuts,
      trash: [],
      
      setCurrentDocument: (id) => set({ currentDocumentId: id }),
      
      addDocument: (doc) => set((state) => ({
        documents: [...state.documents, doc]
      })),
      
      updateDocument: (id, updates) => set((state) => ({
        documents: state.documents.map(doc => 
          doc.id === id ? { ...doc, ...updates, updatedAt: new Date() } : doc
        )
      })),
      
      deleteDocument: (id) => set((state) => {
        const doc = state.documents.find(d => d.id === id)
        if (!doc) return state
        return {
          documents: state.documents.filter(d => d.id !== id),
          trash: [...state.trash, { ...doc, isDeleted: true, deletedAt: new Date() }]
        }
      }),
      
      restoreDocument: (id) => set((state) => {
        const doc = state.trash.find(d => d.id === id)
        if (!doc) return state
        return {
          trash: state.trash.filter(d => d.id !== id),
          documents: [...state.documents, { ...doc, isDeleted: false, deletedAt: undefined }]
        }
      }),
      
      permanentDeleteDocument: (id) => set((state) => ({
        trash: state.trash.filter(d => d.id !== id)
      })),
      
      addFolder: (folder) => set((state) => ({
        folders: [...state.folders, folder]
      })),
      
      updateFolder: (id, updates) => set((state) => ({
        folders: state.folders.map(f => 
          f.id === id ? { ...f, ...updates } : f
        )
      })),
      
      deleteFolder: (id) => set((state) => ({
        folders: state.folders.filter(f => f.id !== id)
      })),
      
      addVersion: (version) => set((state) => ({
        versions: [...state.versions, version]
      })),
      
      updateEditorSettings: (settings) => set((state) => ({
        editorSettings: { ...state.editorSettings, ...settings }
      })),
      
      updateShortcut: (id, keys) => set((state) => ({
        shortcuts: state.shortcuts.map(s => 
          s.id === id ? { ...s, keys } : s
        )
      }))
    }),
    {
      name: 'collaborative-editor-storage',
      partialize: (state) => ({
        documents: state.documents,
        folders: state.folders,
        versions: state.versions,
        editorSettings: state.editorSettings,
        shortcuts: state.shortcuts,
        trash: state.trash
      })
    }
  )
)
