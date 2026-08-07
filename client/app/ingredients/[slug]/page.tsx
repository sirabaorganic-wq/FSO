import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getIngredient, ingredients } from '@/data/knowledge'
import { IngredientDetailPage } from '@/components/knowledge/knowledge-pages'

type Props = { params: Promise<{ slug: string }> }
export function generateStaticParams() { return ingredients.map((ingredient) => ({ slug: ingredient.slug })) }
export async function generateMetadata({ params }: Props): Promise<Metadata> { const { slug } = await params; const ingredient = getIngredient(slug); return { title: ingredient?.name ?? 'Ingredient', description: ingredient?.descriptor } }
export default async function Page({ params }: Props) { const { slug } = await params; const ingredient = getIngredient(slug); if (!ingredient) notFound(); return <IngredientDetailPage ingredient={ingredient} /> }
