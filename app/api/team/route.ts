import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Find organizations the user owns or is a member of
    const ownedOrgs = await prisma.organization.findMany({
      where: { ownerId: user.id },
      include: {
        members: true,
      }
    })

    const memberOrgs = await prisma.teamMember.findMany({
      where: { userId: user.id },
      include: {
        organization: {
          include: { members: true }
        }
      }
    })

    const organizations = [
      ...ownedOrgs.map(org => ({ ...org, isOwner: true })),
      ...memberOrgs
        .filter(m => !ownedOrgs.find(o => o.id === m.organizationId))
        .map(m => ({ ...m.organization, isOwner: false, myRole: m.role })),
    ]

    return NextResponse.json({ organizations })
  } catch (error: any) {
    console.error('Team fetch error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const body = await req.json()
    const { action } = body

    if (action === 'create-org') {
      const { name } = body
      if (!name) {
        return NextResponse.json({ error: 'Organization name is required' }, { status: 400 })
      }

      const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')

      const org = await prisma.organization.create({
        data: {
          name,
          slug,
          ownerId: user.id,
          members: {
            create: {
              userId: user.id,
              email: user.email,
              role: 'ADMIN',
              acceptedAt: new Date(),
            }
          }
        },
        include: { members: true }
      })

      return NextResponse.json({ organization: org })
    }

    if (action === 'invite') {
      const { organizationId, email, role } = body

      if (!organizationId || !email) {
        return NextResponse.json({ error: 'Organization ID and email are required' }, { status: 400 })
      }

      // Verify user is admin/owner of the org
      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
        include: { members: true }
      })

      if (!org) {
        return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
      }

      const isAdmin = org.ownerId === user.id ||
        org.members.some(m => m.userId === user.id && m.role === 'ADMIN')

      if (!isAdmin) {
        return NextResponse.json({ error: 'Only admins can invite members' }, { status: 403 })
      }

      // Check if already invited
      const existing = org.members.find(m => m.email === email)
      if (existing) {
        return NextResponse.json({ error: 'User is already a member' }, { status: 400 })
      }

      // Find invited user (may not exist yet)
      const invitedUser = await prisma.user.findUnique({ where: { email } })

      const member = await prisma.teamMember.create({
        data: {
          organizationId,
          userId: invitedUser?.id || '',
          email,
          role: role || 'VIEWER',
        }
      })

      return NextResponse.json({ member })
    }

    if (action === 'remove-member') {
      const { organizationId, memberId } = body

      const org = await prisma.organization.findUnique({
        where: { id: organizationId }
      })

      if (!org || org.ownerId !== user.id) {
        return NextResponse.json({ error: 'Only the owner can remove members' }, { status: 403 })
      }

      await prisma.teamMember.delete({ where: { id: memberId } })
      return NextResponse.json({ success: true })
    }

    if (action === 'update-role') {
      const { organizationId, memberId, role } = body

      const org = await prisma.organization.findUnique({
        where: { id: organizationId }
      })

      if (!org || org.ownerId !== user.id) {
        return NextResponse.json({ error: 'Only the owner can change roles' }, { status: 403 })
      }

      await prisma.teamMember.update({
        where: { id: memberId },
        data: { role }
      })

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    console.error('Team action error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
