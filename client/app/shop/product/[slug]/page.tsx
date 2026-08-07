import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ProductDetailPage } from '@/components/product/product-detail-page'
import { getProductDetail, productDetails } from '@/data/productDetails'

type Props = { params: Promise<{ slug: string }> }

export function generateStaticParams() { return productDetails.map((product) => ({ slug: product.slug })) }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const product = getProductDetail(slug)
  if (!product) return { title: 'Product not found · FSO' }
  return { title: `${product.name} · FSO`, description: product.shortDescription, alternates: { canonical: `/shop/product/${product.slug}` }, openGraph: { title: product.name, description: product.shortDescription, images: [{ url: product.images[0].src, width: 1600, height: 2000, alt: product.images[0].alt }] } }
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params
  const product = getProductDetail(slug)
  if (!product) notFound()
  return <ProductDetailPage product={product} />
}
