'use client'

import { useState } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ExternalLink, Eye, EyeOff, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ProviderConfigProps {
  config: any
  onChange: (updates: any) => void
}

export default function ProviderConfig({ config, onChange }: ProviderConfigProps) {
  const [showApiKey, setShowApiKey] = useState(false)

  const providers = [
    {
      id: 'ANTHROPIC',
      name: 'Anthropic Claude',
      description: 'Best for reasoning, long context, and complex tasks',
      badge: 'Recommended',
      models: [
        { id: 'anthropic/claude-opus-4-5', name: 'Claude Opus 4.5 (Most Capable)' },
        { id: 'anthropic/claude-sonnet-4-5', name: 'Claude Sonnet 4.5 (Balanced)' },
      ],
      getKeyUrl: 'https://console.anthropic.com/settings/keys'
    },
    {
      id: 'OPENAI',
      name: 'OpenAI GPT',
      description: 'Great for general tasks and fast responses',
      models: [
        { id: 'openai/gpt-5.2', name: 'GPT-5.2 (Latest)' },
        { id: 'openai/gpt-5.2-mini', name: 'GPT-5.2 Mini (Faster)' },
      ],
      getKeyUrl: 'https://platform.openai.com/api-keys'
    },
    {
      id: 'OPENROUTER',
      name: 'OpenRouter',
      description: 'Access 100+ models (Claude, GPT, Llama, Mistral, etc.) through one API key',
      badge: '100+ Models',
      models: [
        { id: 'anthropic/claude-opus-4-5', name: 'Claude Opus 4.5 (via OpenRouter)' },
        { id: 'anthropic/claude-sonnet-4-5', name: 'Claude Sonnet 4.5 (via OpenRouter)' },
        { id: 'openai/gpt-5.2', name: 'GPT-5.2 (via OpenRouter)' },
        { id: 'meta-llama/llama-3.3-70b', name: 'Llama 3.3 70B' },
        { id: 'mistralai/mistral-large', name: 'Mistral Large' },
        { id: 'google/gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
      ],
      getKeyUrl: 'https://openrouter.ai/keys'
    },
    {
      id: 'BEDROCK',
      name: 'Amazon Bedrock',
      description: 'Enterprise AWS integration for Claude, Llama, and more',
      badge: 'Enterprise',
      models: [
        { id: 'bedrock/anthropic.claude-opus-4-5', name: 'Claude Opus 4.5 (Bedrock)' },
        { id: 'bedrock/anthropic.claude-sonnet-4-5', name: 'Claude Sonnet 4.5 (Bedrock)' },
        { id: 'bedrock/meta.llama3-3-70b', name: 'Llama 3.3 70B (Bedrock)' },
      ],
      getKeyUrl: 'https://console.aws.amazon.com/bedrock/'
    },
    {
      id: 'VERCEL',
      name: 'Vercel AI Gateway',
      description: 'Unified gateway with caching, rate limiting, and observability',
      models: [
        { id: 'vercel/anthropic/claude-opus-4-5', name: 'Claude Opus 4.5 (Vercel)' },
        { id: 'vercel/openai/gpt-5.2', name: 'GPT-5.2 (Vercel)' },
      ],
      getKeyUrl: 'https://vercel.com/dashboard'
    },
  ]

  const selectedProvider = providers.find(p => p.id === config.provider)

  return (
    <div className="space-y-6">
      {/* Provider Selection */}
      <div>
        <Label className="text-lg mb-4 block">Choose AI Provider</Label>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {providers.map(provider => (
            <Card
              key={provider.id}
              className={`p-4 cursor-pointer transition-all ${
                config.provider === provider.id
                  ? 'ring-2 ring-purple-600 bg-purple-50/50'
                  : 'hover:shadow-md'
              }`}
              onClick={() => onChange({ provider: provider.id, model: '' })}
            >
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-semibold text-sm">{provider.name}</h4>
                {provider.badge && (
                  <Badge variant="secondary" className="text-xs">
                    {provider.badge}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-gray-600">{provider.description}</p>
            </Card>
          ))}
        </div>
      </div>

      {/* API Key Input */}
      <div>
        <Label htmlFor="apiKey" className="text-lg mb-2 block">
          API Key
        </Label>
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
          <Shield className="h-4 w-4 text-green-600" />
          <span>Your API key is encrypted with AES-256-GCM and never shared.</span>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              id="apiKey"
              type={showApiKey ? 'text' : 'password'}
              placeholder={`Enter your ${selectedProvider?.name || ''} API key`}
              value={config.apiKey}
              onChange={(e) => onChange({ apiKey: e.target.value })}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowApiKey(!showApiKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              {showApiKey ? (
                <EyeOff className="h-4 w-4 text-gray-400" />
              ) : (
                <Eye className="h-4 w-4 text-gray-400" />
              )}
            </button>
          </div>
          {selectedProvider?.getKeyUrl && (
            <Button
              variant="outline"
              onClick={() => window.open(selectedProvider.getKeyUrl, '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Get Key
            </Button>
          )}
        </div>
      </div>

      {/* Model Selection */}
      <div>
        <Label htmlFor="model" className="text-lg mb-2 block">
          Model
        </Label>
        <p className="text-sm text-gray-600 mb-3">
          Default is the most capable model. Advanced users can override this.
        </p>
        <select
          id="model"
          className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={config.model}
          onChange={(e) => onChange({ model: e.target.value })}
        >
          <option value="">Default (Recommended)</option>
          {selectedProvider?.models.map(model => (
            <option key={model.id} value={model.id}>
              {model.name}
            </option>
          ))}
        </select>
      </div>

      {/* Failover Model */}
      <div>
        <Label htmlFor="failoverModel" className="text-sm mb-2 block text-gray-600">
          Failover Model (Optional)
        </Label>
        <p className="text-xs text-gray-500 mb-2">
          If the primary model fails, OpenClaw will automatically switch to this model.
        </p>
        <select
          id="failoverModel"
          className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={config.failoverModel || ''}
          onChange={(e) => onChange({ failoverModel: e.target.value })}
        >
          <option value="">None</option>
          {selectedProvider?.models
            .filter(m => m.id !== config.model)
            .map(model => (
              <option key={model.id} value={model.id}>
                {model.name}
              </option>
            ))}
        </select>
      </div>
    </div>
  )
}
