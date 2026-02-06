'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Bot, ArrowLeft, Users, Plus, Trash2, Crown,
  Mail, Shield, Eye, Edit, UserPlus, Building2
} from 'lucide-react'

interface TeamMember {
  id: string
  email: string
  role: 'ADMIN' | 'EDITOR' | 'VIEWER'
  acceptedAt: string | null
  invitedAt: string
}

interface Organization {
  id: string
  name: string
  slug: string
  ownerId: string
  isOwner: boolean
  members: TeamMember[]
}

const ROLE_ICONS: Record<string, any> = {
  ADMIN: Shield,
  EDITOR: Edit,
  VIEWER: Eye,
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Admin - Full access',
  EDITOR: 'Editor - Edit config & channels',
  VIEWER: 'Viewer - Read-only dashboard',
}

export default function TeamPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [organizations, setOrganizations] = useState<Organization[]>([])

  const [showCreateOrg, setShowCreateOrg] = useState(false)
  const [orgName, setOrgName] = useState('')
  const [creating, setCreating] = useState(false)

  const [showInvite, setShowInvite] = useState<string | null>(null)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'EDITOR' | 'VIEWER'>('VIEWER')
  const [inviting, setInviting] = useState(false)

  useEffect(() => {
    fetchTeams()
  }, [])

  const fetchTeams = async () => {
    try {
      const res = await fetch('/api/team')
      if (res.ok) {
        const data = await res.json()
        setOrganizations(data.organizations || [])
      }
    } catch {
      // Team API may not be available
    } finally {
      setLoading(false)
    }
  }

  const createOrg = async () => {
    if (!orgName) return
    setCreating(true)
    try {
      const res = await fetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create-org', name: orgName }),
      })
      if (res.ok) {
        setShowCreateOrg(false)
        setOrgName('')
        await fetchTeams()
      }
    } catch (error) {
      console.error('Failed to create organization:', error)
    } finally {
      setCreating(false)
    }
  }

  const inviteMember = async (orgId: string) => {
    if (!inviteEmail) return
    setInviting(true)
    try {
      const res = await fetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'invite',
          organizationId: orgId,
          email: inviteEmail,
          role: inviteRole,
        }),
      })
      if (res.ok) {
        setShowInvite(null)
        setInviteEmail('')
        setInviteRole('VIEWER')
        await fetchTeams()
      }
    } catch (error) {
      console.error('Failed to invite member:', error)
    } finally {
      setInviting(false)
    }
  }

  const removeMember = async (orgId: string, memberId: string) => {
    if (!confirm('Remove this team member?')) return
    try {
      await fetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'remove-member',
          organizationId: orgId,
          memberId,
        }),
      })
      await fetchTeams()
    } catch (error) {
      console.error('Failed to remove member:', error)
    }
  }

  const updateRole = async (orgId: string, memberId: string, role: string) => {
    try {
      await fetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update-role',
          organizationId: orgId,
          memberId,
          role,
        }),
      })
      await fetchTeams()
    } catch (error) {
      console.error('Failed to update role:', error)
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
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard')}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Dashboard
            </Button>
            <h1 className="text-lg font-bold">Team Management</h1>
          </div>
          <Button size="sm" onClick={() => setShowCreateOrg(true)}>
            <Plus className="h-4 w-4 mr-1" />
            New Organization
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-3xl space-y-6">
        {/* Create Org Form */}
        {showCreateOrg && (
          <Card>
            <CardContent className="p-4 space-y-3">
              <h4 className="font-medium">Create Organization</h4>
              <div>
                <Label className="text-sm">Organization Name</Label>
                <Input
                  placeholder="e.g., Acme Corp, My Team"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={createOrg} disabled={creating || !orgName}>
                  {creating ? 'Creating...' : 'Create'}
                </Button>
                <Button variant="outline" onClick={() => setShowCreateOrg(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Organizations */}
        {organizations.length === 0 && !showCreateOrg ? (
          <Card>
            <CardContent className="p-8 text-center text-gray-500">
              <Building2 className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="font-medium">No organizations yet</p>
              <p className="text-sm mt-1">Create an organization to share your bot dashboard with your team</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={() => setShowCreateOrg(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Create Organization
              </Button>
            </CardContent>
          </Card>
        ) : (
          organizations.map(org => (
            <Card key={org.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      {org.name}
                      {org.isOwner && (
                        <Badge variant="outline" className="text-xs">
                          <Crown className="h-3 w-3 mr-1" />
                          Owner
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription>
                      {org.members.length} member{org.members.length !== 1 ? 's' : ''}
                    </CardDescription>
                  </div>
                  {org.isOwner && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowInvite(showInvite === org.id ? null : org.id)}
                    >
                      <UserPlus className="h-4 w-4 mr-1" />
                      Invite
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {/* Invite Form */}
                {showInvite === org.id && (
                  <div className="mb-4 p-3 border rounded-lg bg-gray-50 space-y-3">
                    <div>
                      <Label className="text-sm">Email Address</Label>
                      <Input
                        type="email"
                        placeholder="teammate@example.com"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Role</Label>
                      <div className="flex gap-2 mt-1">
                        {(['VIEWER', 'EDITOR', 'ADMIN'] as const).map(role => (
                          <Button
                            key={role}
                            variant={inviteRole === role ? 'default' : 'outline'}
                            size="sm"
                            className="text-xs"
                            onClick={() => setInviteRole(role)}
                          >
                            {role}
                          </Button>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {ROLE_LABELS[inviteRole]}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => inviteMember(org.id)} disabled={inviting || !inviteEmail}>
                        {inviting ? 'Inviting...' : 'Send Invite'}
                      </Button>
                      <Button variant="outline" onClick={() => setShowInvite(null)}>Cancel</Button>
                    </div>
                  </div>
                )}

                {/* Members List */}
                <div className="space-y-2">
                  {org.members.map(member => {
                    const RoleIcon = ROLE_ICONS[member.role] || Eye
                    return (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-gray-100 rounded-lg">
                            <Mail className="h-4 w-4 text-gray-600" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{member.email}</span>
                              <Badge variant="outline" className="text-xs">
                                <RoleIcon className="h-3 w-3 mr-1" />
                                {member.role}
                              </Badge>
                              {!member.acceptedAt && (
                                <Badge variant="secondary" className="text-xs">Pending</Badge>
                              )}
                            </div>
                            <p className="text-xs text-gray-500">
                              Invited {new Date(member.invitedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        {org.isOwner && (
                          <div className="flex items-center gap-1">
                            <select
                              className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                              value={member.role}
                              onChange={(e) => updateRole(org.id, member.id, e.target.value)}
                            >
                              <option value="VIEWER">Viewer</option>
                              <option value="EDITOR">Editor</option>
                              <option value="ADMIN">Admin</option>
                            </select>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeMember(org.id, member.id)}
                              className="text-red-500 h-8 w-8 p-0"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          ))
        )}

        {/* Info */}
        <Card>
          <CardContent className="p-4">
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-600" />
              About Team Access
            </h4>
            <div className="grid md:grid-cols-3 gap-3 text-xs text-gray-600">
              <div className="p-2 bg-gray-50 rounded-lg">
                <p className="font-medium text-gray-900 flex items-center gap-1">
                  <Shield className="h-3 w-3" /> Admin
                </p>
                <p>Full access: config, channels, billing, team management</p>
              </div>
              <div className="p-2 bg-gray-50 rounded-lg">
                <p className="font-medium text-gray-900 flex items-center gap-1">
                  <Edit className="h-3 w-3" /> Editor
                </p>
                <p>Can edit config, channels, skills. Cannot manage billing or team</p>
              </div>
              <div className="p-2 bg-gray-50 rounded-lg">
                <p className="font-medium text-gray-900 flex items-center gap-1">
                  <Eye className="h-3 w-3" /> Viewer
                </p>
                <p>Read-only access to dashboard, logs, and analytics</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
