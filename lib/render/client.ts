/**
 * Render.com API Client
 *
 * Docs: https://render.com/docs/api
 * API Reference: https://api-docs.render.com
 */

const RENDER_API_URL = 'https://api.render.com/v1'

export interface RenderService {
  id: string
  name: string
  type: string
  ownerId: string
  serviceDetails: {
    url?: string
    env: string
    region: string
    plan: string
  }
  createdAt: string
  updatedAt: string
  suspended: string
  suspenders: string[]
}

export interface RenderDeploy {
  id: string
  serviceId: string
  status: string
  createdAt: string
  updatedAt: string
  finishedAt?: string
}

export class RenderClient {
  private apiKey: string

  constructor() {
    const apiKey = process.env.RENDER_API_KEY

    if (!apiKey) {
      throw new Error(
        'Missing RENDER_API_KEY environment variable.\n' +
        'Get one at: https://dashboard.render.com/u/<your-username>/settings#api-keys'
      )
    }

    this.apiKey = apiKey
    console.log(`[Render] Initialized with API key: ${apiKey.slice(0, 10)}...`)
  }

  private async request<T>(
    method: string,
    path: string,
    body?: any
  ): Promise<T> {
    const url = `${RENDER_API_URL}${path}`

    const res = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      ...(body && { body: JSON.stringify(body) }),
    })

    if (!res.ok) {
      const errorText = await res.text()
      console.error(`[Render] API Error ${res.status}:`, errorText)
      throw new Error(`Render API error ${res.status}: ${errorText}`)
    }

    // Some endpoints return empty responses
    const text = await res.text()
    if (!text) {
      return {} as T
    }

    return JSON.parse(text) as T
  }

  /** Create a new service from Docker image */
  async createService(config: {
    name: string
    image: string
    env: Record<string, string>
    plan?: string
    region?: string
    startCommand?: string
  }): Promise<RenderService> {
    console.log(`[Render] Creating service: ${config.name}`)

    const service = await this.request<RenderService>('POST', '/services', {
      type: 'web_service',
      name: config.name,
      ownerId: 'me', // Uses authenticated user/team
      serviceDetails: {
        env: 'docker',
        region: config.region || 'oregon', // Oregon (US West)
        plan: config.plan || 'starter', // Free tier
        dockerDetails: {
          dockerCommand: config.startCommand,
          dockerfilePath: '', // Not building, using pre-built image
          image: {
            imagePath: config.image,
          },
        },
        envVars: Object.entries(config.env).map(([key, value]) => ({
          key,
          value,
        })),
      },
    })

    console.log(`[Render] ✅ Service created: ${service.id}`)
    return service
  }

  /** Get service details */
  async getService(serviceId: string): Promise<RenderService> {
    return this.request<RenderService>('GET', `/services/${serviceId}`)
  }

  /** List all services */
  async listServices(): Promise<RenderService[]> {
    const response = await this.request<{ service: RenderService[] }>('GET', '/services')
    return response.service || []
  }

  /** Delete a service */
  async deleteService(serviceId: string): Promise<void> {
    console.log(`[Render] Deleting service: ${serviceId}`)
    await this.request('DELETE', `/services/${serviceId}`)
    console.log(`[Render] ✅ Service deleted`)
  }

  /** Suspend (stop) a service */
  async suspendService(serviceId: string): Promise<void> {
    console.log(`[Render] Suspending service: ${serviceId}`)
    await this.request('POST', `/services/${serviceId}/suspend`)
    console.log(`[Render] ✅ Service suspended`)
  }

  /** Resume (start) a service */
  async resumeService(serviceId: string): Promise<void> {
    console.log(`[Render] Resuming service: ${serviceId}`)
    await this.request('POST', `/services/${serviceId}/resume`)
    console.log(`[Render] ✅ Service resumed`)
  }

  /** Restart a service */
  async restartService(serviceId: string): Promise<void> {
    console.log(`[Render] Restarting service: ${serviceId}`)
    await this.request('POST', `/services/${serviceId}/restart`)
    console.log(`[Render] ✅ Service restarted`)
  }

  /** Update environment variables */
  async updateEnvVars(
    serviceId: string,
    env: Record<string, string>
  ): Promise<void> {
    console.log(`[Render] Updating ${Object.keys(env).length} env vars for ${serviceId}`)

    const envVars = Object.entries(env).map(([key, value]) => ({
      key,
      value,
    }))

    await this.request('PUT', `/services/${serviceId}/env-vars`, envVars)
    console.log(`[Render] ✅ Environment variables updated`)
  }

  /** Trigger a new deployment */
  async deploy(serviceId: string): Promise<RenderDeploy> {
    console.log(`[Render] Triggering deployment for: ${serviceId}`)

    const deploy = await this.request<RenderDeploy>(
      'POST',
      `/services/${serviceId}/deploys`
    )

    console.log(`[Render] ✅ Deployment triggered: ${deploy.id}`)
    return deploy
  }

  /** Get deployment details */
  async getDeploy(serviceId: string, deployId: string): Promise<RenderDeploy> {
    return this.request<RenderDeploy>('GET', `/services/${serviceId}/deploys/${deployId}`)
  }

  /** Wait for deployment to complete */
  async waitForDeploy(
    serviceId: string,
    deployId: string,
    timeoutMs: number = 300000 // 5 minutes
  ): Promise<void> {
    const startTime = Date.now()
    const pollInterval = 5000 // 5 seconds

    while (Date.now() - startTime < timeoutMs) {
      const deploy = await this.getDeploy(serviceId, deployId)

      console.log(`[Render] Deployment ${deployId} status: ${deploy.status}`)

      if (deploy.status === 'live') {
        console.log(`[Render] ✅ Deployment succeeded`)
        return
      }

      if (deploy.status === 'build_failed' || deploy.status === 'deactivated') {
        throw new Error(`Deployment failed with status: ${deploy.status}`)
      }

      await sleep(pollInterval)
    }

    throw new Error('Deployment timeout (5 minutes)')
  }

  /** Get service URL */
  getServiceUrl(service: RenderService): string {
    return service.serviceDetails.url || `https://${service.name}.onrender.com`
  }

  /** Get shell URL for service (opens in browser) */
  getShellUrl(serviceId: string): string {
    return `https://dashboard.render.com/web/${serviceId}/shell`
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
