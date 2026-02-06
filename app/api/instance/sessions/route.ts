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
      where: { email: session.user.email },
      include: { instance: true }
    })

    if (!user?.instance) {
      return NextResponse.json({ error: 'No instance found' }, { status: 404 })
    }

    // Proxy to the OpenClaw instance's session API
    const accessUrl = user.instance.accessUrl
    if (!accessUrl) {
      return NextResponse.json({ sessions: [] })
    }

    try {
      const res = await fetch(`${accessUrl}/api/sessions`, {
        headers: { 'Authorization': `Bearer ${user.instance.containerId}` },
        signal: AbortSignal.timeout(5000),
      })
      if (res.ok) {
        const data = await res.json()
        return NextResponse.json({ sessions: data.sessions || data || [] })
      }
    } catch {
      // Instance may not support session API yet
    }

    return NextResponse.json({ sessions: [] })
  } catch (error: any) {
    console.error('Sessions fetch error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { instance: true }
    })

    if (!user?.instance) {
      return NextResponse.json({ error: 'No instance found' }, { status: 404 })
    }

    const body = await req.json()
    const { sessionId, pruneAll } = body

    const accessUrl = user.instance.accessUrl
    if (!accessUrl) {
      return NextResponse.json({ error: 'Instance not accessible' }, { status: 503 })
    }

    const endpoint = pruneAll
      ? `${accessUrl}/api/sessions/prune`
      : `${accessUrl}/api/sessions/${sessionId}`

    const res = await fetch(endpoint, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${user.instance.containerId}` },
      signal: AbortSignal.timeout(5000),
    })

    if (res.ok) {
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Failed to prune session' }, { status: 500 })
  } catch (error: any) {
    console.error('Session delete error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
