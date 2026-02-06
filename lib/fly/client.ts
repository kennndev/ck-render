/**
 * Fly.io Machines API Client
 *
 * Docs: https://fly.io/docs/machines/api/
 * API Reference: https://fly.io/docs/machines/api/machines-resource/
 */

const FLY_API_URL = 'https://api.machines.dev/v1'

interface FlyMachine {
  id: string
  name: string
  state: string
  region: string
  image_ref: {
    registry: string
    repository: string
    tag: string
    digest: string
  }
  instance_id: string
  private_ip: string
  config: {
    image: string
    env: Record<string, string>
    guest: {
      cpu_kind: string
      cpus: number
      memory_mb: number
    }
    auto_destroy: boolean
    restart: {
      policy: string
    }
    services?: Array<{
      ports: Array<{
        port: number
        handlers: string[]
      }>
      protocol: string
      internal_port: number
    }>
  }
  created_at: string
}

interface FlyApp {
  id: string
  name: string
  organization: {
    slug: string
  }
  status: string
}

interface FlyVolume {
  id: string
  name: string
  state: string
  size_gb: number
  region: string
  attached_machine_id?: string
}

export class FlyClient {
  private token: string
  private orgSlug: string

  constructor() {
    const token = process.env.FLY_API_TOKEN
    const orgSlug = process.env.FLY_ORG_SLUG

    if (!token) {
      throw new Error(
        'Missing FLY_API_TOKEN environment variable. Get one at: https://fly.io/user/personal_access_tokens'
      )
    }

    if (!orgSlug) {
      throw new Error(
        'Missing FLY_ORG_SLUG environment variable. Find yours at: https://fly.io/dashboard'
      )
    }

    this.token = token
    this.orgSlug = orgSlug

    console.log(`[Fly.io] Initialized with org: ${orgSlug}`)
  }

  private async request<T>(
    method: string,
    path: string,
    body?: any
  ): Promise<T> {
    const url = `${FLY_API_URL}${path}`

    const res = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      ...(body && { body: JSON.stringify(body) }),
    })

    if (!res.ok) {
      const errorText = await res.text()
      console.error(`[Fly.io] API Error ${res.status}:`, errorText)
      throw new Error(`Fly.io API error ${res.status}: ${errorText}`)
    }

    // Some endpoints return 204 No Content
    if (res.status === 204) {
      return {} as T
    }

    return res.json()
  }

  /** Verify API token has access */
  async verifyAccess(): Promise<void> {
    console.log('[Fly.io] Verifying API token...')
    const apps = await this.request<FlyApp[]>('GET', '/apps')
    console.log(`[Fly.io] ✅ Token verified (${apps.length} apps accessible)`)
  }

  /** Create a new Fly app */
  async createApp(name: string): Promise<FlyApp> {
    console.log(`[Fly.io] Creating app: ${name}`)

    const app = await this.request<FlyApp>('POST', '/apps', {
      app_name: name,
      org_slug: this.orgSlug,
    })

    console.log(`[Fly.io] ✅ App created: ${app.id}`)
    return app
  }

  /** Delete a Fly app */
  async deleteApp(appName: string): Promise<void> {
    console.log(`[Fly.io] Deleting app: ${appName}`)
    await this.request('DELETE', `/apps/${appName}`)
    console.log(`[Fly.io] ✅ App deleted: ${appName}`)
  }

  /** Check if an app exists */
  async appExists(appName: string): Promise<boolean> {
    try {
      await this.request<FlyApp>('GET', `/apps/${appName}`)
      return true
    } catch (error: any) {
      if (error.message.includes('404')) {
        return false
      }
      throw error
    }
  }

  /** Set secrets (encrypted environment variables) on an app */
  async setSecrets(
    appName: string,
    secrets: Record<string, string>
  ): Promise<void> {
    console.log(`[Fly.io] Setting ${Object.keys(secrets).length} secrets on ${appName}`)

    // Fly.io Machines API uses GraphQL for secrets management
    // Or we use the REST endpoint for app secrets
    const graphqlUrl = 'https://api.fly.io/graphql'

    const mutation = `
      mutation SetSecrets($input: SetSecretsInput!) {
        setSecrets(input: $input) {
          release {
            id
            version
          }
        }
      }
    `

    const secretsArray = Object.entries(secrets).map(([key, value]) => ({
      key,
      value,
    }))

    const res = await fetch(graphqlUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: mutation,
        variables: {
          input: {
            appId: appName,
            secrets: secretsArray,
          },
        },
      }),
    })

    if (!res.ok) {
      const errorText = await res.text()
      throw new Error(`Failed to set secrets: ${res.status} ${errorText}`)
    }

    const result = await res.json()

    if (result.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`)
    }

    console.log(`[Fly.io] ✅ Secrets set successfully`)
  }

  /** Create a machine (container instance) */
  async createMachine(
    appName: string,
    config: {
      image: string
      env?: Record<string, string>
      cmd?: string[]
      region?: string
      guest?: {
        cpus?: number
        memory_mb?: number
        cpu_kind?: string
      }
      services?: Array<{
        protocol: string
        internal_port: number
        ports?: Array<{
          port: number
          handlers?: string[]
        }>
        auto_stop_machines?: boolean
        auto_start_machines?: boolean
      }>
    }
  ): Promise<FlyMachine> {
    console.log(`[Fly.io] Creating machine in app: ${appName}`)

    const machineConfig: any = {
      image: config.image,
      env: config.env || {},
      guest: {
        cpu_kind: config.guest?.cpu_kind || 'shared',
        cpus: config.guest?.cpus || 1,
        memory_mb: config.guest?.memory_mb || 256,
      },
      restart: {
        policy: 'always',
      },
      auto_destroy: false,
    }

    // Add command if provided
    if (config.cmd) {
      machineConfig.init = {
        cmd: config.cmd,
      }
    }

    // Add services if provided (for HTTP exposure)
    if (config.services) {
      machineConfig.services = config.services
    }

    const machine = await this.request<FlyMachine>(
      'POST',
      `/apps/${appName}/machines`,
      {
        name: `${appName}-main`,
        region: config.region || 'iad', // Default to US East
        config: machineConfig,
      }
    )

    console.log(`[Fly.io] ✅ Machine created: ${machine.id}`)
    return machine
  }

  /** Get machine details */
  async getMachine(appName: string, machineId: string): Promise<FlyMachine> {
    return this.request<FlyMachine>('GET', `/apps/${appName}/machines/${machineId}`)
  }

  /** List all machines for an app */
  async listMachines(appName: string): Promise<FlyMachine[]> {
    return this.request<FlyMachine[]>('GET', `/apps/${appName}/machines`)
  }

  /** Stop a machine */
  async stopMachine(appName: string, machineId: string): Promise<void> {
    console.log(`[Fly.io] Stopping machine: ${machineId}`)
    await this.request('POST', `/apps/${appName}/machines/${machineId}/stop`)
    console.log(`[Fly.io] ✅ Machine stopped`)
  }

  /** Start a machine */
  async startMachine(appName: string, machineId: string): Promise<void> {
    console.log(`[Fly.io] Starting machine: ${machineId}`)
    await this.request('POST', `/apps/${appName}/machines/${machineId}/start`)
    console.log(`[Fly.io] ✅ Machine started`)
  }

  /** Restart a machine */
  async restartMachine(appName: string, machineId: string): Promise<void> {
    console.log(`[Fly.io] Restarting machine: ${machineId}`)
    await this.request('POST', `/apps/${appName}/machines/${machineId}/restart`, {
      timeout: 60,
    })
    console.log(`[Fly.io] ✅ Machine restarted`)
  }

  /** Delete a machine */
  async deleteMachine(appName: string, machineId: string): Promise<void> {
    console.log(`[Fly.io] Deleting machine: ${machineId}`)
    await this.request('DELETE', `/apps/${appName}/machines/${machineId}`)
    console.log(`[Fly.io] ✅ Machine deleted`)
  }

  /** Wait for machine to reach a specific state */
  async waitForMachineState(
    appName: string,
    machineId: string,
    targetState: string,
    timeoutMs: number = 120000
  ): Promise<void> {
    const startTime = Date.now()
    const pollInterval = 3000

    while (Date.now() - startTime < timeoutMs) {
      const machine = await this.getMachine(appName, machineId)

      console.log(`[Fly.io] Machine ${machineId} state: ${machine.state}`)

      if (machine.state === targetState) {
        console.log(`[Fly.io] ✅ Machine reached state: ${targetState}`)
        return
      }

      if (machine.state === 'failed' || machine.state === 'destroyed') {
        throw new Error(`Machine entered terminal state: ${machine.state}`)
      }

      await new Promise((resolve) => setTimeout(resolve, pollInterval))
    }

    throw new Error(`Timeout waiting for machine to reach state: ${targetState}`)
  }

  /** Get machine logs */
  async getMachineLogs(
    appName: string,
    machineId: string,
    limit: number = 100
  ): Promise<string> {
    // Fly.io uses NATS for logs, but we can use flyctl proxy or direct API
    // For now, we'll use the exec endpoint to tail logs
    try {
      const logs = await this.request<{ logs: string }>(
        'GET',
        `/apps/${appName}/machines/${machineId}/logs?limit=${limit}`
      )
      return logs.logs || 'No logs available'
    } catch (error) {
      console.warn('[Fly.io] Failed to fetch logs:', error)
      return 'Failed to fetch logs. Use flyctl logs instead.'
    }
  }

  /** Allocate an IP address for the app */
  async allocateIPAddress(
    appName: string,
    type: 'v4' | 'v6' | 'private_v6' = 'v6'
  ): Promise<{ id: string; address: string; type: string }> {
    console.log(`[Fly.io] Allocating ${type} IP for ${appName}`)

    const graphqlUrl = 'https://api.fly.io/graphql'

    const mutation = `
      mutation AllocateIPAddress($input: AllocateIPAddressInput!) {
        allocateIpAddress(input: $input) {
          ipAddress {
            id
            address
            type
          }
        }
      }
    `

    const res = await fetch(graphqlUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: mutation,
        variables: {
          input: {
            appId: appName,
            type: type === 'v4' ? 'v4' : type === 'v6' ? 'v6' : 'private_v6',
          },
        },
      }),
    })

    if (!res.ok) {
      throw new Error(`Failed to allocate IP: ${res.status}`)
    }

    const result = await res.json()

    if (result.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`)
    }

    const ipAddress = result.data.allocateIpAddress.ipAddress

    console.log(`[Fly.io] ✅ IP allocated: ${ipAddress.address}`)
    return ipAddress
  }

  /** Get app hostname (automatically assigned by Fly.io) */
  getAppHostname(appName: string): string {
    return `${appName}.fly.dev`
  }

  /** Get full app URL with protocol and port */
  getAppUrl(appName: string, port: number = 18789): string {
    return `https://${this.getAppHostname(appName)}`
  }
}
