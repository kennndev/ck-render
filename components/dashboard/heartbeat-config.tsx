'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  HeartPulse, Save, RefreshCw, CheckCircle2
} from 'lucide-react'

interface HeartbeatConfigProps {
  instanceId: string
}

export default function HeartbeatConfig({ instanceId }: HeartbeatConfigProps) {
  const [enabled, setEnabled] = useState(false)
  const [interval, setInterval] = useState('3600000') // 1 hour default
  const [context, setContext] = useState('')
  const [action, setAction] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetchConfig()
  }, [])

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/instance/config')
      if (res.ok) {
        const data = await res.json()
        if (data.heartbeat) {
          setEnabled(data.heartbeat.enabled || false)
          setInterval(data.heartbeat.interval || '3600000')
          setContext(data.heartbeat.context || '')
          setAction(data.heartbeat.action || '')
        }
      }
    } catch {
      // Config may not include heartbeat yet
    }
  }

  const saveConfig = async () => {
    setSaving(true)
    try {
      await fetch('/api/instance/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          heartbeat: {
            enabled,
            interval,
            context,
            action,
          },
        }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (error) {
      console.error('Failed to save heartbeat config:', error)
    } finally {
      setSaving(false)
    }
  }

  const presets = [
    { label: '5 min', value: '300000' },
    { label: '15 min', value: '900000' },
    { label: '1 hour', value: '3600000' },
    { label: '6 hours', value: '21600000' },
    { label: '24 hours', value: '86400000' },
  ]

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <HeartPulse className="h-5 w-5" />
              Heartbeat
            </CardTitle>
            <CardDescription>
              Periodic awareness checks. Your bot can monitor systems, send reports, or stay active.
            </CardDescription>
          </div>
          <Badge variant={enabled ? 'default' : 'secondary'}>
            {enabled ? 'Active' : 'Disabled'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <Button
            variant={enabled ? 'default' : 'outline'}
            size="sm"
            onClick={() => setEnabled(!enabled)}
          >
            {enabled ? 'Enabled' : 'Enable Heartbeat'}
          </Button>
        </div>

        {enabled && (
          <>
            <div>
              <Label className="text-sm">Interval (milliseconds)</Label>
              <Input
                type="number"
                value={interval}
                onChange={(e) => setInterval(e.target.value)}
                placeholder="3600000"
              />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {presets.map(preset => (
                  <Button
                    key={preset.value}
                    variant={interval === preset.value ? 'default' : 'outline'}
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => setInterval(preset.value)}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-sm">Context (what info to include)</Label>
              <textarea
                placeholder="e.g., Current time, date, system status, pending tasks..."
                value={context}
                onChange={(e) => setContext(e.target.value)}
                className="w-full min-h-[60px] rounded-md border border-input bg-white px-3 py-2 text-sm"
              />
            </div>

            <div>
              <Label className="text-sm">Action (what to do on each beat)</Label>
              <textarea
                placeholder="e.g., Check for pending reminders and send them. Summarize overnight messages."
                value={action}
                onChange={(e) => setAction(e.target.value)}
                className="w-full min-h-[60px] rounded-md border border-input bg-white px-3 py-2 text-sm"
              />
            </div>
          </>
        )}

        <div className="flex items-center justify-end gap-2 pt-2">
          {saved && (
            <span className="text-sm text-green-600 flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4" />
              Saved
            </span>
          )}
          <Button onClick={saveConfig} disabled={saving}>
            {saving ? (
              <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-1" />
            )}
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
