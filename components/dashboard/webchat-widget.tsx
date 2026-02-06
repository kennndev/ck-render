'use client'

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Globe, Copy, CheckCircle2, Code, Eye, Palette,
  Send, X, MessageCircle, Loader2
} from 'lucide-react'

interface WebChatWidgetProps {
  instanceId: string
  accessUrl?: string
  agentName?: string
}

interface ChatMessage {
  id: string
  role: 'user' | 'bot'
  text: string
  timestamp: Date
}

export default function WebChatWidget({ instanceId, accessUrl, agentName }: WebChatWidgetProps) {
  const [copied, setCopied] = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [position, setPosition] = useState<'bottom-right' | 'bottom-left'>('bottom-right')
  const [primaryColor, setPrimaryColor] = useState('#7c3aed')
  const [greeting, setGreeting] = useState(`Hi! I'm ${agentName || 'your AI assistant'}. How can I help?`)

  // Live chat state
  const [chatOpen, setChatOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId] = useState(`webchat-dashboard-${Date.now()}`)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Widget script is served from our own API, not from the user's OpenClaw instance
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const widgetScriptUrl = `${baseUrl}/api/webchat/widget`

  const embedCode = `<!-- Kainat WebChat Widget -->
<script>
  (function() {
    var w = document.createElement('script');
    w.src = '${widgetScriptUrl}';
    w.async = true;
    w.dataset.instanceId = '${instanceId}';
    w.dataset.theme = '${theme}';
    w.dataset.position = '${position}';
    w.dataset.color = '${primaryColor}';
    w.dataset.greeting = '${greeting}';
    document.head.appendChild(w);
  })();
</script>`

  const iframeCode = `<!-- Kainat WebChat - Inline Embed -->
<script src="${widgetScriptUrl}"
  data-instance-id="${instanceId}"
  data-theme="${theme}"
  data-position="${position}"
  data-color="${primaryColor}"
  data-greeting="${greeting}">
</script>`

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Add greeting message when chat opens
  useEffect(() => {
    if (chatOpen && messages.length === 0) {
      setMessages([{
        id: 'greeting',
        role: 'bot',
        text: greeting,
        timestamp: new Date()
      }])
    }
  }, [chatOpen, greeting, messages.length])

  const sendMessage = async () => {
    const text = inputValue.trim()
    if (!text || isLoading) return

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, userMsg])
    setInputValue('')
    setIsLoading(true)

    try {
      const res = await fetch('/api/webchat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instanceId,
          message: text,
          sessionId,
        })
      })
      const data = await res.json()

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'bot',
        text: data.reply || 'No response received.',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, botMsg])
    } catch (err) {
      setMessages(prev => [...prev, {
        id: `error-${Date.now()}`,
        role: 'bot',
        text: 'Sorry, something went wrong. Please try again.',
        timestamp: new Date()
      }])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Embeddable Web Chat
              </CardTitle>
              <CardDescription>
                Add a chat widget to your website. Visitors can chat with your bot directly.
              </CardDescription>
            </div>
            <Button onClick={() => setChatOpen(true)} className="gap-2">
              <MessageCircle className="h-4 w-4" />
              Try Chat
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Customization */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm">Theme</Label>
              <div className="flex gap-2 mt-1">
                <Button
                  variant={theme === 'light' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTheme('light')}
                >
                  Light
                </Button>
                <Button
                  variant={theme === 'dark' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTheme('dark')}
                >
                  Dark
                </Button>
              </div>
            </div>

            <div>
              <Label className="text-sm">Position</Label>
              <div className="flex gap-2 mt-1">
                <Button
                  variant={position === 'bottom-right' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPosition('bottom-right')}
                >
                  Bottom Right
                </Button>
                <Button
                  variant={position === 'bottom-left' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPosition('bottom-left')}
                >
                  Bottom Left
                </Button>
              </div>
            </div>

            <div>
              <Label className="text-sm flex items-center gap-1">
                <Palette className="h-3.5 w-3.5" />
                Primary Color
              </Label>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-10 h-10 rounded border cursor-pointer"
                />
                <Input
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="flex-1"
                  placeholder="#7c3aed"
                />
              </div>
            </div>

            <div>
              <Label className="text-sm">Greeting Message</Label>
              <Input
                value={greeting}
                onChange={(e) => setGreeting(e.target.value)}
                placeholder="Hi! How can I help?"
                className="mt-1"
              />
            </div>
          </div>

          {/* Preview */}
          <div>
            <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
              <Eye className="h-4 w-4" />
              Preview
            </h4>
            <div className={`border rounded-lg p-4 ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
              <div className={`w-80 mx-auto rounded-xl shadow-lg overflow-hidden ${
                theme === 'dark' ? 'bg-gray-800' : 'bg-white'
              }`}>
                {/* Widget Header */}
                <div className="p-3" style={{ backgroundColor: primaryColor }}>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                      <Globe className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="text-white font-medium text-sm">{agentName || 'AI Assistant'}</p>
                      <p className="text-white/70 text-xs">Online</p>
                    </div>
                  </div>
                </div>
                {/* Widget Body */}
                <div className={`p-3 min-h-[120px] ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  <div className={`inline-block px-3 py-2 rounded-lg text-sm ${
                    theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'
                  }`}>
                    {greeting}
                  </div>
                </div>
                {/* Widget Input */}
                <div className={`p-3 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                  <div className={`rounded-full px-4 py-2 text-sm ${
                    theme === 'dark' ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-400'
                  }`}>
                    Type a message...
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Embed Code - Script */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium flex items-center gap-1">
                <Code className="h-4 w-4" />
                Embed Code (Floating Widget)
              </h4>
              <Button variant="outline" size="sm" onClick={() => copyCode(embedCode)}>
                {copied ? (
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-green-500" />
                ) : (
                  <Copy className="h-3.5 w-3.5 mr-1" />
                )}
                {copied ? 'Copied!' : 'Copy'}
              </Button>
            </div>
            <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-xs overflow-x-auto">
              {embedCode}
            </pre>
          </div>

          {/* Embed Code - Inline */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium flex items-center gap-1">
                <Code className="h-4 w-4" />
                Embed Code (Inline Script Tag)
              </h4>
              <Button variant="outline" size="sm" onClick={() => copyCode(iframeCode)}>
                <Copy className="h-3.5 w-3.5 mr-1" />
                Copy
              </Button>
            </div>
            <pre className="bg-gray-900 text-blue-400 p-4 rounded-lg text-xs overflow-x-auto">
              {iframeCode}
            </pre>
          </div>
        </CardContent>
      </Card>

      {/* Live Chat Modal */}
      {chatOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md h-[600px] flex flex-col overflow-hidden">
            {/* Chat Header */}
            <div className="p-4 flex items-center justify-between" style={{ backgroundColor: primaryColor }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <MessageCircle className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-white font-semibold">{agentName || 'AI Assistant'}</p>
                  <p className="text-white/70 text-xs">Live Chat Test</p>
                </div>
              </div>
              <button
                onClick={() => setChatOpen(false)}
                className="text-white/80 hover:text-white transition p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'text-white rounded-br-md'
                        : 'bg-white text-gray-800 rounded-bl-md shadow-sm border'
                    }`}
                    style={msg.role === 'user' ? { backgroundColor: primaryColor } : undefined}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white text-gray-800 rounded-2xl rounded-bl-md shadow-sm border px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: primaryColor, animationDelay: '0ms' }} />
                      <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: primaryColor, animationDelay: '150ms' }} />
                      <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: primaryColor, animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input */}
            <div className="p-4 border-t bg-white">
              <form
                onSubmit={(e) => { e.preventDefault(); sendMessage() }}
                className="flex items-center gap-2"
              >
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 rounded-full"
                  disabled={isLoading}
                  autoFocus
                />
                <Button
                  type="submit"
                  size="icon"
                  className="rounded-full h-10 w-10 shrink-0"
                  style={{ backgroundColor: primaryColor }}
                  disabled={isLoading || !inputValue.trim()}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </form>
              <p className="text-center text-xs text-gray-400 mt-2">
                Powered by Kainat
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
