'use client'

import { useState } from 'react'
import Image from 'next/image'
import { FolderTree, Plus, Edit2, Sparkles, Droplet, Sun, Flame, Wheat } from 'lucide-react'
import { mockCategories } from '@/data/admin/products'
import { CategoryItem } from '@/types/admin'

export function CategoriesView() {
  const [categories, setCategories] = useState<CategoryItem[]>(mockCategories)

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="eyebrow">Taxonomy Management</span>
          <h2 className="font-serif text-2xl font-bold text-foreground">Product Categories</h2>
        </div>
        <button
          type="button"
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-all shadow-xs"
        >
          <Plus className="size-4" /> Create Category
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((cat) => (
          <div key={cat.id} className="rounded-xl border border-border bg-surface p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="relative h-32 w-full rounded-lg overflow-hidden border border-border mb-3">
                <Image src={cat.image} alt={cat.name} fill className="object-cover" />
                <span className="absolute top-2 right-2 rounded-full bg-surface/90 px-2 py-0.5 text-[10px] font-bold text-foreground backdrop-blur-xs">
                  {cat.productCount} Products
                </span>
              </div>
              <h3 className="font-serif text-lg font-bold text-foreground">{cat.name}</h3>
              <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{cat.description}</p>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-secondary">Slug: /{cat.slug}</span>
              <button type="button" className="text-xs font-bold text-primary hover:underline">
                Edit Category
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
