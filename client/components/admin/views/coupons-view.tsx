'use client'

import { useState, useEffect } from 'react'
import { Ticket, Plus, RefreshCw, AlertCircle } from 'lucide-react'
import { getAdminCouponsApi } from '@/lib/api/admin'

interface CouponItem {
  id: string
  code: string
  description?: string
  discountPercent?: number
  discountAmount?: number
  minOrderValue?: number
  status?: string
  active?: boolean
  usedCount?: number
  usageLimit?: number
}

export function CouponsView() {
  const [coupons, setCoupons] = useState<CouponItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadCoupons = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getAdminCouponsApi()
      setCoupons(Array.isArray(data) ? data : [])
    } catch (err: unknown) {
      console.error('Failed to load coupons:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch coupons')
      setCoupons([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCoupons()
  }, [])

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="eyebrow">Promotions & Discounts</span>
          <h2 className="font-serif text-2xl font-bold text-foreground">Coupons & Offer Codes</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadCoupons}
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
          Loading coupons from database...
        </div>
      ) : coupons.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/80 p-12 text-center text-xs text-muted-foreground bg-surface">
          <Ticket className="size-10 mx-auto mb-3 opacity-40 text-primary" />
          <h3 className="font-serif text-base font-bold text-foreground">No Active Coupons</h3>
          <p className="mt-1 max-w-md mx-auto">
            The database currently has no promotional coupon codes. Discount promotions and seasonal codes will be listed here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {coupons.map((c) => (
            <div key={c.id} className="rounded-xl border border-dashed border-secondary/60 bg-surface p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-lg font-bold text-secondary tracking-wider bg-secondary/10 px-3 py-1 rounded border border-secondary/30">
                  {c.code}
                </span>
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                  {c.status || (c.active ? 'Active' : 'Inactive')}
                </span>
              </div>
              {c.description && (
                <p className="text-xs text-foreground font-semibold leading-snug">{c.description}</p>
              )}
              <div className="text-[11px] text-muted-foreground space-y-1 border-t border-border/60 pt-2">
                {c.minOrderValue !== undefined && <p>Min Order Value: ₹{c.minOrderValue}</p>}
                {c.usedCount !== undefined && <p>Redemptions: {c.usedCount} / {c.usageLimit || '∞'}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
