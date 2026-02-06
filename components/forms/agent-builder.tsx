'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Bot, Plus, Trash2, ChevronDown, ChevronUp, Settings,
  MessageSquare, Brain, Zap, ArrowRight, Copy
} from 'lucide-react'

interface Agent {
  id: string
  name: string
  model: string
  systemPrompt: string
  channels: string[]
  tools: string[]
}

interface AgentBuilderProps {
  instanceId: string
  accessUrl?: string
}

const AVAILABLE_TOOLS = [
  { id: 'web-search', name: 'Web Search', description: 'Search the internet' },
  { id: 'browser', name: 'Browser', description: 'Navigate web pages' },
  { id: 'memory', name: 'Memory', description: 'Remember conversations' },
  { id: 'canvas', name: 'Canvas', description: 'Generate images' },
  { id: 'cron', name: 'Scheduler', description: 'Run on schedule' },
  { id: 'tts', name: 'Text-to-Speech', description: 'Voice responses' },
]

const CHANNEL_OPTIONS = [
  'whatsapp', 'telegram', 'discord', 'slack', 'webchat',
  'signal', 'matrix', 'msteams', 'line', 'mattermost',
]

const MODEL_OPTIONS = [
  { id: 'anthropic/claude-opus-4-5', name: 'Claude Opus 4.5' },
  { id: 'anthropic/claude-sonnet-4-5', name: 'Claude Sonnet 4.5' },
  { id: 'openai/gpt-5.2', name: 'GPT-5.2' },
  { id: 'openai/gpt-5.2-mini', name: 'GPT-5.2 Mini' },
  { id: 'meta-llama/llama-3.3-70b', name: 'Llama 3.3 70B' },
  { id: 'google/gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
]

export default function AgentBuilder({ instanceId, accessUrl }: AgentBuilderProps) {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<string | null>(null)

  const [showCreate, setShowCreate] = useState(false)
  const [newAgent, setNewAgent] = useState<Omit<Agent, 'id'>>({
    name: '',
    model: 'anthropic/claude-sonnet-4-5',
    systemPrompt: '',
    channels: [],
    tools: [],
  })

  // Load existing agents on mount
  useEffect(() => {
    async function loadAgents() {
      try {
        const res = await fetch('/api/instance/agents')
        if (res.ok) {
          const data = await res.json()
          if (data.agents && data.agents.length > 0) {
            setAgents(data.agents)
          }
        }
      } catch (error) {
        console.error('Failed to load agents:', error)
      } finally {
        setLoading(false)
      }
    }
    loadAgents()
  }, [])

  const addAgent = () => {
    if (!newAgent.name) return
    const agent: Agent = {
      ...newAgent,
      id: `agent-${Date.now()}`,
    }
    setAgents([...agents, agent])
    setNewAgent({
      name: '',
      model: 'anthropic/claude-sonnet-4-5',
      systemPrompt: '',
      channels: [],
      tools: [],
    })
    setShowCreate(false)
    setExpandedAgent(agent.id)
  }

  const removeAgent = (id: string) => {
    if (!confirm('Remove this agent?')) return
    setAgents(agents.filter(a => a.id !== id))
    if (expandedAgent === id) setExpandedAgent(null)
  }

  const updateAgent = (id: string, updates: Partial<Agent>) => {
    setAgents(agents.map(a => a.id === id ? { ...a, ...updates } : a))
  }

  const toggleChannel = (agentId: string, channel: string) => {
    const agent = agents.find(a => a.id === agentId)
    if (!agent) return
    const channels = agent.channels.includes(channel)
      ? agent.channels.filter(c => c !== channel)
      : [...agent.channels, channel]
    updateAgent(agentId, { channels })
  }

  const toggleTool = (agentId: string, toolId: string) => {
    const agent = agents.find(a => a.id === agentId)
    if (!agent) return
    const tools = agent.tools.includes(toolId)
      ? agent.tools.filter(t => t !== toolId)
      : [...agent.tools, toolId]
    updateAgent(agentId, { tools })
  }

  const toggleNewChannel = (channel: string) => {
    const channels = newAgent.channels.includes(channel)
      ? newAgent.channels.filter(c => c !== channel)
      : [...newAgent.channels, channel]
    setNewAgent({ ...newAgent, channels })
  }

  const toggleNewTool = (toolId: string) => {
    const tools = newAgent.tools.includes(toolId)
      ? newAgent.tools.filter(t => t !== toolId)
      : [...newAgent.tools, toolId]
    setNewAgent({ ...newAgent, tools })
  }

  const saveAgents = async () => {
    setSaving(true)
    setSaveStatus(null)
    try {
      const res = await fetch('/api/instance/agents', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agents }),
      })
      if (res.ok) {
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus(null), 3000)
      } else {
        setSaveStatus('error')
      }
    } catch (error) {
      console.error('Failed to save agents:', error)
      setSaveStatus('error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                Multi-Agent Configuration
              </CardTitle>
              <CardDescription>
                Deploy multiple specialized agents under one instance. Each agent can have its own model, personality, and channel assignments.
              </CardDescription>
            </div>
            <Button size="sm" onClick={() => setShowCreate(!showCreate)}>
              <Plus className="h-4 w-4 mr-1" />
              Add Agent
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Create Agent Form */}
          {showCreate && (
            <div className="mb-6 p-4 border rounded-lg bg-gray-50 space-y-4">
              <h4 className="font-medium">New Agent</h4>

              <div>
                <Label className="text-sm">Agent Name</Label>
                <Input
                  placeholder="e.g., Support Agent, Research Agent, Moderator"
                  value={newAgent.name}
                  onChange={(e) => setNewAgent({ ...newAgent, name: e.target.value })}
                />
              </div>

              <div>
                <Label className="text-sm">Model</Label>
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={newAgent.model}
                  onChange={(e) => setNewAgent({ ...newAgent, model: e.target.value })}
                >
                  {MODEL_OPTIONS.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="text-sm">System Prompt</Label>
                <textarea
                  placeholder="Define this agent's role, personality, and instructions..."
                  value={newAgent.systemPrompt}
                  onChange={(e) => setNewAgent({ ...newAgent, systemPrompt: e.target.value })}
                  className="w-full min-h-[100px] rounded-md border border-input bg-white px-3 py-2 text-sm"
                />
              </div>

              <div>
                <Label className="text-sm">Channel Routing</Label>
                <p className="text-xs text-gray-500 mb-2">Which channels should this agent handle?</p>
                <div className="flex flex-wrap gap-2">
                  {CHANNEL_OPTIONS.map(channel => (
                    <Button
                      key={channel}
                      variant={newAgent.channels.includes(channel) ? 'default' : 'outline'}
                      size="sm"
                      className="text-xs capitalize"
                      onClick={() => toggleNewChannel(channel)}
                    >
                      {channel}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-sm">Tools & Skills</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {AVAILABLE_TOOLS.map(tool => (
                    <Button
                      key={tool.id}
                      variant={newAgent.tools.includes(tool.id) ? 'default' : 'outline'}
                      size="sm"
                      className="text-xs"
                      onClick={() => toggleNewTool(tool.id)}
                    >
                      {tool.name}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={addAgent} disabled={!newAgent.name}>
                  Add Agent
                </Button>
                <Button variant="outline" onClick={() => setShowCreate(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Agents List */}
          {loading ? (
            <div className="text-center py-12 text-gray-500">
              <Bot className="h-10 w-10 mx-auto mb-2 opacity-30 animate-pulse" />
              <p className="text-sm">Loading agents...</p>
            </div>
          ) : agents.length === 0 && !showCreate ? (
            <div className="text-center py-12 text-gray-500">
              <Bot className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="font-medium">No agents configured</p>
              <p className="text-sm mt-1">Your instance uses a single default agent. Add more agents for specialized routing.</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={() => setShowCreate(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Add Your First Agent
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {agents.map((agent) => (
                <div key={agent.id} className="border rounded-lg">
                  <div
                    className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 transition"
                    onClick={() => setExpandedAgent(expandedAgent === agent.id ? null : agent.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Bot className="h-4 w-4 text-purple-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{agent.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {MODEL_OPTIONS.find(m => m.id === agent.model)?.name || agent.model}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {agent.channels.length > 0 && (
                            <span className="text-xs text-gray-500">
                              {agent.channels.length} channel{agent.channels.length !== 1 ? 's' : ''}
                            </span>
                          )}
                          {agent.tools.length > 0 && (
                            <span className="text-xs text-gray-500">
                              {agent.tools.length} tool{agent.tools.length !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); removeAgent(agent.id) }}
                        className="text-red-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                      {expandedAgent === agent.id ? (
                        <ChevronUp className="h-4 w-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      )}
                    </div>
                  </div>

                  {expandedAgent === agent.id && (
                    <div className="px-3 pb-3 border-t pt-3 space-y-4">
                      <div>
                        <Label className="text-sm">Name</Label>
                        <Input
                          value={agent.name}
                          onChange={(e) => updateAgent(agent.id, { name: e.target.value })}
                        />
                      </div>

                      <div>
                        <Label className="text-sm">Model</Label>
                        <select
                          className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                          value={agent.model}
                          onChange={(e) => updateAgent(agent.id, { model: e.target.value })}
                        >
                          {MODEL_OPTIONS.map(m => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <Label className="text-sm">System Prompt</Label>
                        <textarea
                          value={agent.systemPrompt}
                          onChange={(e) => updateAgent(agent.id, { systemPrompt: e.target.value })}
                          className="w-full min-h-[100px] rounded-md border border-input bg-white px-3 py-2 text-sm"
                        />
                      </div>

                      <div>
                        <Label className="text-sm">Channel Routing</Label>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {CHANNEL_OPTIONS.map(channel => (
                            <Button
                              key={channel}
                              variant={agent.channels.includes(channel) ? 'default' : 'outline'}
                              size="sm"
                              className="text-xs capitalize"
                              onClick={() => toggleChannel(agent.id, channel)}
                            >
                              {channel}
                            </Button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <Label className="text-sm">Tools & Skills</Label>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {AVAILABLE_TOOLS.map(tool => (
                            <Button
                              key={tool.id}
                              variant={agent.tools.includes(tool.id) ? 'default' : 'outline'}
                              size="sm"
                              className="text-xs"
                              onClick={() => toggleTool(agent.id, tool.id)}
                            >
                              {tool.name}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Routing Diagram */}
          {agents.length > 1 && (
            <div className="mt-6 p-4 bg-purple-50 rounded-lg">
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Zap className="h-4 w-4 text-purple-600" />
                Message Routing
              </h4>
              <div className="space-y-2">
                {agents.map(agent => (
                  <div key={agent.id} className="flex items-center gap-2 text-sm">
                    <div className="flex flex-wrap gap-1">
                      {agent.channels.length > 0 ? (
                        agent.channels.map(ch => (
                          <Badge key={ch} variant="outline" className="text-xs capitalize">{ch}</Badge>
                        ))
                      ) : (
                        <Badge variant="secondary" className="text-xs">All channels</Badge>
                      )}
                    </div>
                    <ArrowRight className="h-3 w-3 text-gray-400 flex-shrink-0" />
                    <Badge className="text-xs bg-purple-600">{agent.name}</Badge>
                    <span className="text-xs text-gray-500">
                      ({MODEL_OPTIONS.find(m => m.id === agent.model)?.name})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Save Button */}
          {agents.length > 0 && (
            <div className="mt-4 flex items-center justify-end gap-3">
              {saveStatus === 'saved' && (
                <span className="text-sm text-green-600 font-medium">Saved successfully!</span>
              )}
              {saveStatus === 'error' && (
                <span className="text-sm text-red-600 font-medium">Save failed. Try again.</span>
              )}
              <Button onClick={saveAgents} disabled={saving}>
                {saving ? 'Saving...' : 'Save Agent Configuration'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
