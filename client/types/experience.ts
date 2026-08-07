export interface IndianState {
  id: string
  slug: string
  name: string
  capital: string
  region: 'North' | 'South' | 'East' | 'West' | 'Central' | 'North-East'
  tagline: string
  description: string
  heroImage: string
  stapleFoods: string[]
  cookingMethods: string[]
  featuredProducerIds: string[]
  featuredProductIds: string[]
  recipeIds: string[]
  articleIds: string[]
  festivalIds: string[]
  mapCoordinates: { x: number; y: number }
}

export interface SeasonalMonth {
  month: string
  season: 'Vasant (Spring)' | 'Greeshma (Summer)' | 'Varsha (Monsoon)' | 'Sharad (Autumn)' | 'Hemant (Pre-Winter)' | 'Shishir (Winter)'
  hindiName: string
  focusDescription: string
  heroImage: string
  keyIngredients: string[]
  recipeIds: string[]
  articleIds: string[]
  festivalIds: string[]
}

export interface PantryItem {
  id: string
  name: string
  category: 'Ghee & Fats' | 'Cold Pressed Oils' | 'Heirloom Grains' | 'Himalayan Spices' | 'Wild Honey & Sweets' | 'Pulses & Lentils'
  recommendedQuantity: string
  benefits: string
  essential: boolean
  productId?: string
}

export interface KitchenCollection {
  id: string
  slug: string
  title: string
  subtitle: string
  story: string
  image: string
  category: 'Kitchen Style' | 'Regional Heritage' | 'Health & Wellness' | 'Artisanal Essentials'
  productIds: string[]
  recipeIds: string[]
  articleIds: string[]
  producerIds: string[]
}

export interface GiftBox {
  id: string
  slug: string
  title: string
  subtitle: string
  price: number
  originalPrice: number
  description: string
  image: string
  category: 'Festival Hampers' | 'Regional Heritage' | 'Healthy Starter' | 'Wedding & Celebration' | 'Corporate Gift'
  contents: string[]
  packagingDetails: string
  rating: number
  reviewCount: number
}

export interface IngredientComparison {
  id: string
  slug: string
  title: string
  subtitle: string
  itemA: {
    name: string
    image: string
    process: string
    nutritionalPros: string[]
    aromaProfile: string
    bestFor: string
  }
  itemB: {
    name: string
    image: string
    process: string
    nutritionalPros: string[]
    aromaProfile: string
    bestFor: string
  }
  verdict: string
  faq: { question: string; answer: string }[]
  relatedRecipeIds: string[]
}

export interface CommunityPost {
  id: string
  authorName: string
  authorAvatar: string
  authorCity: string
  title: string
  content: string
  recipeTitle?: string
  image?: string
  likesCount: number
  savesCount: number
  commentsCount: number
  createdAt: string
  tags: string[]
  producerMention?: string
}

export interface FestivalExperience {
  id: string
  slug: string
  name: string
  hindiName: string
  dateOrMonth: string
  tagline: string
  description: string
  heroImage: string
  regionalTraditions: { region: string; ritual: string }[]
  essentialProductIds: string[]
  festiveRecipeIds: string[]
  articleIds: string[]
  giftBoxId?: string
}

export interface AchievementBadge {
  id: string
  title: string
  description: string
  icon: string
  unlocked: boolean
  progress: number
  maxProgress: number
  category: 'Explorer' | 'Culinary' | 'Supporter' | 'Pantry'
}

export interface HeroTheme {
  id: string
  title: string
  subtitle: string
  badge: string
  image: string
  ctaText: string
  ctaHref: string
}
