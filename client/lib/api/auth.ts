import { apiClient } from './client'
import type { BackendUser, BackendAddress } from './types'

export interface LoginPayload {
  email: string
  password?: string
}

export interface RegisterPayload {
  name: string
  email: string
  password?: string
  phone?: string
  emailOtp?: string
  phoneOtp?: string
}

export interface UpdateProfilePayload {
  name?: string
  email?: string
  phone?: string
  password?: string
  emailOtp?: string
  phoneOtp?: string
  addresses?: BackendAddress[]
  notificationPreferences?: Record<string, boolean>
}

export async function loginApi(payload: LoginPayload): Promise<BackendUser> {
  const res = await apiClient.post<BackendUser>('/auth/login', payload)
  if (res.token || res.accessToken) {
    apiClient.setAccessToken(res.accessToken || res.token || null)
  }
  return res
}

export async function registerApi(payload: RegisterPayload): Promise<BackendUser> {
  const res = await apiClient.post<BackendUser>('/auth/register', payload)
  if (res.token || res.accessToken) {
    apiClient.setAccessToken(res.accessToken || res.token || null)
  }
  return res
}

export async function getProfileApi(): Promise<BackendUser> {
  return apiClient.get<BackendUser>('/auth/profile')
}

export async function updateProfileApi(payload: UpdateProfilePayload): Promise<BackendUser> {
  return apiClient.put<BackendUser>('/auth/profile', payload)
}

export async function logoutApi(): Promise<{ success: boolean; message: string }> {
  try {
    return await apiClient.post<{ success: boolean; message: string }>('/auth/logout')
  } finally {
    apiClient.setAccessToken(null)
  }
}

export async function sendEmailOtpApi(email: string): Promise<{ message: string }> {
  return apiClient.post<{ message: string }>('/otp/send-email', { email })
}

export async function verifyEmailOtpApi(email: string, otp: string): Promise<{ success: boolean }> {
  return apiClient.post<{ success: boolean }>('/otp/verify-email', { email, otp })
}

export interface SellerRegisterPayload {
  businessName: string
  businessType: string
  contactPerson: string
  phone: string
  email: string
  password?: string
  city: string
  state: string
  postalCode: string
  emailOtp: string
}

export async function registerSellerApi(payload: SellerRegisterPayload): Promise<BackendUser> {
  const res = await apiClient.post<BackendUser>('/vendors/register', payload)
  if (res.token || res.accessToken) {
    apiClient.setAccessToken(res.accessToken || res.token || null)
  }
  return res
}
