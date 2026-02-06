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
      include: {
        instance: {
          include: { config: true }
        }
      }
    })

    if (!user?.instance?.config) {
      return NextResponse.json({ agents: [] })
    }

    // Read agents from the fullConfig JSON stored in the database
    const fullConfig = user.instance.config.fullConfig as any
    const agents = fullConfig?.agents || []

    return NextResponse.json({ agents })
  } catch (error: any) {
    console.error('Agents fetch error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        instance: {
          include: { config: true }
        }
      }
    })

    if (!user?.instance?.config) {
      return NextResponse.json({ error: 'No configuration found' }, { status: 404 })
    }

    const body = await req.json()
    const { agents } = body

    if (!Array.isArray(agents)) {
      return NextResponse.json({ error: 'Invalid agents data' }, { status: 400 })
    }

    // Store agents in the fullConfig JSON
    const currentConfig = (user.instance.config.fullConfig as any) || {}
    const updatedConfig = { ...currentConfig, agents }

    await prisma.configuration.update({
      where: { id: user.instance.config.id },
      data: { fullConfig: updatedConfig }
    })

    return NextResponse.json({ success: true, agents })
  } catch (error: any) {
    console.error('Agents update error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
