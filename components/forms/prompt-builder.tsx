'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Wand2, User, Brain, Shield, MessageCircle, Lightbulb,
  Copy, CheckCircle2, RotateCcw, ChevronDown, ChevronUp
} from 'lucide-react'

interface PromptBuilderProps {
  config: {
    agentName: string
    systemPrompt: string
  }
  onChange: (updates: { agentName?: string; systemPrompt?: string }) => void
}

interface PromptSection {
  id: string
  label: string
  icon: any
  description: string
  placeholder: string
  prefix: string
}

const PROMPT_SECTIONS: PromptSection[] = [
  {
    id: 'identity',
    label: 'Identity & Role',
    icon: User,
    description: 'Who is the bot? What role does it play?',
    placeholder: 'You are a helpful customer support agent for Acme Corp...',
    prefix: 'You are',
  },
  {
    id: 'personality',
    label: 'Personality & Tone',
    icon: MessageCircle,
    description: 'How should the bot communicate?',
    placeholder: 'Be friendly, professional, and concise. Use a warm tone...',
    prefix: 'Communication style:',
  },
  {
    id: 'knowledge',
    label: 'Knowledge & Expertise',
    icon: Brain,
    description: 'What domains does the bot specialize in?',
    placeholder: 'You are an expert in web development, cloud infrastructure...',
    prefix: 'Areas of expertise:',
  },
  {
    id: 'boundaries',
    label: 'Boundaries & Rules',
    icon: Shield,
    description: 'What should the bot avoid or refuse?',
    placeholder: 'Never share internal company data. Decline medical or legal advice...',
    prefix: 'Important rules:',
  },
  {
    id: 'instructions',
    label: 'Special Instructions',
    icon: Lightbulb,
    description: 'Any additional behaviors or workflows?',
    placeholder: 'Always ask for the order number first. Escalate billing issues to a human...',
    prefix: 'Additional instructions:',
  },
]

const PROMPT_TEMPLATES = [
  {
    name: 'Customer Support',
    agentName: 'Support Agent',
    prompt: `You are a helpful customer support agent. You assist users with their questions, troubleshoot issues, and provide clear solutions.

Communication style: Be friendly, patient, and professional. Keep responses concise but thorough. Use bullet points for step-by-step instructions.

Important rules:
- Always ask for relevant details (account info, error messages) before troubleshooting
- If you cannot resolve an issue, offer to escalate to a human agent
- Never share internal policies or sensitive company information
- Confirm the issue is resolved before ending the conversation`,
  },
  {
    name: 'Personal Assistant',
    agentName: 'Assistant',
    prompt: `You are a personal AI assistant. You help with scheduling, reminders, research, writing, and general productivity tasks.

Communication style: Be efficient and proactive. Anticipate needs and suggest helpful follow-ups. Keep responses focused and actionable.

Areas of expertise: Time management, writing assistance, research, summarization, task organization.

Additional instructions:
- Prioritize clarity and brevity
- Offer to set reminders for follow-up tasks
- When summarizing, highlight key points and action items
- Ask clarifying questions when the request is ambiguous`,
  },
  {
    name: 'Community Manager',
    agentName: 'Community Bot',
    prompt: `You are a community manager bot for an online community. You welcome new members, answer FAQs, moderate discussions, and keep the community engaged.

Communication style: Be warm, inclusive, and encouraging. Use a casual but respectful tone. Add appropriate enthusiasm for community achievements.

Important rules:
- Welcome every new member with a brief intro and community guidelines
- Redirect off-topic discussions politely
- Flag inappropriate content for human moderators
- Share relevant resources and documentation links when helpful
- Encourage members to help each other`,
  },
  {
    name: 'Technical Expert',
    agentName: 'Tech Bot',
    prompt: `You are a technical expert assistant specializing in software development and engineering. You provide code reviews, debugging help, architecture advice, and technical documentation.

Communication style: Be precise and technical. Use code examples when appropriate. Explain complex concepts clearly with analogies when helpful.

Areas of expertise: Full-stack development, cloud architecture, DevOps, databases, API design, security best practices.

Additional instructions:
- Always include code examples in appropriate language
- Consider edge cases and error handling in your suggestions
- Mention performance implications when relevant
- Suggest testing strategies alongside implementation advice`,
  },
]

export default function PromptBuilder({ config, onChange }: PromptBuilderProps) {
  const [sections, setSections] = useState<Record<string, string>>({})
  const [expandedSections, setExpandedSections] = useState<string[]>(['identity'])
  const [showTemplates, setShowTemplates] = useState(!config.systemPrompt)
  const [copied, setCopied] = useState(false)
  const [mode, setMode] = useState<'guided' | 'freeform'>(config.systemPrompt ? 'freeform' : 'guided')

  const toggleSection = (id: string) => {
    setExpandedSections(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    )
  }

  const updateSection = (id: string, value: string) => {
    const updated = { ...sections, [id]: value }
    setSections(updated)
    // Auto-build prompt from sections
    const builtPrompt = PROMPT_SECTIONS
      .filter(s => updated[s.id]?.trim())
      .map(s => `${s.prefix} ${updated[s.id].trim()}`)
      .join('\n\n')
    onChange({ systemPrompt: builtPrompt })
  }

  const applyTemplate = (template: typeof PROMPT_TEMPLATES[0]) => {
    onChange({
      agentName: template.agentName,
      systemPrompt: template.prompt,
    })
    setMode('freeform')
    setShowTemplates(false)
  }

  const copyPrompt = () => {
    navigator.clipboard.writeText(config.systemPrompt || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const resetPrompt = () => {
    onChange({ systemPrompt: '', agentName: '' })
    setSections({})
    setMode('guided')
    setShowTemplates(true)
  }

  return (
    <div className="space-y-6">
      {/* Agent Name */}
      <div>
        <Label htmlFor="agentName" className="text-lg mb-2 block">
          Agent Name
        </Label>
        <p className="text-sm text-gray-600 mb-3">
          Give your bot a name. This appears in conversations and the dashboard.
        </p>
        <Input
          id="agentName"
          placeholder="e.g., Support Bot, Personal Assistant, Team Helper"
          value={config.agentName}
          onChange={(e) => onChange({ agentName: e.target.value })}
        />
      </div>

      {/* System Prompt */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label className="text-lg">System Prompt</Label>
          <div className="flex items-center gap-2">
            <Button
              variant={mode === 'guided' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('guided')}
            >
              <Wand2 className="h-3.5 w-3.5 mr-1" />
              Guided
            </Button>
            <Button
              variant={mode === 'freeform' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('freeform')}
            >
              Freeform
            </Button>
          </div>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Define your bot's personality, knowledge, and behavior. This is the core instruction set.
        </p>

        {/* Templates */}
        {showTemplates && (
          <div className="mb-6">
            <h4 className="text-sm font-medium mb-3">Start from a template</h4>
            <div className="grid md:grid-cols-2 gap-3">
              {PROMPT_TEMPLATES.map(template => (
                <Card
                  key={template.name}
                  className="p-3 cursor-pointer hover:shadow-md transition hover:ring-1 hover:ring-purple-200"
                  onClick={() => applyTemplate(template)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm">{template.name}</span>
                    <Badge variant="outline" className="text-xs">Template</Badge>
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-2">
                    {template.prompt.split('\n')[0]}
                  </p>
                </Card>
              ))}
            </div>
          </div>
        )}

        {mode === 'guided' ? (
          /* Guided Builder */
          <div className="space-y-3">
            {PROMPT_SECTIONS.map(section => {
              const Icon = section.icon
              const isExpanded = expandedSections.includes(section.id)

              return (
                <div key={section.id} className="border rounded-lg">
                  <button
                    className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition"
                    onClick={() => toggleSection(section.id)}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-purple-600" />
                      <span className="font-medium text-sm">{section.label}</span>
                      {sections[section.id] && (
                        <Badge variant="secondary" className="text-xs">Filled</Badge>
                      )}
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                  {isExpanded && (
                    <div className="px-3 pb-3">
                      <p className="text-xs text-gray-500 mb-2">{section.description}</p>
                      <textarea
                        placeholder={section.placeholder}
                        value={sections[section.id] || ''}
                        onChange={(e) => updateSection(section.id, e.target.value)}
                        className="w-full min-h-[80px] rounded-md border border-input bg-white px-3 py-2 text-sm"
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          /* Freeform Editor */
          <div>
            <textarea
              placeholder="Enter your system prompt here. This defines your bot's personality, knowledge, rules, and behavior..."
              value={config.systemPrompt}
              onChange={(e) => onChange({ systemPrompt: e.target.value })}
              className="w-full min-h-[250px] rounded-md border border-input bg-white px-3 py-2 text-sm font-mono"
            />
          </div>
        )}

        {/* Actions */}
        {config.systemPrompt && (
          <div className="flex items-center gap-2 mt-3">
            <Button variant="outline" size="sm" onClick={copyPrompt}>
              {copied ? (
                <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-green-500" />
              ) : (
                <Copy className="h-3.5 w-3.5 mr-1" />
              )}
              {copied ? 'Copied!' : 'Copy'}
            </Button>
            <Button variant="outline" size="sm" onClick={resetPrompt}>
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              Reset
            </Button>
            {!showTemplates && (
              <Button variant="outline" size="sm" onClick={() => setShowTemplates(true)}>
                Templates
              </Button>
            )}
            <span className="text-xs text-gray-400 ml-auto">
              {config.systemPrompt.length} characters
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
