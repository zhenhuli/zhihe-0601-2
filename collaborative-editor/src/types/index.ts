export interface User {
  id: string
  name: string
  avatar: string
  color: string
}

export type PermissionType = 'readonly' | 'edit' | 'manage'

export interface DocumentPermission {
  userId: string
  userName: string
  permission: PermissionType
}

export interface Document {
  id: string
  title: string
  content: any[]
  folderId: string
  isEncrypted: boolean
  password?: string
  permissions: DocumentPermission[]
  isPublic: boolean
  publicPermission: PermissionType
  createdAt: Date
  updatedAt: Date
  createdBy: string
  isDeleted: boolean
  deletedAt?: Date
}

export interface Version {
  id: string
  documentId: string
  content: any[]
  title: string
  savedBy: string
  savedAt: Date
  isAuto: boolean
  description?: string
}

export interface Comment {
  id: string
  documentId: string
  text: string
  author: string
  authorName: string
  createdAt: Date
  replies: CommentReply[]
  resolved: boolean
}

export interface CommentReply {
  id: string
  text: string
  author: string
  authorName: string
  createdAt: Date
}

export interface Folder {
  id: string
  name: string
  parentId: string | null
  createdAt: Date
}

export interface EditorSettings {
  fontSize: number
  lineHeight: number
  pageMargin: number
}

export interface Shortcut {
  id: string
  name: string
  keys: string
  action: string
}

export interface RemoteUser {
  id: string
  name: string
  color: string
  cursorPosition: any
  selection: any
}
