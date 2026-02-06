'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  MessageSquare, Send, Hash, Zap, Phone, Mail, Grid, Users,
  Plus, Settings, Power, PowerOff, RefreshCw,
  CheckCircle2, XCircle, Wifi, WifiOff, Save, Trash2, X, Edit2
} from 'lucide-react'

const channelIcons: Record<string, any> = {
  WHATSAPP: MessageSquare,
  TELEGRAM: Send,
  DISCORD: Hash,
  SLACK: Zap,
  SIGNAL: Phone,
  GOOGLE_CHAT: Mail,
  MATRIX: Grid,
  MSTEAMS: Users,
  LINE: MessageSquare,
  FEISHU: MessageSquare,
  MATTERMOST: Hash,
  WEBCHAT: MessageSquare,
  NOSTR: Zap,
  TWITCH: MessageSquare,
  ZALO: MessageSquare,
  BLUEBUBBLES: Phone,
  NEXTCLOUD_TALK: MessageSquare,
}

const channelNames: Record<string, string> = {
  WHATSAPP: 'WhatsApp',
  TELEGRAM: 'Telegram',
  DISCORD: 'Discord',
  SLACK: 'Slack',
  SIGNAL: 'Signal',
  GOOGLE_CHAT: 'Google Chat',
  MATRIX: 'Matrix',
  MSTEAMS: 'MS Teams',
  LINE: 'LINE',
  FEISHU: 'Feishu / Lark',
  MATTERMOST: 'Mattermost',
  WEBCHAT: 'WebChat',
  NOSTR: 'Nostr',
  TWITCH: 'Twitch',
  ZALO: 'Zalo',
  BLUEBUBBLES: 'iMessage (BlueBubbles)',
  NEXTCLOUD_TALK: 'Nextcloud Talk',
}

// Credential fields per channel type
const channelCredentialFields: Record<string, { key: string; label: string; type?: string; placeholder: string }[]> = {
  WHATSAPP: [],
  TELEGRAM: [
    { key: 'botToken', label: 'Bot Token', placeholder: '123456:ABC-DEF...' },
    { key: 'botUsername', label: 'Bot Username', placeholder: 'mybot' },
  ],
  DISCORD: [
    { key: 'token', label: 'Bot Token', placeholder: 'Your Discord bot token' },
    { key: 'applicationId', label: 'Application ID', placeholder: '123456789012345678' },
  ],
  SLACK: [
    { key: 'botToken', label: 'Bot Token (xoxb-...)', placeholder: 'xoxb-...' },
    { key: 'appToken', label: 'App Token (xapp-...)', placeholder: 'xapp-...' },
  ],
  SIGNAL: [
    { key: 'phoneNumber', label: 'Phone Number', placeholder: '+1234567890' },
  ],
  GOOGLE_CHAT: [
    { key: 'serviceAccount', label: 'Service Account JSON', placeholder: '{"type":"service_account",...}' },
  ],
  MATRIX: [
    { key: 'homeserverUrl', label: 'Homeserver URL', placeholder: 'https://matrix.org' },
    { key: 'accessToken', label: 'Access Token', placeholder: 'syt_...' },
    { key: 'userId', label: 'User ID', placeholder: '@bot:matrix.org' },
  ],
  MSTEAMS: [
    { key: 'appId', label: 'App ID', placeholder: 'Your MS Teams app ID' },
    { key: 'appPassword', label: 'App Password', placeholder: 'Your MS Teams app password' },
  ],
  LINE: [
    { key: 'channelAccessToken', label: 'Channel Access Token', placeholder: 'Your LINE channel access token' },
    { key: 'channelSecret', label: 'Channel Secret', placeholder: 'Your LINE channel secret' },
  ],
  FEISHU: [
    { key: 'appId', label: 'App ID', placeholder: 'Feishu app ID' },
    { key: 'appSecret', label: 'App Secret', placeholder: 'Feishu app secret' },
  ],
  MATTERMOST: [
    { key: 'url', label: 'Server URL', placeholder: 'https://mattermost.example.com' },
    { key: 'token', label: 'Bot Token', placeholder: 'Your Mattermost bot token' },
  ],
  WEBCHAT: [],
  NOSTR: [
    { key: 'privateKey', label: 'Private Key (nsec)', placeholder: 'nsec1...' },
  ],
  TWITCH: [
    { key: 'username', label: 'Bot Username', placeholder: 'your_bot_name' },
    { key: 'oauthToken', label: 'OAuth Token', placeholder: 'oauth:...' },
    { key: 'channels', label: 'Channels (comma-separated)', placeholder: 'channel1, channel2' },
  ],
  ZALO: [
    { key: 'oaId', label: 'OA ID', placeholder: 'Your Zalo OA ID' },
    { key: 'accessToken', label: 'Access Token', placeholder: 'Your Zalo access token' },
  ],
  BLUEBUBBLES: [
    { key: 'serverUrl', label: 'Server URL', placeholder: 'http://localhost:1234' },
    { key: 'password', label: 'Password', placeholder: 'BlueBubbles server password' },
  ],
  NEXTCLOUD_TALK: [
    { key: 'serverUrl', label: 'Server URL', placeholder: 'https://nextcloud.example.com' },
    { key: 'username', label: 'Username', placeholder: 'bot_user' },
    { key: 'password', label: 'Password', placeholder: 'Your Nextcloud password' },
  ],
}

// Channels that support DM policies
const channelsWithDmPolicy = ['WHATSAPP', 'TELEGRAM', 'DISCORD', 'SLACK', 'SIGNAL', 'MATRIX', 'MSTEAMS', 'LINE', 'NOSTR']
// Channels that support group policies
const channelsWithGroupPolicy = ['WHATSAPP', 'TELEGRAM', 'DISCORD', 'SLACK', 'SIGNAL', 'MSTEAMS']

const dmPolicyOptions = [
  { value: 'pairing', label: 'Pairing (default)', description: 'Unknown senders get a pairing code that must be approved' },
  { value: 'allowlist', label: 'Allowlist only', description: 'Only users in the allowlist can message' },
  { value: 'open', label: 'Open (public)', description: 'Anyone can DM the bot' },
  { value: 'disabled', label: 'Disabled', description: 'Ignore all inbound DMs' },
]

const groupPolicyOptions = [
  { value: 'allowlist', label: 'Allowlist only', description: 'Bot only responds in allowed groups' },
  { value: 'open', label: 'Open', description: 'Bot responds in any group' },
]

interface Channel {
  id: string
  type: string
  enabled: boolean
  config: any
  botUsername?: string
  phoneNumber?: string
  inviteLink?: string
}

interface ChannelManagerProps {
  channels: Channel[]
  onRefresh: () => void
}

export default function ChannelManager({ channels, onRefresh }: ChannelManagerProps) {
  const [togglingChannel, setTogglingChannel] = useState<string | null>(null)
  const [editingChannel, setEditingChannel] = useState<string | null>(null)
  const [editConfig, setEditConfig] = useState<Record<string, any>>({})
  const [showAddChannel, setShowAddChannel] = useState(false)
  const [newChannelType, setNewChannelType] = useState('')
  const [newChannelConfig, setNewChannelConfig] = useState<Record<string, any>>({})
  const [saving, setSaving] = useState(false)
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const toggleChannel = async (channelId: string, currentEnabled: boolean) => {
    setTogglingChannel(channelId)
    try {
      await fetch('/api/instance/channels', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId, enabled: !currentEnabled })
      })
      onRefresh()
    } catch (error) {
      console.error('Failed to toggle channel:', error)
    } finally {
      setTogglingChannel(null)
    }
  }

  const startEditing = (channel: Channel) => {
    setEditingChannel(channel.id)
    setEditConfig({ ...channel.config })
  }

  const saveChannelConfig = async (channelId: string) => {
    setSaving(true)
    try {
      const res = await fetch('/api/instance/channels', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId, config: editConfig })
      })
      if (res.ok) {
        setStatusMsg({ type: 'success', text: 'Channel updated! Restart your instance to apply changes.' })
        setEditingChannel(null)
        onRefresh()
      } else {
        setStatusMsg({ type: 'error', text: 'Failed to update channel' })
      }
    } catch (error) {
      setStatusMsg({ type: 'error', text: 'Failed to update channel' })
    } finally {
      setSaving(false)
      setTimeout(() => setStatusMsg(null), 5000)
    }
  }

  const addChannel = async () => {
    if (!newChannelType) return
    setSaving(true)
    try {
      const res = await fetch('/api/instance/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: newChannelType, config: newChannelConfig })
      })
      if (res.ok) {
        setStatusMsg({ type: 'success', text: 'Channel added! Restart your instance to apply.' })
        setShowAddChannel(false)
        setNewChannelType('')
        setNewChannelConfig({})
        onRefresh()
      } else {
        const data = await res.json()
        setStatusMsg({ type: 'error', text: data.error || 'Failed to add channel' })
      }
    } catch (error) {
      setStatusMsg({ type: 'error', text: 'Failed to add channel' })
    } finally {
      setSaving(false)
      setTimeout(() => setStatusMsg(null), 5000)
    }
  }

  const deleteChannel = async (channelId: string) => {
    if (!confirm('Are you sure you want to remove this channel?')) return
    try {
      const res = await fetch('/api/instance/channels', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId })
      })
      if (res.ok) {
        setStatusMsg({ type: 'success', text: 'Channel removed!' })
        onRefresh()
      }
    } catch (error) {
      setStatusMsg({ type: 'error', text: 'Failed to remove channel' })
    }
    setTimeout(() => setStatusMsg(null), 3000)
  }

  const getAccessInfo = (channel: Channel) => {
    const policy = channel.config?.dmPolicy || 'pairing'
    const policyLabel = dmPolicyOptions.find(o => o.value === policy)?.label || policy
    switch (channel.type) {
      case 'WHATSAPP':
        return `DM: ${policyLabel} · ${channel.phoneNumber || 'QR pairing required'}`
      case 'TELEGRAM':
        return `DM: ${policyLabel} · ${channel.botUsername ? `@${channel.botUsername}` : 'Bot configured'}`
      case 'DISCORD':
        return `DM: ${policyLabel} · ${channel.inviteLink || 'Bot configured'}`
      case 'WEBCHAT':
        return 'Gateway webchat enabled'
      default:
        return channel.enabled ? `DM: ${policyLabel}` : 'Disabled'
    }
  }

  const configuredTypes = channels.map(c => c.type)
  const availableTypes = Object.keys(channelNames).filter(t => !configuredTypes.includes(t))

  const renderPolicyFields = (config: Record<string, any>, setConfig: (c: Record<string, any>) => void, channelType: string) => {
    const hasDm = channelsWithDmPolicy.includes(channelType)
    const hasGroup = channelsWithGroupPolicy.includes(channelType)
    if (!hasDm && !hasGroup) return null

    return (
      <div className="space-y-4 pt-3 border-t mt-3">
        <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Access Policies</h5>

        {hasDm && (
          <>
            <div>
              <Label className="text-sm">DM Policy</Label>
              <select
                value={config.dmPolicy || 'pairing'}
                onChange={(e) => setConfig({ ...config, dmPolicy: e.target.value })}
                className="mt-1 w-full border rounded-md px-3 py-2 text-sm bg-white"
              >
                {dmPolicyOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">
                {dmPolicyOptions.find(o => o.value === (config.dmPolicy || 'pairing'))?.description}
              </p>
            </div>

            <div>
              <Label className="text-sm">DM Allowlist</Label>
              <Input
                value={Array.isArray(config.allowlist) ? config.allowlist.join(', ') : (config.allowlist || '')}
                onChange={(e) => setConfig({
                  ...config,
                  allowlist: e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean)
                })}
                placeholder="user1, user2, +1234567890"
                className="mt-1"
              />
              <p className="text-xs text-gray-400 mt-1">
                Comma-separated list of allowed senders (phone numbers, usernames, or IDs)
              </p>
            </div>
          </>
        )}

        {hasGroup && (
          <>
            <div>
              <Label className="text-sm">Group Policy</Label>
              <select
                value={config.groupPolicy || 'allowlist'}
                onChange={(e) => setConfig({ ...config, groupPolicy: e.target.value })}
                className="mt-1 w-full border rounded-md px-3 py-2 text-sm bg-white"
              >
                {groupPolicyOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">
                {groupPolicyOptions.find(o => o.value === (config.groupPolicy || 'allowlist'))?.description}
              </p>
            </div>

            <div>
              <Label className="text-sm">Allowed Groups</Label>
              <Input
                value={Array.isArray(config.groups) ? config.groups.join(', ') : (config.groups || '')}
                onChange={(e) => setConfig({
                  ...config,
                  groups: e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean)
                })}
                placeholder="group-id-1, group-id-2 (or * for all)"
                className="mt-1"
              />
              <p className="text-xs text-gray-400 mt-1">
                Comma-separated group/guild IDs. Use * to allow all groups.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id={`requireMention-${channelType}`}
                checked={config.requireMention || false}
                onChange={(e) => setConfig({ ...config, requireMention: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor={`requireMention-${channelType}`} className="text-sm cursor-pointer">
                Require @mention in groups
              </Label>
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Wifi className="h-5 w-5" />
              Channel Management
            </CardTitle>
            <CardDescription>Manage your connected messaging platforms</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button size="sm" onClick={() => setShowAddChannel(true)} disabled={availableTypes.length === 0}>
              <Plus className="h-4 w-4 mr-2" />
              Add Channel
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {statusMsg && (
          <div className={`mb-4 p-3 rounded-lg text-sm flex items-center gap-2 ${
            statusMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            {statusMsg.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
            {statusMsg.text}
          </div>
        )}

        {/* Add Channel Form */}
        {showAddChannel && (
          <div className="mb-6 p-4 border-2 border-dashed border-purple-200 rounded-lg bg-purple-50/50">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-sm">Add New Channel</h4>
              <button onClick={() => { setShowAddChannel(false); setNewChannelType(''); setNewChannelConfig({}) }}>
                <X className="h-4 w-4 text-gray-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-sm">Channel Type</Label>
                <select
                  value={newChannelType}
                  onChange={(e) => { setNewChannelType(e.target.value); setNewChannelConfig({ dmPolicy: 'pairing', groupPolicy: 'allowlist' }) }}
                  className="mt-1 w-full border rounded-md px-3 py-2 text-sm bg-white"
                >
                  <option value="">Select a channel...</option>
                  {availableTypes.map(type => (
                    <option key={type} value={type}>{channelNames[type]}</option>
                  ))}
                </select>
              </div>

              {newChannelType && (channelCredentialFields[newChannelType] || []).map((field) => (
                <div key={field.key}>
                  <Label className="text-sm">{field.label}</Label>
                  <Input
                    type={field.type || 'text'}
                    value={newChannelConfig[field.key] || ''}
                    onChange={(e) => setNewChannelConfig(prev => ({ ...prev, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    className="mt-1"
                  />
                </div>
              ))}

              {newChannelType && renderPolicyFields(newChannelConfig, setNewChannelConfig, newChannelType)}

              {newChannelType && (
                <Button onClick={addChannel} disabled={saving} className="w-full">
                  {saving ? 'Adding...' : `Add ${channelNames[newChannelType]}`}
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Channel List */}
        {!channels || channels.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <WifiOff className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">No channels configured</p>
            <p className="text-sm mt-1">Click &quot;Add Channel&quot; to get started</p>
          </div>
        ) : (
          <div className="space-y-3">
            {channels.map((channel) => {
              const Icon = channelIcons[channel.type] || MessageSquare
              const isEditing = editingChannel === channel.id

              return (
                <div key={channel.id} className="border rounded-lg overflow-hidden">
                  <div
                    className={`flex items-center justify-between p-4 transition ${
                      channel.enabled ? 'hover:bg-gray-50' : 'bg-gray-50/50 opacity-75'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-2.5 rounded-lg ${channel.enabled ? 'bg-purple-100' : 'bg-gray-100'}`}>
                        <Icon className={`h-5 w-5 ${channel.enabled ? 'text-purple-600' : 'text-gray-400'}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-semibold">
                            {channelNames[channel.type] || channel.type}
                          </span>
                          <Badge className={`text-xs ${channel.enabled ? 'bg-green-500' : 'bg-gray-500'} text-white`}>
                            {channel.enabled ? (
                              <><CheckCircle2 className="h-3 w-3 mr-1" /> Connected</>
                            ) : (
                              <><PowerOff className="h-3 w-3 mr-1" /> Disabled</>
                            )}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-500">{getAccessInfo(channel)}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => isEditing ? setEditingChannel(null) : startEditing(channel)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleChannel(channel.id, channel.enabled)}
                        disabled={togglingChannel === channel.id}
                      >
                        {channel.enabled ? (
                          <><PowerOff className="h-4 w-4 mr-1" /> Disable</>
                        ) : (
                          <><Power className="h-4 w-4 mr-1" /> Enable</>
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteChannel(channel.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Edit Panel */}
                  {isEditing && (
                    <div className="border-t bg-gray-50 p-4 space-y-3">
                      <h4 className="text-sm font-semibold flex items-center gap-2">
                        <Settings className="h-4 w-4" />
                        Configure {channelNames[channel.type]}
                      </h4>

                      {/* Credential fields */}
                      {(channelCredentialFields[channel.type] || []).map((field) => (
                        <div key={field.key}>
                          <Label className="text-sm">{field.label}</Label>
                          <Input
                            type={field.type || 'text'}
                            value={editConfig[field.key] || ''}
                            onChange={(e) => setEditConfig(prev => ({ ...prev, [field.key]: e.target.value }))}
                            placeholder={field.placeholder}
                            className="mt-1"
                          />
                        </div>
                      ))}

                      {/* Policy fields */}
                      {renderPolicyFields(editConfig, setEditConfig, channel.type)}

                      {(channelCredentialFields[channel.type] || []).length === 0 &&
                       !channelsWithDmPolicy.includes(channel.type) &&
                       !channelsWithGroupPolicy.includes(channel.type) && (
                        <p className="text-sm text-gray-500">This channel has no additional configuration.</p>
                      )}

                      <div className="flex gap-2 pt-2">
                        <Button size="sm" onClick={() => saveChannelConfig(channel.id)} disabled={saving}>
                          <Save className="h-4 w-4 mr-1" />
                          {saving ? 'Saving...' : 'Save Changes'}
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setEditingChannel(null)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Channel Health Summary */}
        <div className="mt-6 pt-4 border-t">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <span className="text-gray-600">
                {channels.filter(c => c.enabled).length} of {channels.length} channels active
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-xs text-gray-500">Connected</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-gray-400" />
                <span className="text-xs text-gray-500">Disabled</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
