export type DiscoveryProduct = {
  slug: string
  name: string
  producer: string
  region: string
  method: string
  category: string
  collection?: string
  image: string
  price: string
  story: string
  rating: number
  tags: string[]
}

export type DiscoveryCategory = {
  slug: string
  name: string
  descriptor: string
  story: string
  image: string
  count: number
  accent: 'forest' | 'terracotta' | 'gold'
  subcategories: string[]
}

export type DiscoveryCollection = {
  slug: string
  name: string
  eyebrow: string
  intro: string
  image: string
  productSlugs: string[]
  producer: string
  region: string
  article: string
}

export type DiscoveryProducer = {
  slug: string
  name: string
  place: string
  craft: string
  image: string
  detail: string
  products: number
}

export type DiscoveryArticle = {
  slug: string
  category: string
  title: string
  excerpt: string
  image: string
  readTime: string
}

export type FilterGroup = {
  label: string
  options: string[]
}
