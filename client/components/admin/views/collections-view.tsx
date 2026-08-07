'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Layers, Plus, Sparkles, CheckCircle2 } from 'lucide-react'
import { mockCollections } from '@/data/admin/products'

export function CollectionsView() {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="eyebrow">Curated Merchandising</span>
          <h2 className="font-serif text-2xl font-bold text-foreground">Featured Collections</h2>
        </div>
        <button
          type="button"
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-all shadow-xs"
        >
          <Plus className="size-4" /> Create Collection
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {mockCollections.map((col) => (
          <div key={col.id} className="rounded-xl border border-border bg-surface p-5 shadow-xs space-y-3">
            <div className="relative h-36 w-full rounded-lg overflow-hidden border border-border">
              <Image src={col.image} alt={col.title} fill className="object-cover" />
              {col.featuredOnHome && (
                <span className="absolute top-2 left-2 rounded-full bg-accent text-accent-foreground px-2 py-0.5 text-[10px] font-bold">
                  Featured on Home
                </span>
              )}
            </div>
            <div>
              <span className="text-[10px] font-bold text-secondary uppercase tracking-wider">{col.tagline}</span>
              <h3 className="font-serif text-lg font-bold text-foreground">{col.title}</h3>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{col.description}</p>
            </div>
            <div className="flex items-center justify-between border-t border-border/60 pt-3 text-xs">
              <span className="font-semibold text-foreground">{col.productCount} Handpicked Products</span>
              <button type="button" className="font-bold text-primary hover:underline">
                Configure
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
