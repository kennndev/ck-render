import Link from 'next/link'
import { Check, Bot, X, Sparkles } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function PricingPage() {
  const plans = [
    {
      name: 'Free',
      price: 0,
      period: '',
      description: 'Try it out, no credit card required',
      badge: 'Free Forever',
      badgeColor: 'bg-green-600',
      cta: 'Start Free',
      ctaColor: 'bg-green-600 text-white hover:bg-green-700',
      features: [
        { text: '1 channel (WhatsApp, Telegram, or Discord)', included: true },
        { text: '100 messages per month', included: true },
        { text: 'Basic AI model (Claude Sonnet)', included: true },
        { text: 'Dashboard & logs', included: true },
        { text: 'Community support', included: true },
        { text: 'Unlimited messages', included: false },
        { text: 'All channels', included: false },
        { text: 'All AI models', included: false },
        { text: 'Skills & extensions', included: false },
      ]
    },
    {
      name: 'Monthly',
      price: 29,
      period: '/month',
      description: 'Full access, cancel anytime',
      cta: 'Get Started',
      ctaColor: 'bg-purple-600 text-white hover:bg-purple-700',
      features: [
        { text: 'All channels (WhatsApp, Telegram, Discord, etc.)', included: true },
        { text: 'Unlimited messages', included: true },
        { text: 'All AI models & providers', included: true },
        { text: 'Dashboard, logs & analytics', included: true },
        { text: 'All skills & extensions', included: true },
        { text: 'Web search & browser', included: true },
        { text: 'Memory & RAG', included: true },
        { text: 'Scheduled tasks', included: true },
        { text: '24/7 support', included: true },
      ]
    },
    {
      name: '3 Months',
      price: 75,
      pricePerMonth: 25,
      period: '/3 months',
      discount: 13,
      badge: 'Save $12',
      badgeColor: 'bg-purple-600',
      popular: true,
      description: 'Best for short-term projects',
      cta: 'Get Started',
      ctaColor: 'bg-purple-600 text-white hover:bg-purple-700',
      features: [
        { text: 'Everything in Monthly, plus:', included: true },
        { text: 'Unlimited messages', included: true },
        { text: 'All channels', included: true },
        { text: 'All AI models & providers', included: true },
        { text: 'All skills & extensions', included: true },
        { text: 'Priority support', included: true },
        { text: 'Save $12 over monthly', included: true },
      ]
    },
    {
      name: 'Yearly',
      price: 299,
      pricePerMonth: 24.92,
      period: '/year',
      discount: 14,
      badge: 'Best Value',
      badgeColor: 'bg-orange-600',
      description: 'Best value for long-term use',
      cta: 'Get Started',
      ctaColor: 'bg-purple-600 text-white hover:bg-purple-700',
      features: [
        { text: 'Everything in Monthly, plus:', included: true },
        { text: 'Unlimited messages', included: true },
        { text: 'All channels', included: true },
        { text: 'All AI models & providers', included: true },
        { text: 'All skills & extensions', included: true },
        { text: 'Priority support', included: true },
        { text: 'Save $49 over monthly', included: true },
      ]
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <Bot className="h-8 w-8 text-purple-600" />
            <span className="text-2xl font-bold">Kainat</span>
          </Link>
          <div className="flex items-center space-x-6">
            <Link href="https://docs.openclaw.ai" className="text-gray-600 hover:text-gray-900" target="_blank">
              Docs
            </Link>
            <Link href="/login" className="text-gray-600 hover:text-gray-900">
              Login
            </Link>
            <Link
              href="/register"
              className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition"
            >
              Start Free
            </Link>
          </div>
        </nav>
      </header>

      <main className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 px-4 py-1.5 rounded-full text-sm font-medium mb-6">
            <Sparkles className="h-4 w-4" />
            Start free - no credit card required
          </div>
          <h1 className="text-5xl font-bold mb-4">Simple, Transparent Pricing</h1>
          <p className="text-xl text-gray-600">
            Start free. Upgrade when you need unlimited messages and all channels.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={`relative p-6 ${
                plan.popular ? 'ring-2 ring-purple-600 shadow-2xl lg:transform lg:scale-105' : 'shadow-lg'
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className={`${plan.badgeColor} text-white px-3 py-0.5`}>
                    {plan.badge}
                  </Badge>
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                <div className="mb-3">
                  <span className="text-4xl font-bold">
                    {plan.price === 0 ? 'Free' : `$${plan.price}`}
                  </span>
                  {plan.period && (
                    <span className="text-gray-600">{plan.period}</span>
                  )}
                  {plan.pricePerMonth && (
                    <p className="text-sm text-gray-500 mt-1">
                      ${plan.pricePerMonth}/month
                    </p>
                  )}
                </div>
                <p className="text-gray-600 text-sm">{plan.description}</p>
              </div>

              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    {feature.included ? (
                      <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    ) : (
                      <X className="h-4 w-4 text-gray-300 mr-2 flex-shrink-0 mt-0.5" />
                    )}
                    <span className={`text-sm ${feature.included ? '' : 'text-gray-400'}`}>
                      {feature.text}
                    </span>
                  </li>
                ))}
              </ul>

              <Link
                href="/register"
                className={`block w-full text-center py-3 rounded-lg font-semibold transition ${plan.ctaColor}`}
              >
                {plan.cta}
              </Link>
            </Card>
          ))}
        </div>

        {/* FAQ */}
        <div className="mt-24 max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-lg mb-2">What's included in the free tier?</h3>
              <p className="text-gray-600">
                The free tier includes 1 channel (WhatsApp, Telegram, or Discord), 100 messages per month, and a basic AI model. It's designed to let you try the platform before committing.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2">Can I upgrade from free to paid?</h3>
              <p className="text-gray-600">
                Yes! You can upgrade at any time from your dashboard. Your configuration and conversation history are preserved.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2">Do I need my own AI API key?</h3>
              <p className="text-gray-600">
                Yes, you'll need an API key from your chosen provider (Anthropic, OpenAI, OpenRouter, etc.). Your key is encrypted and only used to run your bot.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2">What payment methods do you accept?</h3>
              <p className="text-gray-600">
                We accept all major credit cards through Stripe. The free tier requires no payment information.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2">Do you offer refunds?</h3>
              <p className="text-gray-600">
                Yes, we offer a 7-day money-back guarantee on all paid plans.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2">Are there any hidden fees?</h3>
              <p className="text-gray-600">
                No hidden fees. The price you see is what you pay for Kainat. AI provider API costs (Anthropic/OpenAI) are separate and billed directly by them.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t mt-24 py-12">
        <div className="container mx-auto px-4 text-center text-gray-600">
          <p>2026 Kainat. Built on OpenClaw. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
