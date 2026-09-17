'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { UserCheck, CheckCircle2, AlertCircle, RefreshCw, XCircle, Clock } from 'lucide-react'
import { DataTable } from '../data-table'
import {
  getAdminVendorsApi,
  getAdminApprovalsApi,
  type AdminVendorItem,
} from '@/lib/api/admin'

export function ProducersView() {
  const [vendors, setVendors] = useState<AdminVendorItem[]>([])
  const [pendingCount, setPendingCount] = useState<number>(0)
  const [selectedProd, setSelectedProd] = useState<AdminVendorItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadVendors = async () => {
    try {
      setLoading(true)
      setError(null)
      const [vendorsRes, approvalsRes] = await Promise.all([
        getAdminVendorsApi(),
        getAdminApprovalsApi().catch(() => ({ totalPending: 0, pendingVendors: [], pendingProducts: [] })),
      ])
      setVendors(vendorsRes?.vendors || [])
      setPendingCount(approvalsRes?.totalPending || 0)
    } catch (err: unknown) {
      console.error('Failed to load vendors:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch vendor directory')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadVendors()
  }, [])

  const columns = [
    {
      key: 'producer',
      header: 'Producer & Business',
      accessor: (p: AdminVendorItem) => (
        <div>
          <p className="font-semibold text-foreground">{p.businessName}</p>
          <p className="text-[10px] text-muted-foreground">
            Contact: {p.contactPerson} ({p.email})
          </p>
        </div>
      ),
      sortable: true,
    },
    {
      key: 'businessType',
      header: 'Business Model',
      accessor: (p: AdminVendorItem) => (
        <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[10px] font-semibold text-foreground uppercase">
          {p.businessType || 'Direct Producer'}
        </span>
      ),
      sortable: true,
    },
    {
      key: 'verification',
      header: 'Approval Status',
      accessor: (p: AdminVendorItem) => {
        const st = (p.status || '').toUpperCase()
        const isApproved = st === 'APPROVED'
        const isPending = st === 'PENDING'
        return (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              isApproved
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                : isPending
                ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300'
                : 'bg-rose-500/10 text-rose-700'
            }`}
          >
            {isApproved ? (
              <CheckCircle2 className="size-3" />
            ) : isPending ? (
              <Clock className="size-3" />
            ) : (
              <XCircle className="size-3" />
            )}
            {st}
          </span>
        )
      },
      sortable: true,
    },
    {
      key: 'createdAt',
      header: 'Onboarded Date',
      accessor: (p: AdminVendorItem) => (
        <span className="text-xs text-muted-foreground">
          {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : 'N/A'}
        </span>
      ),
      sortable: true,
    },
    {
      key: 'actions',
      header: 'Actions',
      accessor: (p: AdminVendorItem) => (
        <button
          type="button"
          onClick={() => setSelectedProd(p)}
          className="text-[11px] font-bold text-primary hover:underline"
        >
          Inspect Profile
        </button>
      ),
    },
  ]

  if (loading) {
    return (
      <div className="space-y-4 p-4 animate-pulse">
        <div className="h-8 w-48 bg-surface-muted rounded" />
        <div className="h-64 bg-surface-muted rounded-xl" />
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
          onClick={loadVendors}
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
          <span className="eyebrow">Artisan Marketplace</span>
          <h2 className="font-serif text-2xl font-bold text-foreground">Producer Directory</h2>
        </div>
        <Link
          href="/admin/producer-approvals"
          className="flex items-center gap-2 rounded-xl bg-secondary px-4 py-2 text-xs font-bold text-secondary-foreground hover:bg-secondary/90 transition-all shadow-xs"
        >
          <span>View Pending Approvals ({pendingCount})</span>
        </Link>
      </div>

      {vendors.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-12 text-center text-xs text-muted-foreground space-y-2">
          <UserCheck className="size-10 mx-auto text-muted-foreground/50 mb-2" />
          <h3 className="font-serif text-base font-bold text-foreground">No Producers Found</h3>
          <p>No verified producer records exist in the database.</p>
        </div>
      ) : (
        <DataTable
          data={vendors}
          columns={columns}
          searchPlaceholder="Search producer name, business or email..."
          searchKey={(v) => `${v.businessName} ${v.email}`}
          keyExtractor={(v) => v.id}
        />
      )}

      {/* Producer Profile Details Modal */}
      {selectedProd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-xl rounded-2xl border border-border bg-surface p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div>
                <h3 className="font-serif text-lg font-bold text-foreground">{selectedProd.businessName}</h3>
                <p className="text-muted-foreground">{selectedProd.email}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProd(null)}
                className="text-xs font-bold text-muted-foreground hover:text-foreground"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-border/60 bg-surface-muted/30 p-3">
                <span className="text-muted-foreground block text-[10px] uppercase font-bold">Contact Person</span>
                <span className="font-semibold text-foreground">{selectedProd.contactPerson || 'N/A'}</span>
              </div>
              <div className="rounded-lg border border-border/60 bg-surface-muted/30 p-3">
                <span className="text-muted-foreground block text-[10px] uppercase font-bold">Contact Phone</span>
                <span className="font-semibold text-foreground">{selectedProd.phone || 'N/A'}</span>
              </div>
              <div className="rounded-lg border border-border/60 bg-surface-muted/30 p-3">
                <span className="text-muted-foreground block text-[10px] uppercase font-bold">Approval Status</span>
                <span className="font-semibold text-foreground uppercase">{selectedProd.status}</span>
              </div>
              <div className="rounded-lg border border-border/60 bg-surface-muted/30 p-3">
                <span className="text-muted-foreground block text-[10px] uppercase font-bold">Account Active</span>
                <span className="font-semibold text-foreground">{selectedProd.isActive ? 'Active' : 'Disabled'}</span>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-border/60">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Vendor ID</span>
                <span className="font-mono text-[11px] text-foreground">{selectedProd.id}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Registration Date</span>
                <span className="text-foreground">{new Date(selectedProd.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
