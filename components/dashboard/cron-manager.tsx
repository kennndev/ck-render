'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Clock, Plus, Trash2, RefreshCw, Play, Pause,
  Calendar, Timer, History, ChevronDown, ChevronUp
} from 'lucide-react'

interface CronJob {
  id: string
  name: string
  schedule: string
  scheduleType: 'cron' | 'every' | 'at'
  prompt: string
  deliverTo?: string
  enabled: boolean
  lastRun?: string
  nextRun?: string
  runCount: number
}

interface CronManagerProps {
  instanceId: string
}

const CRON_PRESETS = [
  { label: 'Every hour', value: '0 * * * *', type: 'cron' as const },
  { label: 'Every day at 9am', value: '0 9 * * *', type: 'cron' as const },
  { label: 'Every Monday at 9am', value: '0 9 * * 1', type: 'cron' as const },
  { label: 'Every 30 minutes', value: '1800000', type: 'every' as const },
  { label: 'Every 5 minutes', value: '300000', type: 'every' as const },
]

export default function CronManager({ instanceId }: CronManagerProps) {
  const [jobs, setJobs] = useState<CronJob[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [expandedJob, setExpandedJob] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const [newJob, setNewJob] = useState({
    name: '',
    scheduleType: 'cron' as 'cron' | 'every' | 'at',
    schedule: '',
    prompt: '',
    deliverTo: '',
  })

  useEffect(() => {
    fetchJobs()
  }, [])

  const fetchJobs = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/instance/cron')
      if (response.ok) {
        const data = await response.json()
        setJobs(data.jobs || [])
      }
    } catch (error) {
      // Cron endpoint may not be available yet
    } finally {
      setLoading(false)
    }
  }

  const createJob = async () => {
    if (!newJob.name || !newJob.schedule || !newJob.prompt) return
    setCreating(true)
    try {
      const response = await fetch('/api/instance/cron', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newJob)
      })
      if (response.ok) {
        setShowCreate(false)
        setNewJob({ name: '', scheduleType: 'cron', schedule: '', prompt: '', deliverTo: '' })
        await fetchJobs()
      }
    } catch (error) {
      console.error('Failed to create cron job:', error)
    } finally {
      setCreating(false)
    }
  }

  const toggleJob = async (jobId: string, enabled: boolean) => {
    try {
      await fetch('/api/instance/cron', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, enabled: !enabled })
      })
      await fetchJobs()
    } catch (error) {
      console.error('Failed to toggle cron job:', error)
    }
  }

  const deleteJob = async (jobId: string) => {
    if (!confirm('Delete this scheduled task?')) return
    try {
      await fetch('/api/instance/cron', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId })
      })
      await fetchJobs()
    } catch (error) {
      console.error('Failed to delete cron job:', error)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Scheduled Tasks
            </CardTitle>
            <CardDescription>Create and manage automated tasks for your bot</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchJobs} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button size="sm" onClick={() => setShowCreate(!showCreate)}>
              <Plus className="h-4 w-4 mr-1" />
              New Task
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Create Job Form */}
        {showCreate && (
          <div className="mb-6 p-4 border rounded-lg bg-gray-50 space-y-4">
            <h4 className="font-medium">Create Scheduled Task</h4>

            <div>
              <Label className="text-sm">Task Name</Label>
              <Input
                placeholder="e.g., Daily Summary, Health Check"
                value={newJob.name}
                onChange={(e) => setNewJob({ ...newJob, name: e.target.value })}
              />
            </div>

            <div>
              <Label className="text-sm">Schedule Type</Label>
              <div className="flex gap-2 mt-1">
                {(['cron', 'every', 'at'] as const).map(type => (
                  <Button
                    key={type}
                    variant={newJob.scheduleType === type ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setNewJob({ ...newJob, scheduleType: type, schedule: '' })}
                    className="capitalize"
                  >
                    {type === 'cron' && <Calendar className="h-3.5 w-3.5 mr-1" />}
                    {type === 'every' && <Timer className="h-3.5 w-3.5 mr-1" />}
                    {type === 'at' && <Clock className="h-3.5 w-3.5 mr-1" />}
                    {type === 'cron' ? 'Cron Expression' : type === 'every' ? 'Interval' : 'One-shot'}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-sm">
                {newJob.scheduleType === 'cron' ? 'Cron Expression (5-field)' :
                 newJob.scheduleType === 'every' ? 'Interval (milliseconds)' :
                 'ISO 8601 Timestamp'}
              </Label>
              <Input
                placeholder={
                  newJob.scheduleType === 'cron' ? '0 9 * * *' :
                  newJob.scheduleType === 'every' ? '3600000' :
                  '2026-03-01T09:00:00Z'
                }
                value={newJob.schedule}
                onChange={(e) => setNewJob({ ...newJob, schedule: e.target.value })}
              />
              {newJob.scheduleType === 'cron' && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {CRON_PRESETS.filter(p => p.type === 'cron').map(preset => (
                    <Button
                      key={preset.value}
                      variant="outline"
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => setNewJob({ ...newJob, schedule: preset.value })}
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>
              )}
              {newJob.scheduleType === 'every' && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {CRON_PRESETS.filter(p => p.type === 'every').map(preset => (
                    <Button
                      key={preset.value}
                      variant="outline"
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => setNewJob({ ...newJob, schedule: preset.value })}
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <Label className="text-sm">Agent Prompt</Label>
              <textarea
                placeholder="What should the bot do? e.g., 'Check the weather and send a daily summary' or 'Review pending tasks and remind me of deadlines'"
                value={newJob.prompt}
                onChange={(e) => setNewJob({ ...newJob, prompt: e.target.value })}
                className="w-full min-h-[80px] rounded-md border border-input bg-white px-3 py-2 text-sm"
              />
            </div>

            <div>
              <Label className="text-sm">Deliver results to (optional)</Label>
              <Input
                placeholder="Channel or user to send results (e.g., #general, @username)"
                value={newJob.deliverTo}
                onChange={(e) => setNewJob({ ...newJob, deliverTo: e.target.value })}
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={createJob} disabled={creating || !newJob.name || !newJob.schedule || !newJob.prompt}>
                {creating ? 'Creating...' : 'Create Task'}
              </Button>
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            </div>
          </div>
        )}

        {/* Jobs List */}
        {loading ? (
          <div className="text-center py-12 text-gray-500">
            <RefreshCw className="h-8 w-8 mx-auto mb-2 animate-spin opacity-50" />
            <p className="text-sm">Loading tasks...</p>
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Clock className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p className="font-medium">No scheduled tasks</p>
            <p className="text-sm mt-1">Create a task to automate your bot's actions on a schedule</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Create Your First Task
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {jobs.map((job) => (
              <div key={job.id} className="border rounded-lg">
                <div
                  className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 transition"
                  onClick={() => setExpandedJob(expandedJob === job.id ? null : job.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${job.enabled ? 'bg-green-100' : 'bg-gray-100'}`}>
                      <Clock className={`h-4 w-4 ${job.enabled ? 'text-green-600' : 'text-gray-400'}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{job.name}</span>
                        <Badge variant={job.enabled ? 'default' : 'secondary'} className="text-xs">
                          {job.enabled ? 'Active' : 'Paused'}
                        </Badge>
                        <Badge variant="outline" className="text-xs capitalize">
                          {job.scheduleType}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500 font-mono mt-0.5">{job.schedule}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">
                      {job.runCount} runs
                    </span>
                    {expandedJob === job.id ? (
                      <ChevronUp className="h-4 w-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                </div>

                {expandedJob === job.id && (
                  <div className="px-3 pb-3 border-t pt-3 space-y-3">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Prompt</p>
                      <p className="text-sm bg-gray-50 p-2 rounded">{job.prompt}</p>
                    </div>
                    {job.lastRun && (
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <History className="h-3 w-3" />
                          Last run: {new Date(job.lastRun).toLocaleString()}
                        </span>
                        {job.nextRun && (
                          <span>Next: {new Date(job.nextRun).toLocaleString()}</span>
                        )}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); toggleJob(job.id, job.enabled) }}
                      >
                        {job.enabled ? <Pause className="h-3.5 w-3.5 mr-1" /> : <Play className="h-3.5 w-3.5 mr-1" />}
                        {job.enabled ? 'Pause' : 'Resume'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); deleteJob(job.id) }}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
