import { apiClient } from './client'
import type { BackendOrder } from './types'

export interface CreateOrderPayload {
  orderItems: Array<{
    productId: string
    quantity: number
    variant?: string | null
  }>
  shippingAddress: {
    name?: string
    address?: string
    city?: string
    state?: string
    postalCode?: string
    country?: string
    phone?: string
  }
  paymentMethod?: string
  couponCode?: string
  discountAmount?: number
  buyerGstNumber?: string
  businessName?: string
}

export async function createOrderApi(payload: CreateOrderPayload): Promise<BackendOrder> {
  return apiClient.post<BackendOrder>('/orders', payload)
}

export async function getMyOrdersApi(): Promise<BackendOrder[]> {
  return apiClient.get<BackendOrder[]>('/orders/myorders')
}

export async function getOrderByIdApi(id: string): Promise<BackendOrder> {
  return apiClient.get<BackendOrder>(`/orders/${encodeURIComponent(id)}`)
}

export async function cancelOrderApi(id: string, reason?: string): Promise<{ message: string; order: BackendOrder }> {
  return apiClient.post<{ message: string; order: BackendOrder }>(`/orders/${encodeURIComponent(id)}/cancel`, { reason })
}

export async function trackOrderPublicApi(idOrNumber: string): Promise<BackendOrder> {
  return apiClient.get<BackendOrder>(`/orders/track/${encodeURIComponent(idOrNumber)}`, { skipAuth: true })
}
