'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Sparkles, Plus, MapPin, HeartPulse } from 'lucide-react'
import { mockCMSIngredients } from '@/data/admin/articles'

export function IngredientsView() {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="eyebrow">Botanical & Heritage Archive</span>
          <h2 className="font-serif text-2xl font-bold text-foreground">Ingredient Encyclopedia</h2>
        </div>
        <button
          type="button"
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-all shadow-xs"
        >
          <Plus className="size-4" /> Add Ingredient Entry
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {mockCMSIngredients.map((ing) => (
          <div key={ing.id} className="rounded-xl border border-border bg-surface p-5 shadow-xs space-y-3">
            <div className="relative h-36 w-full rounded-lg overflow-hidden border border-border">
              <Image src={ing.image} alt={ing.name} fill className="object-cover" />
              <span className="absolute top-2 left-2 rounded-full bg-accent text-accent-foreground px-2 py-0.5 text-[10px] font-bold">
                Origin: {ing.originState}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-secondary uppercase tracking-wider">{ing.hindiName} • {ing.botanicalName}</span>
              <h3 className="font-serif text-lg font-bold text-foreground">{ing.name}</h3>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{ing.description}</p>
            </div>
            <div className="border-t border-border/60 pt-3 text-xs space-y-1">
              <p className="font-semibold text-foreground">Health Benefits:</p>
              <div className="flex flex-wrap gap-1">
                {ing.healthBenefits.map((b, i) => (
                  <span key={i} className="rounded bg-surface-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    {b}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
