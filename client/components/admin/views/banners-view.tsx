'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Flag, Plus, RefreshCw, AlertCircle } from 'lucide-react'
import { getAdminBannersApi } from '@/lib/api/admin'

interface BannerItem {
  id: string
  title: string
  subtitle?: string
  imageUrl: string
  position?: string
  status?: string
  active?: boolean
  clickCount?: number
  startDate?: string
  endDate?: string
}

export function BannersView() {
  const [banners, setBanners] = useState<BannerItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadBanners = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getAdminBannersApi()
      setBanners(Array.isArray(data) ? data : [])
    } catch (err: unknown) {
      console.error('Failed to load banners:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch banners')
      setBanners([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBanners()
  }, [])

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="eyebrow">Storefront Merchandising</span>
          <h2 className="font-serif text-2xl font-bold text-foreground">Promotional Banners</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadBanners}
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
          Loading promotional banners from database...
        </div>
      ) : banners.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/80 p-12 text-center text-xs text-muted-foreground bg-surface">
          <Flag className="size-10 mx-auto mb-3 opacity-40 text-primary" />
          <h3 className="font-serif text-base font-bold text-foreground">No Promotional Banners</h3>
          <p className="mt-1 max-w-md mx-auto">
            The database currently contains zero promotional banners. Active hero and promotional carousels will appear here once configured.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {banners.map((ban) => (
            <div key={ban.id} className="rounded-xl border border-border bg-surface p-5 shadow-xs space-y-3">
              {ban.imageUrl && (
                <div className="relative h-44 w-full rounded-lg overflow-hidden border border-border">
                  <Image src={ban.imageUrl} alt={ban.title} fill className="object-cover" />
                  {ban.position && (
                    <span className="absolute top-2 left-2 rounded-full bg-accent text-accent-foreground px-2 py-0.5 text-[10px] font-bold">
                      {ban.position}
                    </span>
                  )}
                  <span className="absolute top-2 right-2 rounded-full bg-emerald-500 text-white px-2 py-0.5 text-[10px] font-bold">
                    {ban.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              )}
              <div>
                <h3 className="font-serif text-lg font-bold text-foreground">{ban.title}</h3>
                {ban.subtitle && (
                  <p className="text-xs text-muted-foreground mt-0.5">{ban.subtitle}</p>
                )}
              </div>
              <div className="flex items-center justify-between border-t border-border/60 pt-3 text-xs text-muted-foreground">
                <span>Clicks: <strong className="text-foreground">{ban.clickCount || 0}</strong></span>
                <span>{ban.startDate && ban.endDate ? `${ban.startDate} to ${ban.endDate}` : 'Ongoing'}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
