import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

function jsonResponse(data: any, status = 200) {
  return NextResponse.json(data, { status, headers: corsHeaders })
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders })
}

/**
 * WebChat API — proxies messages to the user's OpenClaw instance
 * via the OpenAI-compatible /v1/chat/completions endpoint on the gateway.
 *
 * POST /api/webchat
 * Body: { instanceId, message, sessionId? }
 */
export async function POST(req: Request) {
  try {
    const { instanceId, message, sessionId } = await req.json()

    if (!instanceId || !message) {
      return jsonResponse({ error: 'Missing instanceId or message' }, 400)
    }

    const instance = await prisma.instance.findUnique({
      where: { id: instanceId },
      include: {
        config: true,
        user: {
          include: { subscription: true }
        }
      }
    })

    if (!instance) {
      return jsonResponse({ error: 'Instance not found' }, 404)
    }

    if (instance.status !== 'RUNNING') {
      return jsonResponse(
        { error: 'Instance is not running', reply: 'The bot is currently offline. Please try again later.', status: instance.status },
        503
      )
    }

    // Check free tier message limits
    const subscription = instance.user?.subscription
    if (subscription?.plan === 'FREE') {
      const messagesUsed = subscription.messagesUsed || 0
      const messagesLimit = subscription.messagesLimit || 100
      if (messagesUsed >= messagesLimit) {
        return jsonResponse(
          { error: 'Free tier message limit reached', reply: 'Sorry, the free tier message limit has been reached. Please ask the bot owner to upgrade their plan.' },
          429
        )
      }

      try {
        await prisma.subscription.update({
          where: { id: subscription.id },
          data: { messagesUsed: messagesUsed + 1 }
        })
      } catch (err) {
        console.warn('[WebChat] Failed to update message count:', err)
      }
    }

    // Use internal serviceUrl (Railway internal networking) or fall back to accessUrl
    const gatewayUrl = instance.serviceUrl || instance.accessUrl
    if (!gatewayUrl) {
      return jsonResponse({
        reply: 'The bot is still being set up. Please try again in a few minutes.',
        error: 'no_gateway_url',
      })
    }

    // Read the gateway token stored on the instance
    const gatewayToken = instance.gatewayToken || ''

    try {
      // Use the OpenAI-compatible chat completions endpoint
      const openclawResponse = await fetch(`${gatewayUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(gatewayToken && { 'Authorization': `Bearer ${gatewayToken}` }),
        },
        body: JSON.stringify({
          model: 'openclaw:default',
          messages: [
            { role: 'user', content: message }
          ],
          user: sessionId || `webchat-${Date.now()}`,
        }),
        signal: AbortSignal.timeout(60000),
      })

      if (openclawResponse.ok) {
        const data = await openclawResponse.json()
        const reply = data.choices?.[0]?.message?.content || 'No response'
        return jsonResponse({
          reply,
          sessionId: sessionId || data.id,
        })
      } else {
        const errorText = await openclawResponse.text()
        console.error('[WebChat] OpenClaw gateway error:', openclawResponse.status, errorText)
        return jsonResponse({
          reply: 'Sorry, I encountered an error processing your message. Please try again.',
          error: 'upstream_error',
        })
      }
    } catch (fetchError: any) {
      console.error('[WebChat] Fetch to OpenClaw gateway failed:', fetchError.message)
      return jsonResponse({
        reply: 'Sorry, I am temporarily unavailable. Please try again in a moment.',
        error: 'connection_error',
      })
    }
  } catch (error: any) {
    console.error('[WebChat] Error:', error)
    return jsonResponse({ error: 'Internal server error' }, 500)
  }
}

/**
 * GET /api/webchat?instanceId=xxx
 * Returns basic info about the webchat instance
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const instanceId = searchParams.get('instanceId')

  if (!instanceId) {
    return jsonResponse({ error: 'Missing instanceId' }, 400)
  }

  try {
    const instance = await prisma.instance.findUnique({
      where: { id: instanceId },
      include: { config: true }
    })

    if (!instance) {
      return jsonResponse({ error: 'Not found' }, 404)
    }

    return jsonResponse({
      agentName: instance.config?.agentName || 'AI Assistant',
      status: instance.status,
      online: instance.status === 'RUNNING',
    })
  } catch (error: any) {
    console.error('[WebChat] GET error:', error)
    return jsonResponse({ error: 'Internal server error' }, 500)
  }
}
