import { apiClient } from './client'
import type { ApiResponse, BackendSearchResult } from './types'

export async function unifiedSearchApi(
  query: string,
  types?: string[],
  limit: number = 6
): Promise<ApiResponse<BackendSearchResult>> {
  const params: Record<string, string | number> = { q: query, limit }
  if (types && types.length > 0) {
    params.types = types.join(',')
  }

  return apiClient.get<ApiResponse<BackendSearchResult>>('/search', { params, skipAuth: true })
}
