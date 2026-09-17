'use client'

import { useState, useEffect } from 'react'
import { Star, CheckCircle, XCircle, Trash2, AlertCircle, RefreshCw, MessageSquare } from 'lucide-react'
import {
  getAdminReviewsApi,
  updateAdminReviewStatusApi,
  deleteAdminReviewApi,
  type AdminReviewItem,
} from '@/lib/api/admin'

export function ReviewsView() {
  const [reviews, setReviews] = useState<AdminReviewItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionNotice, setActionNotice] = useState<string | null>(null)

  const loadReviews = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getAdminReviewsApi()
      setReviews(data || [])
    } catch (err: unknown) {
      console.error('Failed to load reviews:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch reviews')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReviews()
  }, [])

  const handleToggleApproval = async (id: string, currentStatus: boolean) => {
    try {
      setActionLoading(true)
      await updateAdminReviewStatusApi(id, !currentStatus)
      setActionNotice(`Review status updated to ${!currentStatus ? 'Approved' : 'Hidden'}`)
      await loadReviews()
    } catch (err: unknown) {
      console.error('Approval update failed:', err)
      setActionNotice(err instanceof Error ? err.message : 'Failed to update review status')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeleteReview = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this review?')) return
    try {
      setActionLoading(true)
      await deleteAdminReviewApi(id)
      setActionNotice('Review deleted permanently by Admin.')
      await loadReviews()
    } catch (err: unknown) {
      console.error('Delete review failed:', err)
      setActionNotice(err instanceof Error ? err.message : 'Failed to delete review')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 p-4 animate-pulse">
        <div className="h-8 w-48 bg-surface-muted rounded" />
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-surface-muted rounded-xl" />
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
          onClick={loadReviews}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90"
        >
          <RefreshCw className="size-3.5" /> Retry
        </button>
      </div>
    )
  }

  const avgRating = reviews.length > 0
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(2)
    : '0.00'

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="eyebrow">Customer Sentiment</span>
          <h2 className="font-serif text-2xl font-bold text-foreground">Product Reviews Moderation</h2>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          <span>Average Rating: {avgRating} ★</span>
          <span>•</span>
          <span>Total Reviews: {reviews.length}</span>
        </div>
      </div>

      {/* Schema Freeze Architectural Notice */}
      <div className="rounded-lg border border-border/80 bg-surface-muted/50 p-3 text-xs text-muted-foreground">
        <span className="font-bold text-foreground">Schema Policy: </span>
        Review moderation controls persistent visibility (<code className="font-mono text-[11px]">isApproved</code>) and deletion. Under the active schema freeze, vendor replies are not durably persisted.
      </div>

      {actionNotice && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs font-semibold text-primary flex items-center justify-between">
          <span>{actionNotice}</span>
          <button type="button" onClick={() => setActionNotice(null)} className="underline ml-2">
            Dismiss
          </button>
        </div>
      )}

      {reviews.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-12 text-center text-xs text-muted-foreground space-y-2">
          <MessageSquare className="size-10 mx-auto text-muted-foreground/50 mb-2" />
          <h3 className="font-serif text-base font-bold text-foreground">No Reviews Submitted</h3>
          <p>The database currently contains zero reviews. As verified customers leave feedback on delivered orders, they will appear here for administrative moderation.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((rev) => (
            <div key={rev.id} className="rounded-xl border border-border bg-surface p-5 shadow-xs space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-bold text-foreground text-sm">{rev.user?.name || 'Customer'}</p>
                  <p className="text-[11px] text-muted-foreground">
                    Reviewed: <span className="font-semibold text-foreground">{rev.product?.name || 'Product'}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center text-amber-500 font-bold text-xs gap-0.5">
                    <Star className="size-4 fill-amber-500" />
                    <span>{rev.rating}.0</span>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                      rev.isApproved
                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                        : 'bg-rose-500/10 text-rose-700'
                    }`}
                  >
                    {rev.isApproved ? 'Approved' : 'Hidden'}
                  </span>
                </div>
              </div>

              <div>
                {rev.title && <h4 className="font-semibold text-foreground text-xs">{rev.title}</h4>}
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">&quot;{rev.comment}&quot;</p>
              </div>

              <div className="flex items-center justify-between border-t border-border/60 pt-3 text-xs">
                <span className="text-[10px] text-muted-foreground">
                  {new Date(rev.createdAt).toLocaleDateString()} • {rev.isVerifiedPurchase ? 'Verified Purchase' : 'Unverified'}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleToggleApproval(rev.id, rev.isApproved)}
                    className="rounded-md border border-border px-2.5 py-1 text-[11px] font-bold text-foreground hover:bg-surface-muted disabled:opacity-50"
                  >
                    {rev.isApproved ? 'Hide Review' : 'Approve Review'}
                  </button>
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleDeleteReview(rev.id)}
                    className="rounded-md border border-rose-500/40 bg-rose-500/10 px-2.5 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-600 hover:text-white transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="size-3 inline mr-1" /> Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
