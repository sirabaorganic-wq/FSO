import { apiClient } from './client'
import type { BackendCartItem } from './types'

export async function getCartApi(): Promise<BackendCartItem[]> {
  return apiClient.get<BackendCartItem[]>('/cart')
}

export async function addToCartApi(
  productId: string,
  quantity: number = 1,
  variant?: string | null
): Promise<BackendCartItem[]> {
  return apiClient.post<BackendCartItem[]>('/cart', {
    productId,
    quantity,
    variant: variant || null,
  })
}

export async function updateCartItemApi(
  cartItemId: string,
  quantity: number
): Promise<BackendCartItem[]> {
  return apiClient.put<BackendCartItem[]>(`/cart/item/${encodeURIComponent(cartItemId)}`, {
    quantity,
  })
}

export async function removeCartItemApi(cartItemId: string): Promise<BackendCartItem[]> {
  return apiClient.delete<BackendCartItem[]>(`/cart/item/${encodeURIComponent(cartItemId)}`)
}

export async function clearCartApi(): Promise<{ message: string }> {
  return apiClient.delete<{ message: string }>('/cart')
}

export async function syncCartApi(cartItems: Array<{ productId: string; quantity: number; variant?: string | null }>): Promise<BackendCartItem[]> {
  return apiClient.put<BackendCartItem[]>('/cart', { cartItems })
}
