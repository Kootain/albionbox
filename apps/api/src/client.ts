import { hc } from 'hono/client'
import type { AppType } from './index'

export type { AppType }

// createApiClient is defined HERE in the API context, where all Hono types resolve correctly.
// The return type is inferred in API context, making it available to web app consumers.
export function createApiClient(
  baseUrl: string,
  options?: Parameters<typeof hc<AppType>>[1],
) {
  return hc<AppType>(baseUrl, options)
}

export type ApiClient = ReturnType<typeof createApiClient>

