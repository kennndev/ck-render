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
      return NextResponse.json({ jobs: [] })
    }

    try {
      const res = await fetch(`${accessUrl}/api/cron`, {
        headers: { 'Authorization': `Bearer ${instance.containerId}` },
        signal: AbortSignal.timeout(5000),
      })
      if (res.ok) {
        const data = await res.json()
        return NextResponse.json({ jobs: data.jobs || data || [] })
      }
    } catch {
      // Instance may not support cron API yet
    }

    return NextResponse.json({ jobs: [] })
  } catch (error: any) {
    console.error('Cron fetch error:', error)
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
    const { name, scheduleType, schedule, prompt, deliverTo } = body

    if (!name || !schedule || !prompt) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const res = await fetch(`${instance.accessUrl}/api/cron`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${instance.containerId}`,
      },
      body: JSON.stringify({
        name,
        schedule: {
          type: scheduleType,
          value: schedule,
        },
        prompt,
        ...(deliverTo && { deliverTo }),
      }),
      signal: AbortSignal.timeout(5000),
    })

    if (res.ok) {
      const data = await res.json()
      return NextResponse.json(data)
    }

    return NextResponse.json({ error: 'Failed to create cron job' }, { status: 500 })
  } catch (error: any) {
    console.error('Cron create error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
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
    const { jobId, enabled } = body

    const res = await fetch(`${instance.accessUrl}/api/cron/${jobId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${instance.containerId}`,
      },
      body: JSON.stringify({ enabled }),
      signal: AbortSignal.timeout(5000),
    })

    if (res.ok) {
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Failed to update cron job' }, { status: 500 })
  } catch (error: any) {
    console.error('Cron update error:', error)
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
    const { jobId } = body

    const res = await fetch(`${instance.accessUrl}/api/cron/${jobId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${instance.containerId}` },
      signal: AbortSignal.timeout(5000),
    })

    if (res.ok) {
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Failed to delete cron job' }, { status: 500 })
  } catch (error: any) {
    console.error('Cron delete error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
