'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  MessageSquare, Send, Hash, Zap, Phone, Mail, Grid, Users,
  Globe, Radio, Tv, Smartphone, Cloud, Shield, ChevronDown, ChevronUp
} from 'lucide-react'

interface ChannelField {
  key: string
  label: string
  placeholder: string
  type: string
  required?: boolean
}

interface Channel {
  type: string
  name: string
  icon: any
  description: string
  badge?: string
  popular?: boolean
  category: 'popular' | 'enterprise' | 'privacy' | 'developer'
  fields?: ChannelField[]
  helpUrl?: string
}

const availableChannels: Channel[] = [
  // --- Popular ---
  {
    type: 'WHATSAPP',
    name: 'WhatsApp',
    icon: MessageSquare,
    description: 'Scan QR code after deployment',
    badge: 'No API needed',
    popular: true,
    category: 'popular',
    fields: [
      { key: 'allowlist', label: 'Allowed Phone Numbers (optional)', placeholder: '+1234567890, +9876543210', type: 'text' }
    ]
  },
  {
    type: 'TELEGRAM',
    name: 'Telegram',
    icon: Send,
    description: 'Create bot with @BotFather',
    popular: true,
    category: 'popular',
    fields: [
      { key: 'botToken', label: 'Bot Token', placeholder: '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11', type: 'password', required: true },
      { key: 'allowlist', label: 'Allowed Usernames (optional)', placeholder: '@username1, @username2', type: 'text' }
    ],
    helpUrl: 'https://t.me/botfather'
  },
  {
    type: 'DISCORD',
    name: 'Discord',
    icon: Hash,
    description: 'Create bot in Discord Developer Portal',
    popular: true,
    category: 'popular',
    fields: [
      { key: 'token', label: 'Bot Token', placeholder: 'Your bot token', type: 'password', required: true },
      { key: 'applicationId', label: 'Application ID', placeholder: 'Your application ID', type: 'text', required: true },
      { key: 'guilds', label: 'Server IDs (optional)', placeholder: '123456789, 987654321', type: 'text' }
    ],
    helpUrl: 'https://discord.com/developers/applications'
  },
  {
    type: 'WEBCHAT',
    name: 'Web Chat',
    icon: Globe,
    description: 'Embeddable chat widget for your website',
    badge: 'No API needed',
    category: 'popular',
  },
  // --- Enterprise ---
  {
    type: 'SLACK',
    name: 'Slack',
    icon: Zap,
    description: 'Create app in Slack API',
    category: 'enterprise',
    fields: [
      { key: 'botToken', label: 'Bot Token', placeholder: 'xoxb-...', type: 'password', required: true },
      { key: 'appToken', label: 'App Token', placeholder: 'xapp-...', type: 'password', required: true }
    ],
    helpUrl: 'https://api.slack.com/apps'
  },
  {
    type: 'MSTEAMS',
    name: 'MS Teams',
    icon: Users,
    description: 'Microsoft Teams bot',
    category: 'enterprise',
    fields: [
      { key: 'appId', label: 'App ID', placeholder: 'Your app ID', type: 'text', required: true },
      { key: 'appPassword', label: 'App Password', placeholder: 'Your app password', type: 'password', required: true }
    ]
  },
  {
    type: 'GOOGLE_CHAT',
    name: 'Google Chat',
    icon: Mail,
    description: 'Service account from Google Cloud',
    category: 'enterprise',
    fields: [
      { key: 'serviceAccount', label: 'Service Account JSON', placeholder: 'Paste JSON here', type: 'textarea', required: true }
    ],
    helpUrl: 'https://console.cloud.google.com'
  },
  {
    type: 'LINE',
    name: 'LINE',
    icon: MessageSquare,
    description: 'Popular in Japan and Southeast Asia',
    category: 'enterprise',
    fields: [
      { key: 'channelAccessToken', label: 'Channel Access Token', placeholder: 'Your token', type: 'password', required: true },
      { key: 'channelSecret', label: 'Channel Secret', placeholder: 'Your secret', type: 'password', required: true }
    ],
    helpUrl: 'https://developers.line.biz'
  },
  {
    type: 'FEISHU',
    name: 'Feishu / Lark',
    icon: Cloud,
    description: 'Popular in China and Asia',
    category: 'enterprise',
    fields: [
      { key: 'appId', label: 'App ID', placeholder: 'Your app ID', type: 'text', required: true },
      { key: 'appSecret', label: 'App Secret', placeholder: 'Your app secret', type: 'password', required: true }
    ],
    helpUrl: 'https://open.feishu.cn'
  },
  {
    type: 'MATTERMOST',
    name: 'Mattermost',
    icon: Hash,
    description: 'Open-source Slack alternative',
    category: 'enterprise',
    fields: [
      { key: 'url', label: 'Server URL', placeholder: 'https://mattermost.example.com', type: 'url', required: true },
      { key: 'token', label: 'Bot Token', placeholder: 'Your bot token', type: 'password', required: true }
    ]
  },
  // --- Privacy-focused ---
  {
    type: 'SIGNAL',
    name: 'Signal',
    icon: Shield,
    description: 'Privacy-focused messaging',
    category: 'privacy',
    fields: [
      { key: 'phoneNumber', label: 'Phone Number', placeholder: '+1234567890', type: 'tel', required: true }
    ]
  },
  {
    type: 'MATRIX',
    name: 'Matrix',
    icon: Grid,
    description: 'Decentralized, open-source protocol',
    category: 'privacy',
    fields: [
      { key: 'homeserverUrl', label: 'Homeserver URL', placeholder: 'https://matrix.org', type: 'url', required: true },
      { key: 'accessToken', label: 'Access Token', placeholder: 'Your access token', type: 'password', required: true },
      { key: 'userId', label: 'User ID', placeholder: '@bot:matrix.org', type: 'text', required: true }
    ]
  },
  {
    type: 'NOSTR',
    name: 'Nostr',
    icon: Radio,
    description: 'Decentralized social protocol',
    category: 'privacy',
    fields: [
      { key: 'privateKey', label: 'Private Key (nsec)', placeholder: 'nsec1...', type: 'password', required: true }
    ]
  },
  {
    type: 'NEXTCLOUD_TALK',
    name: 'Nextcloud Talk',
    icon: Cloud,
    description: 'Self-hosted collaboration',
    category: 'privacy',
    fields: [
      { key: 'serverUrl', label: 'Server URL', placeholder: 'https://cloud.example.com', type: 'url', required: true },
      { key: 'username', label: 'Username', placeholder: 'botuser', type: 'text', required: true },
      { key: 'password', label: 'Password', placeholder: 'App password', type: 'password', required: true }
    ]
  },
  // --- Developer/Niche ---
  {
    type: 'TWITCH',
    name: 'Twitch',
    icon: Tv,
    description: 'Live streaming chat bot',
    category: 'developer',
    fields: [
      { key: 'username', label: 'Bot Username', placeholder: 'mybotname', type: 'text', required: true },
      { key: 'oauthToken', label: 'OAuth Token', placeholder: 'oauth:...', type: 'password', required: true },
      { key: 'channels', label: 'Channels (comma-separated)', placeholder: 'channel1, channel2', type: 'text', required: true }
    ],
    helpUrl: 'https://dev.twitch.tv/console'
  },
  {
    type: 'ZALO',
    name: 'Zalo',
    icon: MessageSquare,
    description: 'Popular in Vietnam',
    category: 'developer',
    fields: [
      { key: 'oaId', label: 'OA ID', placeholder: 'Your OA ID', type: 'text', required: true },
      { key: 'accessToken', label: 'Access Token', placeholder: 'Your access token', type: 'password', required: true }
    ]
  },
  {
    type: 'BLUEBUBBLES',
    name: 'iMessage',
    icon: Smartphone,
    description: 'Via BlueBubbles (requires Mac server)',
    badge: 'macOS',
    category: 'developer',
    fields: [
      { key: 'serverUrl', label: 'BlueBubbles Server URL', placeholder: 'http://localhost:1234', type: 'url', required: true },
      { key: 'password', label: 'Server Password', placeholder: 'Your password', type: 'password', required: true }
    ]
  },
]

const CATEGORY_LABELS: Record<string, { label: string; description: string }> = {
  popular: { label: 'Popular', description: 'Most commonly used platforms' },
  enterprise: { label: 'Enterprise', description: 'Business communication tools' },
  privacy: { label: 'Privacy-Focused', description: 'Decentralized & encrypted platforms' },
  developer: { label: 'Developer & Niche', description: 'Specialized and regional platforms' },
}

interface ChannelSelectorProps {
  channels: any[]
  onChange: (channels: any[]) => void
}

export default function ChannelSelector({ channels, onChange }: ChannelSelectorProps) {
  const [selectedChannels, setSelectedChannels] = useState<string[]>(
    channels.map(c => c.type) || []
  )
  const [channelConfigs, setChannelConfigs] = useState<Record<string, any>>(
    channels.reduce((acc: any, c: any) => ({ ...acc, [c.type]: c.config }), {})
  )
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['popular'])

  const toggleChannel = (channelType: string) => {
    const newSelected = selectedChannels.includes(channelType)
      ? selectedChannels.filter(c => c !== channelType)
      : [...selectedChannels, channelType]

    setSelectedChannels(newSelected)
    updateChannels(newSelected, channelConfigs)
  }

  const updateChannelConfig = (channelType: string, field: string, value: string) => {
    const newConfigs = {
      ...channelConfigs,
      [channelType]: {
        ...channelConfigs[channelType],
        [field]: value
      }
    }
    setChannelConfigs(newConfigs)
    updateChannels(selectedChannels, newConfigs)
  }

  const updateChannels = (selected: string[], configs: Record<string, any>) => {
    const newChannels = selected.map(type => ({
      type,
      config: configs[type] || {}
    }))
    onChange(newChannels)
  }

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    )
  }

  const categories = ['popular', 'enterprise', 'privacy', 'developer']

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Select Channels</h3>
        <p className="text-sm text-gray-600 mb-1">
          Choose which messaging platforms you want to connect your bot to.
        </p>
        {selectedChannels.length > 0 && (
          <p className="text-sm text-purple-600 font-medium">
            {selectedChannels.length} channel{selectedChannels.length !== 1 ? 's' : ''} selected
          </p>
        )}
      </div>

      {categories.map(category => {
        const channelsInCategory = availableChannels.filter(c => c.category === category)
        const selectedInCategory = channelsInCategory.filter(c => selectedChannels.includes(c.type)).length
        const isExpanded = expandedCategories.includes(category)
        const meta = CATEGORY_LABELS[category]

        return (
          <div key={category} className="border rounded-lg">
            <button
              className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition"
              onClick={() => toggleCategory(category)}
            >
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{meta.label}</span>
                <span className="text-xs text-gray-500">{meta.description}</span>
                {selectedInCategory > 0 && (
                  <Badge variant="default" className="text-xs">
                    {selectedInCategory} selected
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">{channelsInCategory.length} channels</span>
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-gray-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                )}
              </div>
            </button>

            {isExpanded && (
              <div className="p-3 pt-0">
                <div className="grid md:grid-cols-2 gap-3">
                  {channelsInCategory.map(channel => {
                    const Icon = channel.icon
                    const isSelected = selectedChannels.includes(channel.type)

                    return (
                      <div key={channel.type}>
                        <Card
                          className={`p-4 cursor-pointer transition-all ${
                            isSelected ? 'ring-2 ring-purple-600 bg-purple-50/50' : 'hover:shadow-md'
                          }`}
                          onClick={() => toggleChannel(channel.type)}
                        >
                          <div className="flex items-start space-x-3">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleChannel(channel.type)}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <Icon className="h-5 w-5 text-purple-600" />
                                <span className="font-semibold text-sm">{channel.name}</span>
                                {channel.popular && (
                                  <Badge variant="secondary" className="text-xs">Popular</Badge>
                                )}
                                {channel.badge && (
                                  <Badge className="text-xs bg-green-500">{channel.badge}</Badge>
                                )}
                              </div>
                              <p className="text-xs text-gray-600">{channel.description}</p>
                              {channel.helpUrl && (
                                <a
                                  href={channel.helpUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-purple-600 hover:underline mt-1 inline-block"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  Setup Guide
                                </a>
                              )}
                            </div>
                          </div>
                        </Card>

                        {/* Configuration Fields */}
                        {isSelected && channel.fields && (
                          <Card className="mt-2 p-4 bg-purple-50">
                            <div className="space-y-3">
                              {channel.fields.map(field => (
                                <div key={field.key}>
                                  <Label htmlFor={`${channel.type}-${field.key}`} className="text-sm">
                                    {field.label}
                                    {field.required && <span className="text-red-500 ml-1">*</span>}
                                  </Label>
                                  {field.type === 'textarea' ? (
                                    <textarea
                                      id={`${channel.type}-${field.key}`}
                                      placeholder={field.placeholder}
                                      value={channelConfigs[channel.type]?.[field.key] || ''}
                                      onChange={(e) => updateChannelConfig(channel.type, field.key, e.target.value)}
                                      className="w-full min-h-[100px] rounded-md border border-input bg-white px-3 py-2 text-sm"
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                  ) : (
                                    <Input
                                      id={`${channel.type}-${field.key}`}
                                      type={field.type}
                                      placeholder={field.placeholder}
                                      value={channelConfigs[channel.type]?.[field.key] || ''}
                                      onChange={(e) => updateChannelConfig(channel.type, field.key, e.target.value)}
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                  )}
                                </div>
                              ))}
                            </div>
                          </Card>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )
      })}

      {selectedChannels.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          Select at least one channel to continue
        </div>
      )}
    </div>
  )
}
