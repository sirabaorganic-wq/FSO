import type { Metadata } from 'next'
import { IngredientsPage } from '@/components/knowledge/knowledge-pages'
export const metadata: Metadata = { title: 'Ingredient Library', description: 'An encyclopedia of the grains, spices and oils that shape everyday Indian food.' }
export default function Page() { return <IngredientsPage /> }
