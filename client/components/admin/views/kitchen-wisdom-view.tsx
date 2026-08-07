'use client'

import { BookOpen, Sparkles, Plus, Edit } from 'lucide-react'

export function KitchenWisdomView() {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="eyebrow">Content Strategy</span>
          <h2 className="font-serif text-2xl font-bold text-foreground">Kitchen Wisdom Hub Management</h2>
        </div>
        <button
          type="button"
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="size-4" /> Add Wisdom Guide
        </button>
      </div>

      <div className="rounded-xl border border-border bg-surface p-6 shadow-xs space-y-4">
        <h3 className="font-serif text-xl font-bold text-foreground">Curated Wisdom Pillars</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="rounded-lg border border-border p-4 bg-background/50 space-y-2">
            <span className="eyebrow">Pillar 1</span>
            <h4 className="font-serif text-base font-bold text-foreground">Traditional Oil Extraction & Smoke Points</h4>
            <p className="text-muted-foreground">Explains why unrefined Vaagai wood-pressed oils have high flash points without chemical bleaching.</p>
            <button type="button" className="font-bold text-primary hover:underline">Manage Pillar Content →</button>
          </div>
          <div className="rounded-lg border border-border p-4 bg-background/50 space-y-2">
            <span className="eyebrow">Pillar 2</span>
            <h4 className="font-serif text-base font-bold text-foreground">Ayurvedic Bilona Ghee Properties</h4>
            <p className="text-muted-foreground">Focuses on Sahiwal & Gir cow A2 fat structures, dahi fermentation, and digestion.</p>
            <button type="button" className="font-bold text-primary hover:underline">Manage Pillar Content →</button>
          </div>
        </div>
      </div>
    </div>
  )
}
