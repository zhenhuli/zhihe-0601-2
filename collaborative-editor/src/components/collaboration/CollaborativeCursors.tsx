import { useEffect, useState } from 'react'
import type { RemoteUser } from '@/types'

interface CollaborativeCursorsProps {
  documentId: string
  currentUserId: string
}

const mockRemoteUsers: RemoteUser[] = [
  {
    id: 'user-1',
    name: '张三',
    color: '#FF6B6B',
    cursorPosition: null,
    selection: null
  },
  {
    id: 'user-2',
    name: '李四',
    color: '#4ECDC4',
    cursorPosition: null,
    selection: null
  },
]

export const CollaborativeCursors = ({ documentId, currentUserId }: CollaborativeCursorsProps) => {
  const [remoteUsers, setRemoteUsers] = useState<RemoteUser[]>(mockRemoteUsers)

  useEffect(() => {
    const interval = setInterval(() => {
      setRemoteUsers(prev => prev.map(user => ({
        ...user,
        cursorPosition: user.cursorPosition ? {
          top: Math.random() * 400 + 100,
          left: Math.random() * 600 + 100
        } : null
      })))
    }, 2000)

    return () => clearInterval(interval)
  }, [documentId])

  return (
    <div className="pointer-events-none">
      {remoteUsers
        .filter(u => u.id !== currentUserId && u.cursorPosition)
        .map(user => (
          <div
            key={user.id}
            className="absolute z-30"
            style={{
              top: `${user.cursorPosition?.top}px`,
              left: `${user.cursorPosition?.left}px`,
            }}
          >
            <svg width="16" height="20" viewBox="0 0 16 20" fill="none">
              <path
                d="M0 0L16 10L8 12L6 20L0 0Z"
                fill={user.color}
              />
            </svg>
            <div
              className="absolute left-4 top-0 px-2 py-0.5 text-xs text-white whitespace-nowrap rounded"
              style={{ backgroundColor: user.color }}
            >
              {user.name}
            </div>
          </div>
        ))}
    </div>
  )
}

export const OnlineUsers = () => {
  const [onlineUsers] = useState<RemoteUser[]>(mockRemoteUsers)

  return (
    <div className="flex -space-x-2">
      {onlineUsers.map((user) => (
        <div
          key={user.id}
          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-medium border-2 border-white relative"
          style={{ backgroundColor: user.color }}
          title={user.name}
        >
          {user.name.charAt(0)}
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full" />
        </div>
      ))}
    </div>
  )
}
