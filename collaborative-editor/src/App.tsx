import { useState, useEffect, useCallback } from 'react'
import { Sidebar } from './components/Sidebar'
import { Editor } from './components/editor/Editor'
import { EditorHeader } from './components/EditorHeader'
import { HistoryPanel } from './components/HistoryPanel'
import { SettingsPanel } from './components/SettingsPanel'
import { CollaborativeCursors } from './components/collaboration/CollaborativeCursors'
import { useAppStore } from './store'
import type { Version } from './types'

function App() {
  const {
    documents,
    currentDocumentId,
    setCurrentDocument,
    updateDocument,
    currentUser,
    addVersion,
  } = useAppStore()

  const [showHistory, setShowHistory] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isOnline, setIsOnline] = useState(true)

  const currentDoc = documents.find(d => d.id === currentDocumentId)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    if (!currentDocumentId) return

    const interval = setInterval(() => {
      autoSaveVersion()
    }, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [currentDocumentId, currentDoc])

  const autoSaveVersion = () => {
    if (!currentDoc) return

    const version: Version = {
      id: 'version-' + Date.now(),
      documentId: currentDoc.id,
      content: currentDoc.content,
      title: currentDoc.title,
      savedBy: currentUser.id,
      savedAt: new Date(),
      isAuto: true,
      description: '自动保存'
    }
    addVersion(version)
  }

  const handleDocumentSelect = (docId: string) => {
    setCurrentDocument(docId)
  }

  const handleEditorChange = (content: any[]) => {
    if (currentDocumentId) {
      updateDocument(currentDocumentId, { content })
    }
  }

  const handleTitleChange = (title: string) => {
    if (currentDocumentId) {
      updateDocument(currentDocumentId, { title })
    }
  }

  const handleSave = useCallback(() => {
    if (!currentDocumentId) return
    
    setIsSaving(true)
    
    setTimeout(() => {
      if (currentDoc) {
        const version: Version = {
          id: 'version-' + Date.now(),
          documentId: currentDocumentId,
          content: currentDoc.content,
          title: currentDoc.title,
          savedBy: currentUser.id,
          savedAt: new Date(),
          isAuto: false,
          description: '手动保存'
        }
        addVersion(version)
      }
      setIsSaving(false)
    }, 500)
  }, [currentDocumentId, currentDoc, currentUser.id, addVersion])

  const handleRestoreVersion = (version: Version) => {
    if (currentDocumentId) {
      updateDocument(currentDocumentId, {
        content: version.content,
        title: version.title
      })
    }
    setShowHistory(false)
  }

  if (!currentDoc) {
    return (
      <div className="h-screen flex">
        <Sidebar
          onDocumentSelect={handleDocumentSelect}
          currentDocId={currentDocumentId}
        />
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="w-24 h-24 mx-auto mb-6 bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="w-12 h-12 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-700 mb-2">选择或创建文档</h2>
            <p className="text-gray-500">从左侧选择一个文档开始编辑</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex overflow-hidden">
      <Sidebar
        onDocumentSelect={handleDocumentSelect}
        currentDocId={currentDocumentId}
      />
      
      <div className="flex-1 flex flex-col relative">
        <EditorHeader
          documentId={currentDoc.id}
          title={currentDoc.title}
          onTitleChange={handleTitleChange}
          onSave={handleSave}
          onShowHistory={() => setShowHistory(true)}
          onShowSettings={() => setShowSettings(true)}
          isSaving={isSaving}
          isOnline={isOnline}
        />
        
        <div className="flex-1 relative overflow-hidden">
          <Editor
            documentId={currentDoc.id}
            initialContent={currentDoc.content}
            onChange={handleEditorChange}
            readOnly={false}
          />
          
          <CollaborativeCursors
            documentId={currentDoc.id}
            currentUserId={currentUser.id}
          />
        </div>
      </div>

      {showHistory && (
        <HistoryPanel
          documentId={currentDoc.id}
          onClose={() => setShowHistory(false)}
          onRestoreVersion={handleRestoreVersion}
        />
      )}

      {showSettings && (
        <SettingsPanel onClose={() => setShowSettings(false)} />
      )}
    </div>
  )
}

export default App
