import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getIngredientBySlugApi } from '@/lib/api/content'
import { toFrontendIngredient } from '@/lib/api/mappers'
import { getIngredient } from '@/data/knowledge'
import { IngredientDetailPage } from '@/components/knowledge/knowledge-pages'

type Props = { params: Promise<{ slug: string }> }

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  try {
    const res = await getIngredientBySlugApi(slug)
    if (res?.data) {
      return { title: `${res.data.name} · FSO Ingredient Library`, description: res.data.descriptor }
    }
  } catch {}
  const ingredient = getIngredient(slug)
  return { title: ingredient?.name ?? 'Ingredient · FSO', description: ingredient?.descriptor }
}

export default async function Page({ params }: Props) {
  const { slug } = await params

  let ingredient: ReturnType<typeof toFrontendIngredient> | ReturnType<typeof getIngredient> | null = null
  try {
    const res = await getIngredientBySlugApi(slug)
    if (res?.data && res.data.name) {
      ingredient = toFrontendIngredient(res.data)
    }
  } catch {}

  if (!ingredient) {
    ingredient = getIngredient(slug) || null
  }

  if (!ingredient) notFound()
  return <IngredientDetailPage ingredient={ingredient} />
}
