import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { SiteHeader } from '@/components/layout/site-header'
import { CollectionPage } from '@/components/shop/collection-page'
import { getCollectionBySlugApi, getArticlesApi } from '@/lib/api/content'
import { getProducersApi } from '@/lib/api/producers'
import { toDiscoveryProduct, toDiscoveryProducer } from '@/lib/api/mappers'
import type { DiscoveryCollection, DiscoveryProduct, DiscoveryProducer, DiscoveryArticle } from '@/types/discovery'

type CollectionRouteProps = { params: Promise<{ slug: string }> }

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: CollectionRouteProps): Promise<Metadata> {
  const { slug } = await params
  try {
    const res = await getCollectionBySlugApi(slug)
    if (res?.data) {
      return {
        title: `${res.data.title} · FSO Collection`,
        description: res.data.description || res.data.subtitle,
        alternates: { canonical: `/shop/collection/${slug}` },
      }
    }
  } catch {}

  return { title: 'Collection not found · FSO' }
}

export default async function CollectionRoute({ params }: CollectionRouteProps) {
  const { slug } = await params

  let colObj: DiscoveryCollection | null = null
  let products: DiscoveryProduct[] = []
  let producers: DiscoveryProducer[] = []
  let articles: DiscoveryArticle[] = []

  try {
    const res = await getCollectionBySlugApi(slug)
    if (res?.data && res.data.title) {
      const c = res.data
      const rawProducts = Array.isArray(c.products) ? c.products : []
      products = rawProducts.map(toDiscoveryProduct)

      colObj = {
        slug: c.slug,
        name: c.title,
        eyebrow: c.category || 'Curated by FSO',
        intro: c.description || c.subtitle || '',
        image: c.image || '/images/pantry.jpg',
        productSlugs: products.map((p) => p.slug),
        producer: 'Verified Artisans',
        region: 'Across India',
        article: c.subtitle || '',
      }
    }
  } catch {}

  if (!colObj) notFound()

  try {
    const [producersRes, articlesRes] = await Promise.allSettled([
      getProducersApi({ limit: 2 }),
      getArticlesApi({ limit: 3 }),
    ])

    if (producersRes.status === 'fulfilled' && producersRes.value?.data && Array.isArray(producersRes.value.data)) {
      producers = producersRes.value.data.map(toDiscoveryProducer)
    }

    if (articlesRes.status === 'fulfilled' && articlesRes.value?.data && Array.isArray(articlesRes.value.data)) {
      articles = articlesRes.value.data.map((a) => ({
        slug: a.slug,
        category: a.category,
        title: a.title,
        excerpt: a.excerpt,
        image: a.image || '/images/pantry.jpg',
        readTime: a.readTime || '5 min read',
      }))
    }
  } catch (err) {
    console.error('Failed to load related producers/articles:', err)
  }

  return (
    <>
      <SiteHeader />
      <CollectionPage
        collection={colObj}
        products={products}
        producers={producers}
        articles={articles}
      />
    </>
  )
}
