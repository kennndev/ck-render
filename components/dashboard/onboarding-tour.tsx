'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Rocket, CheckCircle2, Circle, ArrowRight, X,
  Wifi, MessageSquare, Zap, Brain, BarChart3, Settings
} from 'lucide-react'

interface OnboardingTourProps {
  instance: any
  subscription: any
  onDismiss: () => void
}

interface ChecklistItem {
  id: string
  label: string
  description: string
  icon: any
  completed: boolean
  action?: string
  href?: string
}

export default function OnboardingTour({ instance, subscription, onDismiss }: OnboardingTourProps) {
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('kainat_tour_dismissed')
    if (stored === 'true') setDismissed(true)
  }, [])

  const dismiss = () => {
    localStorage.setItem('kainat_tour_dismissed', 'true')
    setDismissed(true)
    onDismiss()
  }

  if (dismissed) return null

  const checklist: ChecklistItem[] = [
    {
      id: 'deploy',
      label: 'Deploy your bot',
      description: 'Your bot instance is running',
      icon: Rocket,
      completed: instance?.status === 'RUNNING',
    },
    {
      id: 'channel',
      label: 'Connect a channel',
      description: 'Set up WhatsApp, Telegram, or Discord',
      icon: Wifi,
      completed: (instance?.config?.channels?.length || 0) > 0,
      href: '/dashboard?tab=channels',
    },
    {
      id: 'message',
      label: 'Send your first message',
      description: 'Chat with your bot on any connected channel',
      icon: MessageSquare,
      completed: (subscription?.messagesUsed || 0) > 0,
    },
    {
      id: 'skills',
      label: 'Enable a skill',
      description: 'Add web search, memory, or other capabilities',
      icon: Zap,
      completed: instance?.config?.webSearchEnabled || instance?.config?.memoryEnabled || instance?.config?.browserEnabled,
      href: '/dashboard/skills',
    },
    {
      id: 'prompt',
      label: 'Customize your bot',
      description: 'Set a system prompt and agent name',
      icon: Brain,
      completed: !!instance?.config?.systemPrompt,
      href: '/dashboard/settings',
    },
    {
      id: 'analytics',
      label: 'Check your analytics',
      description: 'View usage stats and conversation insights',
      icon: BarChart3,
      completed: false, // Always pending until user visits
      href: '/dashboard/analytics',
    },
  ]

  const completedCount = checklist.filter(c => c.completed).length
  const totalCount = checklist.length
  const progress = Math.round((completedCount / totalCount) * 100)

  // Don't show if all completed
  if (completedCount === totalCount) return null

  return (
    <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-purple-600" />
            <h3 className="font-semibold text-sm">Getting Started</h3>
            <Badge variant="outline" className="text-xs">
              {completedCount}/{totalCount} complete
            </Badge>
          </div>
          <Button variant="ghost" size="sm" onClick={dismiss} className="h-6 w-6 p-0">
            <X className="h-4 w-4 text-gray-400" />
          </Button>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-1.5 mb-4">
          <div
            className="bg-purple-600 h-1.5 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Checklist */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-2">
          {checklist.map(item => {
            const Icon = item.icon
            return (
              <div
                key={item.id}
                className={`flex items-start gap-2 p-2 rounded-lg transition ${
                  item.completed
                    ? 'bg-green-50/50'
                    : item.href
                      ? 'hover:bg-white/50 cursor-pointer'
                      : ''
                }`}
                onClick={() => {
                  if (item.href && !item.completed) {
                    window.location.href = item.href
                  }
                }}
              >
                {item.completed ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                ) : (
                  <Circle className="h-4 w-4 text-gray-300 flex-shrink-0 mt-0.5" />
                )}
                <div>
                  <p className={`text-xs font-medium ${item.completed ? 'text-green-700 line-through' : ''}`}>
                    {item.label}
                  </p>
                  <p className="text-xs text-gray-500">{item.description}</p>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
