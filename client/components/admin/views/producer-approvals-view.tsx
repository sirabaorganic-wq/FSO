'use client'

import { useState, useEffect } from 'react'
import { UserCog, CheckCircle, XCircle, AlertCircle, RefreshCw, Clock } from 'lucide-react'
import {
  getAdminApprovalsApi,
  updateAdminVendorStatusApi,
  type AdminApprovalsResponse,
} from '@/lib/api/admin'

type PendingVendorItem = AdminApprovalsResponse['pendingVendors'][number]

export function ProducerApprovalsView() {
  const [pendingVendors, setPendingVendors] = useState<PendingVendorItem[]>([])
  const [selectedItem, setSelectedItem] = useState<PendingVendorItem | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionNotice, setActionNotice] = useState<string | null>(null)

  const loadApprovals = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getAdminApprovalsApi()
      setPendingVendors(data?.pendingVendors || [])
    } catch (err: unknown) {
      console.error('Failed to load pending approvals:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch approvals queue')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadApprovals()
  }, [])

  const handleApprove = async (id: string) => {
    try {
      setActionLoading(true)
      await updateAdminVendorStatusApi(id, 'APPROVED')
      setActionNotice('Vendor application approved successfully.')
      await loadApprovals()
    } catch (err: unknown) {
      console.error('Approval failed:', err)
      setActionNotice(err instanceof Error ? err.message : 'Failed to approve vendor')
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async (id: string) => {
    try {
      setActionLoading(true)
      await updateAdminVendorStatusApi(id, 'REJECTED', rejectionReason || 'Application criteria not met')
      setActionNotice('Vendor application marked as rejected.')
      setShowRejectModal(null)
      setRejectionReason('')
      await loadApprovals()
    } catch (err: unknown) {
      console.error('Rejection failed:', err)
      setActionNotice(err instanceof Error ? err.message : 'Failed to reject vendor')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 p-4 animate-pulse">
        <div className="h-8 w-48 bg-surface-muted rounded" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-48 bg-surface-muted rounded-xl" />
          <div className="h-48 bg-surface-muted rounded-xl" />
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
          onClick={loadApprovals}
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
          <span className="eyebrow">Onboarding Audit Queue</span>
          <h2 className="font-serif text-2xl font-bold text-foreground">Producer Verification Approvals</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-amber-500/20 px-3 py-1 text-xs font-bold text-amber-700 dark:text-amber-300">
            {pendingVendors.length} Application{pendingVendors.length === 1 ? '' : 's'} Pending
          </span>
        </div>
      </div>

      {actionNotice && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs font-semibold text-primary flex items-center justify-between">
          <span>{actionNotice}</span>
          <button type="button" onClick={() => setActionNotice(null)} className="underline ml-2">
            Dismiss
          </button>
        </div>
      )}

      {pendingVendors.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-12 text-center text-xs text-muted-foreground space-y-2">
          <UserCog className="size-10 mx-auto text-muted-foreground/50 mb-2" />
          <h3 className="font-serif text-base font-bold text-foreground">Verification Queue Clear</h3>
          <p>There are currently no producer onboarding applications awaiting administrative review.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pendingVendors.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-amber-500/30 bg-surface p-5 shadow-2xs space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-serif text-lg font-bold text-foreground">{item.businessName}</h3>
                  <p className="text-xs text-muted-foreground">
                    Contact: {item.contactPerson} ({item.email})
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300">
                  <Clock className="size-3" /> PENDING
                </span>
              </div>

              <div className="text-[11px] border-y border-border/60 py-2.5 my-2">
                <span className="text-muted-foreground">Application Date: </span>
                <span className="font-semibold text-foreground">
                  {new Date(item.createdAt).toLocaleDateString()}
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => setShowRejectModal(item.id)}
                  className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-1 text-xs font-bold text-rose-700 hover:bg-rose-500 hover:text-white transition-colors disabled:opacity-50"
                >
                  Reject
                </button>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleApprove(item.id)}
                  className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-bold text-white hover:bg-emerald-700 transition-colors shadow-xs disabled:opacity-50"
                >
                  Approve Application
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reject Reason Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-2xl space-y-4 text-xs">
            <h3 className="font-serif text-base font-bold text-foreground">Specify Rejection Reason</h3>
            <p className="text-muted-foreground">
              Provide constructive feedback to the applicant regarding why their verification cannot proceed.
            </p>
            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. FSSAI registration document missing or illegible..."
              className="w-full rounded-lg border border-border bg-background p-2.5 text-xs text-foreground outline-none focus:border-primary"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowRejectModal(null)
                  setRejectionReason('')
                }}
                className="rounded-lg border border-border px-4 py-2 text-xs font-bold text-muted-foreground hover:bg-surface-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleReject(showRejectModal)}
                className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {actionLoading ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
