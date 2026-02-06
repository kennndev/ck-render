'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Terminal, Search, ArrowDown, Pause, Play, Trash2, Download } from 'lucide-react'

interface LogEntry {
  timestamp: string
  level: 'info' | 'warn' | 'error' | 'debug'
  message: string
}

interface LogViewerProps {
  instanceId: string
}

const levelColors: Record<string, string> = {
  info: 'text-blue-400',
  warn: 'text-yellow-400',
  error: 'text-red-400',
  debug: 'text-gray-500',
}

const levelBadgeColors: Record<string, string> = {
  info: 'bg-blue-500/20 text-blue-400',
  warn: 'bg-yellow-500/20 text-yellow-400',
  error: 'bg-red-500/20 text-red-400',
  debug: 'bg-gray-500/20 text-gray-400',
}

function parseLogLine(line: string): LogEntry {
  const timestamp = new Date().toISOString()
  let level: LogEntry['level'] = 'info'

  const lowerLine = line.toLowerCase()
  if (lowerLine.includes('error') || lowerLine.includes('err')) {
    level = 'error'
  } else if (lowerLine.includes('warn') || lowerLine.includes('warning')) {
    level = 'warn'
  } else if (lowerLine.includes('debug') || lowerLine.includes('verbose')) {
    level = 'debug'
  }

  return { timestamp, level, message: line }
}

export default function LogViewer({ instanceId }: LogViewerProps) {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [filter, setFilter] = useState('')
  const [levelFilter, setLevelFilter] = useState<string>('all')
  const [autoScroll, setAutoScroll] = useState(true)
  const [paused, setPaused] = useState(false)
  const logContainerRef = useRef<HTMLDivElement>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const fetchLogs = useCallback(async () => {
    if (paused) return
    try {
      const response = await fetch(`/api/instance/logs?tail=100`)
      if (response.ok) {
        const data = await response.json()
        if (data.logs) {
          const parsed = (data.logs as string[]).map(parseLogLine)
          setLogs(parsed)
        }
      }
    } catch (error) {
      // Silently fail - logs may not be available
    }
  }, [paused])

  useEffect(() => {
    fetchLogs()
    intervalRef.current = setInterval(fetchLogs, 5000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [fetchLogs])

  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
    }
  }, [logs, autoScroll])

  const filteredLogs = logs.filter(log => {
    if (levelFilter !== 'all' && log.level !== levelFilter) return false
    if (filter && !log.message.toLowerCase().includes(filter.toLowerCase())) return false
    return true
  })

  const handleExport = () => {
    const text = filteredLogs
      .map(l => `[${l.timestamp}] [${l.level.toUpperCase()}] ${l.message}`)
      .join('\n')
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `logs-${new Date().toISOString().split('T')[0]}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Terminal className="h-5 w-5" />
              Instance Logs
            </CardTitle>
            <CardDescription>Real-time logs from your bot instance</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPaused(!paused)}
            >
              {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoScroll(!autoScroll)}
            >
              <ArrowDown className={`h-4 w-4 ${autoScroll ? 'text-green-500' : ''}`} />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setLogs([])}>
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Filter logs..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-1">
            {['all', 'info', 'warn', 'error', 'debug'].map(level => (
              <Button
                key={level}
                variant={levelFilter === level ? 'default' : 'outline'}
                size="sm"
                onClick={() => setLevelFilter(level)}
                className="text-xs capitalize"
              >
                {level}
              </Button>
            ))}
          </div>
        </div>

        {/* Log Output */}
        <div
          ref={logContainerRef}
          className="bg-gray-950 rounded-lg p-4 font-mono text-sm h-96 overflow-y-auto"
        >
          {filteredLogs.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <Terminal className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No logs available</p>
                <p className="text-xs mt-1">Logs will appear here when your instance is running</p>
              </div>
            </div>
          ) : (
            filteredLogs.map((log, i) => (
              <div key={i} className="flex gap-2 py-0.5 hover:bg-gray-900/50">
                <span className="text-gray-600 text-xs whitespace-nowrap">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                <span className={`text-xs font-bold uppercase w-12 ${levelColors[log.level]}`}>
                  {log.level}
                </span>
                <span className="text-gray-300 break-all">{log.message}</span>
              </div>
            ))
          )}
        </div>

        {/* Status Bar */}
        <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
          <span>{filteredLogs.length} log entries</span>
          <div className="flex items-center gap-2">
            {paused && <Badge variant="outline" className="text-yellow-500 text-xs">Paused</Badge>}
            {autoScroll && <Badge variant="outline" className="text-green-500 text-xs">Auto-scroll</Badge>}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
