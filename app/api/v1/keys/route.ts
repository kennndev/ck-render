import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { randomBytes } from 'crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function generateApiKey(): string {
  return `knt_${randomBytes(32).toString('hex')}`
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { apiKeys: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const keys = user.apiKeys.map(k => ({
      id: k.id,
      name: k.name,
      keyPrefix: k.key.substring(0, 12) + '...',
      lastUsedAt: k.lastUsedAt,
      expiresAt: k.expiresAt,
      createdAt: k.createdAt,
    }))

    return NextResponse.json({ keys })
  } catch (error: any) {
    console.error('API keys fetch error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const body = await req.json()
    const { name, expiresInDays } = body

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    // Limit API keys per user
    const existingKeys = await prisma.apiKey.count({
      where: { userId: user.id }
    })

    if (existingKeys >= 10) {
      return NextResponse.json({ error: 'Maximum 10 API keys allowed' }, { status: 400 })
    }

    const key = generateApiKey()
    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : null

    const apiKey = await prisma.apiKey.create({
      data: {
        userId: user.id,
        name,
        key,
        expiresAt,
      }
    })

    // Return the full key only at creation time
    return NextResponse.json({
      id: apiKey.id,
      name: apiKey.name,
      key: apiKey.key, // Full key - only shown once
      expiresAt: apiKey.expiresAt,
      createdAt: apiKey.createdAt,
    })
  } catch (error: any) {
    console.error('API key create error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const body = await req.json()
    const { keyId } = body

    // Verify ownership
    const key = await prisma.apiKey.findFirst({
      where: { id: keyId, userId: user.id }
    })

    if (!key) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 })
    }

    await prisma.apiKey.delete({ where: { id: keyId } })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('API key delete error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
