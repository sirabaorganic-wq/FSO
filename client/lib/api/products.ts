import { apiClient } from './client'
import type { BackendProduct, BackendCategory } from './types'

export interface ProductQueryParams {
  keyword?: string
  category?: string
  minPrice?: number
  maxPrice?: number
  sort?: 'price-asc' | 'price-desc' | 'newest'
  certified?: boolean
}

export async function getProductsApi(params?: ProductQueryParams): Promise<BackendProduct[]> {
  const queryParams: Record<string, string | number | boolean | undefined> = {}
  if (params?.keyword) queryParams.keyword = params.keyword
  if (params?.category) queryParams.category = params.category
  if (params?.minPrice !== undefined) queryParams.minPrice = params.minPrice
  if (params?.maxPrice !== undefined) queryParams.maxPrice = params.maxPrice
  if (params?.sort) queryParams.sort = params.sort
  if (params?.certified) queryParams.certified = params.certified

  const res = await apiClient.get<unknown>('/products', { params: queryParams, skipAuth: true })
  if (Array.isArray(res)) return res
  if (res && typeof res === 'object') {
    const obj = res as Record<string, unknown>
    if (Array.isArray(obj.products)) return obj.products as BackendProduct[]
    if (Array.isArray(obj.Products)) return obj.Products as BackendProduct[]
    if (Array.isArray(obj.data)) return obj.data as BackendProduct[]
  }
  return []
}

export async function getProductBySlugOrIdApi(idOrSlug: string): Promise<BackendProduct> {
  return apiClient.get<BackendProduct>(`/products/${encodeURIComponent(idOrSlug)}`, { skipAuth: true })
}

export async function getProductCategoriesApi(): Promise<BackendCategory[]> {
  const res = await apiClient.get<unknown>('/products/categories', { skipAuth: true })
  if (Array.isArray(res)) return res as BackendCategory[]
  if (res && typeof res === 'object') {
    const obj = res as Record<string, unknown>
    if (Array.isArray(obj.data)) return obj.data as BackendCategory[]
    if (Array.isArray(obj.categories)) return obj.categories as BackendCategory[]
  }
  return []
}

export async function getProductComplianceApi(idOrSlug: string): Promise<unknown> {
  return apiClient.get(`/products/${encodeURIComponent(idOrSlug)}/compliance`, { skipAuth: true })
}

