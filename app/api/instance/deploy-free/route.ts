import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { deployInstance } from '@/lib/render/deploy'
import { encrypt } from '@/lib/utils/encryption'
import { Plan, SubscriptionStatus } from '@prisma/client'
import { FREE_TIER_LIMITS } from '@/lib/stripe'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { config } = await req.json()

    if (!config || !config.apiKey || !config.provider) {
      return NextResponse.json(
        { error: 'Missing required configuration' },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { instance: true, subscription: true }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Check if user already has an instance
    if (user.instance) {
      return NextResponse.json(
        { error: 'You already have a deployed instance. Go to your dashboard to manage it.' },
        { status: 409 }
      )
    }

    // Enforce free tier limits
    if (config.channels && config.channels.length > FREE_TIER_LIMITS.channels) {
      return NextResponse.json(
        { error: `Free plan allows only ${FREE_TIER_LIMITS.channels} channel. Upgrade for more.` },
        { status: 400 }
      )
    }

    // Create free subscription
    await prisma.subscription.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        plan: Plan.FREE,
        status: SubscriptionStatus.ACTIVE,
        messagesUsed: 0,
        messagesLimit: FREE_TIER_LIMITS.messagesPerMonth,
      },
      update: {
        plan: Plan.FREE,
        status: SubscriptionStatus.ACTIVE,
        messagesUsed: 0,
        messagesLimit: FREE_TIER_LIMITS.messagesPerMonth,
      }
    })

    // Encrypt API keys
    const encryptedApiKey = encrypt(config.apiKey)

    // Deploy instance — may partially fail but Instance record is created early
    let deployment: any
    try {
      deployment = await deployInstance(user.id, config)
    } catch (err: any) {
      console.error('❌ deployInstance failed:', err)

      // Return detailed error to frontend
      return NextResponse.json(
        {
          error: 'Deployment failed: ' + (err.message || 'Unknown error'),
          details: err.stack || String(err)
        },
        { status: 500 }
      )
    }

    // Save configuration — always, even if deploy had errors
    const existingConfig = await prisma.configuration.findUnique({
      where: { instanceId: deployment.instanceId }
    })

    if (!existingConfig) {
      await prisma.configuration.create({
        data: {
          instanceId: deployment.instanceId,
          provider: config.provider,
          apiKey: encryptedApiKey,
          model: config.model || 'anthropic/claude-sonnet-4-5',
          webSearchEnabled: config.webSearchEnabled || false,
          braveApiKey: config.braveApiKey ? encrypt(config.braveApiKey) : null,
          browserEnabled: config.browserEnabled || false,
          ttsEnabled: config.ttsEnabled || false,
          elevenlabsApiKey: config.elevenlabsApiKey ? encrypt(config.elevenlabsApiKey) : null,
          canvasEnabled: config.canvasEnabled || false,
          cronEnabled: config.cronEnabled || false,
          memoryEnabled: config.memoryEnabled || false,
          workspace: config.workspace,
          agentName: config.agentName,
          systemPrompt: config.systemPrompt,
          thinkingMode: config.thinkingMode || 'high',
          sessionMode: config.sessionMode || 'per-sender',
          dmPolicy: config.dmPolicy || 'pairing',
          fullConfig: config,
          channels: {
            create: (config.channels || []).map((channel: any) => ({
              type: channel.type,
              enabled: true,
              config: channel.config || {},
              botUsername: channel.config?.botUsername,
              phoneNumber: channel.config?.phoneNumber,
              inviteLink: channel.config?.inviteLink
            }))
          }
        }
      })
    }

    return NextResponse.json({
      success: true,
      instanceId: deployment.instanceId,
      message: 'Your free instance is being deployed!'
    })

  } catch (error: any) {
    console.error('Free deploy error:', error)
    return NextResponse.json(
      {
        error: 'Deployment failed: ' + (error.message || 'Unknown error'),
        details: error.stack || String(error),
        hint: 'Check server logs for more details'
      },
      { status: 500 }
    )
  }
}
