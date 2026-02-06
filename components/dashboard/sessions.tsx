'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Users, MessageSquare, Clock, Trash2, RefreshCw,
  UserCircle, Hash, Send, Zap
} from 'lucide-react'

interface Session {
  id: string
  channel: string
  userId: string
  messageCount: number
  lastActive: string
  createdAt: string
}

interface SessionManagerProps {
  instanceId: string
}

const channelIcons: Record<string, any> = {
  whatsapp: MessageSquare,
  telegram: Send,
  discord: Hash,
  slack: Zap,
  default: UserCircle,
}

export default function SessionManager({ instanceId }: SessionManagerProps) {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [pruning, setPruning] = useState(false)

  useEffect(() => {
    fetchSessions()
  }, [])

  const fetchSessions = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/instance/sessions')
      if (response.ok) {
        const data = await response.json()
        setSessions(data.sessions || [])
      }
    } catch (error) {
      // Sessions endpoint may not be available yet
    } finally {
      setLoading(false)
    }
  }

  const pruneSession = async (sessionId: string) => {
    setPruning(true)
    try {
      await fetch('/api/instance/sessions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      })
      await fetchSessions()
    } catch (error) {
      console.error('Failed to prune session:', error)
    } finally {
      setPruning(false)
    }
  }

  const pruneAll = async () => {
    if (!confirm('Are you sure you want to prune all inactive sessions? This cannot be undone.')) return
    setPruning(true)
    try {
      await fetch('/api/instance/sessions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pruneAll: true })
      })
      await fetchSessions()
    } catch (error) {
      console.error('Failed to prune sessions:', error)
    } finally {
      setPruning(false)
    }
  }

  const getTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Active Sessions
            </CardTitle>
            <CardDescription>View and manage active conversation sessions</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchSessions} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            {sessions.length > 0 && (
              <Button variant="outline" size="sm" onClick={pruneAll} disabled={pruning}>
                <Trash2 className="h-4 w-4 mr-1" />
                Prune All
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-12 text-gray-500">
            <RefreshCw className="h-8 w-8 mx-auto mb-2 animate-spin opacity-50" />
            <p className="text-sm">Loading sessions...</p>
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Users className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p className="font-medium">No active sessions</p>
            <p className="text-sm mt-1">Sessions will appear here when users start chatting with your bot</p>
          </div>
        ) : (
          <>
            {/* Summary */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="p-3 bg-purple-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-purple-700">{sessions.length}</p>
                <p className="text-xs text-gray-600">Total Sessions</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-blue-700">
                  {sessions.reduce((sum, s) => sum + s.messageCount, 0)}
                </p>
                <p className="text-xs text-gray-600">Total Messages</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-green-700">
                  {new Set(sessions.map(s => s.channel)).size}
                </p>
                <p className="text-xs text-gray-600">Channels</p>
              </div>
            </div>

            {/* Sessions List */}
            <div className="space-y-2">
              {sessions.map((session) => {
                const Icon = channelIcons[session.channel.toLowerCase()] || channelIcons.default

                return (
                  <div
                    key={session.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <Icon className="h-4 w-4 text-gray-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{session.userId}</span>
                          <Badge variant="outline" className="text-xs">
                            {session.channel}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                          <span className="flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                            {session.messageCount} msgs
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {getTimeAgo(session.lastActive)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => pruneSession(session.id)}
                      disabled={pruning}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-gray-400" />
                    </Button>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
