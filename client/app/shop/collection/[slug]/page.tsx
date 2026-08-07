import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { SiteHeader } from '@/components/layout/site-header'
import { CollectionPage } from '@/components/shop/collection-page'
import { discoveryCollections, getCollection } from '@/data/discovery'

type CollectionRouteProps = { params: Promise<{ slug: string }> }

export function generateStaticParams() {
  return discoveryCollections.map((collection) => ({ slug: collection.slug }))
}

export async function generateMetadata({ params }: CollectionRouteProps): Promise<Metadata> {
  const { slug } = await params
  const collection = getCollection(slug)
  if (!collection) return { title: 'Collection not found' }
  return { title: collection.name, description: collection.intro, alternates: { canonical: `/shop/collection/${collection.slug}` } }
}

export default async function CollectionRoute({ params }: CollectionRouteProps) {
  const { slug } = await params
  const collection = getCollection(slug)
  if (!collection) notFound()
  return <><SiteHeader /><CollectionPage collection={collection} /></>
}
