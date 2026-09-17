/**
 * FSO Data Mappers
 * Adapts backend REST API DTOs into existing frontend domain models
 * Preserves 100% of UI expectations without refactoring components
 */

import type { ProductDetail, Review as ProductReview } from '@/types/product'
import type { Product as ContentProduct, Producer as ContentProducer, Category as ContentCategory } from '@/types/content'
import type { DiscoveryProduct, DiscoveryProducer, DiscoveryCategory } from '@/types/discovery'
import type { CartLine, Order as CustomerOrder, Address as CustomerAddress } from '@/types/customer'
import type { Article as KnowledgeArticle, Recipe as KnowledgeRecipe, Ingredient as KnowledgeIngredient } from '@/types/knowledge'
import type {
  BackendProduct,
  BackendVendor,
  BackendCartItem,
  BackendOrder,
  BackendAddress,
  BackendArticle,
  BackendRecipe,
  BackendIngredient,
  BackendCategory,
} from './types'
import { agricultureImages } from '@/data/images'

const fallbackImage = agricultureImages.pantry

/**
 * Maps BackendProduct to ProductDetail for ProductDetailPage
 */
export function toFrontendProductDetail(
  p: BackendProduct,
  overrideReviews?: ProductReview[]
): ProductDetail {
  const images = Array.isArray(p.images) && p.images.length > 0
    ? p.images.map((src, i) => ({ src, alt: `${p.name} view ${i + 1}` }))
    : [{ src: p.image || fallbackImage, alt: p.name }]

  const producerName = typeof p.vendor === 'object' && p.vendor && 'businessName' in p.vendor
    ? p.vendor.businessName
    : 'FSO Heritage Partner'

  const producerPlace = typeof p.vendor === 'object' && p.vendor && 'addressState' in p.vendor
    ? [p.originVillage, p.originDistrict, p.originState || p.vendor.addressState].filter(Boolean).join(', ')
    : [p.originVillage, p.originDistrict, p.originState].filter(Boolean).join(', ') || 'India'

  const rawStory = typeof p.vendor === 'object' && p.vendor && 'producerStory' in p.vendor
    ? (p.vendor as { producerStory?: string | { body?: string; headline?: string } }).producerStory
    : null
  const storyText = typeof rawStory === 'string' ? rawStory : rawStory?.body || rawStory?.headline || ''
  const producerStory = storyText || p.originStory || 'Honouring multi-generational culinary traditions.'

  const producerLogo = typeof p.vendor === 'object' && p.vendor && 'logo' in p.vendor && p.vendor.logo
    ? p.vendor.logo
    : agricultureImages.farmer

  // Map reviews from product or overrideReviews
  const reviews: ProductReview[] = overrideReviews || (p.reviews || []).map((r) => {
    const userName = typeof r.user === 'object' && r.user && 'name' in r.user
      ? r.user.name
      : 'Verified Patron'
    return {
      name: userName,
      location: 'India',
      rating: r.rating || 5,
      body: r.comment || '',
      date: r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : 'Recent',
    }
  })

  // Format ingredients array
  const ingredientsList = p.ingredients
    ? p.ingredients.split(',').map((s) => s.trim()).filter(Boolean)
    : ['Natural ingredients', 'No additives']

  // Specifications
  const specifications = [
    { label: 'Method', value: p.processingMethod || 'Traditional artisan processing' },
    { label: 'Origin', value: producerPlace },
    { label: 'Pack size', value: p.packSize || 'Standard' },
    { label: 'Harvest', value: p.harvestSeason || 'Current season' },
    ...(p.certifications && p.certifications.length > 0 ? [{ label: 'Certifications', value: p.certifications.join(', ') }] : []),
    ...(p.batchNumber ? [{ label: 'Batch number', value: p.batchNumber }] : []),
  ]

  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    eyebrow: p.eyebrow || p.category || 'Heritage Ingredient',
    shortDescription: p.shortDescription || p.description || '',
    story: p.originStory || p.fullDescription || p.description || '',
    price: `₹${p.price.toLocaleString('en-IN')}`,
    packSize: p.packSize || 'Standard',
    rating: p.rating || 4.9,
    reviewCount: p.numReviews || reviews.length,
    producer: {
      name: producerName,
      place: producerPlace,
      story: producerStory,
      image: producerLogo,
    },
    region: p.originRegion || p.originState || 'India',
    method: p.processingMethod || 'Traditional',
    harvest: p.harvestSeason || 'Seasonal',
    ingredients: ingredientsList,
    uses: Array.isArray(p.culinaryUses) && p.culinaryUses.length > 0 ? p.culinaryUses : ['Everyday cooking', 'Traditional recipes'],
    images,
    recipes: [],
    articles: {
      title: 'What does it mean to stock a slower pantry?',
      excerpt: 'A guide to choosing everyday ingredients by the stories, methods and landscapes behind them.',
      image: { src: agricultureImages.pantry, alt: 'Pantry' },
      readTime: '6 min read',
    },
    specifications,
    nutrition: Array.isArray(p.nutrition) && p.nutrition.length > 0 ? p.nutrition : [
      { label: 'Purity', value: '100% Unadulterated', note: 'Batch tested' },
      { label: 'Preservatives', value: 'Zero Artificial Additives' },
    ],
    faqs: Array.isArray(p.faqs) && p.faqs.length > 0 ? p.faqs : [
      { question: 'How is this ingredient sourced?', answer: `Directly from ${producerName} with verified provenance records.` },
      { question: 'What is the recommended storage?', answer: p.storageInstructions || 'Store in a cool, dry place away from direct sunlight.' },
    ],
    reviews,
  }
}

/**
 * Maps BackendProduct to DiscoveryProduct for shop grids and search results
 */
export function toDiscoveryProduct(p: BackendProduct): DiscoveryProduct {
  const producerName = typeof p.vendor === 'object' && p.vendor && 'businessName' in p.vendor
    ? p.vendor.businessName
    : 'Artisan Producer'

  return {
    slug: p.slug,
    name: p.name,
    producer: producerName,
    region: p.originState || p.originRegion || 'India',
    method: p.processingMethod || 'Wood-pressed',
    category: p.category,
    image: p.image || (Array.isArray(p.images) && p.images[0]) || fallbackImage,
    price: `₹${p.price.toLocaleString('en-IN')}`,
    story: p.shortDescription || p.description || '',
    rating: p.rating || 4.9,
    tags: Array.isArray(p.tags) && p.tags.length > 0 ? p.tags : ['Heritage'],
  }
}

/**
 * Maps BackendProduct to ContentProduct (for homepage simple cards)
 */
export function toContentProduct(p: BackendProduct): ContentProduct {
  const producerName = typeof p.vendor === 'object' && p.vendor && 'businessName' in p.vendor
    ? p.vendor.businessName
    : 'Artisan Producer'

  return {
    name: p.name,
    producer: producerName,
    region: p.originState || 'India',
    method: p.processingMethod || 'Traditional',
    image: p.image || (Array.isArray(p.images) && p.images[0]) || fallbackImage,
    price: `₹${p.price.toLocaleString('en-IN')}`,
    tag: p.tag || (Array.isArray(p.tags) && p.tags[0]) || 'Curated',
  }
}

/**
 * Maps BackendVendor to DiscoveryProducer
 */
export function toDiscoveryProducer(v: BackendVendor): DiscoveryProducer {
  const place = [v.village, v.district, v.address?.state || v.region].filter(Boolean).join(', ') || 'India'
  const craft = Array.isArray(v.traditionalExpertise) && v.traditionalExpertise.length > 0
    ? v.traditionalExpertise.join(' · ')
    : v.producerType || 'Traditional Foods'

  return {
    slug: v.slug || v.id,
    name: v.businessName,
    place,
    craft,
    image: v.logo || agricultureImages.farmer,
    detail: (typeof v.producerStory === 'string' ? v.producerStory : v.producerStory?.body || v.producerStory?.headline) || v.businessDescription || 'Preserving living traditions from the land.',
    products: 1,
  }
}

/**
 * Maps category object or string to DiscoveryCategory
 */
export function toDiscoveryCategory(cat: { id?: string; name: string; slug?: string; count?: number; image?: string | null; description?: string | null }): DiscoveryCategory {
  const slug = cat.slug || cat.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return {
    slug,
    name: cat.name,
    descriptor: cat.description || 'Considered ingredients for the table',
    story: `Authentic, unadulterated ${cat.name.toLowerCase()} sourced directly from verified Indian producers.`,
    image: cat.image || fallbackImage,
    count: cat.count ?? 0,
    accent: 'forest',
    subcategories: [],
  }
}

/**
 * Maps BackendCartItem to frontend CartLine
 */
export function toFrontendCartLine(item: BackendCartItem): CartLine {
  return {
    id: item.id || item.productId,
    productId: item.productId || item.id,
    name: item.name,
    producer: 'Verified Producer',
    image: item.image || fallbackImage,
    price: item.price,
    quantity: item.quantity || item.qty || 1,
    unit: item.variant || 'Standard',
  }
}

/**
 * Maps BackendOrder to frontend CustomerOrder
 */
export function toFrontendOrder(o: BackendOrder): CustomerOrder {
  const formattedItems: CartLine[] = (o.orderItems || []).map((item) => ({
    id: item.id || item.productId,
    productId: item.productId || item.id,
    name: item.name,
    producer: 'Heritage Producer',
    image: item.image || fallbackImage,
    price: item.price,
    quantity: item.quantity,
    unit: item.variant || 'Standard',
  }))

  const dateStr = o.createdAt
    ? new Date(o.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : 'Recent'

  const statusMap: Record<string, 'Delivered' | 'In transit' | 'Processing' | 'Cancelled'> = {
    DELIVERED: 'Delivered',
    SHIPPED: 'In transit',
    PROCESSING: 'Processing',
    CONFIRMED: 'Processing',
    PENDING: 'Processing',
    CANCELLED: 'Cancelled',
    REFUNDED: 'Processing',
  }

  const shipments = (o.vendorOrders || [])
    .filter((vo) => vo.awbCode || vo.courierName)
    .map((vo) => ({
      courierName: vo.courierName,
      awbCode: vo.awbCode,
      trackingUrl: vo.trackingUrl,
      status: vo.status,
    }))

  return {
    id: o.orderNumber || o.id,
    date: dateStr,
    status: statusMap[o.status] || 'Processing',
    total: o.totalPrice,
    items: formattedItems,
    addressId: o.shippingAddress?.postalCode || 'default',
    eta: o.isDelivered ? `Delivered ${dateStr}` : '3–5 Business Days',
    shipments,
  }
}

/**
 * Maps BackendAddress to frontend CustomerAddress
 */
export function toFrontendAddress(a: BackendAddress, index: number = 0): CustomerAddress {
  const lines: string[] = []
  if (a.street) lines.push(a.street)
  const cityState = [a.city, a.state, a.postalCode].filter(Boolean).join(', ')
  if (cityState) lines.push(cityState)

  return {
    id: a.id || `address-${index}`,
    label: a.label || (index === 0 ? 'Home' : 'Work'),
    name: a.name || 'Customer',
    lines: lines.length > 0 ? lines : ['Address line 1', 'City, State'],
    phone: a.phone || '',
    isDefault: Boolean(a.isDefault),
  }
}

/**
 * Maps BackendArticle to KnowledgeArticle
 */
export function toFrontendArticle(a: BackendArticle): KnowledgeArticle {
  return {
    slug: a.slug,
    title: a.title,
    category: a.category,
    excerpt: a.excerpt,
    image: a.image || fallbackImage,
    author: a.authorName || 'FSO Editorial',
    readTime: a.readTime || '5 min read',
    published: a.publishedAt ? new Date(a.publishedAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : 'August 2026',
    quote: a.excerpt,
    body: a.content ? [a.content] : [a.excerpt],
    related: [],
  }
}

/**
 * Maps BackendRecipe to KnowledgeRecipe
 */
export function toFrontendRecipe(r: BackendRecipe): KnowledgeRecipe {
  return {
    slug: r.slug,
    title: r.title,
    region: r.region || 'India',
    cuisine: r.cuisine || 'Traditional',
    image: r.image || fallbackImage,
    difficulty: r.difficulty || 'Everyday',
    time: `${r.totalTime || 30} min`,
    servings: r.servings || 'Serves 4',
    story: r.story || r.excerpt || '',
    ingredients: Array.isArray(r.ingredients) ? r.ingredients : [],
    steps: Array.isArray(r.instructions) ? r.instructions.map((i) => i.instruction) : [],
    tips: Array.isArray(r.tips) ? r.tips : [],
  }
}

/**
 * Maps BackendIngredient to KnowledgeIngredient
 */
export function toFrontendIngredient(i: BackendIngredient): KnowledgeIngredient {
  return {
    slug: i.slug,
    name: i.name,
    descriptor: i.descriptor || i.hindiName || '',
    image: i.image || fallbackImage,
    origin: i.origin || 'India',
    history: i.history || '',
    regionalImportance: i.regionalImportance || '',
    uses: Array.isArray(i.uses) ? i.uses : [],
    storage: i.storage || 'Keep in an airtight container in a cool, dry place.',
    tips: Array.isArray(i.tips) ? i.tips : [],
    recipes: [],
    products: [],
    faqs: Array.isArray(i.faqs) ? i.faqs : [],
  }
}
