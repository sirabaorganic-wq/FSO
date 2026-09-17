'use client'

import { useState, useEffect } from 'react'
import { FolderTree, AlertCircle, RefreshCw } from 'lucide-react'
import { getAdminCategoriesApi, type AdminCategoryItem } from '@/lib/api/admin'

export function CategoriesView() {
  const [categories, setCategories] = useState<AdminCategoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadCategories = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getAdminCategoriesApi()
      setCategories(data || [])
    } catch (err: unknown) {
      console.error('Failed to load categories:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch categories')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCategories()
  }, [])

  if (loading) {
    return (
      <div className="space-y-4 p-4 animate-pulse">
        <div className="h-8 w-48 bg-surface-muted rounded" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-44 bg-surface-muted rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center space-y-4">
        <AlertCircle className="size-10 text-destructive mx-auto" />
        <p className="text-sm font-semibold text-foreground">{error}</p>
        <button
          type="button"
          onClick={loadCategories}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90"
        >
          <RefreshCw className="size-3.5" /> Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="eyebrow">Taxonomy Management</span>
          <h2 className="font-serif text-2xl font-bold text-foreground">Product Categories</h2>
        </div>
        <div className="text-xs text-muted-foreground font-semibold">
          Active Categories: {categories.length}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((cat) => (
          <div key={cat.id || cat.slug} className="rounded-xl border border-border bg-surface p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="rounded-full bg-surface-muted px-2.5 py-0.5 text-[10px] font-bold text-foreground">
                  {cat.productCount ?? 0} Listed Products
                </span>
                <span className="text-[10px] font-mono text-muted-foreground">/{cat.slug}</span>
              </div>
              <h3 className="font-serif text-lg font-bold text-foreground">{cat.name}</h3>
              <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                {cat.description || 'Heritage product classification.'}
              </p>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3 text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
              <span>Neon Canonical</span>
              <span className="text-emerald-700 dark:text-emerald-400 font-bold">Synchronized</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
