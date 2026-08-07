import type { Product } from '@/types/content'
import { image } from './images'

export const products: Product[] = [
  { name: 'Kachi Ghani Mustard Oil', producer: 'Saraswati Oil Mill', region: 'Bharatpur, Rajasthan', method: 'Wood-pressed', image: image('photo-1474979266404-7eaacbcd87c5'), price: '₹420', tag: 'Bestseller' },
  { name: 'Little Millet', producer: 'Annapoorna Collective', region: 'Dharwad, Karnataka', method: 'Stone-milled', image: image('photo-1509440159596-0249088772ff'), price: '₹180', tag: 'New harvest' },
  { name: 'Lakadong Turmeric', producer: 'Jaintia Hills Women', region: 'Meghalaya', method: 'Sun-dried', image: image('photo-1596040033229-a9821ebd058d'), price: '₹260', tag: 'High curcumin' },
]
