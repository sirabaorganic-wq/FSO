'use client'

import { useState } from 'react'
import Link from 'next/link'
import { PackageCheck, CheckSquare, Square, Plus, Trash2, ShoppingBag } from 'lucide-react'
import { mockPantryItems } from '@/data/pantry'
import { PantryItem } from '@/types/experience'

export function PantryPlanner() {
  const [items, setItems] = useState<PantryItem[]>(mockPantryItems)
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  const [checkedIds, setCheckedIds] = useState<string[]>(['pnt-1', 'pnt-2'])
  const [newItemName, setNewItemName] = useState('')

  const categories = ['All', 'Ghee & Fats', 'Cold Pressed Oils', 'Wild Honey & Sweets', 'Himalayan Spices', 'Heirloom Grains']

  const filtered = selectedCategory === 'All' ? items : items.filter((i) => i.category === selectedCategory)

  const toggleCheck = (id: string) => {
    if (checkedIds.includes(id)) {
      setCheckedIds(checkedIds.filter((i) => i !== id))
    } else {
      setCheckedIds([...checkedIds, id])
    }
  }

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newItemName) return
    const created: PantryItem = {
      id: `pnt-${Date.now()}`,
      name: newItemName,
      category: 'Himalayan Spices',
      recommendedQuantity: 'Custom requirement',
      benefits: 'Custom pantry item added by user.',
      essential: true,
    }
    setItems([created, ...items])
    setNewItemName('')
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="eyebrow text-secondary">Custom Kitchen Inventory</span>
          <h1 className="font-serif text-3xl font-bold text-foreground">Healthy Pantry Planner</h1>
        </div>
        <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-400">
          {checkedIds.length} of {items.length} Essentials Stocked
        </span>
      </div>

      {/* Category Pills & Add Input */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                selectedCategory === cat
                  ? 'bg-primary text-primary-foreground shadow-2xs'
                  : 'bg-surface border border-border text-foreground hover:bg-surface-muted'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <form onSubmit={handleAddItem} className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Add custom item..."
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            className="rounded-lg border border-border/80 bg-surface px-3 py-1.5 text-xs outline-none focus:border-ring"
          />
          <button
            type="submit"
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="size-4" />
          </button>
        </form>
      </div>

      {/* Item List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((item) => {
          const isChecked = checkedIds.includes(item.id)
          return (
            <div
              key={item.id}
              onClick={() => toggleCheck(item.id)}
              className={`flex items-start gap-3 rounded-xl border p-4 cursor-pointer text-xs transition-all ${
                isChecked
                  ? 'border-emerald-500/40 bg-emerald-500/5 text-foreground'
                  : 'border-border bg-surface hover:bg-surface-muted/40'
              }`}
            >
              <button type="button" className="mt-0.5 shrink-0">
                {isChecked ? (
                  <CheckSquare className="size-5 text-emerald-600" />
                ) : (
                  <Square className="size-5 text-muted-foreground/60" />
                )}
              </button>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <span className={`font-bold text-sm ${isChecked ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                    {item.name}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-secondary">
                    {item.recommendedQuantity}
                  </span>
                </div>
                <p className="text-muted-foreground leading-relaxed">{item.benefits}</p>
                {item.productId && (
                  <div className="pt-1">
                    <Link
                      href="/shop"
                      onClick={(e) => e.stopPropagation()}
                      className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1"
                    >
                      <ShoppingBag className="size-3" /> Restock Item in Shop →
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
