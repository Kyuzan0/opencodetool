import { ipcMain } from 'electron'

interface FetchModelsRequest {
  baseURL: string
  apiKey?: string
}

interface FetchedModel {
  id: string
  name?: string
}

interface FetchModelsResult {
  error?: string
  models?: FetchedModel[]
}

function ipcError(channel: string, e: unknown): FetchModelsResult {
  const message = e instanceof Error ? e.message : String(e)
  console.error(`[${channel}]`, message)
  return { error: message }
}

async function fetchModelsFromProvider(req: FetchModelsRequest): Promise<FetchModelsResult> {
  const { baseURL, apiKey } = req

  if (!baseURL) {
    return { error: 'Base URL is required' }
  }

  // Normalize the base URL
  let url = baseURL.trim().replace(/\/+$/, '')

  // Try /v1/models first (most common), then /models
  const endpoints = [`${url}/v1/models`, `${url}/models`]

  let lastError = ''

  for (const endpoint of endpoints) {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`
      }

      const response = await fetch(endpoint, {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(15000)
      })

      if (!response.ok) {
        lastError = `HTTP ${response.status}: ${response.statusText}`
        continue
      }

      const data = await response.json() as Record<string, unknown>

      // Handle OpenAI-compatible format: { data: [{ id: "model-name", ... }] }
      if (Array.isArray(data.data)) {
        const models: FetchedModel[] = data.data
          .filter((m: Record<string, unknown>) => typeof m.id === 'string')
          .map((m: Record<string, unknown>) => ({
            id: m.id as string,
            name: (m.name as string) || (m.id as string)
          }))
        return { models }
      }

      // Handle array format: [{ id: "model-name" }]
      if (Array.isArray(data)) {
        const models: FetchedModel[] = data
          .filter((m: Record<string, unknown>) => typeof m.id === 'string')
          .map((m: Record<string, unknown>) => ({
            id: m.id as string,
            name: (m.name as string) || (m.id as string)
          }))
        return { models }
      }

      lastError = 'Unexpected response format'
    } catch (e: unknown) {
      lastError = e instanceof Error ? e.message : String(e)
    }
  }

  return { error: lastError || 'Failed to fetch models' }
}

export function registerProviderModelsIpc(): void {
  ipcMain.handle(
    'provider:fetch-models',
    async (_event, req: FetchModelsRequest): Promise<FetchModelsResult> => {
      try {
        return await fetchModelsFromProvider(req)
      } catch (e: unknown) {
        return ipcError('provider:fetch-models', e)
      }
    }
  )
}
