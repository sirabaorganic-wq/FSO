'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Calendar, Sun, CloudRain, Snowflake, ArrowRight } from 'lucide-react'
import { mockSeasonalMonths } from '@/data/calendar'

export function SeasonalCalendar() {
  const [activeSeason, setActiveSeason] = useState(mockSeasonalMonths[0])

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <span className="eyebrow text-secondary">Ritu Chakra • Indian Seasonal Rhythms</span>
        <h1 className="font-serif text-3xl md:text-5xl font-bold text-foreground">
          Seasonal Heritage Food Calendar
        </h1>
        <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
          Traditional Indian food wisdom rotates across 6 seasonal ritus to balance bodily doshas, digestive fire, and natural crop availability.
        </p>
      </div>

      <div className="flex justify-center gap-2 overflow-x-auto">
        {mockSeasonalMonths.map((m) => (
          <button
            key={m.season}
            type="button"
            onClick={() => setActiveSeason(m)}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              activeSeason.season === m.season
                ? 'bg-secondary text-secondary-foreground shadow-xs'
                : 'bg-surface border border-border text-foreground hover:bg-surface-muted'
            }`}
          >
            {m.season}
          </button>
        ))}
      </div>

      {/* Selected Season Card */}
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-xs grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
        <div className="relative h-64 w-full rounded-xl overflow-hidden border border-border">
          <Image src={activeSeason.heroImage} alt={activeSeason.season} fill className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-5 flex flex-col justify-end">
            <span className="text-xs font-bold text-accent">{activeSeason.hindiName}</span>
            <h2 className="font-serif text-3xl font-bold text-white">{activeSeason.season}</h2>
            <p className="text-xs text-white/80">{activeSeason.month}</p>
          </div>
        </div>

        <div className="space-y-4 text-xs">
          <div>
            <h3 className="font-serif text-xl font-bold text-foreground mb-1">Seasonal Diet Focus</h3>
            <p className="text-muted-foreground leading-relaxed">{activeSeason.focusDescription}</p>
          </div>

          <div>
            <p className="font-semibold text-foreground mb-2">Key Harvested Ingredients</p>
            <div className="flex flex-wrap gap-2">
              {activeSeason.keyIngredients.map((ing) => (
                <span key={ing} className="rounded-lg border border-border bg-background px-3 py-1 text-xs font-bold text-primary">
                  {ing}
                </span>
              ))}
            </div>
          </div>

          <div className="pt-2">
            <Link
              href="/shop"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-all"
            >
              <span>Shop {activeSeason.season} Staples</span>
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
