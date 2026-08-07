export interface ProductImage {
  src: string
  alt: string
}

export interface ProductDetail {
  slug: string
  name: string
  eyebrow: string
  shortDescription: string
  story: string
  price: string
  packSize: string
  rating: number
  reviewCount: number
  producer: { name: string; place: string; story: string; image: string }
  region: string
  method: string
  harvest: string
  ingredients: string[]
  uses: string[]
  images: ProductImage[]
  recipes: Recipe[]
  articles: Article
  specifications: Specification[]
  nutrition: Nutrition[]
  faqs: FAQ[]
  reviews: Review[]
}

export interface Recipe { title: string; description: string; image: ProductImage; time: string }
export interface Article { title: string; excerpt: string; image: ProductImage; readTime: string }
export interface Specification { label: string; value: string }
export interface Nutrition { label: string; value: string; note?: string }
export interface FAQ { question: string; answer: string }
export interface Review { name: string; location: string; rating: number; body: string; date: string }
