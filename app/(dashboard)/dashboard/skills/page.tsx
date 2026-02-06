'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Bot, ArrowLeft } from 'lucide-react'
import SkillsBrowser from '@/components/dashboard/skills-browser'

export default function SkillsPage() {
  const router = useRouter()
  const [instance, setInstance] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/instance/status')
      .then(r => r.json())
      .then(data => {
        setInstance(data.instance)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Bot className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    )
  }

  if (!instance) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">No instance found. Deploy your bot first.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Dashboard
          </Button>
          <h1 className="text-lg font-bold">Skills Marketplace</h1>
        </div>
      </header>
      <main className="container mx-auto px-4 py-6">
        <SkillsBrowser instanceId={instance.id} />
      </main>
    </div>
  )
}
