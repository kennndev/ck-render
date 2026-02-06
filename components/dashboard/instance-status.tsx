'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Activity, Clock, Server, Wifi, Play, Square, RotateCw,
  Cpu, HardDrive, Globe, Shield, Copy, ExternalLink, Bot
} from 'lucide-react'
import { useState } from 'react'

interface Instance {
  id: string
  status: string
  port: number
  accessUrl: string | null
  lastHealthCheck: Date | null
  isHealthy?: boolean
  createdAt?: string
  config?: {
    provider?: string
    model?: string
    agentName?: string
    channels?: any[]
  }
}

interface InstanceStatusProps {
  instance: Instance
  onAction: (action: 'start' | 'stop' | 'restart') => void
  actionLoading: boolean
}

export default function InstanceStatus({ instance, onAction, actionLoading }: InstanceStatusProps) {
  const [copied, setCopied] = useState(false)

  const statusConfig: Record<string, { color: string; bgColor: string; label: string; pulse: boolean }> = {
    RUNNING: { color: 'bg-green-500', bgColor: 'bg-green-50', label: 'Running', pulse: true },
    STOPPED: { color: 'bg-gray-500', bgColor: 'bg-gray-50', label: 'Stopped', pulse: false },
    DEPLOYING: { color: 'bg-yellow-500', bgColor: 'bg-yellow-50', label: 'Deploying', pulse: true },
    ERROR: { color: 'bg-red-500', bgColor: 'bg-red-50', label: 'Error', pulse: false },
    RESTARTING: { color: 'bg-blue-500', bgColor: 'bg-blue-50', label: 'Restarting', pulse: true },
  }

  const status = statusConfig[instance.status] || statusConfig.STOPPED

  const copyId = () => {
    navigator.clipboard.writeText(instance.id)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Calculate uptime from createdAt
  const uptimeText = instance.createdAt
    ? getUptimeString(new Date(instance.createdAt))
    : '--'

  const activeChannels = instance.config?.channels?.filter((c: any) => c.enabled).length || 0

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              {instance.config?.agentName || 'AI Assistant'}
            </CardTitle>
            <CardDescription>Instance health and controls</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${status.bgColor}`}>
              <div className="relative">
                <div className={`w-2.5 h-2.5 rounded-full ${status.color}`} />
                {status.pulse && (
                  <div className={`absolute inset-0 w-2.5 h-2.5 rounded-full ${status.color} animate-ping`} />
                )}
              </div>
              <span className="text-sm font-medium">{status.label}</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="flex items-center space-x-3">
            <div className={`p-2.5 rounded-lg ${
              instance.status === 'RUNNING' ? 'bg-green-100' :
              instance.status === 'DEPLOYING' || instance.status === 'RESTARTING' ? 'bg-yellow-100' :
              'bg-red-100'
            }`}>
              <Activity className={`h-5 w-5 ${
                instance.status === 'RUNNING' ? 'text-green-600' :
                instance.status === 'DEPLOYING' || instance.status === 'RESTARTING' ? 'text-yellow-600' :
                'text-red-600'
              }`} />
            </div>
            <div>
              <p className="text-xs text-gray-500">Health</p>
              <p className="font-semibold text-sm">
                {instance.status === 'RUNNING' ? 'Healthy' :
                 instance.status === 'DEPLOYING' ? 'Deploying' :
                 instance.status === 'RESTARTING' ? 'Restarting' :
                 instance.status === 'ERROR' ? 'Error' : 'Down'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-lg bg-purple-100">
              <Clock className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Uptime</p>
              <p className="font-semibold text-sm">{instance.status === 'RUNNING' ? uptimeText : 'Offline'}</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-lg bg-blue-100">
              <Cpu className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Model</p>
              <p className="font-semibold text-sm truncate max-w-[120px]">
                {instance.config?.model
                  ? instance.config.model.split('/').pop()
                  : '--'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-lg bg-orange-100">
              <Globe className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Channels</p>
              <p className="font-semibold text-sm">{activeChannels} active</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2 mb-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onAction('start')}
            disabled={instance.status === 'RUNNING' || actionLoading}
          >
            <Play className="h-4 w-4 mr-1" />
            Start
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onAction('stop')}
            disabled={instance.status === 'STOPPED' || actionLoading}
          >
            <Square className="h-4 w-4 mr-1" />
            Stop
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onAction('restart')}
            disabled={actionLoading}
          >
            <RotateCw className="h-4 w-4 mr-1" />
            Restart
          </Button>
          {instance.accessUrl && (
            <Button
              variant="outline"
              size="sm"
              asChild
            >
              <a href={instance.accessUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-1" />
                Open UI
              </a>
            </Button>
          )}
        </div>

        {/* Instance Details */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span className="font-mono text-xs">{instance.id.slice(0, 16)}...</span>
              <span>Port {instance.port}</span>
              {instance.lastHealthCheck && (
                <span>
                  Last check: {new Date(instance.lastHealthCheck).toLocaleTimeString()}
                </span>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={copyId}>
              <Copy className="h-3.5 w-3.5 mr-1" />
              {copied ? 'Copied!' : 'Copy ID'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function getUptimeString(since: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - since.getTime()
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))

  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${mins}m`
  return `${mins}m`
}
