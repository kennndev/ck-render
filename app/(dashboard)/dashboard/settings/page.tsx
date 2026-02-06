'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Bot, ArrowLeft, Key, Plus, Trash2, Copy, CheckCircle2,
  Eye, EyeOff, Settings, Shield, Clock, AlertCircle,
  Code, Save, RefreshCw
} from 'lucide-react'

interface ApiKeyEntry {
  id: string
  name: string
  key?: string
  keyPrefix: string
  lastUsedAt: string | null
  expiresAt: string | null
  createdAt: string
}

export default function SettingsPage() {
  const router = useRouter()
  const [instance, setInstance] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // API Keys
  const [apiKeys, setApiKeys] = useState<ApiKeyEntry[]>([])
  const [showCreateKey, setShowCreateKey] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [newKeyExpiry, setNewKeyExpiry] = useState('')
  const [creatingKey, setCreatingKey] = useState(false)
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null)
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null)

  // Config editing
  const [config, setConfig] = useState<any>(null)
  const [configEdits, setConfigEdits] = useState<Record<string, any>>({})
  const [savingConfig, setSavingConfig] = useState(false)
  const [configSaved, setConfigSaved] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/instance/status').then(r => r.json()),
      fetch('/api/v1/keys').then(r => r.json()),
      fetch('/api/instance/config').then(r => r.json()),
    ]).then(([statusData, keysData, configData]) => {
      setInstance(statusData.instance)
      setApiKeys(keysData.keys || [])
      setConfig(configData)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const createApiKey = async () => {
    if (!newKeyName) return
    setCreatingKey(true)
    try {
      const res = await fetch('/api/v1/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newKeyName,
          expiresInDays: newKeyExpiry ? parseInt(newKeyExpiry) : undefined,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setNewlyCreatedKey(data.key)
        setApiKeys([...apiKeys, { ...data, keyPrefix: data.key.substring(0, 12) + '...' }])
        setShowCreateKey(false)
        setNewKeyName('')
        setNewKeyExpiry('')
      }
    } catch (error) {
      console.error('Failed to create API key:', error)
    } finally {
      setCreatingKey(false)
    }
  }

  const deleteApiKey = async (keyId: string) => {
    if (!confirm('Delete this API key? This cannot be undone.')) return
    try {
      await fetch('/api/v1/keys', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyId }),
      })
      setApiKeys(apiKeys.filter(k => k.id !== keyId))
    } catch (error) {
      console.error('Failed to delete API key:', error)
    }
  }

  const copyKey = (key: string, id: string) => {
    navigator.clipboard.writeText(key)
    setCopiedKeyId(id)
    setTimeout(() => setCopiedKeyId(null), 2000)
  }

  const updateConfigField = (field: string, value: any) => {
    setConfigEdits({ ...configEdits, [field]: value })
    setConfigSaved(false)
  }

  const saveConfig = async () => {
    if (Object.keys(configEdits).length === 0) return
    setSavingConfig(true)
    try {
      const res = await fetch('/api/instance/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configEdits),
      })
      if (res.ok) {
        setConfig({ ...config, ...configEdits })
        setConfigEdits({})
        setConfigSaved(true)
        setTimeout(() => setConfigSaved(false), 3000)
      }
    } catch (error) {
      console.error('Failed to save config:', error)
    } finally {
      setSavingConfig(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Bot className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Dashboard
          </Button>
          <h1 className="text-lg font-bold">Settings</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-3xl space-y-6">
        {/* Inline Config Editing */}
        {config && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Bot Configuration
              </CardTitle>
              <CardDescription>
                Edit your bot's settings without redeploying. Changes are applied automatically.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm">Agent Name</Label>
                <Input
                  value={configEdits.agentName ?? config.agentName ?? ''}
                  onChange={(e) => updateConfigField('agentName', e.target.value)}
                  placeholder="Your bot's name"
                />
              </div>

              <div>
                <Label className="text-sm">Model</Label>
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={configEdits.model ?? config.model ?? ''}
                  onChange={(e) => updateConfigField('model', e.target.value)}
                >
                  <option value="">Default</option>
                  <option value="anthropic/claude-opus-4-5">Claude Opus 4.5</option>
                  <option value="anthropic/claude-sonnet-4-5">Claude Sonnet 4.5</option>
                  <option value="openai/gpt-5.2">GPT-5.2</option>
                  <option value="openai/gpt-5.2-mini">GPT-5.2 Mini</option>
                </select>
              </div>

              <div>
                <Label className="text-sm">System Prompt</Label>
                <textarea
                  value={configEdits.systemPrompt ?? config.systemPrompt ?? ''}
                  onChange={(e) => updateConfigField('systemPrompt', e.target.value)}
                  placeholder="Define your bot's behavior..."
                  className="w-full min-h-[120px] rounded-md border border-input bg-white px-3 py-2 text-sm font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm">Thinking Mode</Label>
                  <select
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={configEdits.thinkingMode ?? config.thinkingMode ?? 'high'}
                    onChange={(e) => updateConfigField('thinkingMode', e.target.value)}
                  >
                    <option value="high">High (Deep reasoning)</option>
                    <option value="medium">Medium (Balanced)</option>
                    <option value="low">Low (Fast)</option>
                    <option value="none">None</option>
                  </select>
                </div>
                <div>
                  <Label className="text-sm">Session Mode</Label>
                  <select
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={configEdits.sessionMode ?? config.sessionMode ?? 'per-sender'}
                    onChange={(e) => updateConfigField('sessionMode', e.target.value)}
                  >
                    <option value="per-sender">Per Sender</option>
                    <option value="per-channel">Per Channel</option>
                    <option value="global">Global</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  {configSaved && (
                    <span className="text-sm text-green-600 flex items-center gap-1">
                      <CheckCircle2 className="h-4 w-4" />
                      Saved & deploying
                    </span>
                  )}
                </div>
                <Button
                  onClick={saveConfig}
                  disabled={savingConfig || Object.keys(configEdits).length === 0}
                >
                  {savingConfig ? (
                    <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-1" />
                  )}
                  {savingConfig ? 'Saving...' : 'Save & Redeploy'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* API Keys */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  API Keys
                </CardTitle>
                <CardDescription>
                  Manage API keys for programmatic access to your instance via the REST API.
                </CardDescription>
              </div>
              <Button size="sm" onClick={() => setShowCreateKey(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Create Key
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Newly created key banner */}
            {newlyCreatedKey && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm font-medium text-yellow-800">
                    Save your API key now - it won't be shown again
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <code className="flex-1 bg-white px-3 py-2 rounded border text-sm font-mono break-all">
                    {newlyCreatedKey}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(newlyCreatedKey)
                      setCopiedKeyId('new')
                      setTimeout(() => setCopiedKeyId(null), 2000)
                    }}
                  >
                    {copiedKeyId === 'new' ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 text-xs"
                  onClick={() => setNewlyCreatedKey(null)}
                >
                  Dismiss
                </Button>
              </div>
            )}

            {/* Create Key Form */}
            {showCreateKey && (
              <div className="mb-4 p-4 border rounded-lg bg-gray-50 space-y-3">
                <h4 className="font-medium text-sm">Create API Key</h4>
                <div>
                  <Label className="text-sm">Key Name</Label>
                  <Input
                    placeholder="e.g., Production, CI/CD, Mobile App"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-sm">Expires in (days, optional)</Label>
                  <Input
                    type="number"
                    placeholder="Leave blank for no expiry"
                    value={newKeyExpiry}
                    onChange={(e) => setNewKeyExpiry(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={createApiKey} disabled={creatingKey || !newKeyName}>
                    {creatingKey ? 'Creating...' : 'Create Key'}
                  </Button>
                  <Button variant="outline" onClick={() => setShowCreateKey(false)}>Cancel</Button>
                </div>
              </div>
            )}

            {/* Keys List */}
            {apiKeys.length === 0 && !showCreateKey ? (
              <div className="text-center py-8 text-gray-500">
                <Key className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p className="font-medium">No API keys</p>
                <p className="text-sm mt-1">Create an API key to access the developer REST API</p>
              </div>
            ) : (
              <div className="space-y-2">
                {apiKeys.map(key => (
                  <div
                    key={key.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{key.name}</span>
                        {key.expiresAt && new Date(key.expiresAt) < new Date() && (
                          <Badge variant="destructive" className="text-xs">Expired</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                        <code>{key.keyPrefix}</code>
                        {key.lastUsedAt && (
                          <span>Last used: {new Date(key.lastUsedAt).toLocaleDateString()}</span>
                        )}
                        {key.expiresAt && (
                          <span>Expires: {new Date(key.expiresAt).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteApiKey(key.id)}
                      className="text-red-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* API Usage Example */}
            <div className="mt-6 p-4 bg-gray-900 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Code className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-400">API Usage Example</span>
              </div>
              <pre className="text-xs text-green-400 overflow-x-auto">
{`curl -H "Authorization: Bearer knt_your_key_here" \\
  ${typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com'}/api/v1/instances`}
              </pre>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
