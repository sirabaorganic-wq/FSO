import Image from 'next/image'
import Link from 'next/link'
import { SiteHeader } from '@/components/layout/site-header'
import { SiteFooter } from '@/components/layout/site-footer'
import { getCollectionsApi } from '@/lib/api/content'
import type { BackendCollection } from '@/lib/api/types'
import { BackButton } from '@/components/ui/back-button'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Kitchen Collections · FSO',
  description: 'Curated product bundles celebrating regional heritage and traditional Indian kitchens.',
  alternates: { canonical: '/collections' },
}

export default async function CollectionsPage() {
  let collections: BackendCollection[] = []

  try {
    const res = await getCollectionsApi()
    if (res?.data && Array.isArray(res.data)) {
      collections = res.data
    }
  } catch (err) {
    console.error('Failed to load collections:', err)
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SiteHeader />
      <main id="main-content" className="flex-1 container-shell pt-28 pb-16 space-y-8">
        <div>
          <BackButton fallbackHref="/" label="Back to Marketplace" variant="pill" />
        </div>
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="eyebrow text-secondary">Curated Editorial Storytelling</span>
          <h1 className="font-serif text-3xl md:text-5xl font-bold text-foreground">
            Kitchen Collections
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
            Handpicked product bundles curated around regional heritage, health goals, and traditional Indian kitchen styles.
          </p>
        </div>

        {collections.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {collections.map((col) => (
              <div key={col.id} className="rounded-2xl border border-border bg-surface p-6 shadow-xs space-y-3">
                <div className="relative h-48 w-full rounded-xl overflow-hidden border border-border">
                  <Image
                    src={col.image || '/images/pantry.jpg'}
                    alt={col.title}
                    fill
                    className="object-cover"
                  />
                  {col.category && (
                    <span className="absolute top-2 left-2 rounded-full bg-secondary text-secondary-foreground px-3 py-1 text-[10px] font-bold">
                      {col.category}
                    </span>
                  )}
                </div>
                <div>
                  <h3 className="font-serif text-2xl font-bold text-foreground">{col.title}</h3>
                  {col.subtitle && <p className="text-xs text-secondary font-semibold mt-0.5">{col.subtitle}</p>}
                  <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{col.description || col.story || ''}</p>
                </div>
                <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground">
                    {col.category || 'Curated Collection'}
                  </span>
                  <Link href={`/shop/collection/${col.slug}`} className="font-bold text-primary hover:underline">
                    Explore Collection →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="border border-border bg-surface-muted p-12 text-center">
            <p className="font-serif text-2xl text-foreground">New collections are being curated</p>
            <p className="mt-2 text-sm text-muted-foreground">Our editorial team is assembling seasonal groupings from verified producers.</p>
            <Link href="/shop" className="mt-6 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-secondary">
              Browse Pantry →
            </Link>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  )
}
