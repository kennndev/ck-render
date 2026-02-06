'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Package, Search, Download, Check, Star, ExternalLink,
  RefreshCw, Filter, Code, Globe, Brain, Zap, Image,
  Calendar, Mic, FileText, Shield, Puzzle
} from 'lucide-react'

interface Skill {
  id: string
  name: string
  description: string
  category: string
  author: string
  version: string
  downloads: number
  rating: number
  installed: boolean
  requiresConfig: boolean
  configFields?: { key: string; label: string; placeholder: string; secret?: boolean }[]
  icon?: string
}

interface SkillsBrowserProps {
  instanceId: string
}

const CATEGORY_ICONS: Record<string, any> = {
  'search': Globe,
  'browser': Globe,
  'productivity': Calendar,
  'media': Image,
  'voice': Mic,
  'ai': Brain,
  'automation': Zap,
  'security': Shield,
  'document': FileText,
  'development': Code,
  'integration': Puzzle,
  'default': Package,
}

// Built-in skills registry (in production this would come from ClawHub API)
const SKILLS_REGISTRY: Skill[] = [
  {
    id: 'web-search',
    name: 'Web Search',
    description: 'Search the web using Brave Search API. Find current information, news, and answer questions about recent events.',
    category: 'search',
    author: 'OpenClaw',
    version: '1.2.0',
    downloads: 15420,
    rating: 4.8,
    installed: false,
    requiresConfig: true,
    configFields: [
      { key: 'BRAVE_API_KEY', label: 'Brave API Key', placeholder: 'BSA...', secret: true },
    ],
  },
  {
    id: 'browser',
    name: 'Web Browser',
    description: 'Navigate, read, and interact with web pages. Extract content, fill forms, and take screenshots.',
    category: 'browser',
    author: 'OpenClaw',
    version: '2.0.1',
    downloads: 12380,
    rating: 4.6,
    installed: false,
    requiresConfig: false,
  },
  {
    id: 'memory',
    name: 'Memory & RAG',
    description: 'Long-term memory with vector search. Remember conversations, facts, and retrieve relevant context.',
    category: 'ai',
    author: 'OpenClaw',
    version: '1.5.0',
    downloads: 18900,
    rating: 4.9,
    installed: false,
    requiresConfig: false,
  },
  {
    id: 'canvas',
    name: 'Image Generation',
    description: 'Generate images from text descriptions. Create diagrams, art, and visual content.',
    category: 'media',
    author: 'OpenClaw',
    version: '1.0.3',
    downloads: 8750,
    rating: 4.4,
    installed: false,
    requiresConfig: false,
  },
  {
    id: 'tts',
    name: 'Text-to-Speech',
    description: 'Convert text responses to natural-sounding speech using ElevenLabs voices.',
    category: 'voice',
    author: 'OpenClaw',
    version: '1.1.0',
    downloads: 6200,
    rating: 4.5,
    installed: false,
    requiresConfig: true,
    configFields: [
      { key: 'ELEVENLABS_API_KEY', label: 'ElevenLabs API Key', placeholder: 'el_...', secret: true },
    ],
  },
  {
    id: 'scheduler',
    name: 'Task Scheduler',
    description: 'Schedule recurring tasks using cron expressions, intervals, or one-shot timers. Automate daily reports, health checks, and more.',
    category: 'automation',
    author: 'OpenClaw',
    version: '1.3.0',
    downloads: 9800,
    rating: 4.7,
    installed: false,
    requiresConfig: false,
  },
  {
    id: 'code-exec',
    name: 'Code Execution',
    description: 'Safely execute Python, JavaScript, and shell scripts. Run data analysis, generate reports, and automate tasks.',
    category: 'development',
    author: 'OpenClaw',
    version: '1.0.0',
    downloads: 5400,
    rating: 4.3,
    installed: false,
    requiresConfig: false,
  },
  {
    id: 'pdf-reader',
    name: 'PDF Reader',
    description: 'Read, parse, and extract text from PDF documents. Summarize documents and answer questions about their content.',
    category: 'document',
    author: 'Community',
    version: '0.9.2',
    downloads: 4300,
    rating: 4.2,
    installed: false,
    requiresConfig: false,
  },
  {
    id: 'github',
    name: 'GitHub Integration',
    description: 'Interact with GitHub repos: create issues, review PRs, manage projects, and get notifications.',
    category: 'integration',
    author: 'Community',
    version: '1.1.0',
    downloads: 7600,
    rating: 4.5,
    installed: false,
    requiresConfig: true,
    configFields: [
      { key: 'GITHUB_TOKEN', label: 'GitHub Token', placeholder: 'ghp_...', secret: true },
    ],
  },
  {
    id: 'notion',
    name: 'Notion Integration',
    description: 'Read and write Notion pages, databases, and blocks. Manage your knowledge base from chat.',
    category: 'integration',
    author: 'Community',
    version: '0.8.0',
    downloads: 3200,
    rating: 4.1,
    installed: false,
    requiresConfig: true,
    configFields: [
      { key: 'NOTION_TOKEN', label: 'Notion Integration Token', placeholder: 'secret_...', secret: true },
    ],
  },
  {
    id: 'email',
    name: 'Email Sender',
    description: 'Send emails on behalf of the bot. Use for notifications, reports, and automated follow-ups.',
    category: 'automation',
    author: 'Community',
    version: '1.0.0',
    downloads: 4100,
    rating: 4.0,
    installed: false,
    requiresConfig: true,
    configFields: [
      { key: 'SMTP_HOST', label: 'SMTP Host', placeholder: 'smtp.gmail.com' },
      { key: 'SMTP_USER', label: 'SMTP User', placeholder: 'you@example.com' },
      { key: 'SMTP_PASS', label: 'SMTP Password', placeholder: '****', secret: true },
    ],
  },
  {
    id: 'weather',
    name: 'Weather Service',
    description: 'Get current weather, forecasts, and alerts for any location worldwide.',
    category: 'search',
    author: 'Community',
    version: '1.2.0',
    downloads: 5800,
    rating: 4.6,
    installed: false,
    requiresConfig: true,
    configFields: [
      { key: 'OPENWEATHER_API_KEY', label: 'OpenWeatherMap API Key', placeholder: '...', secret: true },
    ],
  },
]

const CATEGORIES = [
  'all', 'search', 'browser', 'ai', 'automation', 'media',
  'voice', 'development', 'document', 'integration', 'security',
]

export default function SkillsBrowser({ instanceId }: SkillsBrowserProps) {
  const [skills, setSkills] = useState<Skill[]>(SKILLS_REGISTRY)
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [installing, setInstalling] = useState<string | null>(null)
  const [configuringSkill, setConfiguringSkill] = useState<string | null>(null)
  const [skillConfig, setSkillConfig] = useState<Record<string, string>>({})

  const filteredSkills = skills.filter(skill => {
    const matchesSearch = skill.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      skill.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || skill.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const installSkill = async (skillId: string) => {
    const skill = skills.find(s => s.id === skillId)
    if (!skill) return

    if (skill.requiresConfig && !configuringSkill) {
      setConfiguringSkill(skillId)
      setSkillConfig({})
      return
    }

    setInstalling(skillId)
    try {
      await fetch('/api/instance/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skillId,
          config: skillConfig,
        }),
      })

      setSkills(skills.map(s =>
        s.id === skillId ? { ...s, installed: true } : s
      ))
      setConfiguringSkill(null)
      setSkillConfig({})
    } catch (error) {
      console.error('Failed to install skill:', error)
    } finally {
      setInstalling(null)
    }
  }

  const uninstallSkill = async (skillId: string) => {
    if (!confirm('Remove this skill?')) return
    try {
      await fetch('/api/instance/skills', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skillId }),
      })

      setSkills(skills.map(s =>
        s.id === skillId ? { ...s, installed: false } : s
      ))
    } catch (error) {
      console.error('Failed to uninstall skill:', error)
    }
  }

  const installedCount = skills.filter(s => s.installed).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Skills Marketplace
              </CardTitle>
              <CardDescription>
                Extend your bot with powerful skills and integrations. {installedCount} installed.
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-sm">
              {skills.length} Available
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search and Filter */}
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search skills..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Category Pills */}
          <div className="flex flex-wrap gap-2 mb-6">
            {CATEGORIES.map(cat => (
              <Button
                key={cat}
                variant={selectedCategory === cat ? 'default' : 'outline'}
                size="sm"
                className="text-xs capitalize"
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </Button>
            ))}
          </div>

          {/* Skills Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSkills.map(skill => {
              const Icon = CATEGORY_ICONS[skill.category] || CATEGORY_ICONS.default

              return (
                <Card key={skill.id} className={`relative overflow-hidden ${
                  skill.installed ? 'ring-1 ring-green-200 bg-green-50/30' : ''
                }`}>
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`p-2 rounded-lg ${
                          skill.installed ? 'bg-green-100' : 'bg-gray-100'
                        }`}>
                          <Icon className={`h-4 w-4 ${
                            skill.installed ? 'text-green-600' : 'text-gray-600'
                          }`} />
                        </div>
                        <div>
                          <h4 className="font-medium text-sm">{skill.name}</h4>
                          <p className="text-xs text-gray-500">v{skill.version} by {skill.author}</p>
                        </div>
                      </div>
                      {skill.installed && (
                        <Badge className="bg-green-600 text-xs">Installed</Badge>
                      )}
                    </div>

                    <p className="text-xs text-gray-600 mb-3 line-clamp-2">{skill.description}</p>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-0.5">
                          <Star className="h-3 w-3 text-yellow-500" />
                          {skill.rating}
                        </span>
                        <span className="flex items-center gap-0.5">
                          <Download className="h-3 w-3" />
                          {skill.downloads.toLocaleString()}
                        </span>
                      </div>

                      {skill.installed ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs text-red-600"
                          onClick={() => uninstallSkill(skill.id)}
                        >
                          Remove
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className="text-xs"
                          onClick={() => installSkill(skill.id)}
                          disabled={installing === skill.id}
                        >
                          {installing === skill.id ? (
                            <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                          ) : (
                            <Download className="h-3 w-3 mr-1" />
                          )}
                          {skill.requiresConfig ? 'Configure' : 'Install'}
                        </Button>
                      )}
                    </div>

                    {/* Config Form */}
                    {configuringSkill === skill.id && skill.configFields && (
                      <div className="mt-3 pt-3 border-t space-y-3">
                        <p className="text-xs font-medium text-gray-700">Configuration Required</p>
                        {skill.configFields.map(field => (
                          <div key={field.key}>
                            <label className="text-xs text-gray-600">{field.label}</label>
                            <Input
                              type={field.secret ? 'password' : 'text'}
                              placeholder={field.placeholder}
                              value={skillConfig[field.key] || ''}
                              onChange={(e) => setSkillConfig({
                                ...skillConfig,
                                [field.key]: e.target.value,
                              })}
                              className="h-8 text-xs"
                            />
                          </div>
                        ))}
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="text-xs"
                            onClick={() => installSkill(skill.id)}
                            disabled={installing === skill.id}
                          >
                            Install
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs"
                            onClick={() => {
                              setConfiguringSkill(null)
                              setSkillConfig({})
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>

          {filteredSkills.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Search className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="font-medium">No skills found</p>
              <p className="text-sm mt-1">Try a different search or category</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
