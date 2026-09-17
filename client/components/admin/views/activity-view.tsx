'use client'

import { useState, useEffect } from 'react'
import { Activity, Clock, Shield, Search, RefreshCw, AlertCircle } from 'lucide-react'
import { getAdminRefundLogsApi, type AdminRefundLogItem } from '@/lib/api/admin'
import { DataTable } from '../data-table'

export function ActivityView() {
  const [logs, setLogs] = useState<AdminRefundLogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadLogs = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getAdminRefundLogsApi()
      setLogs(Array.isArray(data) ? data : [])
    } catch (err: unknown) {
      console.error('Failed to load audit logs:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch audit logs')
      setLogs([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLogs()
  }, [])

  const columns = [
    {
      key: 'createdAt',
      header: 'Timestamp',
      accessor: (a: AdminRefundLogItem) => (
        <span className="font-mono text-[11px] text-muted-foreground">
          {new Date(a.createdAt).toLocaleDateString('en-IN', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      ),
      sortable: true,
    },
    {
      key: 'order',
      header: 'Order & Customer',
      accessor: (a: AdminRefundLogItem) => (
        <div>
          <span className="font-bold text-foreground">
            {a.order?.orderNumber || a.orderId}
          </span>
          <p className="text-[10px] text-muted-foreground">
            {a.order?.user?.name || a.order?.user?.email || 'Customer'}
          </p>
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      accessor: (a: AdminRefundLogItem) => (
        <span className="font-semibold text-foreground">₹{a.amount}</span>
      ),
    },
    {
      key: 'reason',
      header: 'Reason / Details',
      accessor: (a: AdminRefundLogItem) => (
        <div>
          <p className="text-xs text-foreground">{a.reason || 'Financial transaction / refund log'}</p>
          {a.razorpayRefundId && (
            <p className="text-[10px] font-mono text-muted-foreground">Rzp: {a.razorpayRefundId}</p>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      accessor: (a: AdminRefundLogItem) => (
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
            a.status === 'PROCESSED' || a.status === 'COMPLETED'
              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
              : a.status === 'PENDING'
              ? 'bg-amber-500/10 text-amber-700'
              : 'bg-rose-500/10 text-rose-700'
          }`}
        >
          {a.status}
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="eyebrow">Audit Trail</span>
          <h2 className="font-serif text-2xl font-bold text-foreground">System & Transaction Audit Logs</h2>
        </div>
        <button
          type="button"
          onClick={loadLogs}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-surface-muted transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
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
          Loading audit logs from database...
        </div>
      ) : (
        <DataTable
          data={logs}
          columns={columns}
          searchPlaceholder="Search order ID, reason, or status..."
          searchKey={(a) => `${a.orderId} ${a.reason || ''} ${a.status}`}
          keyExtractor={(a) => a.id}
        />
      )}
    </div>
  )
}
