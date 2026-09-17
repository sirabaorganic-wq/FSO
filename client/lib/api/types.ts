/**
 * FSO API Types & DTO Definitions
 * Matches actual backend /api/v1 REST responses
 */

export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
  meta?: {
    total: number
    page: number
    limit: number
    pages: number
  }
}

export interface ApiErrorResponse {
  success: false
  error: {
    code: string
    message: string
    details?: unknown
  }
}

export interface BackendUser {
  id: string
  _id?: string
  name: string
  email: string
  phone?: string | null
  addresses?: BackendAddress[]
  isAdmin?: boolean
  role: 'customer' | 'vendor' | 'seller' | 'producer_manager' | 'content_editor' | 'admin' | string
  cart?: BackendCartItem[]
  wishlist?: string[]
  notificationPreferences?: Record<string, boolean>
  createdAt?: string
  token?: string
  accessToken?: string
}

export interface BackendAddress {
  id?: string
  label?: string
  name?: string
  street?: string
  city?: string
  state?: string
  postalCode?: string
  country?: string
  phone?: string
  isDefault?: boolean
}

export interface BackendVendor {
  id: string
  slug: string
  _id?: string
  businessName: string
  businessDescription?: string
  businessType?: string
  producerType?: string
  logo?: string
  gallery?: string[]
  address?: {
    street?: string
    city?: string
    state?: string
    postalCode?: string
    country?: string
  }
  village?: string
  district?: string
  region?: string
  producerStory?: string | { body?: string; headline?: string; journey?: string[] }
  traditionalExpertise?: string[]
  processingMethods?: string[]
  yearsInOperation?: number
  generationCount?: number
  certifications?: string[]
  certificationsVerified?: boolean
  tags?: string[]
  socialLinks?: Record<string, string>
  createdAt?: string
}

export interface BackendProductReview {
  id: string
  _id?: string
  user?: {
    id: string
    _id?: string
    name: string
  } | string
  rating: number
  comment?: string
  isVerifiedPurchase?: boolean
  helpfulCount?: number
  createdAt?: string
}

export interface BackendProduct {
  id: string
  _id?: string
  name: string
  slug: string
  eyebrow?: string
  description?: string
  shortDescription?: string
  fullDescription?: string
  price: number
  compareAtPrice?: number | null
  costPrice?: number | null
  currency?: string
  sku?: string
  stockQuantity: number
  countInStock?: number
  category: string
  tag?: string
  tags?: string[]
  image?: string
  image2?: string
  images?: string[]
  videos?: string[]
  features?: string[]
  ingredients?: string
  packSize?: string
  originVillage?: string
  originDistrict?: string
  originState?: string
  originRegion?: string
  originCountry?: string
  originStory?: string
  origin?: {
    village?: string
    district?: string
    state?: string
    region?: string
    country?: string
    story?: string
  }
  harvestSeason?: string
  harvestDate?: string
  seasonalAvailability?: string
  processingMethod?: string
  traditionalPreparation?: string
  preparationStory?: string
  servingSuggestions?: string
  culinaryUses?: string[]
  storageInstructions?: string
  faqs?: Array<{ question: string; answer: string }>
  nutrition?: Array<{ label: string; value: string; note?: string }>
  nutritionNote?: string
  certifications?: string[]
  batchNumber?: string
  batchInfo?: string
  rating?: number
  numReviews?: number
  reviews?: BackendProductReview[]
  vendorId?: string
  vendor?: BackendVendor | { id: string; slug?: string; businessName: string; logo?: string; addressState?: string; status?: string }
  isPublic?: boolean
  isActive?: boolean
  createdAt?: string
}

export interface BackendCartItem {
  id: string
  productId: string
  product?: string
  _id?: string
  name: string
  slug: string
  image?: string
  price: number
  compareAtPrice?: number | null
  stockQuantity: number
  countInStock?: number
  quantity: number
  qty?: number
  variant?: string | null
  vendorId?: string
}

export interface BackendOrderItem {
  id: string
  productId: string
  name: string
  slug?: string
  image?: string
  price: number
  quantity: number
  variant?: string | null
}

export interface BackendVendorOrder {
  id: string
  vendorId: string
  orderId: string
  status: string
  subtotal: number
  shiprocketOrderId?: string
  shipmentId?: string
  awbCode?: string
  courierName?: string
  trackingUrl?: string
  shippedAt?: string
  deliveredAt?: string
  vendor?: {
    id: string
    businessName: string
    logo?: string
    addressState?: string
    village?: string
    district?: string
  }
}

export interface BackendOrder {
  id: string
  _id?: string
  orderNumber?: string
  userId?: string
  orderItems: BackendOrderItem[]
  vendorOrders?: BackendVendorOrder[]
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
  paymentStatus?: string
  status: 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED'
  totalPrice: number
  itemsPrice?: number
  shippingPrice?: number
  taxPrice?: number
  discountAmount?: number
  isPaid?: boolean
  paidAt?: string
  isDelivered?: boolean
  deliveredAt?: string
  createdAt?: string
}

export interface BackendArticle {
  id: string
  _id?: string
  title: string
  slug: string
  excerpt: string
  content?: string
  image: string
  category: string
  tags?: string[]
  authorName?: string
  authorImage?: string
  readTime?: string
  published?: boolean
  publishedAt?: string
}

export interface BackendRecipe {
  id: string
  _id?: string
  title: string
  slug: string
  excerpt?: string
  story?: string
  image: string
  region?: string
  cuisine?: string
  difficulty: string
  prepTime?: number
  cookTime?: number
  totalTime?: number
  servings?: string
  ingredients?: string[]
  instructions?: Array<{ step: number; instruction: string }>
  tips?: string[]
  published?: boolean
}

export interface BackendIngredient {
  id: string
  _id?: string
  name: string
  slug: string
  hindiName?: string
  descriptor?: string
  image: string
  origin?: string
  history?: string
  regionalImportance?: string
  uses?: string[]
  storage?: string
  tips?: string[]
  faqs?: Array<{ question: string; answer: string }>
}

export interface BackendCollection {
  id: string
  _id?: string
  title: string
  slug: string
  subtitle?: string
  description?: string
  story?: string
  image: string
  category?: string
  displayOrder?: number
  isPublished?: boolean
  productSlugs?: string[]
  products?: BackendProduct[]
}

export interface BackendSearchResult {
  query: string
  results: {
    products: BackendProduct[]
    producers: BackendVendor[]
    articles: BackendArticle[]
    recipes: BackendRecipe[]
    ingredients: BackendIngredient[]
    collections: BackendCollection[]
  }
  counts: {
    products: number
    producers: number
    articles: number
    recipes: number
    ingredients: number
    collections: number
    total: number
  }
}

export interface BackendCategory {
  id: string
  name: string
  slug: string
  image?: string | null
  description?: string | null
  count: number
}
