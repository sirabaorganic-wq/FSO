import type { ProductDetail } from '@/types/product'

const gallery = {
  oil: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=1600&q=85',
  field: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1600&q=85',
  harvest: 'https://images.unsplash.com/photo-1499529112087-3cb3b73cec95?auto=format&fit=crop&w=1600&q=85',
  kitchen: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=1600&q=85',
  mill: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=1600&q=85',
  grain: 'https://images.unsplash.com/photo-1509358271058-acd22cc93898?auto=format&fit=crop&w=1600&q=85',
  spices: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=1600&q=85',
}

export const productDetails: ProductDetail[] = [
  {
    slug: 'cold-pressed-groundnut-oil',
    name: 'Cold-Pressed Groundnut Oil',
    eyebrow: 'Sahyadri Oils · Satara, Maharashtra',
    shortDescription: 'A fragrant, golden oil pressed slowly from locally grown groundnuts.',
    story: 'In Satara, the Patil family still lets the wooden ghani set the pace. The groundnuts are cleaned by hand, pressed in small batches, and left unrefined so the oil keeps its nutty warmth and gentle aroma. It is the kind of everyday staple that makes a kitchen feel connected to its source.',
    price: '₹480',
    packSize: '1 litre · Glass bottle',
    rating: 4.9,
    reviewCount: 42,
    producer: { name: 'Sahyadri Oils', place: 'Satara, Maharashtra', story: 'A family mill keeping the slow, fragrant work of wood-pressing alive across three generations.', image: gallery.field },
    region: 'Satara, Maharashtra',
    method: 'Wood-pressed in a traditional ghani',
    harvest: 'Winter groundnuts · 2026 harvest',
    ingredients: ['100% Maharashtra groundnuts', 'Nothing else added'],
    uses: ['Everyday sabzis', 'Tadka and tempering', 'Shallow frying', 'Homemade chutneys'],
    images: [
      { src: gallery.oil, alt: 'Golden groundnut oil in a glass bottle beside raw peanuts' },
      { src: gallery.field, alt: 'Green agricultural fields in the Sahyadri landscape' },
      { src: gallery.mill, alt: 'Traditional food preparation in a small-batch workshop' },
      { src: gallery.kitchen, alt: 'Warm Indian kitchen ready for everyday cooking' },
    ],
    recipes: [
      { title: 'Bharli Vangi', description: 'A Maharashtrian aubergine preparation with a fragrant peanut masala.', image: { src: gallery.kitchen, alt: 'A homestyle Indian meal in a traditional kitchen' }, time: '35 min' },
      { title: 'Peanut Thecha', description: 'A bold, rustic chutney made for bhakri, rice and warm rotis.', image: { src: gallery.spices, alt: 'Fresh spices and ingredients arranged for cooking' }, time: '15 min' },
    ],
    articles: { title: 'Why the method matters as much as the ingredient', excerpt: 'From the ghani to the stone mill, a primer on patient processing and everyday flavour.', image: { src: gallery.mill, alt: 'Traditional food processing tools in a working kitchen' }, readTime: '5 min read' },
    specifications: [
      { label: 'Origin', value: 'Satara, Maharashtra' },
      { label: 'Processing', value: 'Traditional wood-pressed ghani' },
      { label: 'Bottle', value: 'Amber glass · recyclable' },
      { label: 'Shelf life', value: '9 months from packing' },
      { label: 'Pack size', value: '1 litre' },
    ],
    nutrition: [
      { label: 'Energy', value: '884 kcal', note: 'per 100 ml' },
      { label: 'Saturated fat', value: '17 g', note: 'per 100 ml' },
      { label: 'Monounsaturated fat', value: '46 g', note: 'per 100 ml' },
      { label: 'No additives', value: '100%', note: 'single ingredient' },
    ],
    faqs: [
      { question: 'Can I use it for frying?', answer: 'Yes. It is suited to everyday sautéing, tempering and shallow frying. Keep the heat moderate and let the oil warm gradually.' },
      { question: 'Why is the colour different between batches?', answer: 'The colour follows the groundnut harvest and pressing temperature. Small natural variation is a sign of minimal processing.' },
      { question: 'How should I store it?', answer: 'Keep the bottle in a cool, dry cupboard away from direct sunlight. Refrigeration is not required.' },
    ],
    reviews: [
      { name: 'Ananya S.', location: 'Pune', rating: 5, body: 'The aroma is subtle but unmistakable. It makes even a simple dal feel more considered.', date: 'June 2026' },
      { name: 'Rohan M.', location: 'Mumbai', rating: 5, body: 'I appreciate knowing the mill and the place behind the bottle. It has become our daily cooking oil.', date: 'May 2026' },
    ],
  },
]

export function getProductDetail(slug: string) { return productDetails.find((product) => product.slug === slug) }
