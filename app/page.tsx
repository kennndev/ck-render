import Link from 'next/link'
import {
  ArrowRight, Bot, MessageSquare, Zap, Shield, Check,
  Clock, Brain, Globe, Users, Hash, ChevronRight, Sparkles
} from 'lucide-react'

const templates = [
  { name: 'Customer Support', desc: 'WhatsApp + Telegram with memory', icon: MessageSquare },
  { name: 'Personal Assistant', desc: 'All channels, search + scheduling', icon: Users },
  { name: 'Discord Community', desc: 'Engage & moderate your server', icon: Hash },
  { name: 'Team Collaboration', desc: 'Slack/Teams with browser + canvas', icon: Zap },
]

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bot className="h-8 w-8 text-purple-600" />
            <span className="text-2xl font-bold">Kainat</span>
          </div>
          <div className="flex items-center space-x-6">
            <Link href="/pricing" className="text-gray-600 hover:text-gray-900">
              Pricing
            </Link>
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

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-20">
        <div className="text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 px-4 py-1.5 rounded-full text-sm font-medium mb-6">
            <Sparkles className="h-4 w-4" />
            Free tier available - no credit card required
          </div>
          <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            Your AI Assistant,
            <br />
            Deployed in One Click
          </h1>
          <p className="text-xl text-gray-600 mb-10">
            Get your personal AI assistant running on WhatsApp, Telegram, Discord, and more.
            Choose a template, connect your channels, and deploy instantly.
          </p>
          <div className="flex items-center justify-center space-x-4">
            <Link
              href="/register"
              className="bg-purple-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-purple-700 transition flex items-center space-x-2"
            >
              <span>Deploy Free</span>
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="/pricing"
              className="border-2 border-purple-600 text-purple-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-purple-50 transition"
            >
              View Pricing
            </Link>
          </div>
        </div>

        {/* Templates Section */}
        <div className="mt-24">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">Start with a Template</h2>
            <p className="text-xl text-gray-600">
              Pre-configured bots for common use cases. Deploy in under 2 minutes.
            </p>
          </div>
          <div className="grid md:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {templates.map((tpl) => {
              const Icon = tpl.icon
              return (
                <Link
                  key={tpl.name}
                  href="/register"
                  className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg hover:shadow-xl transition group"
                >
                  <Icon className="h-10 w-10 text-purple-600 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">{tpl.name}</h3>
                  <p className="text-sm text-gray-600 mb-4">{tpl.desc}</p>
                  <span className="text-purple-600 text-sm font-medium flex items-center">
                    Use template
                    <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </span>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Features Grid */}
        <div className="mt-24">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">Everything You Need</h2>
            <p className="text-xl text-gray-600">
              A full management dashboard, multi-channel support, and powerful AI capabilities.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg">
              <Zap className="h-12 w-12 text-purple-600 mb-4" />
              <h3 className="text-2xl font-semibold mb-3">One-Click Deploy</h3>
              <p className="text-gray-600">
                Pick a template, connect your AI provider, choose channels, and deploy. No command line required.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg">
              <MessageSquare className="h-12 w-12 text-purple-600 mb-4" />
              <h3 className="text-2xl font-semibold mb-3">Multi-Channel</h3>
              <p className="text-gray-600">
                WhatsApp, Telegram, Discord, Slack, Signal, and more. All managed from one dashboard.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg">
              <Shield className="h-12 w-12 text-purple-600 mb-4" />
              <h3 className="text-2xl font-semibold mb-3">Secure & Private</h3>
              <p className="text-gray-600">
                Your data stays yours. Isolated containers, encrypted API keys, and zero data sharing.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg">
              <Brain className="h-12 w-12 text-purple-600 mb-4" />
              <h3 className="text-2xl font-semibold mb-3">Smart Skills</h3>
              <p className="text-gray-600">
                Web search, browser automation, text-to-speech, scheduled tasks, and persistent memory.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg">
              <Globe className="h-12 w-12 text-purple-600 mb-4" />
              <h3 className="text-2xl font-semibold mb-3">Real-Time Dashboard</h3>
              <p className="text-gray-600">
                Monitor status, view logs, track analytics, and manage channels live from your dashboard.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg">
              <Clock className="h-12 w-12 text-purple-600 mb-4" />
              <h3 className="text-2xl font-semibold mb-3">Always On</h3>
              <p className="text-gray-600">
                Your bot runs 24/7 on managed infrastructure. Start, stop, and restart from anywhere.
              </p>
            </div>
          </div>
        </div>

        {/* Channels Section */}
        <div className="mt-24 text-center">
          <h2 className="text-4xl font-bold mb-6">Connect to Your Favorite Platforms</h2>
          <p className="text-xl text-gray-600 mb-12">
            One AI assistant, accessible everywhere you chat
          </p>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-4 max-w-4xl mx-auto">
            {[
              'WhatsApp', 'Telegram', 'Discord', 'Slack', 'Signal',
              'Google Chat', 'Matrix', 'MS Teams', 'LINE', 'Mattermost',
              'Webchat', 'iMessage'
            ].map((platform) => (
              <div key={platform} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow hover:shadow-lg transition">
                <p className="font-medium text-sm">{platform}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Pricing Preview */}
        <div className="mt-24 text-center">
          <h2 className="text-4xl font-bold mb-6">Simple, Transparent Pricing</h2>
          <p className="text-xl text-gray-600 mb-12">
            Start free. Upgrade when you need more.
          </p>
          <div className="grid md:grid-cols-4 gap-6 max-w-6xl mx-auto">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg border-2 border-green-500">
              <div className="text-sm font-semibold text-green-600 mb-2">FREE FOREVER</div>
              <h3 className="text-2xl font-bold mb-2">Free</h3>
              <div className="text-4xl font-bold mb-4">$0</div>
              <ul className="text-left text-sm text-gray-600 space-y-2 mb-6">
                <li className="flex items-start"><Check className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />1 channel</li>
                <li className="flex items-start"><Check className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />100 messages/mo</li>
              </ul>
              <Link href="/register" className="block w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition text-center">
                Start Free
              </Link>
            </div>

            <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg">
              <h3 className="text-2xl font-bold mb-2">Monthly</h3>
              <div className="text-4xl font-bold mb-4">$29<span className="text-lg text-gray-600">/mo</span></div>
              <ul className="text-left text-sm text-gray-600 space-y-2 mb-6">
                <li className="flex items-start"><Check className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />Unlimited</li>
                <li className="flex items-start"><Check className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />All channels</li>
              </ul>
              <Link href="/register" className="block w-full bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 transition text-center">
                Get Started
              </Link>
            </div>

            <div className="bg-purple-600 text-white p-8 rounded-xl shadow-xl transform scale-105">
              <div className="text-sm font-semibold mb-2">SAVE 13%</div>
              <h3 className="text-2xl font-bold mb-2">3 Months</h3>
              <div className="text-4xl font-bold mb-4">$75<span className="text-lg">/3mo</span></div>
              <ul className="text-left text-sm space-y-2 mb-6">
                <li className="flex items-start"><Check className="h-4 w-4 text-green-300 mr-2 mt-0.5 flex-shrink-0" />Everything</li>
                <li className="flex items-start"><Check className="h-4 w-4 text-green-300 mr-2 mt-0.5 flex-shrink-0" />Save $12</li>
              </ul>
              <Link href="/register" className="block w-full bg-white text-purple-600 py-3 rounded-lg hover:bg-gray-100 transition font-semibold text-center">
                Get Started
              </Link>
            </div>

            <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg">
              <div className="text-sm font-semibold text-purple-600 mb-2">BEST VALUE</div>
              <h3 className="text-2xl font-bold mb-2">Yearly</h3>
              <div className="text-4xl font-bold mb-4">$299<span className="text-lg text-gray-600">/yr</span></div>
              <ul className="text-left text-sm text-gray-600 space-y-2 mb-6">
                <li className="flex items-start"><Check className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />Everything</li>
                <li className="flex items-start"><Check className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />Save $49</li>
              </ul>
              <Link href="/register" className="block w-full bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 transition text-center">
                Get Started
              </Link>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-24 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl p-12 text-center text-white">
          <h2 className="text-4xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-xl mb-8">
            Deploy your AI assistant now - start free, no credit card needed.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center space-x-2 bg-white text-purple-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-100 transition"
          >
            <span>Deploy Free Now</span>
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t mt-24 py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Bot className="h-6 w-6 text-purple-600" />
                <span className="text-xl font-bold">Kainat</span>
              </div>
              <p className="text-sm text-gray-600">
                Built on top of OpenClaw. Deploy AI assistants to any messaging platform.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Product</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><Link href="/pricing" className="hover:text-purple-600">Pricing</Link></li>
                <li><Link href="/register" className="hover:text-purple-600">Get Started</Link></li>
                <li><Link href="/login" className="hover:text-purple-600">Login</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Resources</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><a href="https://docs.openclaw.ai" target="_blank" rel="noopener noreferrer" className="hover:text-purple-600">Documentation</a></li>
                <li><a href="https://docs.openclaw.ai/channels" target="_blank" rel="noopener noreferrer" className="hover:text-purple-600">Channel Guides</a></li>
                <li><a href="https://clawhub.com" target="_blank" rel="noopener noreferrer" className="hover:text-purple-600">Skills Marketplace</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Support</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><a href="mailto:support@kainat.ai" className="hover:text-purple-600">Contact Support</a></li>
                <li><a href="https://docs.openclaw.ai/faq" target="_blank" rel="noopener noreferrer" className="hover:text-purple-600">FAQ</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t mt-8 pt-8 text-center text-sm text-gray-500">
            <p>2026 Kainat. Built on OpenClaw. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
