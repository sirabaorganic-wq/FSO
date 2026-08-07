'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Sparkles, Calendar, Gift, ArrowRight } from 'lucide-react'
import { mockFestivals } from '@/data/festivals'

export function FestivalExperience() {
  const [selectedFestival, setSelectedFestival] = useState(mockFestivals[0])

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <span className="eyebrow text-accent">Sacred Celebrations & Food Traditions</span>
        <h1 className="font-serif text-3xl md:text-5xl font-bold text-foreground">
          Festivals of India
        </h1>
        <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
          Discover traditional recipes, sacred prasad ingredients, and curated heritage gift boxes for India’s rich festival calendar.
        </p>
      </div>

      <div className="flex justify-center gap-2 overflow-x-auto">
        {mockFestivals.map((fest) => (
          <button
            key={fest.id}
            type="button"
            onClick={() => setSelectedFestival(fest)}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              selectedFestival.id === fest.id
                ? 'bg-accent text-accent-foreground shadow-xs'
                : 'bg-surface border border-border text-foreground hover:bg-surface-muted'
            }`}
          >
            {fest.name} ({fest.hindiName})
          </button>
        ))}
      </div>

      {/* Hero Card */}
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-xs grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
        <div className="relative h-64 w-full rounded-xl overflow-hidden border border-border">
          <Image src={selectedFestival.heroImage} alt={selectedFestival.name} fill className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-5 flex flex-col justify-end">
            <span className="text-xs font-bold text-accent">{selectedFestival.hindiName} • {selectedFestival.dateOrMonth}</span>
            <h2 className="font-serif text-3xl font-bold text-white">{selectedFestival.name}</h2>
          </div>
        </div>

        <div className="space-y-4 text-xs">
          <div>
            <p className="font-bold text-secondary text-sm">{selectedFestival.tagline}</p>
            <p className="text-muted-foreground leading-relaxed mt-1">{selectedFestival.description}</p>
          </div>

          <div>
            <p className="font-semibold text-foreground mb-2">Regional Rituals & Traditions</p>
            <div className="space-y-1.5">
              {selectedFestival.regionalTraditions.map((trad, idx) => (
                <div key={idx} className="rounded-lg border border-border p-2 bg-background/50">
                  <span className="font-bold text-primary">{trad.region}: </span>
                  <span className="text-muted-foreground">{trad.ritual}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2 flex items-center gap-3">
            <Link
              href="/gift-boxes"
              className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-xs font-bold text-accent-foreground hover:bg-accent/90"
            >
              <Gift className="size-4" /> Explore Festive Gift Boxes
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
