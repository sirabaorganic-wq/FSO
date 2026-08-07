import type { Article } from '@/types/content'
import { image } from './images'

export const articles: Article[] = [
  { category: 'Kitchen Wisdom', title: 'Why the first press matters', excerpt: 'Oil is not just a cooking medium. It carries the soil, seed, and care of the place it came from.', image: image('photo-1474979266404-7eaacbcd87c5'), readTime: '6 min read' },
  { category: 'Field Notes', title: 'The grain that waits for rain', excerpt: 'Across dryland India, native millets are quietly rewriting what abundance can look like.', image: image('photo-1509440159596-0249088772ff'), readTime: '8 min read' },
  { category: 'Methods', title: 'A spice is a season made visible', excerpt: 'From hand-sorting to sun-drying: the small decisions that keep flavour alive.', image: image('photo-1596040033229-a9821ebd058d'), readTime: '5 min read' },
]

export const states = ['Rajasthan', 'Karnataka', 'Meghalaya', 'Kerala', 'Punjab', 'Assam']
export const processingMethods = ['Wood-pressed', 'Stone-milled', 'Sun-dried', 'Hand-pounded']
