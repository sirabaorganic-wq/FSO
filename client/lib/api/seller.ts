/**
 * FSO Vendor / Seller Portal API Client
 * Strictly connects frontend seller views to authoritative Prisma-backed Express endpoints.
 * Zero hardcoded mock fallbacks.
 */

import { apiClient } from './client'

export interface VendorProfile {
  id: string
  _id?: string
  businessName: string
  contactPerson: string
  email: string
  phone: string
  alternatePhone?: string
  businessDescription?: string
  logo?: string
  website?: string
  addressStreet?: string
  addressCity?: string
  addressState?: string
  addressPostalCode?: string
  village?: string
  district?: string
  region?: string
  status: string
  isActive: boolean
  businessType: string
  bankDetails?: {
    accountNumber?: string
    ifscCode?: string
    bankName?: string
    branchName?: string
    accountHolderName?: string
  }
  pickupAddress?: {
    street?: string
    city?: string
    state?: string
    postalCode?: string
    country?: string
    pickupLocation?: string
  }
  producerStory?: string
}

export interface ShopSettings {
  shopName?: string
  shopSlug?: string
  tagline?: string
  shopDescription?: string
  shopBanner?: string
  shopLogo?: string
  returnPolicy?: string
  shippingPolicy?: string
  processingTime?: string
  socialLinks?: Record<string, string>
  isPublished?: boolean
  email?: string
  phone?: string
}

export interface DashboardStats {
  totalSales: number
  totalEarnings: number
  totalOrders: number
  pendingOrders: number
  totalProducts: number
}

export interface AnalyticsSnapshot {
  totalProducts: number
  totalUnits: number
  lowStockCount: number
  stockValue: number
  pendingOrders: number
  availableBalance: number
}

export interface SalesTrendPoint {
  date: string
  revenue: number
  orders: number
}

export interface AnalyticsData {
  period: string
  revenue: number
  payout: number
  commission: number
  orders: number
  completedOrders: number
  cancelledOrders: number
  aov: number
  productsSold: number
  salesTrend: SalesTrendPoint[]
  snapshot: AnalyticsSnapshot
}

export interface VendorCustomer {
  id: string
  _id?: string
  name: string
  email: string
  ordersCount: number
  totalSpend: number
  lastOrderDate: string
}

export interface VendorProduct {
  id: string
  _id?: string
  name: string
  slug: string
  description?: string
  shortDescription?: string
  price: number
  compareAtPrice?: number | null
  stockQuantity: number
  category: string
  image?: string | null
  images: string[]
  sku?: string | null
  hsn?: string | null
  vendorStatus: string
  isActive: boolean
  rating?: number
  numReviews?: number
  createdAt: string
  updatedAt: string
}

export interface VendorProductsResponse {
  products: VendorProduct[]
  page: number
  pages: number
  total: number
}

export interface InventoryItem {
  id: string
  _id?: string
  productId?: string
  name: string
  sku?: string | null
  stock: number
  stockQuantity: number
  price: number
  status: string
  isActive: boolean
}

export interface VendorOrderItem {
  id?: string
  productId: string
  name: string
  quantity: number
  price: number
  image?: string
  hsn?: string
}

export interface VendorOrder {
  id: string
  _id?: string
  vendorOrderNumber: string
  orderId: string
  status: string
  subtotal: number
  taxAmount?: number
  shippingAmount?: number
  commissionRate?: number
  commissionAmount?: number
  payoutAmount?: number
  payoutStatus?: string
  items: VendorOrderItem[]
  shipmentId?: string | null
  shiprocketOrderId?: string | null
  awbCode?: string | null
  courierName?: string | null
  trackingUrl?: string | null
  shippedAt?: string | null
  deliveredAt?: string | null
  createdAt: string
  updatedAt: string
  order?: {
    id: string
    orderNumber?: string
    shippingAddress?: {
      city?: string
      state?: string
      postalCode?: string
      country?: string
    }
  }
}

export interface VendorOrdersResponse {
  orders: VendorOrder[]
  page: number
  pages: number
  total: number
}

export interface VendorTransfer {
  id: string
  _id?: string
  amount: number
  status: string
  transferType: string
  createdAt: string
  updatedAt?: string
}

export interface VendorPayoutsResponse {
  payouts: VendorTransfer[]
  total: number
}

export interface VendorWalletResponse {
  balance: number
  availableBalance: number
  pendingBalance: number
  totalPaidOut: number
  transactions: VendorTransfer[]
}

export interface VendorReview {
  id: string
  _id?: string
  rating: number
  title?: string
  comment: string
  isVerifiedPurchase: boolean
  createdAt: string
  product: {
    id: string
    name: string
    image?: string | null
    slug?: string
  }
  user: {
    id?: string
    name: string
  }
}

export interface VendorReviewsResponse {
  reviews: VendorReview[]
  total: number
  page: number
  pages: number
}

export interface ComplianceDoc {
  id: string
  _id?: string
  name: string
  type: string
  fileUrl: string
  expiryDate?: string | null
  status: string
  uploadedAt: string
}

export interface VendorNotification {
  id: string
  _id?: string
  title: string
  message: string
  type: string
  isRead: boolean
  createdAt: string
}

// ── Profile & Shop APIs ──────────────────────────────────────────────────────

export const getVendorProfileApi = (): Promise<VendorProfile> => {
  return apiClient.get<VendorProfile>('/vendors/profile')
}

export const updateVendorProfileApi = (data: Partial<VendorProfile>): Promise<VendorProfile> => {
  return apiClient.put<VendorProfile>('/vendors/profile', data)
}

export const getShopSettingsApi = (): Promise<ShopSettings> => {
  return apiClient.get<ShopSettings>('/vendors/shop')
}

export const updateShopSettingsApi = (settings: Partial<ShopSettings>): Promise<ShopSettings> => {
  return apiClient.put<ShopSettings>('/vendors/shop', settings)
}

// ── Dashboard & Analytics APIs ───────────────────────────────────────────────

export const getVendorDashboardStatsApi = (): Promise<DashboardStats> => {
  return apiClient.get<DashboardStats>('/vendors/dashboard')
}

export const getVendorAnalyticsApi = (period: string = '30d'): Promise<AnalyticsData> => {
  return apiClient.get<AnalyticsData>('/vendors/analytics', { params: { period } })
}

export const getVendorCustomersApi = (): Promise<{ customers: VendorCustomer[]; total: number }> => {
  return apiClient.get<{ customers: VendorCustomer[]; total: number }>('/vendors/customers')
}

// ── Product Management APIs ──────────────────────────────────────────────────

export const getVendorProductsApi = (params?: { page?: number; limit?: number; status?: string }): Promise<VendorProductsResponse> => {
  return apiClient.get<VendorProductsResponse>('/vendors/products', { params })
}

export const getVendorProductByIdApi = (id: string): Promise<VendorProduct> => {
  return apiClient.get<VendorProduct>(`/vendors/products/${id}`)
}

export const createVendorProductApi = (data: Record<string, unknown>): Promise<VendorProduct> => {
  return apiClient.post<VendorProduct>('/vendors/products', data)
}

export const updateVendorProductApi = (id: string, data: Record<string, unknown>): Promise<VendorProduct> => {
  return apiClient.put<VendorProduct>(`/vendors/products/${id}`, data)
}

export const deleteVendorProductApi = (id: string): Promise<{ message: string }> => {
  return apiClient.delete<{ message: string }>(`/vendors/products/${id}`)
}

// ── Inventory APIs ───────────────────────────────────────────────────────────

export const getVendorInventoryApi = (): Promise<InventoryItem[]> => {
  return apiClient.get<InventoryItem[]>('/vendors/inventory')
}

export const updateInventoryItemApi = (id: string, stock: number): Promise<InventoryItem> => {
  return apiClient.put<InventoryItem>(`/vendors/inventory/${id}`, { stockQuantity: stock })
}

// ── Orders & Fulfillment APIs ────────────────────────────────────────────────

export const getVendorOrdersApi = (params?: { page?: number; limit?: number; status?: string }): Promise<VendorOrdersResponse> => {
  return apiClient.get<VendorOrdersResponse>('/vendors/orders', { params })
}

export const getVendorOrderByIdApi = (id: string): Promise<VendorOrder> => {
  return apiClient.get<VendorOrder>(`/vendors/orders/${id}`)
}

export const updateVendorOrderStatusApi = (id: string, status: string): Promise<VendorOrder> => {
  return apiClient.put<VendorOrder>(`/vendors/orders/${id}/status`, { status })
}

export const shipVendorOrderApi = (id: string): Promise<{ message: string; shipment: unknown; vendorOrder: VendorOrder }> => {
  return apiClient.post<{ message: string; shipment: unknown; vendorOrder: VendorOrder }>(`/vendors/orders/${id}/ship`)
}

// ── Finance, Wallet & Payout APIs ────────────────────────────────────────────

export const getVendorPayoutsApi = (): Promise<VendorPayoutsResponse> => {
  return apiClient.get<VendorPayoutsResponse>('/vendors/payouts')
}

export const getVendorWalletApi = (): Promise<VendorWalletResponse> => {
  return apiClient.get<VendorWalletResponse>('/vendors/wallet')
}

export const requestPayoutApi = (amount: number): Promise<{ success: boolean; message: string; transfer: VendorTransfer }> => {
  return apiClient.post<{ success: boolean; message: string; transfer: VendorTransfer }>('/vendors/wallet/payout', { amount })
}

// ── Reviews APIs ─────────────────────────────────────────────────────────────

export const getVendorReviewsApi = (params?: { page?: number; limit?: number }): Promise<VendorReviewsResponse> => {
  return apiClient.get<VendorReviewsResponse>('/vendors/reviews', { params })
}

export const replyToReviewApi = (id: string, reply: string): Promise<{ message: string; review: unknown }> => {
  return apiClient.post<{ message: string; review: unknown }>(`/reviews/${id}/reply`, { reply })
}

// ── Compliance APIs ──────────────────────────────────────────────────────────

export const getVendorComplianceApi = (): Promise<ComplianceDoc[]> => {
  return apiClient.get<ComplianceDoc[]>('/vendors/compliance')
}

export const uploadComplianceDocApi = (data: { name: string; type: string; fileUrl: string; expiryDate?: string }): Promise<ComplianceDoc[]> => {
  return apiClient.post<ComplianceDoc[]>('/vendors/compliance', data)
}

// ── Notifications APIs ───────────────────────────────────────────────────────

export const getVendorNotificationsApi = (): Promise<VendorNotification[]> => {
  return apiClient.get<VendorNotification[]>('/notifications/vendor')
}

export const markAllNotificationsReadApi = (): Promise<{ message: string }> => {
  return apiClient.put<{ message: string }>('/notifications/vendor/read-all')
}
