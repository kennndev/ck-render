'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Webhook, Plus, Copy, Trash2, RefreshCw, ExternalLink,
  CheckCircle2, AlertCircle, Eye, EyeOff, Zap, Globe
} from 'lucide-react'

interface WebhookEntry {
  id: string
  name: string
  path: string
  fullUrl: string
  type: 'wake' | 'agent' | 'custom'
  prompt?: string
  deliverTo?: string
  token: string
  enabled: boolean
  lastTriggered?: string
  triggerCount: number
}

interface WebhookManagerProps {
  instanceId: string
  accessUrl?: string
}

const INTEGRATION_RECIPES = [
  { name: 'GitHub Push', desc: 'Trigger on new commits', icon: Globe },
  { name: 'Zapier', desc: 'Connect to 5000+ apps', icon: Zap },
  { name: 'Stripe Payment', desc: 'React to payments', icon: Globe },
  { name: 'Form Submission', desc: 'Handle form data', icon: Globe },
]

export default function WebhookManager({ instanceId, accessUrl }: WebhookManagerProps) {
  const [webhooks, setWebhooks] = useState<WebhookEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [showTokenId, setShowTokenId] = useState<string | null>(null)

  const [newWebhook, setNewWebhook] = useState({
    name: '',
    type: 'agent' as 'wake' | 'agent' | 'custom',
    path: '',
    prompt: '',
    deliverTo: '',
  })

  useEffect(() => {
    fetchWebhooks()
  }, [])

  const fetchWebhooks = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/instance/webhooks')
      if (response.ok) {
        const data = await response.json()
        setWebhooks(data.webhooks || [])
      }
    } catch (error) {
      // Webhook endpoint may not be available yet
    } finally {
      setLoading(false)
    }
  }

  const createWebhook = async () => {
    if (!newWebhook.name) return
    setCreating(true)
    try {
      const response = await fetch('/api/instance/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newWebhook)
      })
      if (response.ok) {
        setShowCreate(false)
        setNewWebhook({ name: '', type: 'agent', path: '', prompt: '', deliverTo: '' })
        await fetchWebhooks()
      }
    } catch (error) {
      console.error('Failed to create webhook:', error)
    } finally {
      setCreating(false)
    }
  }

  const deleteWebhook = async (webhookId: string) => {
    if (!confirm('Delete this webhook endpoint?')) return
    try {
      await fetch('/api/instance/webhooks', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookId })
      })
      await fetchWebhooks()
    } catch (error) {
      console.error('Failed to delete webhook:', error)
    }
  }

  const copyUrl = (webhook: WebhookEntry) => {
    navigator.clipboard.writeText(webhook.fullUrl)
    setCopiedId(webhook.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const baseUrl = accessUrl || 'https://your-instance.railway.app'

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Webhook className="h-5 w-5" />
              Webhooks
            </CardTitle>
            <CardDescription>Create HTTP endpoints to trigger your bot from external services</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchWebhooks} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button size="sm" onClick={() => setShowCreate(!showCreate)}>
              <Plus className="h-4 w-4 mr-1" />
              New Webhook
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Built-in Endpoints Info */}
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-sm text-blue-900 mb-2">Built-in Webhook Endpoints</h4>
          <div className="space-y-1.5 text-sm text-blue-800">
            <div className="flex items-center gap-2">
              <code className="bg-blue-100 px-2 py-0.5 rounded text-xs">POST /hooks/wake</code>
              <span className="text-xs">Enqueue a system event to the main session</span>
            </div>
            <div className="flex items-center gap-2">
              <code className="bg-blue-100 px-2 py-0.5 rounded text-xs">POST /hooks/agent</code>
              <span className="text-xs">Run an isolated agent turn with optional delivery</span>
            </div>
          </div>
          <p className="text-xs text-blue-600 mt-2">
            Base URL: <code className="bg-blue-100 px-1 rounded">{baseUrl}</code>
          </p>
        </div>

        {/* Create Webhook Form */}
        {showCreate && (
          <div className="mb-6 p-4 border rounded-lg bg-gray-50 space-y-4">
            <h4 className="font-medium">Create Custom Webhook</h4>

            <div>
              <Label className="text-sm">Name</Label>
              <Input
                placeholder="e.g., GitHub Notifications, Stripe Events"
                value={newWebhook.name}
                onChange={(e) => setNewWebhook({ ...newWebhook, name: e.target.value })}
              />
            </div>

            <div>
              <Label className="text-sm">Type</Label>
              <div className="flex gap-2 mt-1">
                {(['wake', 'agent', 'custom'] as const).map(type => (
                  <Button
                    key={type}
                    variant={newWebhook.type === type ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setNewWebhook({ ...newWebhook, type })}
                    className="capitalize"
                  >
                    {type === 'wake' ? 'Wake (Main Session)' :
                     type === 'agent' ? 'Agent (Isolated)' :
                     'Custom Path'}
                  </Button>
                ))}
              </div>
            </div>

            {newWebhook.type === 'custom' && (
              <div>
                <Label className="text-sm">Custom Path</Label>
                <div className="flex items-center gap-1">
                  <span className="text-sm text-gray-500">/hooks/</span>
                  <Input
                    placeholder="my-webhook"
                    value={newWebhook.path}
                    onChange={(e) => setNewWebhook({ ...newWebhook, path: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>
            )}

            {newWebhook.type === 'agent' && (
              <div>
                <Label className="text-sm">Agent Prompt (what should the bot do with the payload?)</Label>
                <textarea
                  placeholder="e.g., 'Summarize this GitHub push event and notify the team'"
                  value={newWebhook.prompt}
                  onChange={(e) => setNewWebhook({ ...newWebhook, prompt: e.target.value })}
                  className="w-full min-h-[60px] rounded-md border border-input bg-white px-3 py-2 text-sm"
                />
              </div>
            )}

            <div>
              <Label className="text-sm">Deliver results to (optional)</Label>
              <Input
                placeholder="Channel or user (e.g., #general)"
                value={newWebhook.deliverTo}
                onChange={(e) => setNewWebhook({ ...newWebhook, deliverTo: e.target.value })}
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={createWebhook} disabled={creating || !newWebhook.name}>
                {creating ? 'Creating...' : 'Create Webhook'}
              </Button>
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            </div>
          </div>
        )}

        {/* Webhooks List */}
        {loading ? (
          <div className="text-center py-8 text-gray-500">
            <RefreshCw className="h-8 w-8 mx-auto mb-2 animate-spin opacity-50" />
          </div>
        ) : webhooks.length === 0 && !showCreate ? (
          <div className="text-center py-8 text-gray-500">
            <Webhook className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p className="font-medium">No custom webhooks</p>
            <p className="text-sm mt-1">Create webhooks to connect external services to your bot</p>
          </div>
        ) : (
          <div className="space-y-2">
            {webhooks.map((webhook) => (
              <div key={webhook.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`p-2 rounded-lg ${webhook.enabled ? 'bg-green-100' : 'bg-gray-100'}`}>
                    <Webhook className={`h-4 w-4 ${webhook.enabled ? 'text-green-600' : 'text-gray-400'}`} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{webhook.name}</span>
                      <Badge variant="outline" className="text-xs capitalize">{webhook.type}</Badge>
                    </div>
                    <p className="text-xs text-gray-500 font-mono truncate">{webhook.fullUrl}</p>
                    {webhook.lastTriggered && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        Last triggered: {new Date(webhook.lastTriggered).toLocaleString()} ({webhook.triggerCount} total)
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 ml-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyUrl(webhook)}
                  >
                    {copiedId === webhook.id ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteWebhook(webhook.id)}
                    className="text-red-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Integration Recipes */}
        <div className="mt-6 pt-4 border-t">
          <h4 className="text-sm font-medium mb-3">Integration Ideas</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {INTEGRATION_RECIPES.map((recipe) => {
              const Icon = recipe.icon
              return (
                <div key={recipe.name} className="p-2.5 border rounded-lg text-center hover:bg-gray-50 transition cursor-pointer">
                  <Icon className="h-5 w-5 text-purple-600 mx-auto mb-1" />
                  <p className="text-xs font-medium">{recipe.name}</p>
                  <p className="text-xs text-gray-500">{recipe.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
