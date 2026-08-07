import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { SiteHeader } from '@/components/layout/site-header'
import { CategoryPage } from '@/components/shop/category-page'
import { discoveryCategories, getCategory } from '@/data/discovery'

type CategoryRouteProps = { params: Promise<{ slug: string }> }

export function generateStaticParams() {
  return discoveryCategories.map((category) => ({ slug: category.slug }))
}

export async function generateMetadata({ params }: CategoryRouteProps): Promise<Metadata> {
  const { slug } = await params
  const category = getCategory(slug)
  if (!category) return { title: 'Category not found' }
  return { title: category.name, description: category.story, alternates: { canonical: `/shop/category/${category.slug}` } }
}

export default async function CategoryRoute({ params }: CategoryRouteProps) {
  const { slug } = await params
  const category = getCategory(slug)
  if (!category) notFound()
  return <><SiteHeader /><CategoryPage category={category} /></>
}
