/**
 * FSO Centralized Admin API Client
 * Strictly connects frontend admin components to authoritative Express + Prisma + Neon PostgreSQL endpoints.
 * Zero mock fallbacks. Zero hardcoded business metrics.
 */

import { apiClient } from './client'

// ── Dashboard Types ───────────────────────────────────────────────────────────

export interface AdminDashboardData {
  totalUsers: number
  totalVendors: number
  totalProducts: number
  totalOrders: number
  totalRevenue: number
  pendingApprovalsCount: number
  pendingVendors: Array<{
    id: string
    businessName: string
    email: string
    contactPerson: string
    createdAt: string
  }>
  pendingProducts: Array<{
    id: string
    name: string
    price: number
    createdAt: string
    vendor?: { id: string; businessName: string }
  }>
}

// ── User & Staff Types ────────────────────────────────────────────────────────

export interface AdminUserItem {
  id: string
  _id?: string
  name: string
  email: string
  isAdmin: boolean
  role: string
  isBlocked: boolean
  totalOrders: number
  lastLogin?: string | null
  createdAt: string
}

export interface SubadminUser {
  id: string
  _id?: string
  name: string
  email: string
  role: string
  isEmailVerified: boolean
  createdAt: string
  lastLogin?: string | null
}

// ── Vendor & Approval Types ───────────────────────────────────────────────────

export interface AdminVendorItem {
  id: string
  _id?: string
  businessName: string
  email: string
  contactPerson: string
  phone: string
  status: string
  isActive: boolean
  businessType: string
  plan?: string
  commissionRate?: number
  allowedCategories?: string[]
  createdAt: string
  approvedBy?: { id: string; name: string; email: string } | null
}

export interface AdminVendorsResponse {
  vendors: AdminVendorItem[]
  total: number
  page: number
  pages: number
}

export interface AdminApprovalsResponse {
  pendingVendors: Array<{
    id: string
    _id?: string
    businessName: string
    email: string
    contactPerson: string
    createdAt: string
  }>
  pendingProducts: Array<{
    id: string
    _id?: string
    name: string
    price: number
    createdAt: string
    vendor?: { id: string; businessName: string }
  }>
  totalPending: number
}

// ── Product & Category Types ─────────────────────────────────────────────────

export interface AdminProductItem {
  id: string
  _id?: string
  name: string
  slug: string
  price: number
  comparePrice?: number | null
  stockQuantity: number
  sku?: string | null
  category: string
  vendorStatus?: string | null
  isPublic: boolean
  isActive: boolean
  isVendorProduct: boolean
  vendorId?: string | null
  vendor?: { id: string; businessName: string; email?: string } | null
  createdAt: string
}

export interface AdminProductsResponse {
  products: AdminProductItem[]
  total: number
  page: number
  pages: number
}

export interface AdminCategoryItem {
  id: string
  name: string
  slug: string
  description?: string | null
  image?: string | null
  productCount: number
}

// ── Order & Fulfillment Types ────────────────────────────────────────────────

export interface AdminOrderItem {
  id: string
  _id?: string
  orderNumber: string
  status: string
  totalPrice: number
  paymentMethod: string
  isPaid: boolean
  paidAt?: string | null
  createdAt: string
  user?: { id: string; name: string; email: string } | null
  orderItems: Array<{
    id: string
    name: string
    quantity: number
    price: number
    image?: string | null
  }>
  vendorOrders?: Array<{
    id: string
    vendorId: string
    vendorOrderNumber: string
    status: string
    subtotal: number
    vendor?: { id: string; businessName: string } | null
    shipmentId?: string | null
    awbCode?: string | null
    courierName?: string | null
  }>
}

export interface AdminVendorOrder {
  id: string
  _id?: string
  vendorOrderNumber: string
  vendorId: string
  status: string
  subtotal: number
  payoutStatus?: string | null
  payoutAmount?: number | null
  createdAt: string
  vendor?: { id: string; businessName: string; email: string } | null
  order?: { id: string; orderNumber: string; createdAt: string } | null
}

export interface AdminVendorOrdersResponse {
  vendorOrders: AdminVendorOrder[]
  total: number
  page: number
  pages: number
}

// ── Payment & Refund Types ───────────────────────────────────────────────────

export interface AdminPaymentItem {
  id: string
  _id?: string
  orderId: string
  amount: number
  currency: string
  status: string
  razorpayOrderId: string
  razorpayPaymentId: string
  method?: string | null
  bank?: string | null
  wallet?: string | null
  vpa?: string | null
  createdAt: string
  order?: {
    id: string
    orderNumber: string
    user?: { id: string; name: string; email: string } | null
  } | null
}

export interface AdminTransferItem {
  id: string
  _id?: string
  vendorId: string
  amount: number
  status: string
  transferType: string
  createdAt: string
  vendor?: { id: string; businessName: string; email: string } | null
}

export interface AdminPayoutsResponse {
  payouts: AdminTransferItem[]
  total: number
  page: number
  pages: number
}

export interface AdminRefundLogItem {
  id: string
  _id?: string
  orderId: string
  paymentId?: string | null
  razorpayRefundId?: string | null
  amount: number
  status: string
  reason?: string | null
  createdAt: string
  order?: {
    id: string
    orderNumber?: string
    totalPrice?: number
    status?: string
    user?: { id: string; name: string; email: string } | null
  } | null
}

export interface AdminReturnItem {
  id: string
  _id?: string
  orderId: string
  amount: number
  status: string
  returnStatus?: string
  createdAt: string
  order?: { id: string; orderNumber: string } | null
}

export interface AdminReturnsResponse {
  returns: AdminReturnItem[]
  stats: {
    total: number
    requested: number
    approved: number
    rejected: number
    returned: number
    refunded: number
  }
  total: number
  page: number
  pages: number
}

export interface AdminNotificationItem {
  id: string
  _id?: string
  userId?: string | null
  vendorId?: string | null
  title: string
  message: string
  type: string
  read: boolean
  data?: any
  createdAt: string
}

// ── Review Moderation Types ──────────────────────────────────────────────────

export interface AdminReviewItem {
  id: string
  _id?: string
  rating: number
  title?: string | null
  comment: string
  isVerifiedPurchase: boolean
  isApproved: boolean
  createdAt: string
  product?: {
    id: string
    name: string
    slug?: string
    image?: string | null
  } | null
  user?: {
    id: string
    name: string
    email: string
  } | null
}

// ── Analytics Types ──────────────────────────────────────────────────────────

export interface AdminAnalyticsOverview {
  totalUsers: number
  totalVendors: number
  totalProducts: number
  totalOrders: number
  platformCurrency: string
}

export interface AdminVendorAnalytics {
  totalVendors: number
  pendingVendors: number
  approvedVendors: number
  rejectedVendors: number
  suspendedVendors: number
  activeVendors: number
}

export interface AdminOrderAnalytics {
  totalOrders: number
  totalRevenue: number
  totalUsers: number
  uniqueCustomers: number
  completedOrders: number
  pendingOrders: number
  ordersByStatus: Record<string, number>
}

// ── Notification Types ───────────────────────────────────────────────────────

export interface AdminNotificationItem {
  id: string
  _id?: string
  title: string
  message: string
  type: string
  isRead: boolean
  createdAt: string
}

// =============================================================================
// API CLIENT FUNCTIONS
// =============================================================================

// ── 1. Dashboard ─────────────────────────────────────────────────────────────

export const getAdminDashboardStatsApi = (): Promise<AdminDashboardData> => {
  return apiClient.get<AdminDashboardData>('/admin/dashboard')
}

// ── 2. Users & Staff ─────────────────────────────────────────────────────────

export const getAdminUsersApi = (): Promise<AdminUserItem[]> => {
  return apiClient.get<AdminUserItem[]>('/auth/users')
}

export const getAdminSubadminsApi = (): Promise<SubadminUser[]> => {
  return apiClient.get<SubadminUser[]>('/admin/subadmins')
}

export const createAdminSubadminApi = (data: {
  name: string
  email: string
  password: string
  role: string
}): Promise<SubadminUser> => {
  return apiClient.post<SubadminUser>('/admin/subadmins', data)
}

export const resetAdminSubadminPasswordApi = (
  id: string,
  password: string
): Promise<{ message: string }> => {
  return apiClient.put<{ message: string }>(`/admin/subadmins/${id}/reset-password`, { password })
}

export const deleteAdminSubadminApi = (id: string): Promise<{ message: string }> => {
  return apiClient.delete<{ message: string }>(`/admin/subadmins/${id}`)
}

// ── 3. Vendors & Approvals ───────────────────────────────────────────────────

export const getAdminVendorsApi = (params?: {
  status?: string
  search?: string
  page?: number
  limit?: number
}): Promise<AdminVendorsResponse> => {
  return apiClient.get<AdminVendorsResponse>('/admin/vendors', { params })
}

export const getAdminVendorByIdApi = (id: string): Promise<AdminVendorItem> => {
  return apiClient.get<AdminVendorItem>(`/admin/vendors/${id}`)
}

export const updateAdminVendorStatusApi = (
  id: string,
  status: string,
  rejectionReason?: string
): Promise<{ message: string; vendor: AdminVendorItem }> => {
  return apiClient.put<{ message: string; vendor: AdminVendorItem }>(`/admin/vendors/${id}/status`, {
    status,
    rejectionReason,
  })
}

export const deleteAdminVendorApi = (id: string): Promise<{ success: boolean; notFound?: boolean }> => {
  return apiClient.delete<{ success: boolean; notFound?: boolean }>(`/admin/vendors/${id}`)
}

export const getAdminApprovalsApi = (): Promise<AdminApprovalsResponse> => {
  return apiClient.get<AdminApprovalsResponse>('/admin/approvals')
}

// ── 4. Products & Categories ─────────────────────────────────────────────────

export const getAdminProductsApi = (params?: {
  vendorId?: string
  status?: string
  page?: number
  limit?: number
}): Promise<AdminProductsResponse> => {
  return apiClient.get<AdminProductsResponse>('/admin/vendor-products', { params })
}

export const updateAdminProductStatusApi = (
  productId: string,
  data: Partial<AdminProductItem>
): Promise<AdminProductItem> => {
  return apiClient.put<AdminProductItem>(`/admin/vendor-products/${productId}`, data)
}

export const deleteAdminProductApi = (id: string): Promise<{ message: string }> => {
  return apiClient.delete<{ message: string }>(`/admin/products/${id}`)
}

export const getAdminCategoriesApi = (): Promise<AdminCategoryItem[]> => {
  return apiClient.get<AdminCategoryItem[]>('/products/categories')
}

// ── 5. Orders & Fulfillment ──────────────────────────────────────────────────

export const getAdminOrdersApi = (): Promise<AdminOrderItem[]> => {
  return apiClient.get<AdminOrderItem[]>('/orders')
}

export const getAdminOrderByIdApi = (id: string): Promise<AdminOrderItem> => {
  return apiClient.get<AdminOrderItem>(`/orders/${id}`)
}

export const getAdminVendorOrdersApi = (params?: {
  status?: string
  vendorId?: string
  page?: number
  limit?: number
}): Promise<AdminVendorOrdersResponse> => {
  return apiClient.get<AdminVendorOrdersResponse>('/admin/vendor-orders', { params })
}

export const updateAdminOrderStatusApi = (
  id: string,
  status: string
): Promise<AdminOrderItem> => {
  return apiClient.put<AdminOrderItem>(`/orders/${id}/status`, { status })
}

// ── 6. Payments & Refunds ────────────────────────────────────────────────────

export const getAdminPaymentsApi = (): Promise<AdminPaymentItem[]> => {
  return apiClient.get<AdminPaymentItem[]>('/admin/payments')
}

export const getAdminPayoutsApi = (params?: {
  status?: string
  page?: number
  limit?: number
}): Promise<AdminPayoutsResponse> => {
  return apiClient.get<AdminPayoutsResponse>('/admin/payouts', { params })
}

export const getAdminRefundsApi = (): Promise<AdminRefundLogItem[]> => {
  return apiClient.get<AdminRefundLogItem[]>('/refunds/admin-logs')
}

export const getAdminRefundLogsApi = getAdminRefundsApi

export const getAdminReturnsApi = (params?: {
  page?: number
  limit?: number
}): Promise<AdminReturnsResponse> => {
  return apiClient.get<AdminReturnsResponse>('/admin/returns', { params })
}

// ── 7. Review Moderation ─────────────────────────────────────────────────────

export const getAdminReviewsApi = (): Promise<AdminReviewItem[]> => {
  return apiClient.get<AdminReviewItem[]>('/admin/reviews')
}

export const updateAdminReviewStatusApi = (
  id: string,
  isApproved: boolean
): Promise<{ message: string; review: AdminReviewItem }> => {
  return apiClient.put<{ message: string; review: AdminReviewItem }>(`/admin/reviews/${id}/status`, {
    isApproved,
  })
}

export const deleteAdminReviewApi = (
  id: string
): Promise<{ message: string; rating: number; numReviews: number }> => {
  return apiClient.delete<{ message: string; rating: number; numReviews: number }>(`/admin/reviews/${id}`)
}

// ── 8. Analytics & Reporting ─────────────────────────────────────────────────

export const getAdminAnalyticsOverviewApi = (): Promise<AdminAnalyticsOverview> => {
  return apiClient.get<AdminAnalyticsOverview>('/admin/analytics/overview')
}

export const getAdminVendorAnalyticsApi = (): Promise<AdminVendorAnalytics> => {
  return apiClient.get<AdminVendorAnalytics>('/admin/analytics/vendors')
}

export const getAdminOrderAnalyticsApi = (): Promise<AdminOrderAnalytics> => {
  return apiClient.get<AdminOrderAnalytics>('/orders/analytics')
}

// ── 9. Settings & Notifications ──────────────────────────────────────────────

export const getAdminShippingSettingsApi = (): Promise<Record<string, unknown>> => {
  return apiClient.get<Record<string, unknown>>('/admin/shipping-settings')
}

export const updateAdminShippingSettingsApi = (
  data: Record<string, unknown>
): Promise<{ message: string; shippingConfig: Record<string, unknown> }> => {
  return apiClient.put<{ message: string; shippingConfig: Record<string, unknown> }>(
    '/admin/shipping-settings',
    data
  )
}

export const getAdminNotificationsApi = (): Promise<AdminNotificationItem[]> => {
  return apiClient.get<AdminNotificationItem[]>('/notifications/user')
}

export const markAdminNotificationReadApi = (id: string): Promise<AdminNotificationItem> => {
  return apiClient.put<AdminNotificationItem>(`/notifications/${id}/read`)
}

// ── 10. Content & CMS ────────────────────────────────────────────────────────

export const getAdminArticlesApi = (): Promise<any[]> => {
  return apiClient.get<any[]>('/articles/admin/all')
}

export const getAdminCouponsApi = (): Promise<any[]> => {
  return apiClient.get<any[]>('/coupons')
}

export const getAdminBannersApi = (): Promise<any[]> => {
  return apiClient.get<any[]>('/banners/admin/all')
}

export const getAdminCollectionsApi = (): Promise<any[]> => {
  return apiClient.get<any[]>('/collections')
}

export const getAdminRecipesApi = (): Promise<any[]> => {
  return apiClient.get<any[]>('/recipes/admin/all')
}

export const getAdminIngredientsApi = (): Promise<any[]> => {
  return apiClient.get<any[]>('/ingredients')
}
