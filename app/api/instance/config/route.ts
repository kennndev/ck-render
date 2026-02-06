import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { syncConfigToRender } from '@/lib/render/sync-config'

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
      include: {
        instance: {
          include: {
            config: { include: { channels: true } }
          }
        }
      }
    })

    if (!user?.instance?.config) {
      return NextResponse.json({ error: 'No configuration found' }, { status: 404 })
    }

    const config = user.instance.config
    return NextResponse.json({
      provider: config.provider,
      model: config.model,
      failoverModel: config.failoverModel,
      agentName: config.agentName,
      systemPrompt: config.systemPrompt,
      thinkingMode: config.thinkingMode,
      sessionMode: config.sessionMode,
      dmPolicy: config.dmPolicy,
      webSearchEnabled: config.webSearchEnabled,
      browserEnabled: config.browserEnabled,
      ttsEnabled: config.ttsEnabled,
      canvasEnabled: config.canvasEnabled,
      cronEnabled: config.cronEnabled,
      memoryEnabled: config.memoryEnabled,
      channels: config.channels.map(ch => ({
        id: ch.id,
        type: ch.type,
        enabled: ch.enabled,
      })),
    })
  } catch (error: any) {
    console.error('Config fetch error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        instance: {
          include: {
            config: { include: { channels: true } }
          }
        }
      }
    })

    if (!user?.instance?.config) {
      return NextResponse.json({ error: 'No configuration found' }, { status: 404 })
    }

    const body = await req.json()
    const allowedFields = [
      'model', 'failoverModel', 'agentName', 'systemPrompt',
      'thinkingMode', 'sessionMode', 'dmPolicy',
      'webSearchEnabled', 'browserEnabled', 'ttsEnabled',
      'canvasEnabled', 'cronEnabled', 'memoryEnabled',
    ]

    // Build update object with only allowed fields
    const updates: Record<string, any> = {}
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field]
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    // Update DB config
    const updatedConfig = await prisma.configuration.update({
      where: { id: user.instance.config.id },
      data: updates,
      include: { channels: true },
    })

    // Push updated config to Railway and redeploy
    if (user.instance.containerId) {
      syncConfigToRender(user.instance.id).catch(err => {
        console.error('Failed to push config to Render:', err)
      })
    }

    return NextResponse.json({ success: true, updated: Object.keys(updates) })
  } catch (error: any) {
    console.error('Config update error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
