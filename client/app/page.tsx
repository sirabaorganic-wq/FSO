import type { Metadata } from 'next'
import { HomePage } from '@/components/home/homepage'
import { getProductCategoriesApi, getProductsApi } from '@/lib/api/products'
import { getProducersApi } from '@/lib/api/producers'
import { getArticlesApi } from '@/lib/api/content'
import type { BackendCategory, BackendProduct, BackendVendor, BackendArticle } from '@/lib/api/types'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: "FLASH SALES ONLINE · India's Heritage Kitchen Marketplace",
  description: 'Pure, authentic ingredients sourced directly from verified Indian heritage producers and artisan makers.',
  alternates: { canonical: '/' },
}

export default async function Page() {
  let categories: BackendCategory[] = []
  let producers: BackendVendor[] = []
  let products: BackendProduct[] = []
  let articles: BackendArticle[] = []

  try {
    const [catsRes, prodsRes, producersRes, articlesRes] = await Promise.allSettled([
      getProductCategoriesApi(),
      getProductsApi(),
      getProducersApi({ limit: 3 }),
      getArticlesApi({ limit: 3 }),
    ])

    if (catsRes.status === 'fulfilled' && Array.isArray(catsRes.value)) {
      categories = catsRes.value
    }
    if (prodsRes.status === 'fulfilled' && Array.isArray(prodsRes.value)) {
      products = prodsRes.value
    }
    if (producersRes.status === 'fulfilled' && producersRes.value?.data && Array.isArray(producersRes.value.data)) {
      producers = producersRes.value.data
    }
    if (articlesRes.status === 'fulfilled' && articlesRes.value?.data && Array.isArray(articlesRes.value.data)) {
      articles = articlesRes.value.data
    }
  } catch (err) {
    console.error('Failed to load homepage live data:', err)
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'FLASH SALES ONLINE',
    description: "India's Heritage Kitchen Marketplace",
    url: 'https://flashsalesonline.in',
  }

  return (
    <>
      <HomePage
        categories={categories}
        producers={producers}
        products={products}
        articles={articles}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </>
  )
}
