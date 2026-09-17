import { apiClient } from './client'
import type { BackendProduct } from './types'

export async function getWishlistApi(): Promise<BackendProduct[]> {
  return apiClient.get<BackendProduct[]>('/auth/wishlist')
}

export async function toggleWishlistApi(productId: string): Promise<{ message: string; wishlist: string[] }> {
  return apiClient.post<{ message: string; wishlist: string[] }>(`/auth/wishlist/${encodeURIComponent(productId)}`)
}
