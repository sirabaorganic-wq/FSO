'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Layers, Plus, RefreshCw, AlertCircle } from 'lucide-react'
import { getAdminCollectionsApi } from '@/lib/api/admin'

interface CollectionItem {
  id: string
  title: string
  slug: string
  tagline?: string
  description?: string
  image?: string
  bannerImage?: string
  featuredOnHome?: boolean
  products?: any[]
  _count?: { products: number }
}

export function CollectionsView() {
  const [collections, setCollections] = useState<CollectionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadCollections = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getAdminCollectionsApi()
      setCollections(Array.isArray(data) ? data : [])
    } catch (err: unknown) {
      console.error('Failed to load collections:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch collections')
      setCollections([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCollections()
  }, [])

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="eyebrow">Curated Merchandising</span>
          <h2 className="font-serif text-2xl font-bold text-foreground">Featured Collections</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadCollections}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-surface-muted transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-xs font-medium text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center text-xs text-muted-foreground">
          <RefreshCw className="size-6 animate-spin mx-auto mb-2 text-primary" />
          Loading collections from database...
        </div>
      ) : collections.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/80 p-12 text-center text-xs text-muted-foreground bg-surface">
          <Layers className="size-10 mx-auto mb-3 opacity-40 text-primary" />
          <h3 className="font-serif text-base font-bold text-foreground">No Collections Configured</h3>
          <p className="mt-1 max-w-md mx-auto">
            The database currently contains no merchandise collections. Curated collections will appear here once configured in the catalog.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {collections.map((col) => (
            <div key={col.id} className="rounded-xl border border-border bg-surface p-5 shadow-xs space-y-3">
              {(col.image || col.bannerImage) && (
                <div className="relative h-36 w-full rounded-lg overflow-hidden border border-border">
                  <Image src={col.image || col.bannerImage || ''} alt={col.title} fill className="object-cover" />
                  {col.featuredOnHome && (
                    <span className="absolute top-2 left-2 rounded-full bg-accent text-accent-foreground px-2 py-0.5 text-[10px] font-bold">
                      Featured on Home
                    </span>
                  )}
                </div>
              )}
              <div>
                {col.tagline && (
                  <span className="text-[10px] font-bold text-secondary uppercase tracking-wider">{col.tagline}</span>
                )}
                <h3 className="font-serif text-lg font-bold text-foreground">{col.title}</h3>
                {col.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{col.description}</p>
                )}
              </div>
              <div className="flex items-center justify-between border-t border-border/60 pt-3 text-xs">
                <span className="font-semibold text-foreground">
                  {col._count?.products ?? col.products?.length ?? 0} Products
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
