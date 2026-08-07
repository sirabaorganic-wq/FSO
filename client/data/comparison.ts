import { IngredientComparison } from '@/types/experience'
import { agricultureImages } from './images'

export const mockComparisons: IngredientComparison[] = [
  {
    id: 'comp-oils',
    slug: 'wood-pressed-vs-refined-oil',
    title: 'Wood-Pressed (Ghani) Oil vs Industrial Refined Oil',
    subtitle: 'Understanding extraction heat, solvent processing, and retained antioxidants.',
    itemA: {
      name: 'Vaagai Wood-Pressed Sesame Oil',
      image: agricultureImages.oil,
      process: 'Crushed slowly in dense wooden mortars below 45°C without chemical solvent or bleaching.',
      nutritionalPros: ['Retains natural Vitamin E & Sesamol', 'Zero hexane chemical residue', 'Dense natural aroma'],
      aromaProfile: 'Nutty, earthy, rich sesame fragrance',
      bestFor: 'Daily sauteing, Idli podi, traditional gravies, body massage',
    },
    itemB: {
      name: 'Commercial Refined Cooking Oil',
      image: agricultureImages.market,
      process: 'Extracted using petroleum-derived hexane solvent at 150°C+, degummed, bleached, and deodorized.',
      nutritionalPros: ['Neutral odorless flavor', 'High smoke point'],
      aromaProfile: 'Odorless due to chemical refining',
      bestFor: 'Deep industrial frying',
    },
    verdict: 'Wood-pressed oils preserve delicate fat-soluble vitamins and natural antioxidants destroyed by commercial high-heat refining processes.',
    faq: [
      { question: 'Why does wood-pressed oil look darker than refined oil?', answer: 'Wood-pressed oil is unfiltered and unbleached, retaining natural seed pigments, carotenoids, and flavor compounds.' },
      { question: 'Is wood-pressed oil suitable for daily cooking?', answer: 'Yes! Traditional Indian wood-pressed sesame, groundnut, and mustard oils have been used for daily cooking for generations.' },
    ],
    relatedRecipeIds: ['rcp-802'],
  },
  {
    id: 'comp-ghee',
    slug: 'bilona-a2-ghee-vs-commercial-ghee',
    title: 'Hand-Churned Bilona A2 Ghee vs Cream-Boiled Commercial Ghee',
    subtitle: 'The fundamental difference between fermented dahi curd churned ghee and boiled cream butter oil.',
    itemA: {
      name: 'Bundelkhand Bilona A2 Desi Ghee',
      image: agricultureImages.grain,
      process: 'Cultured A2 milk turned to dahi (curd), hand-churned bidirectional with wooden bilona, melted on low firewood.',
      nutritionalPros: ['Rich in Short-Chain Fatty Acids (Butyric Acid)', 'High Vitamin A & CLA', 'Lactose & casein free'],
      aromaProfile: 'Granular golden texture, warm nutty caramel scent',
      bestFor: 'Hot khichdi, dal tempering, festive prasad, ayurvedic remedies',
    },
    itemB: {
      name: 'Industrial Cream-Boiled Ghee',
      image: agricultureImages.pantry,
      process: 'Direct cream separated from milk using centrifuges, boiled at high heat without curd fermentation.',
      nutritionalPros: ['Uniform consistency'],
      aromaProfile: 'Flat milk aroma',
      bestFor: 'Commercial bakery production',
    },
    verdict: 'The traditional 5-step Bilona method ferments milk into dahi first, creating gut-friendly enzymes and superior aroma structure.',
    faq: [
      { question: 'What makes A2 cow milk ghee special?', answer: 'A2 beta-casein protein from native Indian cow breeds like Sahiwal and Gir is gentler on digestion compared to A1 milk.' },
    ],
    relatedRecipeIds: ['rcp-801', 'rcp-803'],
  },
]
