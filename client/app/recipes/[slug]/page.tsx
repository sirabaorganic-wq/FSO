import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getRecipe, recipes } from '@/data/knowledge'
import { RecipeDetailPage } from '@/components/knowledge/knowledge-pages'

type Props = { params: Promise<{ slug: string }> }
export function generateStaticParams() { return recipes.map((recipe) => ({ slug: recipe.slug })) }
export async function generateMetadata({ params }: Props): Promise<Metadata> { const { slug } = await params; const recipe = getRecipe(slug); return { title: recipe?.title ?? 'Recipe', description: recipe?.story } }
export default async function Page({ params }: Props) { const { slug } = await params; const recipe = getRecipe(slug); if (!recipe) notFound(); return <RecipeDetailPage recipe={recipe} /> }
