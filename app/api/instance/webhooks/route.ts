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

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const instance = await getUserInstance(session.user.email)
    if (!instance) {
      return NextResponse.json({ error: 'No instance found' }, { status: 404 })
    }

    const accessUrl = instance.accessUrl
    if (!accessUrl) {
      return NextResponse.json({ webhooks: [] })
    }

    try {
      const res = await fetch(`${accessUrl}/api/webhooks`, {
        headers: { 'Authorization': `Bearer ${instance.containerId}` },
        signal: AbortSignal.timeout(5000),
      })
      if (res.ok) {
        const data = await res.json()
        return NextResponse.json({ webhooks: data.webhooks || data || [] })
      }
    } catch {
      // Instance may not support webhook API yet
    }

    return NextResponse.json({ webhooks: [] })
  } catch (error: any) {
    console.error('Webhooks fetch error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
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
    const { name, type, path, prompt, deliverTo } = body

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const res = await fetch(`${instance.accessUrl}/api/webhooks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${instance.containerId}`,
      },
      body: JSON.stringify({
        name,
        type: type || 'agent',
        ...(path && { path }),
        ...(prompt && { prompt }),
        ...(deliverTo && { deliverTo }),
      }),
      signal: AbortSignal.timeout(5000),
    })

    if (res.ok) {
      const data = await res.json()
      return NextResponse.json(data)
    }

    return NextResponse.json({ error: 'Failed to create webhook' }, { status: 500 })
  } catch (error: any) {
    console.error('Webhook create error:', error)
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
    const { webhookId } = body

    const res = await fetch(`${instance.accessUrl}/api/webhooks/${webhookId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${instance.containerId}` },
      signal: AbortSignal.timeout(5000),
    })

    if (res.ok) {
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Failed to delete webhook' }, { status: 500 })
  } catch (error: any) {
    console.error('Webhook delete error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
