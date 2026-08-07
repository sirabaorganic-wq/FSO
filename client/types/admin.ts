export type AdminRole = 'Super Admin' | 'Content Editor' | 'Operations Manager' | 'Customer Support' | 'Finance Admin' | 'Producer Manager'

export interface AdminUser {
  id: string
  name: string
  email: string
  avatar: string
  role: AdminRole
  status: 'Active' | 'Inactive' | 'Suspended'
  department: string
  lastActive: string
  twoFactorEnabled: boolean
  createdAt: string
  permissions: string[]
}

export interface PermissionGroup {
  category: string
  description: string
  permissions: {
    id: string
    name: string
    description: string
  }[]
}

export interface RoleDefinition {
  id: string
  name: AdminRole
  description: string
  userCount: number
  isSystem: boolean
  permissions: string[]
}

export interface Customer {
  id: string
  name: string
  email: string
  phone: string
  avatar: string
  city: string
  state: string
  totalOrders: number
  totalSpent: number
  status: 'Active' | 'VIP' | 'Inactive' | 'Flagged'
  joinedDate: string
  lastOrderDate: string
  tags: string[]
}

export interface Producer {
  id: string
  name: string
  businessName: string
  email: string
  phone: string
  avatar: string
  state: string
  city: string
  category: string
  verificationStatus: 'Verified' | 'Pending Approval' | 'Under Review' | 'Rejected'
  productsCount: number
  totalSales: number
  rating: number
  joinedDate: string
  documents: { title: string; fileUrl: string; status: 'Verified' | 'Pending' | 'Rejected'; uploadedAt: string }[]
  storyExcerpt: string
}

export interface ProducerApprovalItem {
  id: string
  producerId: string
  applicantName: string
  businessName: string
  craftType: string
  state: string
  submittedAt: string
  status: 'Pending Review' | 'Inspection Scheduled' | 'Approved' | 'Rejected'
  documentsCount: number
  sampleSubmitted: boolean
  riskLevel: 'Low' | 'Medium' | 'High'
  notes?: string
}

export interface AdminProduct {
  id: string
  slug: string
  name: string
  producerName: string
  producerId: string
  category: string
  price: number
  comparePrice?: number
  stock: number
  sku: string
  status: 'Published' | 'Draft' | 'Out of Stock' | 'Pending Review' | 'Archived'
  salesCount: number
  revenue: number
  rating: number
  image: string
  createdAt: string
  featured: boolean
}

export interface CategoryItem {
  id: string
  name: string
  slug: string
  description: string
  icon: string
  image: string
  productCount: number
  status: 'Active' | 'Hidden'
  sortOrder: number
}

export interface CollectionItem {
  id: string
  title: string
  slug: string
  tagline: string
  description: string
  image: string
  productIds: string[]
  productCount: number
  status: 'Active' | 'Draft' | 'Archived'
  featuredOnHome: boolean
}

export type OrderStatus = 'Placed' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled' | 'Returned' | 'Refunded'

export interface OrderItem {
  productId: string
  productName: string
  quantity: number
  price: number
  image: string
}

export interface AdminOrder {
  id: string
  orderNumber: string
  customerName: string
  customerEmail: string
  customerPhone: string
  date: string
  totalAmount: number
  paymentMethod: 'UPI' | 'Card' | 'NetBanking' | 'COD'
  paymentStatus: 'Paid' | 'Pending' | 'Refunded' | 'Failed'
  status: OrderStatus
  shippingAddress: string
  producerName: string
  items: OrderItem[]
  trackingNumber?: string
  carrier?: string
  refundReason?: string
  refundAmount?: number
  timeline: { time: string; title: string; description: string }[]
}

export interface ProductReview {
  id: string
  productId: string
  productName: string
  customerName: string
  customerAvatar: string
  rating: number
  title: string
  comment: string
  date: string
  status: 'Approved' | 'Pending' | 'Flagged' | 'Rejected'
  verifiedPurchase: boolean
}

export interface CMSArticle {
  id: string
  title: string
  slug: string
  excerpt: string
  content: string
  author: string
  category: string
  readTime: string
  image: string
  status: 'Published' | 'Draft' | 'Scheduled'
  publishDate: string
  views: number
  likes: number
  featured: boolean
}

export interface CMSRecipe {
  id: string
  title: string
  slug: string
  prepTime: string
  cookTime: string
  servings: string
  difficulty: 'Easy' | 'Medium' | 'Advanced'
  region: string
  image: string
  author: string
  ingredientsCount: number
  status: 'Published' | 'Draft'
  views: number
  featured: boolean
}

export interface CMSIngredient {
  id: string
  name: string
  hindiName: string
  botanicalName: string
  originState: string
  season: string
  description: string
  image: string
  healthBenefits: string[]
  recipesCount: number
  status: 'Active' | 'Draft'
}

export interface CMSHomepageSection {
  id: string
  type: 'hero' | 'featured_categories' | 'producer_story' | 'recipes_grid' | 'heritage_wisdom' | 'testimonials' | 'faq' | 'newsletter'
  title: string
  subtitle?: string
  enabled: boolean
  sortOrder: number
  config: Record<string, unknown>
}

export interface MediaItem {
  id: string
  name: string
  url: string
  type: 'image' | 'video' | 'document'
  size: string
  dimensions?: string
  folder: 'Products' | 'Producers' | 'Articles' | 'Banners' | 'System'
  altText: string
  tags: string[]
  uploadedAt: string
  uploadedBy: string
}

export type BannerPosition = 'Homepage Hero' | 'Category Banner' | 'Seasonal Banner' | 'Collection Banner' | 'Promotional Banner' | 'CTA Banner'

export interface BannerItem {
  id: string
  title: string
  subtitle: string
  position: BannerPosition
  imageUrl: string
  linkUrl: string
  status: 'Active' | 'Scheduled' | 'Expired' | 'Draft'
  startDate: string
  endDate: string
  clickCount: number
}

export interface CouponItem {
  id: string
  code: string
  description: string
  discountType: 'Percentage' | 'Fixed Amount' | 'Free Shipping'
  discountValue: number
  minOrderValue: number
  usageLimit: number
  usedCount: number
  status: 'Active' | 'Scheduled' | 'Expired' | 'Disabled'
  startDate: string
  endDate: string
}

export interface NotificationPayload {
  id: string
  title: string
  message: string
  channels: ('Push' | 'Email' | 'SMS' | 'In-App')[]
  audience: 'All Customers' | 'VIP Customers' | 'Producers' | 'Inactive Users'
  status: 'Sent' | 'Scheduled' | 'Draft'
  scheduledTime?: string
  sentTime?: string
  recipientCount: number
  openRate?: number
}

export interface ReportItem {
  id: string
  title: string
  category: 'Sales' | 'Orders' | 'Customers' | 'Inventory' | 'Producers' | 'Content'
  format: 'CSV' | 'PDF' | 'XLSX'
  generatedAt: string
  period: 'Daily' | 'Weekly' | 'Monthly' | 'Custom'
  fileSize: string
  downloadUrl: string
}

export interface ActivityLog {
  id: string
  actor: string
  actorRole: string
  action: string
  target: string
  category: 'Security' | 'CMS' | 'Order' | 'User' | 'Producer' | 'System'
  ipAddress: string
  timestamp: string
  severity: 'Info' | 'Warning' | 'Critical'
}

export interface SystemSettings {
  general: {
    marketplaceName: string
    tagline: string
    supportEmail: string
    supportPhone: string
    currency: string
    timezone: string
    maintenanceMode: boolean
  }
  brand: {
    logoUrl: string
    faviconUrl: string
    primaryColor: string
    secondaryColor: string
    accentColor: string
  }
  seo: {
    metaTitle: string
    metaDescription: string
    ogImage: string
    googleAnalyticsId: string
  }
  email: {
    smtpServer: string
    smtpPort: number
    senderName: string
    senderEmail: string
  }
  shipping: {
    defaultCarrier: string
    freeShippingThreshold: number
    standardFlatRate: number
    expressFlatRate: number
  }
  payments: {
    razorpayEnabled: boolean
    upiEnabled: boolean
    codEnabled: boolean
    codLimit: number
    testMode: boolean
  }
  taxes: {
    gstEnabled: boolean
    defaultGstPercentage: number
    hsnCodeMandatory: boolean
  }
  security: {
    enforce2FA: boolean
    sessionTimeoutMinutes: number
    maxLoginAttempts: number
    passwordMinLength: number
  }
}
