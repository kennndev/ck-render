'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Bot, Activity, MessageSquare, ExternalLink, Settings,
  BarChart3, Terminal, Wifi, ArrowUpRight, Crown,
  Users, Zap, Clock, Webhook
} from 'lucide-react'
import InstanceStatus from '@/components/dashboard/instance-status'
import ChannelManager from '@/components/dashboard/channel-manager'
import UsageStats from '@/components/dashboard/usage-stats'
import LogViewer from '@/components/dashboard/log-viewer'
import SessionManager from '@/components/dashboard/sessions'
import CronManager from '@/components/dashboard/cron-manager'
import WebhookManager from '@/components/dashboard/webhook-manager'
import HeartbeatConfig from '@/components/dashboard/heartbeat-config'
import WebChatWidget from '@/components/dashboard/webchat-widget'
import OnboardingTour from '@/components/dashboard/onboarding-tour'

export default function DashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [showTour, setShowTour] = useState(true)

  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/instance/status')
      const result = await response.json()
      setData(result)
    } catch (error) {
      console.error('Failed to fetch status:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 10000)
    return () => clearInterval(interval)
  }, [fetchStatus])

  const handleAction = async (action: 'start' | 'stop' | 'restart') => {
    setActionLoading(true)
    try {
      await fetch(`/api/instance/${action}`, { method: 'POST' })
      await fetchStatus()
    } catch (error) {
      console.error(`${action} failed:`, error)
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Activity className="h-12 w-12 animate-spin mx-auto mb-4 text-purple-600" />
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  // User has a subscription (paid) or pending config but instance hasn't been created yet — deployment in progress
  if (!data?.hasInstance && (data?.subscription?.status === 'ACTIVE' || data?.hasPendingConfig)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-purple-50 to-white">
        <Card className="max-w-lg">
          <CardHeader className="text-center">
            <Activity className="h-16 w-16 mx-auto text-purple-600 mb-4 animate-spin" />
            <CardTitle className="text-2xl">Deploying Your AI Assistant</CardTitle>
            <CardDescription className="text-base">
              Your payment was successful! We&apos;re setting up your bot on Railway now.
              This usually takes 1-2 minutes.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="bg-purple-50 rounded-lg p-4">
              <p className="text-sm text-purple-700 font-medium">
                Plan: {data.subscription.plan}
              </p>
              <p className="text-xs text-purple-600 mt-1">
                Your instance is being provisioned...
              </p>
            </div>
            <p className="text-xs text-gray-400">
              This page refreshes automatically every 10 seconds
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Instance exists but is still deploying
  if (data?.hasInstance && data?.instance?.status === 'DEPLOYING') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-purple-50 to-white">
        <Card className="max-w-lg">
          <CardHeader className="text-center">
            <Activity className="h-16 w-16 mx-auto text-orange-500 mb-4 animate-spin" />
            <CardTitle className="text-2xl">Deployment In Progress</CardTitle>
            <CardDescription className="text-base">
              Your bot is being deployed to Railway. This usually takes 1-2 minutes.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-xs text-gray-400">
              This page refreshes automatically every 10 seconds
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!data?.hasInstance) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-purple-50 to-white">
        <Card className="max-w-lg">
          <CardHeader className="text-center">
            <Bot className="h-16 w-16 mx-auto text-purple-600 mb-4" />
            <CardTitle className="text-2xl">Deploy Your AI Assistant</CardTitle>
            <CardDescription className="text-base">
              Get started by choosing a template and deploying your bot in just a few steps.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={() => router.push('/onboard')}
              className="w-full"
              size="lg"
            >
              <Bot className="mr-2 h-5 w-5" />
              Get Started - Deploy Your Bot
            </Button>
            <p className="text-center text-sm text-gray-500">
              Free tier available - no credit card required
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { instance, subscription } = data
  const isFreePlan = subscription?.plan === 'FREE'

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Bot className="h-7 w-7 text-purple-600" />
              <div>
                <h1 className="text-xl font-bold">
                  {instance.config?.agentName || 'AI Assistant'}
                </h1>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {subscription?.plan?.replace('_', ' ') || 'Free'} Plan
                  </Badge>
                  {isFreePlan && (
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-xs text-purple-600"
                      onClick={() => router.push('/pricing')}
                    >
                      <Crown className="h-3 w-3 mr-1" />
                      Upgrade
                    </Button>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm ${
                instance.status === 'RUNNING'
                  ? 'bg-green-50 text-green-700'
                  : instance.status === 'DEPLOYING' || instance.status === 'RESTARTING'
                    ? 'bg-yellow-50 text-yellow-700'
                    : instance.status === 'ERROR'
                      ? 'bg-red-50 text-red-700'
                      : 'bg-gray-100 text-gray-600'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  instance.status === 'RUNNING' ? 'bg-green-500' :
                  instance.status === 'DEPLOYING' || instance.status === 'RESTARTING' ? 'bg-yellow-500 animate-pulse' :
                  instance.status === 'ERROR' ? 'bg-red-500' : 'bg-gray-400'
                }`} />
                {instance.status === 'RUNNING' ? 'Online' :
                 instance.status === 'DEPLOYING' ? 'Deploying' :
                 instance.status === 'RESTARTING' ? 'Restarting' :
                 instance.status === 'ERROR' ? 'Error' : 'Offline'}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/dashboard/settings')}
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Free Tier Upgrade Banner */}
      {isFreePlan && (
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white py-2.5">
          <div className="container mx-auto px-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <Crown className="h-4 w-4" />
              <span>
                Free plan: {subscription?.messagesUsed || 0}/{subscription?.messagesLimit || 100} messages used
              </span>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => router.push('/pricing')}
              className="text-xs"
            >
              Upgrade for Unlimited
              <ArrowUpRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Main Content with Tabs */}
      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-6 w-full max-w-2xl">
            <TabsTrigger value="overview" className="flex items-center gap-1.5">
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="channels" className="flex items-center gap-1.5">
              <Wifi className="h-4 w-4" />
              <span className="hidden sm:inline">Channels</span>
            </TabsTrigger>
            <TabsTrigger value="sessions" className="flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Sessions</span>
            </TabsTrigger>
            <TabsTrigger value="automation" className="flex items-center gap-1.5">
              <Zap className="h-4 w-4" />
              <span className="hidden sm:inline">Automation</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-1.5">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Analytics</span>
            </TabsTrigger>
            <TabsTrigger value="logs" className="flex items-center gap-1.5">
              <Terminal className="h-4 w-4" />
              <span className="hidden sm:inline">Logs</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {showTour && (
              <OnboardingTour
                instance={instance}
                subscription={subscription}
                onDismiss={() => setShowTour(false)}
              />
            )}

            <InstanceStatus
              instance={instance}
              onAction={handleAction}
              actionLoading={actionLoading}
            />

            <div className="grid lg:grid-cols-2 gap-6">
              {/* Quick Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Quick Stats</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <MessageSquare className="h-6 w-6 text-purple-600 mx-auto mb-2" />
                      <p className="text-2xl font-bold">
                        {instance.config?.channels?.filter((c: any) => c.enabled).length || 0}
                      </p>
                      <p className="text-sm text-gray-600">Active Channels</p>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <Activity className="h-6 w-6 text-green-600 mx-auto mb-2" />
                      <p className="text-2xl font-bold">
                        {instance.status === 'RUNNING' ? '99.9%' : '0%'}
                      </p>
                      <p className="text-sm text-gray-600">Uptime</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Subscription & Support */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Subscription</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Plan</span>
                    <Badge>{subscription?.plan?.replace('_', ' ') || 'Free'}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Status</span>
                    <Badge variant={subscription?.status === 'ACTIVE' ? 'default' : 'secondary'}>
                      {subscription?.status || 'Active'}
                    </Badge>
                  </div>
                  {subscription?.stripeCurrentPeriodEnd && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Renews</span>
                      <span className="text-sm">
                        {new Date(subscription.stripeCurrentPeriodEnd).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  <div className="pt-2 space-y-2">
                    {isFreePlan ? (
                      <Button
                        className="w-full"
                        onClick={() => router.push('/pricing')}
                      >
                        <Crown className="h-4 w-4 mr-2" />
                        Upgrade Plan
                      </Button>
                    ) : (
                      <Button variant="outline" className="w-full">
                        Manage Subscription
                      </Button>
                    )}
                    <a
                      href="https://docs.openclaw.ai"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center text-sm text-purple-600 hover:underline py-2"
                    >
                      <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                      Documentation
                    </a>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Channels Tab */}
          <TabsContent value="channels">
            <ChannelManager
              channels={instance.channels || instance.config?.channels || []}
              onRefresh={fetchStatus}
            />
          </TabsContent>

          {/* Sessions Tab */}
          <TabsContent value="sessions">
            <SessionManager instanceId={instance.id} />
          </TabsContent>

          {/* Automation Tab */}
          <TabsContent value="automation" className="space-y-6">
            <CronManager instanceId={instance.id} />
            <WebhookManager
              instanceId={instance.id}
              accessUrl={instance.accessUrl}
            />
            <HeartbeatConfig instanceId={instance.id} />
            <WebChatWidget
              instanceId={instance.id}
              accessUrl={instance.accessUrl}
              agentName={instance.config?.agentName}
            />
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <UsageStats
              instance={instance}
              subscription={subscription}
            />
          </TabsContent>

          {/* Logs Tab */}
          <TabsContent value="logs">
            <LogViewer instanceId={instance.id} />
          </TabsContent>
        </Tabs>

        {/* Quick Access Links */}
        <div className="mt-8 border-t pt-6">
          <h3 className="text-sm font-medium text-gray-500 mb-3">Advanced Features</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Card
              className="p-3 cursor-pointer hover:shadow-md transition hover:ring-1 hover:ring-purple-200"
              onClick={() => router.push('/dashboard/agents')}
            >
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="text-sm font-medium">Multi-Agent</p>
                  <p className="text-xs text-gray-500">Configure agents</p>
                </div>
              </div>
            </Card>
            <Card
              className="p-3 cursor-pointer hover:shadow-md transition hover:ring-1 hover:ring-purple-200"
              onClick={() => router.push('/dashboard/skills')}
            >
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="text-sm font-medium">Skills</p>
                  <p className="text-xs text-gray-500">Browse marketplace</p>
                </div>
              </div>
            </Card>
            <Card
              className="p-3 cursor-pointer hover:shadow-md transition hover:ring-1 hover:ring-purple-200"
              onClick={() => router.push('/dashboard/knowledge')}
            >
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium">Knowledge</p>
                  <p className="text-xs text-gray-500">Upload documents</p>
                </div>
              </div>
            </Card>
            <Card
              className="p-3 cursor-pointer hover:shadow-md transition hover:ring-1 hover:ring-purple-200"
              onClick={() => router.push('/dashboard/analytics')}
            >
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium">Analytics</p>
                  <p className="text-xs text-gray-500">Deep insights</p>
                </div>
              </div>
            </Card>
            <Card
              className="p-3 cursor-pointer hover:shadow-md transition hover:ring-1 hover:ring-purple-200"
              onClick={() => router.push('/dashboard/settings')}
            >
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-gray-600" />
                <div>
                  <p className="text-sm font-medium">Settings</p>
                  <p className="text-xs text-gray-500">Config & API keys</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
