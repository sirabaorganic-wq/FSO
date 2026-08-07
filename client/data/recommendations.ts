import { agricultureImages } from './images'

export interface RecommendedItem {
  id: string
  title: string
  subtitle: string
  category: 'Product' | 'Recipe' | 'Article' | 'Collection'
  image: string
  href: string
  matchReason: string
}

export const mockRecommendations: RecommendedItem[] = [
  {
    id: 'rec-1',
    title: 'Bundelkhand Bilona A2 Desi Ghee',
    subtitle: '500ml Earthenware Pot Churned Ghee',
    category: 'Product',
    image: agricultureImages.grain,
    href: '/shop',
    matchReason: 'Based on your interest in Traditional Indian Breakfast & Vedic Fats',
  },
  {
    id: 'rec-2',
    title: 'The Bilona Method: Hand-Churned Ghee vs Industrial Butter Oil',
    subtitle: '6 min read • Food Science',
    category: 'Article',
    image: agricultureImages.grain,
    href: '/kitchen-wisdom/articles',
    matchReason: 'Recommended continuation for your Ghee & Dahi Fermentation reading',
  },
  {
    id: 'rec-3',
    title: 'Kumaoni Pahadi Aloo ke Gutke with Jakhiya Crackle',
    subtitle: '20 mins cook • Uttarakhand Recipe',
    category: 'Recipe',
    image: agricultureImages.spice,
    href: '/recipes',
    matchReason: 'Matches your Himalayan Spices & Jakhiya search',
  },
  {
    id: 'rec-4',
    title: 'Healthy Family Kitchen Collection',
    subtitle: '3 Essential Staples • 100% Traceable',
    category: 'Collection',
    image: agricultureImages.pantry,
    href: '/collections',
    matchReason: 'Popular with families in Bengaluru & Pune',
  },
]
