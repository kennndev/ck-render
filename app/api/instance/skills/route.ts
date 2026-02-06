import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function getUserInstance(email: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { instance: true }
  })
  return user?.instance
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const instance = await getUserInstance(session.user.email)
    if (!instance?.accessUrl) {
      return NextResponse.json({ error: 'Instance not accessible' }, { status: 503 })
    }

    const body = await req.json()
    const { skillId, config } = body

    // Forward skill installation to the OpenClaw instance
    const res = await fetch(`${instance.accessUrl}/api/skills/install`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${instance.containerId}`,
      },
      body: JSON.stringify({ skillId, config }),
      signal: AbortSignal.timeout(10000),
    })

    if (res.ok) {
      const data = await res.json()
      return NextResponse.json(data)
    }

    return NextResponse.json({ error: 'Failed to install skill' }, { status: 500 })
  } catch (error: any) {
    console.error('Skill install error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const instance = await getUserInstance(session.user.email)
    if (!instance?.accessUrl) {
      return NextResponse.json({ error: 'Instance not accessible' }, { status: 503 })
    }

    const body = await req.json()
    const { skillId } = body

    const res = await fetch(`${instance.accessUrl}/api/skills/${skillId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${instance.containerId}` },
      signal: AbortSignal.timeout(5000),
    })

    if (res.ok) {
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Failed to uninstall skill' }, { status: 500 })
  } catch (error: any) {
    console.error('Skill uninstall error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
