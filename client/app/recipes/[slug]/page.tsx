import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getRecipeBySlugApi } from '@/lib/api/content'
import { toFrontendRecipe } from '@/lib/api/mappers'
import { getRecipe } from '@/data/knowledge'
import { RecipeDetailPage } from '@/components/knowledge/knowledge-pages'

type Props = { params: Promise<{ slug: string }> }

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  try {
    const res = await getRecipeBySlugApi(slug)
    if (res?.data) {
      return { title: `${res.data.title} · FSO Recipe`, description: res.data.story || res.data.excerpt }
    }
  } catch {}
  const recipe = getRecipe(slug)
  return { title: recipe?.title ?? 'Recipe · FSO', description: recipe?.story }
}

export default async function Page({ params }: Props) {
  const { slug } = await params

  let recipe: ReturnType<typeof toFrontendRecipe> | ReturnType<typeof getRecipe> | null = null
  try {
    const res = await getRecipeBySlugApi(slug)
    if (res?.data && res.data.title) {
      recipe = toFrontendRecipe(res.data)
    }
  } catch {}

  if (!recipe) {
    recipe = getRecipe(slug) || null
  }

  if (!recipe) notFound()
  return <RecipeDetailPage recipe={recipe} />
}
