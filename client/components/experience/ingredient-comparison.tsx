'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Scale, CheckCircle2, HelpCircle, ArrowRight } from 'lucide-react'
import { mockComparisons } from '@/data/comparison'
import { IngredientComparison } from '@/types/experience'

export function IngredientComparisonView() {
  const [activeComp, setActiveComp] = useState<IngredientComparison>(mockComparisons[0])

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <span className="eyebrow text-secondary">Educational Science & Food Truth</span>
        <h1 className="font-serif text-3xl md:text-5xl font-bold text-foreground">
          Ingredient Comparison Guide
        </h1>
        <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
          Compare traditional wood-pressed and Bilona churned foods against modern industrial processed alternatives.
        </p>
      </div>

      <div className="flex justify-center gap-2 overflow-x-auto">
        {mockComparisons.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setActiveComp(c)}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              activeComp.id === c.id
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'bg-surface border border-border text-foreground hover:bg-surface-muted'
            }`}
          >
            {c.title}
          </button>
        ))}
      </div>

      {/* Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Item A */}
        <div className="rounded-2xl border-2 border-emerald-500/40 bg-emerald-500/5 p-6 space-y-4 shadow-xs">
          <div className="relative h-44 w-full rounded-xl overflow-hidden border border-border">
            <Image src={activeComp.itemA.image} alt={activeComp.itemA.name} fill className="object-cover" />
            <span className="absolute top-2 left-2 rounded-full bg-emerald-600 text-white px-3 py-1 text-[10px] font-bold">
              Artisanal Heritage Choice
            </span>
          </div>
          <div>
            <h3 className="font-serif text-2xl font-bold text-foreground">{activeComp.itemA.name}</h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{activeComp.itemA.process}</p>
          </div>

          <div className="space-y-2 text-xs border-t border-emerald-500/20 pt-3">
            <p className="font-bold text-foreground">Nutritional & Culinary Advantages:</p>
            <ul className="space-y-1 text-muted-foreground">
              {activeComp.itemA.nutritionalPros.map((pro, i) => (
                <li key={i} className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                  <span>{pro}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Item B */}
        <div className="rounded-2xl border border-border bg-surface p-6 space-y-4 shadow-xs opacity-90">
          <div className="relative h-44 w-full rounded-xl overflow-hidden border border-border">
            <Image src={activeComp.itemB.image} alt={activeComp.itemB.name} fill className="object-cover grayscale" />
            <span className="absolute top-2 left-2 rounded-full bg-muted-foreground text-white px-3 py-1 text-[10px] font-bold">
              Commercial Industrial Process
            </span>
          </div>
          <div>
            <h3 className="font-serif text-2xl font-bold text-foreground">{activeComp.itemB.name}</h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{activeComp.itemB.process}</p>
          </div>

          <div className="space-y-2 text-xs border-t border-border/60 pt-3">
            <p className="font-bold text-foreground">Industrial Characteristics:</p>
            <ul className="space-y-1 text-muted-foreground">
              {activeComp.itemB.nutritionalPros.map((pro, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-muted-foreground shrink-0" />
                  <span>{pro}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Verdict & FAQ */}
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-xs space-y-4">
        <h3 className="font-serif text-xl font-bold text-foreground">Food Science Verdict</h3>
        <p className="text-xs text-muted-foreground leading-relaxed italic bg-surface-muted/30 p-4 rounded-xl border border-border">
          &quot;{activeComp.verdict}&quot;
        </p>

        <div className="space-y-3 pt-2 text-xs">
          <h4 className="font-serif text-lg font-bold text-foreground">Frequently Asked Questions</h4>
          {activeComp.faq.map((item, idx) => (
            <div key={idx} className="rounded-xl border border-border p-3 space-y-1 bg-background/50">
              <p className="font-bold text-foreground">{item.question}</p>
              <p className="text-muted-foreground">{item.answer}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
