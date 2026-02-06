'use client'

export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check } from 'lucide-react'
import TemplateSelector, { BotTemplate } from '@/components/forms/template-selector'
import PlanSelection from '@/components/forms/plan-selection'
import ProviderConfig from '@/components/forms/provider-config'
import ChannelSelector from '@/components/forms/channel-selector'
import SkillsConfig from '@/components/forms/skills-config'
import PromptBuilder from '@/components/forms/prompt-builder'

const steps = [
  { id: 1, name: 'Template', description: 'Choose a starting point' },
  { id: 2, name: 'Choose Plan', description: 'Select your subscription' },
  { id: 3, name: 'AI Provider', description: 'Configure your AI model' },
  { id: 4, name: 'Channels', description: 'Select messaging platforms' },
  { id: 5, name: 'Personality', description: 'Define your bot\'s behavior' },
  { id: 6, name: 'Skills', description: 'Enable features (optional)' },
]

export default function OnboardPage() {
  const router = useRouter()
  const { status } = useSession()
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login')
    }
  }, [status, router])

  const [config, setConfig] = useState({
    plan: 'FREE',
    provider: 'ANTHROPIC',
    apiKey: '',
    model: '',
    failoverModel: '',
    channels: [] as any[],
    webSearchEnabled: false,
    braveApiKey: '',
    browserEnabled: false,
    ttsEnabled: false,
    elevenlabsApiKey: '',
    canvasEnabled: false,
    cronEnabled: false,
    memoryEnabled: false,
    agentName: '',
    systemPrompt: '',
  })

  const updateConfig = (updates: any) => {
    setConfig(prev => ({ ...prev, ...updates }))
  }

  const handleTemplateSelect = (template: BotTemplate | null) => {
    if (!template) {
      setSelectedTemplate('blank')
      return
    }

    setSelectedTemplate(template.id)
    updateConfig({
      provider: template.provider,
      model: template.model,
      channels: template.channels,
      webSearchEnabled: template.skills.webSearchEnabled,
      browserEnabled: template.skills.browserEnabled,
      ttsEnabled: template.skills.ttsEnabled,
      canvasEnabled: template.skills.canvasEnabled,
      cronEnabled: template.skills.cronEnabled,
      memoryEnabled: template.skills.memoryEnabled,
      agentName: template.agentName,
      systemPrompt: template.systemPrompt,
    })
  }

  const nextStep = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1)
    } else {
      handleCheckout()
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleCheckout = async () => {
    setLoading(true)
    try {
      // If free plan, deploy directly without Stripe
      if (config.plan === 'FREE') {
        const response = await fetch('/api/instance/deploy-free', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ config })
        })

        const data = await response.json()

        if (!response.ok) {
          console.error('Deploy Error:', data)
          alert(`Deployment failed: ${data.error || 'Unknown error'}`)
          return
        }

        router.push('/dashboard?success=true')
        return
      }

      // Paid plans go through Stripe
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: config.plan, config })
      })

      const data = await response.json()

      if (!response.ok) {
        console.error('API Error:', data)
        alert(`Checkout failed: ${data.error || 'Unknown error'}`)
        return
      }

      if (data.url) {
        window.location.href = data.url
        return
      }

      alert('Failed to initialize checkout')
    } catch (error) {
      console.error('Checkout error:', error)
      alert('Checkout failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-2">Deploy Your AI Assistant</h1>
          <p className="text-gray-600">Configure your bot in a few simple steps</p>
        </div>

        {/* Progress Steps */}
        <div className="mb-12">
          <div className="flex justify-between items-center">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors text-sm ${
                      currentStep > step.id
                        ? 'bg-green-500 text-white'
                        : currentStep === step.id
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {currentStep > step.id ? <Check className="h-5 w-5" /> : step.id}
                  </div>
                  <div className="mt-2 text-center">
                    <p className="font-semibold text-xs">{step.name}</p>
                    <p className="text-xs text-gray-500 hidden md:block">{step.description}</p>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`h-1 flex-1 mx-2 transition-colors ${
                      currentStep > step.id ? 'bg-green-500' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>{steps[currentStep - 1].name}</CardTitle>
            <CardDescription>{steps[currentStep - 1].description}</CardDescription>
          </CardHeader>
          <CardContent>
            {currentStep === 1 && (
              <TemplateSelector
                selectedTemplate={selectedTemplate}
                onSelect={handleTemplateSelect}
              />
            )}
            {currentStep === 2 && (
              <PlanSelection
                selectedPlan={config.plan}
                onSelect={(plan) => updateConfig({ plan })}
              />
            )}
            {currentStep === 3 && (
              <ProviderConfig
                config={config}
                onChange={updateConfig}
              />
            )}
            {currentStep === 4 && (
              <ChannelSelector
                channels={config.channels}
                onChange={(channels) => updateConfig({ channels })}
              />
            )}
            {currentStep === 5 && (
              <PromptBuilder
                config={{ agentName: config.agentName, systemPrompt: config.systemPrompt }}
                onChange={updateConfig}
              />
            )}
            {currentStep === 6 && (
              <SkillsConfig
                config={config}
                onChange={updateConfig}
              />
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 1}
          >
            Back
          </Button>
          <Button
            onClick={nextStep}
            disabled={loading || (currentStep === 1 && !selectedTemplate)}
          >
            {loading
              ? 'Processing...'
              : currentStep === steps.length
                ? config.plan === 'FREE'
                  ? 'Deploy for Free'
                  : 'Proceed to Payment'
                : 'Next Step'}
          </Button>
        </div>
      </div>
    </div>
  )
}
