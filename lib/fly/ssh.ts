import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

/**
 * Execute a command in a Fly.io machine via SSH
 *
 * Requires flyctl to be installed and FLY_API_TOKEN to be set
 */
export async function executeSSHCommand(
  appName: string,
  command: string,
  options?: {
    timeout?: number
    machineId?: string
  }
): Promise<{ stdout: string; stderr: string }> {
  const timeout = options?.timeout || 30000
  const machineIdFlag = options?.machineId ? `--machine ${options.machineId}` : ''

  // Build flyctl ssh console command
  const flyctlCommand = `flyctl ssh console ${machineIdFlag} --app ${appName} --command "${command.replace(/"/g, '\\"')}"`

  console.log(`[Fly.io SSH] Executing: ${command}`)

  try {
    const { stdout, stderr } = await execAsync(flyctlCommand, {
      timeout,
      env: {
        ...process.env,
        FLY_API_TOKEN: process.env.FLY_API_TOKEN,
      },
    })

    return { stdout, stderr }
  } catch (error: any) {
    console.error('[Fly.io SSH] Command failed:', error.message)
    throw new Error(`SSH command failed: ${error.message}`)
  }
}

/**
 * List pending OpenClaw device pairing requests
 */
export async function listPendingDevices(appName: string): Promise<{
  devices: Array<{
    requestId: string
    channel: string
    identifier: string
    timestamp: string
  }>
}> {
  const { stdout } = await executeSSHCommand(
    appName,
    'openclaw devices list --json'
  )

  try {
    const devices = JSON.parse(stdout)
    return { devices }
  } catch (error) {
    // If JSON parsing fails, parse text output
    // Expected format:
    // Request ID: abc123
    // Channel: whatsapp
    // Identifier: +1234567890
    // Timestamp: 2026-02-06T10:30:00Z

    const devices: Array<any> = []
    const lines = stdout.split('\n')

    let currentDevice: any = {}

    for (const line of lines) {
      if (line.startsWith('Request ID:')) {
        if (currentDevice.requestId) {
          devices.push(currentDevice)
          currentDevice = {}
        }
        currentDevice.requestId = line.split(':')[1]?.trim()
      } else if (line.startsWith('Channel:')) {
        currentDevice.channel = line.split(':')[1]?.trim()
      } else if (line.startsWith('Identifier:')) {
        currentDevice.identifier = line.split(':')[1]?.trim()
      } else if (line.startsWith('Timestamp:')) {
        currentDevice.timestamp = line.split(':')[1]?.trim()
      }
    }

    if (currentDevice.requestId) {
      devices.push(currentDevice)
    }

    return { devices }
  }
}

/**
 * Approve a device pairing request
 */
export async function approveDevice(
  appName: string,
  requestId: string
): Promise<{ success: boolean; message: string }> {
  const { stdout, stderr } = await executeSSHCommand(
    appName,
    `openclaw devices approve ${requestId}`
  )

  const success = !stderr.includes('error') && !stderr.includes('failed')

  return {
    success,
    message: stdout + stderr,
  }
}

/**
 * List OpenClaw channel status
 */
export async function listChannels(appName: string): Promise<{
  channels: Array<{
    name: string
    type: string
    status: string
    connected: boolean
  }>
}> {
  const { stdout } = await executeSSHCommand(
    appName,
    'openclaw channels list --json'
  )

  try {
    const channels = JSON.parse(stdout)
    return { channels }
  } catch (error) {
    // Fallback text parsing
    return { channels: [] }
  }
}

/**
 * Get WhatsApp QR code (if available in logs)
 */
export async function getWhatsAppQR(appName: string): Promise<{
  qrCode: string | null
  expires: string | null
}> {
  const { stdout } = await executeSSHCommand(
    appName,
    'openclaw logs --grep "QR Code" --tail 100'
  )

  // Look for QR code in ASCII format or URL
  const qrMatch = stdout.match(/QR Code:?\s*([\s\S]+?)(?:\n\n|\n[A-Z])/i)

  if (qrMatch && qrMatch[1]) {
    return {
      qrCode: qrMatch[1].trim(),
      expires: null, // TODO: Parse expiry if available
    }
  }

  return {
    qrCode: null,
    expires: null,
  }
}

/**
 * Run OpenClaw doctor to validate configuration
 */
export async function runDoctor(appName: string): Promise<{
  healthy: boolean
  issues: string[]
  warnings: string[]
}> {
  const { stdout, stderr } = await executeSSHCommand(
    appName,
    'openclaw doctor --json'
  )

  try {
    const result = JSON.parse(stdout)
    return {
      healthy: result.healthy || false,
      issues: result.issues || [],
      warnings: result.warnings || [],
    }
  } catch (error) {
    // Parse text output
    const issues: string[] = []
    const warnings: string[] = []

    const lines = (stdout + stderr).split('\n')

    for (const line of lines) {
      if (line.toLowerCase().includes('error') || line.toLowerCase().includes('issue')) {
        issues.push(line.trim())
      } else if (line.toLowerCase().includes('warn')) {
        warnings.push(line.trim())
      }
    }

    return {
      healthy: issues.length === 0,
      issues,
      warnings,
    }
  }
}

/**
 * Get OpenClaw Gateway health status
 */
export async function getGatewayHealth(appName: string): Promise<{
  status: 'healthy' | 'unhealthy' | 'unknown'
  uptime: number | null
  version: string | null
}> {
  try {
    const { stdout } = await executeSSHCommand(
      appName,
      'openclaw health --json',
      { timeout: 10000 }
    )

    const health = JSON.parse(stdout)

    return {
      status: health.status === 'ok' ? 'healthy' : 'unhealthy',
      uptime: health.uptime || null,
      version: health.version || null,
    }
  } catch (error) {
    return {
      status: 'unknown',
      uptime: null,
      version: null,
    }
  }
}

/**
 * Execute arbitrary OpenClaw CLI command (use carefully!)
 */
export async function executeOpenClawCommand(
  appName: string,
  command: string
): Promise<{ stdout: string; stderr: string }> {
  // Sanitize command to prevent injection
  const sanitized = command.replace(/[;&|`$()]/g, '')

  return executeSSHCommand(appName, `openclaw ${sanitized}`)
}
