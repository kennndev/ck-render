'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  MessageSquare, TrendingUp, Zap, Clock, BarChart3,
  ArrowUpRight, ArrowDownRight, Send, Hash, Users
} from 'lucide-react'

interface UsageStatsProps {
  instance: any
  subscription?: any
}

interface UsageData {
  messagesIn: number
  messagesOut: number
  totalTokens: number
  avgResponseMs: number
  channelBreakdown: { channel: string; count: number }[]
  dailyMessages: { date: string; count: number }[]
}

export default function UsageStats({ instance, subscription }: UsageStatsProps) {
  const [usage, setUsage] = useState<UsageData | null>(null)
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUsage()
  }, [period])

  const fetchUsage = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/instance/usage?period=${period}`)
      if (response.ok) {
        const data = await response.json()
        setUsage(data)
      }
    } catch (error) {
      // Use fallback data if API not available yet
    } finally {
      setLoading(false)
    }
  }

  // Use real data or fallback
  const stats = usage || {
    messagesIn: 0,
    messagesOut: 0,
    totalTokens: 0,
    avgResponseMs: 0,
    channelBreakdown: [],
    dailyMessages: [],
  }

  const totalMessages = stats.messagesIn + stats.messagesOut
  const isFreePlan = subscription?.plan === 'FREE'
  const messageLimit = subscription?.messagesLimit || 100
  const messagesUsed = subscription?.messagesUsed || 0
  const usagePercent = isFreePlan ? Math.round((messagesUsed / messageLimit) * 100) : 0

  const channelIcons: Record<string, any> = {
    WHATSAPP: MessageSquare,
    TELEGRAM: Send,
    DISCORD: Hash,
    SLACK: Zap,
    default: MessageSquare,
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Usage & Analytics
            </CardTitle>
            <CardDescription>Monitor your bot's activity and performance</CardDescription>
          </div>
          <div className="flex gap-1">
            {(['7d', '30d', '90d'] as const).map(p => (
              <Button
                key={p}
                variant={period === p ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPeriod(p)}
                className="text-xs"
              >
                {p === '7d' ? '7 Days' : p === '30d' ? '30 Days' : '90 Days'}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Free Tier Usage Bar */}
        {isFreePlan && (
          <div className="mb-6 p-4 bg-purple-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Free Plan Usage</span>
              <span className="text-sm text-gray-600">
                {messagesUsed} / {messageLimit} messages
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className={`h-2.5 rounded-full transition-all ${
                  usagePercent > 80 ? 'bg-red-500' : usagePercent > 50 ? 'bg-yellow-500' : 'bg-purple-600'
                }`}
                style={{ width: `${Math.min(usagePercent, 100)}%` }}
              />
            </div>
            {usagePercent > 80 && (
              <p className="text-xs text-red-600 mt-2">
                You're running low on messages. Upgrade for unlimited messaging.
              </p>
            )}
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <MessageSquare className="h-5 w-5 text-purple-600" />
              <ArrowUpRight className="h-4 w-4 text-green-500" />
            </div>
            <p className="text-2xl font-bold">{totalMessages.toLocaleString()}</p>
            <p className="text-sm text-gray-600">Total Messages</p>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <p className="text-2xl font-bold">
              {instance.status === 'RUNNING' ? '99.9%' : '0%'}
            </p>
            <p className="text-sm text-gray-600">Uptime</p>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <Clock className="h-5 w-5 text-blue-600" />
            </div>
            <p className="text-2xl font-bold">
              {stats.avgResponseMs > 0
                ? `${(stats.avgResponseMs / 1000).toFixed(1)}s`
                : '--'}
            </p>
            <p className="text-sm text-gray-600">Avg Response</p>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <Zap className="h-5 w-5 text-orange-600" />
            </div>
            <p className="text-2xl font-bold">
              {stats.totalTokens > 1000000
                ? `${(stats.totalTokens / 1000000).toFixed(1)}M`
                : stats.totalTokens > 1000
                  ? `${(stats.totalTokens / 1000).toFixed(1)}K`
                  : stats.totalTokens || '--'}
            </p>
            <p className="text-sm text-gray-600">Tokens Used</p>
          </div>
        </div>

        {/* Simple Bar Chart */}
        {stats.dailyMessages.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-medium mb-3">Messages Over Time</h4>
            <div className="flex items-end gap-1 h-32">
              {stats.dailyMessages.slice(-14).map((day, i) => {
                const maxCount = Math.max(...stats.dailyMessages.map(d => d.count), 1)
                const height = (day.count / maxCount) * 100
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full bg-purple-500 rounded-t transition-all hover:bg-purple-600"
                      style={{ height: `${Math.max(height, 2)}%` }}
                      title={`${day.date}: ${day.count} messages`}
                    />
                    {i % 2 === 0 && (
                      <span className="text-xs text-gray-400 -rotate-45">
                        {new Date(day.date).getDate()}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Channel Breakdown */}
        {stats.channelBreakdown.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-3">Messages by Channel</h4>
            <div className="space-y-2">
              {stats.channelBreakdown.map((ch) => {
                const Icon = channelIcons[ch.channel] || channelIcons.default
                const total = stats.channelBreakdown.reduce((sum, c) => sum + c.count, 0)
                const percent = total > 0 ? Math.round((ch.count / total) * 100) : 0

                return (
                  <div key={ch.channel} className="flex items-center gap-3">
                    <Icon className="h-4 w-4 text-gray-500 flex-shrink-0" />
                    <span className="text-sm w-24">
                      {ch.channel.replace('_', ' ')}
                    </span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                      <div
                        className="bg-purple-500 h-2 rounded-full"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-600 w-16 text-right">
                      {ch.count.toLocaleString()}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {totalMessages === 0 && stats.channelBreakdown.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <BarChart3 className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No usage data yet</p>
            <p className="text-xs mt-1">
              Stats will appear here once your bot starts processing messages
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
