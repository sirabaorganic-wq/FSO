/**
 * DEPRECATED: Phase 6 Production Integration
 * All seller portal data is now served exclusively through authoritative Prisma/Express REST APIs
 * via `@/lib/api/seller`.
 * Static mock data is decommissioned to ensure zero mock fallbacks in production.
 */

import type {
  SellerCustomer,
  SellerDocument,
  SellerNotification,
  SellerOrder,
  SellerPayout,
  SellerProduct,
  SellerReview,
} from '@/types/seller'

export const sellerProfile = {
  name: '',
  owner: '',
  place: '',
  completion: 0,
  initials: '',
  story: '',
}

export const sellerProducts: SellerProduct[] = []
export const sellerOrders: SellerOrder[] = []
export const sellerCustomers: SellerCustomer[] = []
export const sellerReviews: SellerReview[] = []
export const sellerDocuments: SellerDocument[] = []
export const sellerPayouts: SellerPayout[] = []
export const sellerNotifications: SellerNotification[] = []
export const salesData: number[] = []
