'use client'

import { useState } from 'react'
import { Ticket, Plus, Copy, CheckCircle2 } from 'lucide-react'
import { mockCoupons } from '@/data/admin/homepage'

export function CouponsView() {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="eyebrow">Promotions & Discounts</span>
          <h2 className="font-serif text-2xl font-bold text-foreground">Coupons & Offer Codes</h2>
        </div>
        <button
          type="button"
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 shadow-xs"
        >
          <Plus className="size-4" /> Add Coupon Code
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {mockCoupons.map((c) => (
          <div key={c.id} className="rounded-xl border border-dashed border-secondary/60 bg-surface p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-lg font-bold text-secondary tracking-wider bg-secondary/10 px-3 py-1 rounded border border-secondary/30">
                {c.code}
              </span>
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                {c.status}
              </span>
            </div>
            <p className="text-xs text-foreground font-semibold leading-snug">{c.description}</p>
            <div className="text-[11px] text-muted-foreground space-y-1 border-t border-border/60 pt-2">
              <p>Min Order Value: ₹{c.minOrderValue}</p>
              <p>Redemptions: {c.usedCount} / {c.usageLimit}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
