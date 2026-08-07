import { SiteHeader } from '@/components/layout/site-header'
import { SiteFooter } from '@/components/layout/site-footer'
import { mockKitchenCollections } from '@/data/collections'

export async function generateStaticParams() {
  return mockKitchenCollections.map((c) => ({ slug: c.slug }))
}

export default async function CollectionDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params
  const collection = mockKitchenCollections.find((c) => c.slug === resolvedParams.slug) || mockKitchenCollections[0]

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SiteHeader />
      <main id="main-content" className="flex-1 container-shell pt-28 pb-16 space-y-6">
        <span className="eyebrow text-secondary">{collection.category}</span>
        <h1 className="font-serif text-4xl font-bold text-foreground">{collection.title}</h1>
        <p className="text-sm text-muted-foreground max-w-xl">{collection.story}</p>
      </main>
      <SiteFooter />
    </div>
  )
}
