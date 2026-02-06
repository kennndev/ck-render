'use client'

import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Search, Globe, Mic, Layout, Clock, Brain, ExternalLink } from 'lucide-react'

const skills = [
  {
    key: 'webSearchEnabled',
    name: 'Web Search',
    icon: Search,
    description: 'Search the web for real-time information',
    badge: 'Popular',
    apiKeyField: 'braveApiKey',
    apiKeyLabel: 'Brave API Key',
    apiKeyPlaceholder: 'Enter Brave Search API key',
    getKeyUrl: 'https://brave.com/search/api/'
  },
  {
    key: 'browserEnabled',
    name: 'Browser Automation',
    icon: Globe,
    description: 'Navigate websites and extract information',
    badge: 'Advanced'
  },
  {
    key: 'ttsEnabled',
    name: 'Text-to-Speech',
    icon: Mic,
    description: 'Generate natural voice responses',
    apiKeyField: 'elevenlabsApiKey',
    apiKeyLabel: 'ElevenLabs API Key',
    apiKeyPlaceholder: 'Enter ElevenLabs API key',
    getKeyUrl: 'https://elevenlabs.io/'
  },
  {
    key: 'canvasEnabled',
    name: 'Canvas',
    icon: Layout,
    description: 'Visual workspace for agent interactions',
    badge: 'Beta'
  },
  {
    key: 'cronEnabled',
    name: 'Scheduled Tasks',
    icon: Clock,
    description: 'Run tasks on a schedule'
  },
  {
    key: 'memoryEnabled',
    name: 'Memory & RAG',
    icon: Brain,
    description: 'Remember context across conversations',
    badge: 'Pro'
  }
]

interface SkillsConfigProps {
  config: any
  onChange: (updates: any) => void
}

export default function SkillsConfig({ config, onChange }: SkillsConfigProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Enable Skills (Optional)</h3>
        <p className="text-sm text-gray-600 mb-4">
          Add extra capabilities to your AI assistant. You can skip this step and enable them later.
        </p>
      </div>

      <div className="space-y-4">
        {skills.map(skill => {
          const Icon = skill.icon
          const isEnabled = config[skill.key]

          return (
            <div key={skill.key}>
              <Card className="p-4">
                <div className="flex items-start space-x-3">
                  <Checkbox
                    checked={isEnabled}
                    onCheckedChange={(checked) => onChange({ [skill.key]: checked })}
                  />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <Icon className="h-5 w-5 text-purple-600" />
                      <span className="font-semibold">{skill.name}</span>
                      {skill.badge && (
                        <Badge variant="secondary" className="text-xs">{skill.badge}</Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{skill.description}</p>
                  </div>
                </div>

                {/* API Key Field */}
                {isEnabled && skill.apiKeyField && (
                  <div className="mt-4 pl-7">
                    <Label htmlFor={skill.apiKeyField} className="text-sm mb-2 block">
                      {skill.apiKeyLabel}
                      <span className="text-red-500 ml-1">*</span>
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id={skill.apiKeyField}
                        type="password"
                        placeholder={skill.apiKeyPlaceholder}
                        value={config[skill.apiKeyField] || ''}
                        onChange={(e) => onChange({ [skill.apiKeyField]: e.target.value })}
                      />
                      {skill.getKeyUrl && (
                        <button
                          type="button"
                          onClick={() => window.open(skill.getKeyUrl, '_blank')}
                          className="px-4 py-2 border rounded-md hover:bg-gray-50 flex items-center space-x-2"
                        >
                          <ExternalLink className="h-4 w-4" />
                          <span className="text-sm">Get Key</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            </div>
          )
        })}
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-900">
          <strong>Note:</strong> Skills can be enabled or disabled at any time from your dashboard after deployment.
        </p>
      </div>
    </div>
  )
}
