import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Developer API for programmatic instance management.
 * Authenticated via API key (knt_...) in Authorization header.
 */
async function authenticateApiKey(req: Request) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }

  const key = authHeader.substring(7)
  const apiKey = await prisma.apiKey.findUnique({
    where: { key },
    include: {
      user: {
        include: {
          instance: {
            include: {
              config: { include: { channels: true } }
            }
          },
          subscription: true,
        }
      }
    }
  })

  if (!apiKey) return null

  // Check expiry
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    return null
  }

  // Update last used
  await prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  })

  return apiKey.user
}

export async function GET(req: Request) {
  try {
    const user = await authenticateApiKey(req)
    if (!user) {
      return NextResponse.json({ error: 'Invalid or expired API key' }, { status: 401 })
    }

    if (!user.instance) {
      return NextResponse.json({ error: 'No instance found' }, { status: 404 })
    }

    const instance = user.instance
    return NextResponse.json({
      id: instance.id,
      status: instance.status,
      accessUrl: instance.accessUrl,
      createdAt: instance.createdAt,
      lastHealthCheck: instance.lastHealthCheck,
      config: instance.config ? {
        provider: instance.config.provider,
        model: instance.config.model,
        agentName: instance.config.agentName,
        channels: instance.config.channels.map(ch => ({
          type: ch.type,
          enabled: ch.enabled,
        })),
        skills: {
          webSearch: instance.config.webSearchEnabled,
          browser: instance.config.browserEnabled,
          tts: instance.config.ttsEnabled,
          canvas: instance.config.canvasEnabled,
          cron: instance.config.cronEnabled,
          memory: instance.config.memoryEnabled,
        },
      } : null,
      subscription: user.subscription ? {
        plan: user.subscription.plan,
        status: user.subscription.status,
        messagesUsed: user.subscription.messagesUsed,
        messagesLimit: user.subscription.messagesLimit,
      } : null,
    })
  } catch (error: any) {
    console.error('API instance fetch error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const user = await authenticateApiKey(req)
    if (!user) {
      return NextResponse.json({ error: 'Invalid or expired API key' }, { status: 401 })
    }

    if (!user.instance) {
      return NextResponse.json({ error: 'No instance found' }, { status: 404 })
    }

    const body = await req.json()
    const { action } = body

    if (!['start', 'stop', 'restart'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action. Use: start, stop, restart' }, { status: 400 })
    }

    const response = await fetch(
      `${process.env.NEXTAUTH_URL || ''}/api/instance/${action}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': '', // Internal call
        },
      }
    )

    if (response.ok) {
      return NextResponse.json({ success: true, action })
    }

    return NextResponse.json({ error: `Failed to ${action} instance` }, { status: 500 })
  } catch (error: any) {
    console.error('API instance action error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
