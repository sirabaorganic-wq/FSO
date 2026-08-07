import type { Category } from '@/types/content'
import { image } from './images'

export const categories: Category[] = [
  { name: 'Cold-Pressed Oils', descriptor: 'The quiet difference in everyday cooking', image: image('photo-1474979266404-7eaacbcd87c5'), accent: 'From the wooden ghani' },
  { name: 'Native Grains', descriptor: 'Ancient grains for modern tables', image: image('photo-1509440159596-0249088772ff'), accent: 'Grown for resilience' },
  { name: 'Spices & Blends', descriptor: 'A map of India, in every pinch', image: image('photo-1596040033229-a9821ebd058d'), accent: 'Ground with patience' },
  { name: 'Wild Honey & Sweets', descriptor: 'Raw unheated forest nectar and jaggery', image: image('photo-1587049352847-4a222e784d38'), accent: 'Ethically harvested' },
]
