import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ProductDetailPage } from '@/components/product/product-detail-page'
import { getProductBySlugOrIdApi, getProductsApi } from '@/lib/api/products'
import { toFrontendProductDetail, toDiscoveryProduct } from '@/lib/api/mappers'

type Props = { params: Promise<{ slug: string }> }

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  try {
    const raw = await getProductBySlugOrIdApi(slug)
    if (!raw) return { title: 'Product not found · FSO' }
    return {
      title: `${raw.name} · FSO`,
      description: raw.shortDescription || raw.description || '',
      alternates: { canonical: `/shop/product/${raw.slug}` },
      openGraph: {
        title: raw.name,
        description: raw.shortDescription || raw.description || '',
        images: raw.image ? [{ url: raw.image, width: 1600, height: 2000, alt: raw.name }] : [],
      },
    }
  } catch {
    return { title: 'Product not found · FSO' }
  }
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params

  let product: ReturnType<typeof toFrontendProductDetail> | null = null
  let related: ReturnType<typeof toDiscoveryProduct>[] = []

  try {
    const raw = await getProductBySlugOrIdApi(slug)
    if (raw && raw.id) {
      product = toFrontendProductDetail(raw)
      try {
        const allProducts = await getProductsApi()
        related = allProducts
          .filter((p) => p.slug !== raw.slug)
          .slice(0, 3)
          .map(toDiscoveryProduct)
      } catch {
        related = []
      }
    }
  } catch {}

  if (!product) {
    notFound()
  }

  return <ProductDetailPage product={product} related={related} />
}
