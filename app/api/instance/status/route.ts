import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { checkInstanceHealth } from '@/lib/render/deploy'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        instance: {
          include: {
            config: {
              include: {
                channels: true
              }
            }
          }
        },
        subscription: true
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    if (!user.instance) {
      return NextResponse.json({
        hasInstance: false,
        hasPendingConfig: !!user.pendingConfig,
        subscription: user.subscription
      })
    }

    // Don't health-check instances that are still deploying or restarting
    let isHealthy = false
    const skipHealthStatuses = ['DEPLOYING', 'RESTARTING']
    if (!skipHealthStatuses.includes(user.instance.status)) {
      try {
        isHealthy = await checkInstanceHealth(user.instance.id)
      } catch (error) {
        console.error('Health check failed:', error)
        // Don't crash the status endpoint if health check fails
        isHealthy = user.instance.status === 'RUNNING'
      }
    } else {
      // If deploying/restarting, don't mark as healthy but don't error either
      isHealthy = false
    }

    // Re-fetch instance after health check (it may have updated status/accessUrl)
    const freshInstance = await prisma.instance.findUnique({
      where: { id: user.instance.id },
      include: {
        config: {
          include: { channels: true }
        }
      }
    })

    const inst = freshInstance || user.instance

    return NextResponse.json({
      hasInstance: true,
      instance: {
        id: inst.id,
        status: inst.status,
        port: inst.port,
        accessUrl: inst.accessUrl,
        qrCode: inst.qrCode,
        lastHealthCheck: inst.lastHealthCheck,
        createdAt: inst.createdAt,
        isHealthy,
        channels: inst.config?.channels || [],
        config: inst.config ? {
          provider: inst.config.provider,
          model: inst.config.model,
          agentName: inst.config.agentName,
          channels: inst.config.channels,
        } : null,
      },
      subscription: user.subscription
    })

  } catch (error: any) {
    console.error('Status check error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
