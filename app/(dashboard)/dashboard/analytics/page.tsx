'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Bot, ArrowLeft, BarChart3, TrendingUp, TrendingDown,
  MessageSquare, Users, Clock, Zap, Globe, Activity,
  ArrowUpRight, ArrowDownRight, Download
} from 'lucide-react'

interface AnalyticsData {
  totalMessages: number
  totalUsers: number
  avgResponseTime: number
  tokensUsed: number
  messagesTrend: number
  usersTrend: number
  responseTrend: number
  channelBreakdown: { channel: string; messages: number; percentage: number }[]
  hourlyActivity: number[]
  dailyMessages: { date: string; inbound: number; outbound: number }[]
  topTopics: { topic: string; count: number }[]
  sentimentBreakdown: { positive: number; neutral: number; negative: number }
}

export default function AnalyticsPage() {
  const router = useRouter()
  const [instance, setInstance] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('7d')
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)

  useEffect(() => {
    fetch('/api/instance/status')
      .then(r => r.json())
      .then(data => {
        setInstance(data.instance)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (instance) fetchAnalytics()
  }, [instance, period])

  const fetchAnalytics = async () => {
    try {
      const res = await fetch(`/api/instance/usage?period=${period}`)
      if (res.ok) {
        const data = await res.json()
        setAnalytics({
          totalMessages: (data.messagesIn || 0) + (data.messagesOut || 0),
          totalUsers: data.uniqueUsers || 0,
          avgResponseTime: data.avgResponseMs || 0,
          tokensUsed: data.totalTokens || 0,
          messagesTrend: data.messagesTrend || 0,
          usersTrend: data.usersTrend || 0,
          responseTrend: data.responseTrend || 0,
          channelBreakdown: data.channelBreakdown || [],
          hourlyActivity: data.hourlyActivity || new Array(24).fill(0),
          dailyMessages: data.dailyMessages || [],
          topTopics: data.topTopics || [],
          sentimentBreakdown: data.sentimentBreakdown || { positive: 60, neutral: 30, negative: 10 },
        })
      }
    } catch {
      // Analytics may not be available yet
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Bot className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    )
  }

  if (!instance) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">No instance found. Deploy your bot first.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard')}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Dashboard
            </Button>
            <h1 className="text-lg font-bold">Analytics & Insights</h1>
          </div>
          <div className="flex items-center gap-2">
            {['7d', '30d', '90d'].map(p => (
              <Button
                key={p}
                variant={period === p ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPeriod(p)}
              >
                {p === '7d' ? '7 Days' : p === '30d' ? '30 Days' : '90 Days'}
              </Button>
            ))}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <MessageSquare className="h-5 w-5 text-purple-600" />
                {analytics?.messagesTrend !== undefined && analytics.messagesTrend !== 0 && (
                  <Badge variant={analytics.messagesTrend > 0 ? 'default' : 'destructive'} className="text-xs">
                    {analytics.messagesTrend > 0 ? (
                      <ArrowUpRight className="h-3 w-3 mr-0.5" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3 mr-0.5" />
                    )}
                    {Math.abs(analytics.messagesTrend)}%
                  </Badge>
                )}
              </div>
              <p className="text-2xl font-bold">{analytics?.totalMessages?.toLocaleString() || '0'}</p>
              <p className="text-xs text-gray-500">Total Messages</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Users className="h-5 w-5 text-blue-600" />
                {analytics?.usersTrend !== undefined && analytics.usersTrend !== 0 && (
                  <Badge variant={analytics.usersTrend > 0 ? 'default' : 'destructive'} className="text-xs">
                    {analytics.usersTrend > 0 ? '+' : ''}{analytics.usersTrend}%
                  </Badge>
                )}
              </div>
              <p className="text-2xl font-bold">{analytics?.totalUsers?.toLocaleString() || '0'}</p>
              <p className="text-xs text-gray-500">Active Users</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Clock className="h-5 w-5 text-green-600" />
              </div>
              <p className="text-2xl font-bold">
                {analytics?.avgResponseTime
                  ? analytics.avgResponseTime < 1000
                    ? `${analytics.avgResponseTime}ms`
                    : `${(analytics.avgResponseTime / 1000).toFixed(1)}s`
                  : '0ms'}
              </p>
              <p className="text-xs text-gray-500">Avg Response Time</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Zap className="h-5 w-5 text-orange-600" />
              </div>
              <p className="text-2xl font-bold">
                {analytics?.tokensUsed
                  ? analytics.tokensUsed > 1000000
                    ? `${(analytics.tokensUsed / 1000000).toFixed(1)}M`
                    : analytics.tokensUsed > 1000
                      ? `${(analytics.tokensUsed / 1000).toFixed(1)}K`
                      : analytics.tokensUsed.toLocaleString()
                  : '0'}
              </p>
              <p className="text-xs text-gray-500">Tokens Used</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Daily Messages Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Daily Messages</CardTitle>
            </CardHeader>
            <CardContent>
              {analytics?.dailyMessages && analytics.dailyMessages.length > 0 ? (
                <div className="space-y-2">
                  {analytics.dailyMessages.slice(-14).map((day, i) => {
                    const total = day.inbound + day.outbound
                    const maxTotal = Math.max(...analytics.dailyMessages.map(d => d.inbound + d.outbound), 1)
                    return (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 w-12 flex-shrink-0">
                          {new Date(day.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                        <div className="flex-1 flex gap-0.5">
                          <div
                            className="bg-purple-500 rounded-sm h-5"
                            style={{ width: `${(day.inbound / maxTotal) * 100}%` }}
                            title={`Inbound: ${day.inbound}`}
                          />
                          <div
                            className="bg-blue-400 rounded-sm h-5"
                            style={{ width: `${(day.outbound / maxTotal) * 100}%` }}
                            title={`Outbound: ${day.outbound}`}
                          />
                        </div>
                        <span className="text-xs text-gray-500 w-8 text-right">{total}</span>
                      </div>
                    )
                  })}
                  <div className="flex items-center gap-4 pt-2 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-purple-500 rounded-sm" />
                      Inbound
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-blue-400 rounded-sm" />
                      Outbound
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No message data yet</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Channel Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Channel Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              {analytics?.channelBreakdown && analytics.channelBreakdown.length > 0 ? (
                <div className="space-y-3">
                  {analytics.channelBreakdown.map((ch, i) => (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium capitalize">{ch.channel}</span>
                        <span className="text-sm text-gray-500">{ch.messages} ({ch.percentage}%)</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                          className="bg-purple-500 h-2 rounded-full transition-all"
                          style={{ width: `${ch.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Globe className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No channel data yet</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Hourly Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Activity by Hour</CardTitle>
            </CardHeader>
            <CardContent>
              {analytics?.hourlyActivity ? (
                <div className="flex items-end gap-1 h-32">
                  {analytics.hourlyActivity.map((count, hour) => {
                    const maxCount = Math.max(...analytics.hourlyActivity, 1)
                    const height = (count / maxCount) * 100
                    return (
                      <div
                        key={hour}
                        className="flex-1 flex flex-col items-center gap-1"
                        title={`${hour}:00 - ${count} messages`}
                      >
                        <div
                          className="w-full bg-purple-400 rounded-t-sm transition-all hover:bg-purple-500"
                          style={{ height: `${Math.max(height, 2)}%` }}
                        />
                        {hour % 6 === 0 && (
                          <span className="text-[10px] text-gray-400">{hour}</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Activity className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No activity data yet</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sentiment */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Conversation Sentiment</CardTitle>
            </CardHeader>
            <CardContent>
              {analytics?.sentimentBreakdown ? (
                <div className="space-y-4">
                  <div className="flex h-6 rounded-full overflow-hidden">
                    <div
                      className="bg-green-500 transition-all"
                      style={{ width: `${analytics.sentimentBreakdown.positive}%` }}
                    />
                    <div
                      className="bg-gray-300 transition-all"
                      style={{ width: `${analytics.sentimentBreakdown.neutral}%` }}
                    />
                    <div
                      className="bg-red-400 transition-all"
                      style={{ width: `${analytics.sentimentBreakdown.negative}%` }}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-lg font-bold text-green-600">{analytics.sentimentBreakdown.positive}%</p>
                      <p className="text-xs text-gray-500">Positive</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-gray-500">{analytics.sentimentBreakdown.neutral}%</p>
                      <p className="text-xs text-gray-500">Neutral</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-red-500">{analytics.sentimentBreakdown.negative}%</p>
                      <p className="text-xs text-gray-500">Negative</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Sentiment analysis requires more data</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
