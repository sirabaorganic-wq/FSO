import type { Metadata } from 'next'
import { RecipesPage } from '@/components/knowledge/knowledge-pages'
export const metadata: Metadata = { title: 'Recipes', description: 'Recipes built around ingredients with a place, method and story.' }
export default function Page() { return <RecipesPage /> }
