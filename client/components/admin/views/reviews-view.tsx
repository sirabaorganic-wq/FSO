'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Star, CheckCircle, XCircle, Flag, MessageSquare } from 'lucide-react'
import { mockProductReviews } from '@/data/admin/orders'
import { ProductReview } from '@/types/admin'

export function ReviewsView() {
  const [reviews, setReviews] = useState<ProductReview[]>(mockProductReviews)

  const handleStatusChange = (id: string, status: 'Approved' | 'Rejected' | 'Flagged') => {
    setReviews(reviews.map((r) => (r.id === id ? { ...r, status } : r)))
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="eyebrow">Customer Sentiment</span>
          <h2 className="font-serif text-2xl font-bold text-foreground">Product Reviews Moderation</h2>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          <span>Average Rating: 4.88 ★</span>
        </div>
      </div>

      <div className="space-y-4">
        {reviews.map((rev) => (
          <div key={rev.id} className="rounded-xl border border-border bg-surface p-5 shadow-xs space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="relative size-10 rounded-full overflow-hidden border border-border shrink-0">
                  <Image src={rev.customerAvatar} alt={rev.customerName} fill className="object-cover" />
                </div>
                <div>
                  <p className="font-bold text-foreground text-sm">{rev.customerName}</p>
                  <p className="text-[11px] text-muted-foreground">Reviewed: <span className="font-semibold text-foreground">{rev.productName}</span></p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center text-amber-500 font-bold text-xs gap-0.5">
                  <Star className="size-4 fill-amber-500" />
                  <span>{rev.rating}.0</span>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                    rev.status === 'Approved'
                      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                      : rev.status === 'Pending'
                      ? 'bg-amber-500/20 text-amber-700'
                      : 'bg-rose-500/10 text-rose-700'
                  }`}
                >
                  {rev.status}
                </span>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-foreground text-xs">{rev.title}</h4>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">&quot;{rev.comment}&quot;</p>
            </div>

            <div className="flex items-center justify-between border-t border-border/60 pt-3 text-xs">
              <span className="text-[10px] text-muted-foreground">{rev.date} • Verified Purchase</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleStatusChange(rev.id, 'Approved')}
                  className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-600 hover:text-white transition-colors"
                >
                  Approve Review
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusChange(rev.id, 'Rejected')}
                  className="rounded-md border border-rose-500/40 bg-rose-500/10 px-2.5 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-600 hover:text-white transition-colors"
                >
                  Hide
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
