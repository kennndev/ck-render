import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function getUserInstance(email: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { instance: true }
  })
  return user?.instance
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const instance = await getUserInstance(session.user.email)
    if (!instance?.accessUrl) {
      return NextResponse.json({ documents: [] })
    }

    try {
      const res = await fetch(`${instance.accessUrl}/api/knowledge`, {
        headers: { 'Authorization': `Bearer ${instance.containerId}` },
        signal: AbortSignal.timeout(5000),
      })
      if (res.ok) {
        const data = await res.json()
        return NextResponse.json({ documents: data.documents || data || [] })
      }
    } catch {
      // Knowledge API may not be available
    }

    return NextResponse.json({ documents: [] })
  } catch (error: any) {
    console.error('Knowledge fetch error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const instance = await getUserInstance(session.user.email)
    if (!instance?.accessUrl) {
      return NextResponse.json({ error: 'Instance not accessible' }, { status: 503 })
    }

    // Forward the multipart form data to the OpenClaw instance
    const formData = await req.formData()
    const file = formData.get('file')

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large. Max 10MB.' }, { status: 400 })
    }

    const forwardForm = new FormData()
    forwardForm.append('file', file)

    const res = await fetch(`${instance.accessUrl}/api/knowledge/upload`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${instance.containerId}` },
      body: forwardForm,
      signal: AbortSignal.timeout(30000),
    })

    if (res.ok) {
      const data = await res.json()
      return NextResponse.json(data)
    }

    return NextResponse.json({ error: 'Failed to upload document' }, { status: 500 })
  } catch (error: any) {
    console.error('Knowledge upload error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const instance = await getUserInstance(session.user.email)
    if (!instance?.accessUrl) {
      return NextResponse.json({ error: 'Instance not accessible' }, { status: 503 })
    }

    const body = await req.json()
    const { documentId } = body

    const res = await fetch(`${instance.accessUrl}/api/knowledge/${documentId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${instance.containerId}` },
      signal: AbortSignal.timeout(5000),
    })

    if (res.ok) {
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 })
  } catch (error: any) {
    console.error('Knowledge delete error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
