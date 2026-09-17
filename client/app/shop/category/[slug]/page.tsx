import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { SiteHeader } from '@/components/layout/site-header'
import { CategoryPage } from '@/components/shop/category-page'
import { getProductCategoriesApi, getProductsApi } from '@/lib/api/products'
import { getProducersApi } from '@/lib/api/producers'
import { getArticlesApi } from '@/lib/api/content'
import { toDiscoveryCategory, toDiscoveryProduct, toDiscoveryProducer } from '@/lib/api/mappers'
import type { DiscoveryProduct, DiscoveryProducer, DiscoveryArticle } from '@/types/discovery'

type CategoryRouteProps = { params: Promise<{ slug: string }> }

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: CategoryRouteProps): Promise<Metadata> {
  const { slug } = await params
  try {
    const categories = await getProductCategoriesApi()
    const match = categories.find(
      (c) => c.slug === slug || c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') === slug
    )
    if (match) {
      return {
        title: `${match.name} · FSO Category`,
        description: `Explore authentic, verified ${match.name.toLowerCase()} sourced directly from Indian heritage producers.`,
        alternates: { canonical: `/shop/category/${slug}` },
      }
    }
  } catch {}

  return { title: 'Category not found · FSO' }
}

export default async function CategoryRoute({ params }: CategoryRouteProps) {
  const { slug } = await params

  let categoryObj: ReturnType<typeof toDiscoveryCategory> | null = null
  let products: DiscoveryProduct[] = []
  let producers: DiscoveryProducer[] = []
  let articles: DiscoveryArticle[] = []

  try {
    const categories = await getProductCategoriesApi().catch(() => [])
    const match = categories.find(
      (c) => c.slug === slug || c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') === slug
    )
    if (match) {
      categoryObj = toDiscoveryCategory(match)
    }
  } catch {}

  if (!categoryObj) {
    notFound()
  }

  try {
    const [rawProducts, rawProducers, rawArticles] = await Promise.allSettled([
      getProductsApi({ category: slug }),
      getProducersApi({ limit: 2 }),
      getArticlesApi({ limit: 3 }),
    ])

    if (rawProducts.status === 'fulfilled' && Array.isArray(rawProducts.value)) {
      products = rawProducts.value.map(toDiscoveryProduct)
    }

    if (rawProducers.status === 'fulfilled' && rawProducers.value?.data && Array.isArray(rawProducers.value.data)) {
      producers = rawProducers.value.data.map(toDiscoveryProducer)
    }

    if (rawArticles.status === 'fulfilled' && rawArticles.value?.data && Array.isArray(rawArticles.value.data)) {
      articles = rawArticles.value.data.map((a) => ({
        slug: a.slug,
        category: a.category,
        title: a.title,
        excerpt: a.excerpt,
        image: a.image || '/images/pantry.jpg',
        readTime: a.readTime || '5 min read',
      }))
    }
  } catch (err) {
    console.error('Failed to load category products/producers:', err)
  }

  return (
    <>
      <SiteHeader />
      <CategoryPage
        category={categoryObj}
        products={products}
        producers={producers}
        articles={articles}
      />
    </>
  )
}
