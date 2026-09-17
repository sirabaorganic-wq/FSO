import { apiClient } from './client'
import type { ApiResponse, BackendVendor, BackendProduct } from './types'

export interface ProducerQueryParams {
  state?: string
  region?: string
  q?: string
  page?: number
  limit?: number
}

export async function getProducersApi(
  params?: ProducerQueryParams
): Promise<ApiResponse<BackendVendor[]>> {
  const queryParams: Record<string, string | number | undefined> = {}
  if (params?.state) queryParams.state = params.state
  if (params?.region) queryParams.region = params.region
  if (params?.q) queryParams.q = params.q
  if (params?.page) queryParams.page = params.page
  if (params?.limit) queryParams.limit = params.limit

  return apiClient.get<ApiResponse<BackendVendor[]>>('/producers', { params: queryParams, skipAuth: true })
}

export async function getProducerByIdApi(id: string): Promise<ApiResponse<BackendVendor>> {
  return apiClient.get<ApiResponse<BackendVendor>>(`/producers/${encodeURIComponent(id)}`, { skipAuth: true })
}

export async function getProducerProductsApi(
  id: string,
  category?: string
): Promise<ApiResponse<{ producer: BackendVendor; products: BackendProduct[] }>> {
  const params = category ? { category } : undefined
  return apiClient.get<ApiResponse<{ producer: BackendVendor; products: BackendProduct[] }>>(
    `/producers/${encodeURIComponent(id)}/products`,
    { params, skipAuth: true }
  )
}
