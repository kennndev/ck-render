'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Terminal as TerminalIcon, CheckCircle, XCircle, RefreshCw, QrCode } from 'lucide-react'

interface Device {
  requestId: string
  channel: string
  identifier: string
  timestamp: string
}

export default function Terminal() {
  const [loading, setLoading] = useState(false)
  const [devices, setDevices] = useState<Device[]>([])
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [health, setHealth] = useState<any>(null)
  const [output, setOutput] = useState<string[]>([])

  const addOutput = (message: string) => {
    setOutput(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`])
  }

  const loadDevices = async () => {
    setLoading(true)
    addOutput('Fetching pending devices...')

    try {
      const res = await fetch('/api/instance/terminal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'list-devices' })
      })

      const data = await res.json()

      if (res.ok) {
        setDevices(data.devices || [])
        addOutput(`Found ${data.devices?.length || 0} pending devices`)
      } else {
        addOutput(`❌ Error: ${data.error}`)
      }
    } catch (error: any) {
      addOutput(`❌ Failed: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const approveDevice = async (requestId: string) => {
    setLoading(true)
    addOutput(`Approving device: ${requestId}`)

    try {
      const res = await fetch('/api/instance/terminal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve-device', requestId })
      })

      const data = await res.json()

      if (res.ok && data.success) {
        addOutput(`✅ Device approved!`)
        await loadDevices() // Refresh list
      } else {
        addOutput(`❌ Failed: ${data.message || data.error}`)
      }
    } catch (error: any) {
      addOutput(`❌ Failed: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const loadWhatsAppQR = async () => {
    setLoading(true)
    addOutput('Fetching WhatsApp QR code...')

    try {
      const res = await fetch('/api/instance/terminal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get-whatsapp-qr' })
      })

      const data = await res.json()

      if (res.ok && data.qrCode) {
        setQrCode(data.qrCode)
        addOutput('✅ QR code retrieved')
      } else {
        addOutput('⚠️  No QR code found. Make sure WhatsApp channel is configured.')
      }
    } catch (error: any) {
      addOutput(`❌ Failed: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const checkHealth = async () => {
    setLoading(true)
    addOutput('Checking gateway health...')

    try {
      const res = await fetch('/api/instance/terminal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'check-health' })
      })

      const data = await res.json()

      if (res.ok) {
        setHealth(data)
        addOutput(`✅ Gateway status: ${data.status}`)
        if (data.version) addOutput(`   Version: ${data.version}`)
        if (data.uptime) addOutput(`   Uptime: ${Math.floor(data.uptime / 60)}m`)
      } else {
        addOutput(`❌ Health check failed: ${data.error}`)
      }
    } catch (error: any) {
      addOutput(`❌ Failed: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Auto-load devices on mount
    loadDevices()
    checkHealth()
  }, [])

  return (
    <div className="space-y-4">
      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TerminalIcon className="w-5 h-5" />
            OpenClaw Terminal
          </CardTitle>
          <CardDescription>
            Manage device pairing, view QR codes, and run diagnostics
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button onClick={loadDevices} disabled={loading} size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Devices
            </Button>
            <Button onClick={loadWhatsAppQR} disabled={loading} size="sm" variant="outline">
              <QrCode className="w-4 h-4 mr-2" />
              WhatsApp QR
            </Button>
            <Button onClick={checkHealth} disabled={loading} size="sm" variant="outline">
              <CheckCircle className="w-4 h-4 mr-2" />
              Check Health
            </Button>
          </div>

          {/* Health Status */}
          {health && (
            <div className="p-3 rounded-lg bg-muted">
              <div className="flex items-center gap-2 mb-2">
                {health.status === 'healthy' ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-600" />
                )}
                <span className="font-medium">
                  Gateway: {health.status}
                </span>
              </div>
              {health.version && (
                <p className="text-sm text-muted-foreground">Version: {health.version}</p>
              )}
              {health.uptime !== null && (
                <p className="text-sm text-muted-foreground">
                  Uptime: {Math.floor(health.uptime / 3600)}h {Math.floor((health.uptime % 3600) / 60)}m
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Devices */}
      {devices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Device Approvals</CardTitle>
            <CardDescription>
              These devices are waiting for approval to connect
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {devices.map((device) => (
                <div
                  key={device.requestId}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline">{device.channel}</Badge>
                      <span className="font-medium">{device.identifier}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Request ID: {device.requestId}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(device.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <Button
                    onClick={() => approveDevice(device.requestId)}
                    disabled={loading}
                    size="sm"
                  >
                    Approve
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* WhatsApp QR Code */}
      {qrCode && (
        <Card>
          <CardHeader>
            <CardTitle>WhatsApp QR Code</CardTitle>
            <CardDescription>
              Scan this code with WhatsApp to connect your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-white rounded-lg inline-block">
              <pre className="font-mono text-xs leading-tight">{qrCode}</pre>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              💡 Open WhatsApp → Settings → Linked Devices → Link a Device → Scan this QR
            </p>
          </CardContent>
        </Card>
      )}

      {/* Terminal Output */}
      <Card>
        <CardHeader>
          <CardTitle>Terminal Output</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm h-64 overflow-y-auto">
            {output.length === 0 ? (
              <p className="text-gray-500">Waiting for commands...</p>
            ) : (
              output.map((line, i) => (
                <div key={i}>{line}</div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
