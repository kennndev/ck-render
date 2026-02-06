'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Headphones,
  UserCircle,
  Hash,
  Users,
  Sparkles,
  ArrowRight,
  MessageSquare,
  Send,
  Bot,
  Briefcase
} from 'lucide-react'
import { Button } from '@/components/ui/button'

export interface BotTemplate {
  id: string
  name: string
  description: string
  icon: any
  badge?: string
  popular?: boolean
  channels: { type: string; config: Record<string, any> }[]
  provider: string
  model: string
  skills: {
    webSearchEnabled: boolean
    browserEnabled: boolean
    ttsEnabled: boolean
    canvasEnabled: boolean
    cronEnabled: boolean
    memoryEnabled: boolean
  }
  systemPrompt: string
  agentName: string
}

const templates: BotTemplate[] = [
  {
    id: 'customer-support',
    name: 'Customer Support Bot',
    description: 'A helpful support agent that answers questions, resolves issues, and escalates when needed. Great for businesses.',
    icon: Headphones,
    badge: 'Popular',
    popular: true,
    channels: [
      { type: 'WHATSAPP', config: {} },
      { type: 'TELEGRAM', config: {} }
    ],
    provider: 'ANTHROPIC',
    model: 'anthropic/claude-sonnet-4-5',
    skills: {
      webSearchEnabled: false,
      browserEnabled: false,
      ttsEnabled: false,
      canvasEnabled: false,
      cronEnabled: false,
      memoryEnabled: true
    },
    systemPrompt: 'You are a professional and friendly customer support assistant. Help users with their questions and issues. Be concise, helpful, and empathetic. If you cannot resolve an issue, let the user know you will escalate it. Always maintain a professional tone.',
    agentName: 'Support Bot'
  },
  {
    id: 'personal-assistant',
    name: 'Personal Assistant',
    description: 'Your all-purpose AI companion with web search, scheduling, and memory. Handles tasks across all your channels.',
    icon: UserCircle,
    popular: true,
    channels: [
      { type: 'WHATSAPP', config: {} },
      { type: 'TELEGRAM', config: {} },
      { type: 'DISCORD', config: {} }
    ],
    provider: 'ANTHROPIC',
    model: 'anthropic/claude-opus-4-5',
    skills: {
      webSearchEnabled: true,
      browserEnabled: true,
      ttsEnabled: false,
      canvasEnabled: false,
      cronEnabled: true,
      memoryEnabled: true
    },
    systemPrompt: 'You are a capable personal assistant. Help the user with anything they need: answering questions, researching topics, managing tasks, setting reminders, and more. Be proactive, thoughtful, and efficient. Remember important context from past conversations.',
    agentName: 'Assistant'
  },
  {
    id: 'discord-community',
    name: 'Discord Community Bot',
    description: 'Engage your Discord community with an AI that answers questions, moderates, and keeps conversations going.',
    icon: Hash,
    channels: [
      { type: 'DISCORD', config: {} }
    ],
    provider: 'ANTHROPIC',
    model: 'anthropic/claude-sonnet-4-5',
    skills: {
      webSearchEnabled: true,
      browserEnabled: false,
      ttsEnabled: false,
      canvasEnabled: false,
      cronEnabled: false,
      memoryEnabled: true
    },
    systemPrompt: 'You are a helpful and engaging community bot for a Discord server. Answer questions, provide information, and keep conversations constructive. Be friendly and approachable. Follow server rules and encourage positive interactions.',
    agentName: 'Community Bot'
  },
  {
    id: 'team-collaboration',
    name: 'Team Collaboration Bot',
    description: 'Boost team productivity with an AI that searches the web, browses docs, and helps with daily tasks on Slack or Teams.',
    icon: Briefcase,
    channels: [
      { type: 'SLACK', config: {} }
    ],
    provider: 'ANTHROPIC',
    model: 'anthropic/claude-opus-4-5',
    skills: {
      webSearchEnabled: true,
      browserEnabled: true,
      ttsEnabled: false,
      canvasEnabled: true,
      cronEnabled: true,
      memoryEnabled: true
    },
    systemPrompt: 'You are a team productivity assistant. Help team members with research, documentation, summarizing discussions, tracking action items, and answering questions. Be concise and professional. Proactively offer help when you notice patterns or recurring questions.',
    agentName: 'Team Bot'
  },
  {
    id: 'blank',
    name: 'Start from Scratch',
    description: 'Full control over every setting. Choose your own channels, model, skills, and system prompt.',
    icon: Sparkles,
    channels: [],
    provider: 'ANTHROPIC',
    model: '',
    skills: {
      webSearchEnabled: false,
      browserEnabled: false,
      ttsEnabled: false,
      canvasEnabled: false,
      cronEnabled: false,
      memoryEnabled: false
    },
    systemPrompt: '',
    agentName: ''
  }
]

interface TemplateSelectorProps {
  onSelect: (template: BotTemplate | null) => void
  selectedTemplate: string | null
}

export default function TemplateSelector({ onSelect, selectedTemplate }: TemplateSelectorProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Quick Start Templates</h3>
        <p className="text-sm text-gray-600 mb-6">
          Pick a template to pre-configure your bot, or start from scratch for full control.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {templates.map(template => {
          const Icon = template.icon
          const isSelected = selectedTemplate === template.id

          return (
            <Card
              key={template.id}
              className={`p-5 cursor-pointer transition-all hover:shadow-md ${
                isSelected
                  ? 'ring-2 ring-purple-600 shadow-lg bg-purple-50/50'
                  : ''
              } ${template.id === 'blank' ? 'border-dashed' : ''}`}
              onClick={() => onSelect(template.id === 'blank' ? null : template)}
            >
              <div className="flex items-start space-x-4">
                <div className={`p-3 rounded-lg ${isSelected ? 'bg-purple-200' : 'bg-purple-100'}`}>
                  <Icon className={`h-6 w-6 ${isSelected ? 'text-purple-700' : 'text-purple-600'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className="font-semibold">{template.name}</h4>
                    {template.popular && (
                      <Badge className="text-xs bg-purple-600">Popular</Badge>
                    )}
                    {template.badge && !template.popular && (
                      <Badge variant="secondary" className="text-xs">{template.badge}</Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{template.description}</p>

                  {template.id !== 'blank' && (
                    <div className="flex flex-wrap gap-1.5">
                      {template.channels.map(ch => (
                        <Badge key={ch.type} variant="outline" className="text-xs">
                          {ch.type === 'WHATSAPP' && <MessageSquare className="h-3 w-3 mr-1" />}
                          {ch.type === 'TELEGRAM' && <Send className="h-3 w-3 mr-1" />}
                          {ch.type === 'DISCORD' && <Hash className="h-3 w-3 mr-1" />}
                          {ch.type === 'SLACK' && <Users className="h-3 w-3 mr-1" />}
                          {ch.type.replace('_', ' ')}
                        </Badge>
                      ))}
                      {template.skills.webSearchEnabled && (
                        <Badge variant="outline" className="text-xs">Web Search</Badge>
                      )}
                      {template.skills.memoryEnabled && (
                        <Badge variant="outline" className="text-xs">Memory</Badge>
                      )}
                      {template.skills.cronEnabled && (
                        <Badge variant="outline" className="text-xs">Scheduling</Badge>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {isSelected && template.id !== 'blank' && (
                <div className="mt-4 pt-3 border-t border-purple-200">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-purple-700 font-medium">
                      Template selected - you can customize in next steps
                    </span>
                    <ArrowRight className="h-4 w-4 text-purple-600" />
                  </div>
                </div>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
