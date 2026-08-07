import type { DiscoveryArticle, DiscoveryCategory, DiscoveryCollection, DiscoveryProducer, DiscoveryProduct, FilterGroup } from '@/types/discovery'
import { agricultureImages } from '@/data/images'

const images = agricultureImages

export const discoveryProducts: DiscoveryProduct[] = [
  { slug: 'cold-pressed-groundnut-oil', name: 'Cold-Pressed Groundnut Oil', producer: 'Sahyadri Oils', region: 'Maharashtra', method: 'Wood-pressed', category: 'Everyday Pantry', collection: 'slow-pantry', image: images.oil, price: '₹480', story: 'A nutty, golden oil pressed in small batches from locally grown groundnuts.', rating: 4.9, tags: ['Staple', 'Wood-pressed'] },
  { slug: 'single-origin-turmeric', name: 'Single-Origin Lakadong Turmeric', producer: 'Meghalaya Roots', region: 'Meghalaya', method: 'Stone-ground', category: 'Spices & Masalas', collection: 'slow-pantry', image: images.spice, price: '₹260', story: 'Bright, earthy turmeric from the misty hills of Jaintia, ground close to harvest.', rating: 4.8, tags: ['Single-origin', 'Stone-ground'] },
  { slug: 'hand-pounded-red-rice', name: 'Hand-Pounded Red Rice', producer: 'Kaveri Collective', region: 'Karnataka', method: 'Hand-pounded', category: 'Grains & Flours', collection: 'slow-pantry', image: images.grain, price: '₹310', story: 'Nutty and nourishing rice kept close to its natural husk and the hands that tend it.', rating: 4.9, tags: ['Heritage grain', 'Unpolished'] },
  { slug: 'wild-forest-honey', name: 'Wild Forest Honey', producer: 'Vanam Cooperative', region: 'Uttarakhand', method: 'Raw & unfiltered', category: 'Sweeteners', collection: 'gifts-from-the-land', image: images.tea, price: '₹540', story: 'Collected from forest edges by beekeepers who know the rhythm of the hills.', rating: 4.7, tags: ['Raw', 'Seasonal'] },
  { slug: 'traditional-filter-coffee', name: 'Traditional Filter Coffee', producer: 'Malnad Coffee Works', region: 'Karnataka', method: 'Slow-roasted', category: 'Tea & Coffee', collection: 'morning-table', image: images.pantry, price: '₹620', story: 'A deep, balanced roast built for the quiet ritual of a South Indian morning.', rating: 4.8, tags: ['Small batch', 'Slow-roasted'] },
  { slug: 'stone-ground-ragi-flour', name: 'Stone-Ground Ragi Flour', producer: 'Kaveri Collective', region: 'Karnataka', method: 'Stone-ground', category: 'Grains & Flours', collection: 'slow-pantry', image: images.grain, price: '₹190', story: 'Earthy finger millet milled slowly to retain its warmth, texture, and goodness.', rating: 4.8, tags: ['Ancient grain', 'Stone-ground'] },
]

export const discoveryCategories: DiscoveryCategory[] = [
  { slug: 'grains-flours', name: 'Grains & Flours', descriptor: 'For everyday nourishment', story: 'Heritage grains, millets and slow-milled flours from farms that keep diversity alive.', image: images.grain, count: 24, accent: 'forest', subcategories: ['Rice', 'Millets', 'Atta & flours'] },
  { slug: 'spices-masalas', name: 'Spices & Masalas', descriptor: 'The flavour of place', story: 'Single-origin spices and family masalas that carry the character of their landscape.', image: images.spice, count: 31, accent: 'terracotta', subcategories: ['Whole spices', 'Powders', 'Blends'] },
  { slug: 'oils-ghee', name: 'Oils & Ghee', descriptor: 'The good kind of richness', story: 'Traditional oils and ghee made with patient methods, chosen for taste and trust.', image: images.oil, count: 18, accent: 'gold', subcategories: ['Cold-pressed oils', 'Ghee', 'Coconut'] },
  { slug: 'tea-coffee', name: 'Tea & Coffee', descriptor: 'Rituals worth keeping', story: 'Leaves, beans and brewing rituals shaped by altitude, soil and a little time.', image: images.tea, count: 16, accent: 'forest', subcategories: ['Tea', 'Coffee', 'Herbal infusions'] },
]

export const discoveryCollections: DiscoveryCollection[] = [
  { slug: 'slow-pantry', name: 'The Slow Pantry', eyebrow: 'A considered everyday', intro: 'Build a pantry around ingredients with a point of view: grown well, made carefully, and worth knowing by name.', image: images.pantry, productSlugs: ['cold-pressed-groundnut-oil', 'single-origin-turmeric', 'hand-pounded-red-rice', 'stone-ground-ragi-flour'], producer: 'Four makers, four landscapes', region: 'Across India', article: 'What does it mean to stock a slower pantry?' },
  { slug: 'morning-table', name: 'The Morning Table', eyebrow: 'Begin with intention', intro: 'A small collection for the first light: coffee with depth, honey from the forest, and grains that carry you through.', image: images.kitchen, productSlugs: ['traditional-filter-coffee', 'wild-forest-honey', 'hand-pounded-red-rice'], producer: 'Morning rituals from the source', region: 'Karnataka & Uttarakhand', article: 'The quiet architecture of an Indian breakfast' },
  { slug: 'gifts-from-the-land', name: 'Gifts from the Land', eyebrow: 'For thoughtful giving', intro: 'Not just a gift, but a story of soil, season, skill and the people who keep an ingredient alive.', image: images.market, productSlugs: ['wild-forest-honey', 'single-origin-turmeric', 'traditional-filter-coffee'], producer: 'Small-batch makers', region: 'From the hills to the coast', article: 'Why provenance makes a gift memorable' },
]

export const discoveryProducers: DiscoveryProducer[] = [
  { slug: 'sahyadri-oils', name: 'Sahyadri Oils', place: 'Satara, Maharashtra', craft: 'Wood-pressed oils', image: images.farmer, detail: 'A family mill keeping the slow, fragrant work of wood-pressing alive.', products: 8 },
  { slug: 'meghalaya-roots', name: 'Meghalaya Roots', place: 'Jaintia Hills, Meghalaya', craft: 'Single-origin spices', image: images.workshop, detail: 'A growers collective protecting the sharp, sunlit character of Lakadong turmeric.', products: 6 },
]

export const discoveryArticles: DiscoveryArticle[] = [
  { slug: 'slow-pantry', category: 'Kitchen Wisdom', title: 'What does it mean to stock a slower pantry?', excerpt: 'A guide to choosing everyday ingredients by the stories, methods and landscapes behind them.', image: images.pantry, readTime: '6 min read' },
  { slug: 'heritage-grains', category: 'Grains & Flours', title: 'The grain bowl is older than the trend', excerpt: 'Meet the millets and rice varieties returning to the centre of Indian kitchens.', image: images.grain, readTime: '8 min read' },
  { slug: 'wood-pressed', category: 'Processing Methods', title: 'Why the method matters as much as the ingredient', excerpt: 'From the ghani to the stone mill, a primer on patient processing.', image: images.oil, readTime: '5 min read' },
]

export const filterGroups: FilterGroup[] = [
  { label: 'Category', options: ['Grains & Flours', 'Spices & Masalas', 'Oils & Ghee', 'Tea & Coffee', 'Sweeteners'] },
  { label: 'Region', options: ['Karnataka', 'Maharashtra', 'Meghalaya', 'Uttarakhand', 'Kerala'] },
  { label: 'Method', options: ['Stone-ground', 'Wood-pressed', 'Hand-pounded', 'Raw & unfiltered', 'Slow-roasted'] },
]

export function getCategory(slug: string) { return discoveryCategories.find((item) => item.slug === slug) }
export function getCollection(slug: string) { return discoveryCollections.find((item) => item.slug === slug) }
export function getProductsBySlugs(slugs: string[]) { return discoveryProducts.filter((product) => slugs.includes(product.slug)) }
export function getProductsByCategory(name: string) { return discoveryProducts.filter((product) => product.category === name) }
export function searchDiscovery(query: string) {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return { products: [], categories: [], producers: [], articles: [] }
  return {
    products: discoveryProducts.filter((item) => `${item.name} ${item.producer} ${item.region} ${item.category}`.toLowerCase().includes(normalized)),
    categories: discoveryCategories.filter((item) => `${item.name} ${item.descriptor}`.toLowerCase().includes(normalized)),
    producers: discoveryProducers.filter((item) => `${item.name} ${item.place} ${item.craft}`.toLowerCase().includes(normalized)),
    articles: discoveryArticles.filter((item) => `${item.title} ${item.excerpt} ${item.category}`.toLowerCase().includes(normalized)),
  }
}
