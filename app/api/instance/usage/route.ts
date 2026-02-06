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

    const url = new URL(req.url)
    const period = url.searchParams.get('period') || '30d'

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { instance: true }
    })

    if (!user?.instance) {
      return NextResponse.json({
        messagesIn: 0,
        messagesOut: 0,
        totalTokens: 0,
        avgResponseMs: 0,
        channelBreakdown: [],
        dailyMessages: [],
      })
    }

    // Calculate date range
    const days = period === '7d' ? 7 : period === '90d' ? 90 : 30
    const since = new Date()
    since.setDate(since.getDate() - days)

    // Fetch usage logs
    const logs = await prisma.usageLog.findMany({
      where: {
        instanceId: user.instance.id,
        createdAt: { gte: since }
      },
      orderBy: { createdAt: 'asc' }
    })

    // Aggregate stats
    const messagesIn = logs.filter(l => l.direction === 'INBOUND').length
    const messagesOut = logs.filter(l => l.direction === 'OUTBOUND').length
    const totalTokens = logs.reduce((sum, l) => sum + l.tokensUsed, 0)
    const responseTimes = logs.filter(l => l.responseMs).map(l => l.responseMs!)
    const avgResponseMs = responseTimes.length > 0
      ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
      : 0

    // Channel breakdown
    const channelMap: Record<string, number> = {}
    logs.forEach(l => {
      channelMap[l.channel] = (channelMap[l.channel] || 0) + 1
    })
    const channelBreakdown = Object.entries(channelMap)
      .map(([channel, count]) => ({ channel, count }))
      .sort((a, b) => b.count - a.count)

    // Daily messages
    const dailyMap: Record<string, number> = {}
    logs.forEach(l => {
      const date = l.createdAt.toISOString().split('T')[0]
      dailyMap[date] = (dailyMap[date] || 0) + 1
    })
    const dailyMessages = Object.entries(dailyMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date))

    return NextResponse.json({
      messagesIn,
      messagesOut,
      totalTokens,
      avgResponseMs,
      channelBreakdown,
      dailyMessages,
    })

  } catch (error: any) {
    console.error('Usage fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
