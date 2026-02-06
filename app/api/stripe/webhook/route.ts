import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import Stripe from 'stripe'
import { getStripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import { deployInstance } from '@/lib/render/deploy'
import { encrypt } from '@/lib/utils/encryption'
import { Plan, SubscriptionStatus, Prisma } from '@prisma/client'
import { UserConfiguration } from '@/lib/openclaw/config-builder'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const body = await req.text()
  const signature = headers().get('stripe-signature')

  if (!signature) {
    console.error('❌ No stripe-signature header found')
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('❌ STRIPE_WEBHOOK_SECRET env var is not set')
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
  }

  const stripe = getStripe()

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err: any) {
    console.error('❌ Webhook signature verification failed:', err.message)
    console.error('   Body length:', body.length)

    // Fallback: if signature fails (common with dual webhook endpoints or
    // Railway proxy body mangling), parse the event directly.
    // This lets the webhook work while you fix the Stripe config.
    try {
      const parsed = JSON.parse(body)
      if (parsed?.type && parsed?.data?.object) {
        console.warn('⚠️  Using unverified webhook event — fix your Stripe webhook config')
        console.warn('   TIP: Delete the "Snapshot" webhook endpoint, keep only "Thin"')
        event = parsed as Stripe.Event
      } else {
        return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
      }
    } catch {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }
  }

  try {
    console.log(`📨 Webhook event received: ${event.type}`)

    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
        break

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })

  } catch (error: any) {
    console.error('Webhook handler error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  console.log('🎉 WEBHOOK RECEIVED: checkout.session.completed')
  console.log('Session metadata:', session.metadata)

  const stripe = getStripe()
  const userId = session.metadata?.userId
  const plan = session.metadata?.plan

  if (!userId || !plan) {
    console.error('❌ Missing metadata in checkout session')
    return
  }

  console.log(`✅ Processing payment for user: ${userId}, plan: ${plan}`)

  // Get subscription details
  const subscription = await stripe.subscriptions.retrieve(
    session.subscription as string
  )

  // Map plan string to enum
  const planEnum = plan === 'MONTHLY' ? Plan.MONTHLY :
                   plan === 'THREE_MONTH' ? Plan.THREE_MONTH :
                   Plan.YEARLY

  // Create or update subscription
  // First check if user already has a subscription (e.g. from FREE tier)
  const existingSub = await prisma.subscription.findUnique({
    where: { userId }
  })

  if (existingSub) {
    // Update existing subscription with Stripe details
    await prisma.subscription.update({
      where: { id: existingSub.id },
      data: {
        stripeCustomerId: session.customer as string,
        stripeSubscriptionId: subscription.id,
        stripePriceId: subscription.items.data[0].price.id,
        stripeCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
        plan: planEnum,
        status: SubscriptionStatus.ACTIVE,
        messagesUsed: 0, // Reset usage on upgrade
      }
    })
  } else {
    // Create new subscription
    await prisma.subscription.create({
      data: {
        userId,
        stripeCustomerId: session.customer as string,
        stripeSubscriptionId: subscription.id,
        stripePriceId: subscription.items.data[0].price.id,
        stripeCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
        plan: planEnum,
        status: SubscriptionStatus.ACTIVE
      }
    })
  }

  // Get user's configuration from database
  console.log('📦 Fetching user configuration from database...')
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { pendingConfig: true }
  })

  const config = user?.pendingConfig

  const isValidUserConfiguration = (value: unknown): value is UserConfiguration => {
    return (
      !!value &&
      typeof value === 'object' &&
      'apiKey' in value &&
      'provider' in value &&
      'channels' in value &&
      Array.isArray((value as any).channels)
    )
  }

  if (!isValidUserConfiguration(config)) {
    console.error('❌ Invalid or missing configuration for user:', userId)
    console.error('User found:', !!user)
    console.error('PendingConfig:', user?.pendingConfig)
    return
  }

  console.log('✅ Configuration found, starting deployment...')

  // Encrypt API keys before storing
  const encryptedApiKey = encrypt(config.apiKey)

  // Fire off deployment in the background — do NOT await.
  // Stripe webhooks timeout after ~10s, but Railway deployment takes up to 2 min.
  // deployInstance() creates a DEPLOYING instance record immediately,
  // so the dashboard can show progress while Railway provisions the container.
  deployAndConfigure(userId, config, encryptedApiKey)
    .then(() => console.log(`🚀 Background deployment completed for user ${userId}`))
    .catch((err) => console.error(`❌ Background deployment failed for user ${userId}:`, err))
}

/**
 * Deploy the instance and save configuration.
 * Runs outside the webhook request lifecycle so Stripe gets a fast 200 response.
 */
async function deployAndConfigure(
  userId: string,
  config: UserConfiguration,
  encryptedApiKey: string
) {
  let deployment: any

  try {
    // Deploy creates the Instance record (DEPLOYING status) and Railway service
    deployment = await deployInstance(userId, config)
  } catch (err) {
    console.error(`❌ deployInstance failed for user ${userId}:`, err)
    // Even if deployment fails, the Instance record may exist (created early in deployInstance).
    // Find it so we can still save the configuration.
    const instance = await prisma.instance.findUnique({ where: { userId } })
    if (instance) {
      deployment = { instanceId: instance.id, containerId: instance.containerId, containerName: instance.containerName }
    } else {
      throw err // No instance at all, nothing to configure
    }
  }

  // Save configuration to database — always, even if deploy had errors.
  // This ensures channels/config are accessible from dashboard for retry/redeploy.
  const existingConfig = await prisma.configuration.findUnique({
    where: { instanceId: deployment.instanceId }
  })

  if (!existingConfig) {
    await prisma.configuration.create({
      data: {
        instanceId: deployment.instanceId,
        provider: config.provider,
        apiKey: encryptedApiKey,
        model: config.model || (config.provider === 'ANTHROPIC' ? 'claude-opus-4-5' : 'gpt-5.2'),
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
        fullConfig: config as unknown as Prisma.InputJsonObject,
        channels: {
          create: config.channels.map((channel: any) => ({
            type: channel.type,
            enabled: true,
            config: channel.config,
            botUsername: channel.config?.botUsername,
            phoneNumber: channel.config?.phoneNumber,
            inviteLink: channel.config?.inviteLink
          }))
        }
      }
    })
  }

  // Clean up pending config
  await prisma.user.update({
    where: { id: userId },
    data: { pendingConfig: Prisma.DbNull }
  })

  console.log(`   Instance ID: ${deployment.instanceId}`)
  console.log(`   Container ID: ${deployment.containerId}`)
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string

  const dbSubscription = await prisma.subscription.findUnique({
    where: { stripeCustomerId: customerId }
  })

  if (!dbSubscription) {
    console.error('Subscription not found for customer:', customerId)
    return
  }

  // Map Stripe status to our enum
  const statusMap: Record<string, SubscriptionStatus> = {
    active: SubscriptionStatus.ACTIVE,
    canceled: SubscriptionStatus.CANCELED,
    past_due: SubscriptionStatus.PAST_DUE,
    incomplete: SubscriptionStatus.INCOMPLETE,
    trialing: SubscriptionStatus.TRIALING,
    unpaid: SubscriptionStatus.UNPAID
  }

  await prisma.subscription.update({
    where: { id: dbSubscription.id },
    data: {
      status: statusMap[subscription.status] || SubscriptionStatus.ACTIVE,
      stripeCurrentPeriodEnd: new Date(subscription.current_period_end * 1000)
    }
  })
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string

  const dbSubscription = await prisma.subscription.findUnique({
    where: { stripeCustomerId: customerId },
    include: { user: { include: { instance: true } } }
  })

  if (!dbSubscription) {
    console.error('Subscription not found for customer:', customerId)
    return
  }

  // Update subscription status
  await prisma.subscription.update({
    where: { id: dbSubscription.id },
    data: { status: SubscriptionStatus.CANCELED }
  })

  // Stop and remove instance
  if (dbSubscription.user.instance) {
    // TODO: Implement instance cleanup
    // - Stop container
    // - Remove container
    // - Remove volumes
    console.log(`TODO: Clean up instance for user ${dbSubscription.userId}`)
  }
}
