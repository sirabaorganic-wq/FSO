import type { Metadata } from 'next'
import { SiteHeader } from '@/components/layout/site-header'
import { ShopLanding } from '@/components/shop/shop-landing'
import { getProductsApi, getProductCategoriesApi } from '@/lib/api/products'
import { getProducersApi } from '@/lib/api/producers'
import { getCollectionsApi, getArticlesApi } from '@/lib/api/content'
import { toDiscoveryProduct, toDiscoveryProducer, toDiscoveryCategory } from '@/lib/api/mappers'
import type { DiscoveryCollection, DiscoveryArticle } from '@/types/discovery'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Shop the Pantry · FSO',
  description: 'Discover considered everyday ingredients from India’s growers, makers and traditional kitchens.',
  alternates: { canonical: '/shop' },
}

export default async function ShopPage() {
  let products: ReturnType<typeof toDiscoveryProduct>[] = []
  let producers: ReturnType<typeof toDiscoveryProducer>[] = []
  let categories: ReturnType<typeof toDiscoveryCategory>[] = []
  let collections: DiscoveryCollection[] = []
  let articles: DiscoveryArticle[] = []

  try {
    const [rawProducts, rawCategories, rawProducers, rawCollections, rawArticles] = await Promise.allSettled([
      getProductsApi(),
      getProductCategoriesApi(),
      getProducersApi({ limit: 6 }),
      getCollectionsApi(),
      getArticlesApi({ limit: 3 }),
    ])

    if (rawProducts.status === 'fulfilled' && Array.isArray(rawProducts.value)) {
      products = rawProducts.value.map(toDiscoveryProduct)
    }

    if (rawCategories.status === 'fulfilled' && Array.isArray(rawCategories.value)) {
      categories = rawCategories.value.map(toDiscoveryCategory)
    }

    if (rawProducers.status === 'fulfilled' && rawProducers.value.data) {
      producers = rawProducers.value.data.map(toDiscoveryProducer)
    }

    if (rawCollections.status === 'fulfilled' && rawCollections.value.data) {
      collections = rawCollections.value.data.map((c) => ({
        slug: c.slug,
        name: c.title,
        eyebrow: c.category || 'Curated by FSO',
        intro: c.description || c.subtitle || '',
        image: c.image || '/images/pantry.jpg',
        productSlugs: c.productSlugs || [],
        producer: 'Verified Artisans',
        region: 'India',
        article: c.subtitle || '',
      }))
    }

    if (rawArticles.status === 'fulfilled' && rawArticles.value.data) {
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
    console.error('Failed to load shop landing data:', err)
  }

  return (
    <>
      <SiteHeader />
      <ShopLanding
        products={products}
        categories={categories}
        producers={producers}
        collections={collections}
        articles={articles}
      />
    </>
  )
}
