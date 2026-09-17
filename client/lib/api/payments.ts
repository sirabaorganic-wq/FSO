import { apiClient } from './client'

export interface RazorpayOrderResponse {
  success: boolean
  id: string
  orderId: string
  amount: number
  currency: string
  keyId?: string
  fsoOrderId: string
  orderNumber: string
}

export interface VerifyPaymentPayload {
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
  orderId?: string
}

export interface PaymentVerificationResponse {
  success: boolean
  message: string
  orderId: string
  orderNumber?: string
  paymentStatus?: string
  status?: string
}

export interface PaymentStatusResponse {
  orderId: string
  orderNumber?: string | null
  status: string
  paymentStatus: string
  paidAt?: string | null
  totalPrice?: number
  razorpayOrderId?: string | null
  razorpayPaymentId?: string | null
  paymentMethod?: string
}

export async function createRazorpayOrderApi(orderId: string): Promise<RazorpayOrderResponse> {
  return apiClient.post<RazorpayOrderResponse>('/payment/create-order', { orderId })
}

export async function verifyPaymentApi(payload: VerifyPaymentPayload): Promise<PaymentVerificationResponse> {
  return apiClient.post<PaymentVerificationResponse>('/payment/verify', payload)
}

export async function getPaymentStatusApi(orderId: string): Promise<PaymentStatusResponse> {
  return apiClient.get<PaymentStatusResponse>(`/payment/status/${encodeURIComponent(orderId)}`)
}
