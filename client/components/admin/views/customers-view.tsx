'use client'

import { useState, useEffect } from 'react'
import { Users, Mail, Phone, ShoppingBag, CheckCircle2, XCircle, AlertCircle, RefreshCw } from 'lucide-react'
import { DataTable } from '../data-table'
import { getAdminUsersApi, type AdminUserItem } from '@/lib/api/admin'

export function CustomersView() {
  const [customers, setCustomers] = useState<AdminUserItem[]>([])
  const [selectedCust, setSelectedCust] = useState<AdminUserItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadCustomers = async () => {
    try {
      setLoading(true)
      setError(null)
      const users = await getAdminUsersApi()
      const custs = (users || []).filter((u) => (u.role || '').toLowerCase() === 'customer')
      setCustomers(custs)
    } catch (err: unknown) {
      console.error('Failed to load customers:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch customer directory')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCustomers()
  }, [])

  const columns = [
    {
      key: 'customer',
      header: 'Customer',
      accessor: (c: AdminUserItem) => (
        <div>
          <p className="font-semibold text-foreground">{c.name}</p>
          <p className="text-[10px] text-muted-foreground">{c.email}</p>
        </div>
      ),
      sortable: true,
    },
    {
      key: 'orders',
      header: 'Total Orders',
      accessor: (c: AdminUserItem) => (
        <span className="font-semibold text-foreground">{c.totalOrders || 0} Orders</span>
      ),
      sortable: true,
    },
    {
      key: 'status',
      header: 'Account Status',
      accessor: (c: AdminUserItem) => (
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
            !c.isBlocked
              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
              : 'bg-rose-500/10 text-rose-700'
          }`}
        >
          {!c.isBlocked ? <CheckCircle2 className="size-3" /> : <XCircle className="size-3" />}
          {!c.isBlocked ? 'Active' : 'Blocked'}
        </span>
      ),
    },
    {
      key: 'joined',
      header: 'Registered Date',
      accessor: (c: AdminUserItem) => (
        <span className="text-xs text-muted-foreground">
          {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : 'N/A'}
        </span>
      ),
      sortable: true,
    },
    {
      key: 'actions',
      header: 'Actions',
      accessor: (c: AdminUserItem) => (
        <button
          type="button"
          onClick={() => setSelectedCust(c)}
          className="text-[11px] font-bold text-primary hover:underline"
        >
          View Details
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
          onClick={loadCustomers}
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
          <span className="eyebrow">Customer Directory</span>
          <h2 className="font-serif text-2xl font-bold text-foreground">Registered Customers</h2>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          <span>Total Customers: {customers.length}</span>
        </div>
      </div>

      {customers.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-12 text-center text-xs text-muted-foreground space-y-2">
          <Users className="size-10 mx-auto text-muted-foreground/50 mb-2" />
          <h3 className="font-serif text-base font-bold text-foreground">No Registered Customers</h3>
          <p>As patrons register and place orders on Flash Sales Online, their records will appear here.</p>
        </div>
      ) : (
        <DataTable
          data={customers}
          columns={columns}
          searchKey={(u) => `${u.name} ${u.email}`}
          keyExtractor={(u) => u.id}
          searchPlaceholder="Filter customers by email..."
        />
      )}

      {/* Customer Detail Drawer / Modal */}
      {selectedCust && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-xl border border-border bg-surface p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div>
                <h3 className="font-serif text-lg font-bold text-foreground">{selectedCust.name}</h3>
                <p className="text-muted-foreground">{selectedCust.email}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCust(null)}
                className="text-xs font-bold text-muted-foreground hover:text-foreground"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-border/60 bg-surface-muted/30 p-3">
                <span className="text-muted-foreground block text-[10px] uppercase font-bold">Total Orders</span>
                <span className="font-serif text-lg font-bold text-foreground">{selectedCust.totalOrders || 0}</span>
              </div>
              <div className="rounded-lg border border-border/60 bg-surface-muted/30 p-3">
                <span className="text-muted-foreground block text-[10px] uppercase font-bold">Account Role</span>
                <span className="font-semibold text-foreground uppercase">{selectedCust.role}</span>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-border/60">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">User ID</span>
                <span className="font-mono text-[11px] text-foreground">{selectedCust.id}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Account State</span>
                <span className="font-semibold text-foreground">{selectedCust.isBlocked ? 'Blocked' : 'Active'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Registered Date</span>
                <span className="text-foreground">{new Date(selectedCust.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Last Login</span>
                <span className="text-foreground">
                  {selectedCust.lastLogin ? new Date(selectedCust.lastLogin).toLocaleString() : 'Never logged in'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
