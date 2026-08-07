import Image from 'next/image'
import Link from 'next/link'
import { Gift, Star, ShoppingBag } from 'lucide-react'
import { SiteHeader } from '@/components/layout/site-header'
import { SiteFooter } from '@/components/layout/site-footer'
import { mockGiftBoxes } from '@/data/giftBoxes'

export const metadata = { title: 'Gift Collections & Festival Hampers' }

export default function GiftBoxesPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SiteHeader />
      <main id="main-content" className="flex-1 container-shell pt-28 pb-16 space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="eyebrow text-accent">Artisanal Gifting</span>
          <h1 className="font-serif text-3xl md:text-5xl font-bold text-foreground">
            Gift Boxes & Festival Hampers
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
            Handcrafted pine wood and eco-jute gift hampers filled with pure Vedic Bilona Ghee, Kashmir Saffron, and Wood-Pressed Oils.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {mockGiftBoxes.map((gift) => (
            <div key={gift.id} className="rounded-2xl border border-border bg-surface p-5 shadow-xs space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="relative h-48 w-full rounded-xl overflow-hidden border border-border">
                  <Image src={gift.image} alt={gift.title} fill className="object-cover" />
                  <span className="absolute top-2 left-2 rounded-full bg-accent text-accent-foreground px-3 py-1 text-[10px] font-bold">
                    {gift.category}
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-1 text-amber-500 font-bold text-xs mb-1">
                    <Star className="size-3.5 fill-amber-500" />
                    <span>{gift.rating} ({gift.reviewCount} Reviews)</span>
                  </div>
                  <h3 className="font-serif text-xl font-bold text-foreground leading-snug">{gift.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{gift.description}</p>
                </div>
                <div className="rounded-lg bg-surface-muted/40 p-3 text-xs space-y-1">
                  <p className="font-semibold text-foreground">Hamper Contents:</p>
                  <ul className="list-disc list-inside text-muted-foreground text-[11px] space-y-0.5">
                    {gift.contents.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="pt-3 border-t border-border/60 flex items-center justify-between">
                <div>
                  <span className="font-serif text-xl font-bold text-primary">₹{gift.price}</span>
                  <span className="text-xs text-muted-foreground line-through ml-2">₹{gift.originalPrice}</span>
                </div>
                <Link
                  href="/shop"
                  className="flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-xs font-bold text-accent-foreground hover:bg-accent/90"
                >
                  <ShoppingBag className="size-3.5" /> Order Gift Box
                </Link>
              </div>
            </div>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
