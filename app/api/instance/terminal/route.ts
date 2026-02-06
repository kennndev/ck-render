import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  executeOpenClawCommand,
  listPendingDevices,
  approveDevice,
  getWhatsAppQR,
  runDoctor,
  getGatewayHealth,
  listChannels,
} from '@/lib/fly/ssh'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/instance/terminal - Get terminal info and capabilities
 */
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { instance: true },
    })

    if (!user?.instance) {
      return NextResponse.json({ error: 'No instance found' }, { status: 404 })
    }

    const { containerName } = user.instance

    if (!containerName) {
      return NextResponse.json(
        { error: 'Instance not properly configured' },
        { status: 400 }
      )
    }

    // Get various status information
    const [health, doctor, channels, devices] = await Promise.allSettled([
      getGatewayHealth(containerName),
      runDoctor(containerName),
      listChannels(containerName),
      listPendingDevices(containerName),
    ])

    return NextResponse.json({
      appName: containerName,
      capabilities: {
        ssh: true,
        deviceApproval: true,
        channelManagement: true,
        qrCodeAccess: true,
      },
      status: {
        health: health.status === 'fulfilled' ? health.value : null,
        doctor: doctor.status === 'fulfilled' ? doctor.value : null,
        channels: channels.status === 'fulfilled' ? channels.value : null,
        devices: devices.status === 'fulfilled' ? devices.value : null,
      },
    })
  } catch (error: any) {
    console.error('Terminal info error:', error)
    return NextResponse.json(
      { error: 'Failed to get terminal info' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/instance/terminal - Execute terminal command
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { instance: true },
    })

    if (!user?.instance) {
      return NextResponse.json({ error: 'No instance found' }, { status: 404 })
    }

    const { containerName } = user.instance

    if (!containerName) {
      return NextResponse.json(
        { error: 'Instance not properly configured' },
        { status: 400 }
      )
    }

    const body = await req.json()
    const { action, command, requestId } = body

    // Handle specific actions
    switch (action) {
      case 'list-devices':
        const devices = await listPendingDevices(containerName)
        return NextResponse.json(devices)

      case 'approve-device':
        if (!requestId) {
          return NextResponse.json(
            { error: 'requestId required' },
            { status: 400 }
          )
        }
        const approval = await approveDevice(containerName, requestId)
        return NextResponse.json(approval)

      case 'get-whatsapp-qr':
        const qr = await getWhatsAppQR(containerName)
        return NextResponse.json(qr)

      case 'run-doctor':
        const doctorResult = await runDoctor(containerName)
        return NextResponse.json(doctorResult)

      case 'check-health':
        const healthResult = await getGatewayHealth(containerName)
        return NextResponse.json(healthResult)

      case 'list-channels':
        const channelsResult = await listChannels(containerName)
        return NextResponse.json(channelsResult)

      case 'execute':
        if (!command) {
          return NextResponse.json(
            { error: 'command required' },
            { status: 400 }
          )
        }

        // Whitelist allowed commands for security
        const allowedCommands = [
          'devices list',
          'devices approve',
          'channels list',
          'channels status',
          'health',
          'status',
          'doctor',
          'logs',
          'pairing list',
          'pairing approve',
        ]

        const isAllowed = allowedCommands.some((allowed) =>
          command.startsWith(allowed)
        )

        if (!isAllowed) {
          return NextResponse.json(
            { error: 'Command not allowed. Use preset actions instead.' },
            { status: 403 }
          )
        }

        const result = await executeOpenClawCommand(containerName, command)
        return NextResponse.json(result)

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }
  } catch (error: any) {
    console.error('Terminal command error:', error)
    return NextResponse.json(
      { error: error.message || 'Command execution failed' },
      { status: 500 }
    )
  }
}
