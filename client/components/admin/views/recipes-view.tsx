'use client'

import { useState } from 'react'
import Image from 'next/image'
import { UtensilsCrossed, Plus, Clock, Sparkles } from 'lucide-react'
import { mockCMSRecipes } from '@/data/admin/articles'

export function RecipesView() {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="eyebrow">CMS Heirloom Recipes</span>
          <h2 className="font-serif text-2xl font-bold text-foreground">Traditional Recipes Library</h2>
        </div>
        <button
          type="button"
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-all shadow-xs"
        >
          <Plus className="size-4" /> Create Recipe
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {mockCMSRecipes.map((rcp) => (
          <div key={rcp.id} className="rounded-xl border border-border bg-surface p-5 shadow-xs space-y-3">
            <div className="relative h-40 w-full rounded-lg overflow-hidden border border-border">
              <Image src={rcp.image} alt={rcp.title} fill className="object-cover" />
              <span className="absolute top-2 left-2 rounded-full bg-secondary text-secondary-foreground px-2 py-0.5 text-[10px] font-bold">
                {rcp.region}
              </span>
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-foreground">{rcp.title}</h3>
              <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Clock className="size-3.5" /> Prep: {rcp.prepTime}</span>
                <span>•</span>
                <span>{rcp.ingredientsCount} Ingredients</span>
              </div>
            </div>
            <div className="border-t border-border/60 pt-3 flex items-center justify-between text-xs">
              <span className="font-semibold text-emerald-700 dark:text-emerald-400">{rcp.difficulty}</span>
              <button type="button" className="font-bold text-primary hover:underline">
                Edit Steps & Ingredients
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
