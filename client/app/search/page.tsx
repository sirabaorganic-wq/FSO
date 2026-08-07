import type { Metadata } from 'next'
import { SiteHeader } from '@/components/layout/site-header'
import { SearchPage } from '@/components/search/search-page'

type SearchRouteProps = { searchParams: Promise<{ q?: string }> }

export const metadata: Metadata = {
  title: 'Search the Pantry',
  description: 'Search FSO ingredients, producers, regions and kitchen wisdom.',
  alternates: { canonical: '/search' },
}

export default async function SearchRoute({ searchParams }: SearchRouteProps) {
  const params = await searchParams
  return <><SiteHeader /><SearchPage initialQuery={params.q ?? ''} /></>
}
