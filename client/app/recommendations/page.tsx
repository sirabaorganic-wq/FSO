import Image from 'next/image'
import Link from 'next/link'
import { SiteHeader } from '@/components/layout/site-header'
import { SiteFooter } from '@/components/layout/site-footer'
import { mockRecommendations } from '@/data/recommendations'
import { BackButton } from '@/components/ui/back-button'

export const metadata = { title: 'Personalized Recommendations' }

export default function RecommendationsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SiteHeader />
      <main id="main-content" className="flex-1 container-shell pt-28 pb-16 space-y-6">
        <div>
          <BackButton fallbackHref="/" label="Back to Marketplace" variant="pill" />
        </div>
        <div className="border-b border-border/60 pb-3">
          <span className="eyebrow text-accent">Smart Personalization Engine</span>
          <h1 className="font-serif text-3xl font-bold text-foreground">Recommended Next Reads & Products</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {mockRecommendations.map((item) => (
            <div key={item.id} className="rounded-xl border border-border bg-surface p-4 flex items-center gap-4 text-xs shadow-xs">
              <div className="relative size-16 rounded-lg overflow-hidden border border-border shrink-0">
                <Image src={item.image} alt={item.title} fill className="object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="rounded bg-accent/20 px-2 py-0.5 text-[10px] font-bold text-accent-foreground">
                  {item.category}
                </span>
                <h3 className="font-serif font-bold text-foreground text-sm truncate mt-1">{item.title}</h3>
                <p className="text-[11px] text-muted-foreground">{item.subtitle}</p>
                <p className="text-[10px] text-secondary font-medium mt-1">✨ {item.matchReason}</p>
              </div>
              <Link href={item.href} className="font-bold text-primary hover:underline shrink-0">
                Discover →
              </Link>
            </div>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
