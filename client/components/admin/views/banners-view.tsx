'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Flag, Plus, Calendar, Link as LinkIcon } from 'lucide-react'
import { mockBanners } from '@/data/admin/homepage'

export function BannersView() {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="eyebrow">Storefront Merchandising</span>
          <h2 className="font-serif text-2xl font-bold text-foreground">Promotional Banners</h2>
        </div>
        <button
          type="button"
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 shadow-xs"
        >
          <Plus className="size-4" /> Create Banner
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {mockBanners.map((ban) => (
          <div key={ban.id} className="rounded-xl border border-border bg-surface p-5 shadow-xs space-y-3">
            <div className="relative h-44 w-full rounded-lg overflow-hidden border border-border">
              <Image src={ban.imageUrl} alt={ban.title} fill className="object-cover" />
              <span className="absolute top-2 left-2 rounded-full bg-accent text-accent-foreground px-2 py-0.5 text-[10px] font-bold">
                {ban.position}
              </span>
              <span className="absolute top-2 right-2 rounded-full bg-emerald-500 text-white px-2 py-0.5 text-[10px] font-bold">
                {ban.status}
              </span>
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-foreground">{ban.title}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{ban.subtitle}</p>
            </div>
            <div className="flex items-center justify-between border-t border-border/60 pt-3 text-xs text-muted-foreground">
              <span>Clicks: <strong className="text-foreground">{ban.clickCount}</strong></span>
              <span>{ban.startDate} to {ban.endDate}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
