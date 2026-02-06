import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ChannelType } from '@prisma/client'
import { syncConfigToRender } from '@/lib/render/sync-config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function getUserWithConfig(email: string) {
  return prisma.user.findUnique({
    where: { email },
    include: {
      instance: {
        include: {
          config: {
            include: { channels: true }
          }
        }
      }
    }
  })
}

/**
 * Fire-and-forget: push updated config to Railway and redeploy.
 * Errors are logged but don't fail the API response.
 */
function triggerSync(instanceId: string) {
  syncConfigToRender(instanceId).catch(err => {
    console.error('[Channels] Failed to sync config to Render:', err)
  })
}

// GET - List channels
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await getUserWithConfig(session.user.email)

    if (!user?.instance?.config) {
      return NextResponse.json({ channels: [] })
    }

    return NextResponse.json({ channels: user.instance.config.channels })

  } catch (error) {
    console.error('Channel fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Add a new channel
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { type, config } = await req.json()

    if (!type) {
      return NextResponse.json({ error: 'Missing channel type' }, { status: 400 })
    }

    if (!Object.values(ChannelType).includes(type as ChannelType)) {
      return NextResponse.json({ error: 'Invalid channel type' }, { status: 400 })
    }

    const user = await getUserWithConfig(session.user.email)

    if (!user?.instance?.config) {
      return NextResponse.json({ error: 'No instance configuration found' }, { status: 404 })
    }

    const exists = user.instance.config.channels.some(c => c.type === type)
    if (exists) {
      return NextResponse.json({ error: 'Channel type already configured' }, { status: 409 })
    }

    const channel = await prisma.channel.create({
      data: {
        configId: user.instance.config.id,
        type: type as ChannelType,
        enabled: true,
        config: config || {},
        botUsername: config?.botUsername,
        phoneNumber: config?.phoneNumber,
        inviteLink: config?.inviteLink,
      }
    })

    // Sync to Railway (redeploys with new channel)
    triggerSync(user.instance.id)

    return NextResponse.json({ channel, redeploying: true })

  } catch (error) {
    console.error('Channel create error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH - Enable/disable a channel
export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { channelId, enabled } = await req.json()

    if (!channelId || typeof enabled !== 'boolean') {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const user = await getUserWithConfig(session.user.email)

    const userChannelIds = user?.instance?.config?.channels.map(c => c.id) || []
    if (!userChannelIds.includes(channelId)) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 })
    }

    const updated = await prisma.channel.update({
      where: { id: channelId },
      data: { enabled }
    })

    // Sync to Railway (redeploys with channel enabled/disabled)
    if (user?.instance) {
      triggerSync(user.instance.id)
    }

    return NextResponse.json({ channel: updated, redeploying: true })

  } catch (error) {
    console.error('Channel update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - Update channel configuration
export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { channelId, config } = await req.json()

    if (!channelId || !config) {
      return NextResponse.json({ error: 'Missing channelId or config' }, { status: 400 })
    }

    const user = await getUserWithConfig(session.user.email)

    const userChannel = user?.instance?.config?.channels.find(c => c.id === channelId)
    if (!userChannel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 })
    }

    const updated = await prisma.channel.update({
      where: { id: channelId },
      data: {
        config,
        botUsername: config.botUsername || userChannel.botUsername,
        phoneNumber: config.phoneNumber || userChannel.phoneNumber,
        inviteLink: config.inviteLink || userChannel.inviteLink,
      }
    })

    // Sync to Railway (redeploys with updated config)
    if (user?.instance) {
      triggerSync(user.instance.id)
    }

    return NextResponse.json({ channel: updated, redeploying: true })

  } catch (error) {
    console.error('Channel config update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Remove a channel
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { channelId } = await req.json()

    if (!channelId) {
      return NextResponse.json({ error: 'Missing channelId' }, { status: 400 })
    }

    const user = await getUserWithConfig(session.user.email)

    const userChannel = user?.instance?.config?.channels.find(c => c.id === channelId)
    if (!userChannel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 })
    }

    await prisma.channel.delete({
      where: { id: channelId }
    })

    // Sync to Railway (redeploys without deleted channel)
    if (user?.instance) {
      triggerSync(user.instance.id)
    }

    return NextResponse.json({ success: true, redeploying: true })

  } catch (error) {
    console.error('Channel delete error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
