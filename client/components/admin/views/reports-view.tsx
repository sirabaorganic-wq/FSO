'use client'

import { useState } from 'react'
import { BarChart3, Download, FileText, CheckCircle2, AlertCircle } from 'lucide-react'
import { getAdminOrdersApi } from '@/lib/api/admin'

export function ReportsView() {
  const [downloading, setDownloading] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const handleExportOrdersCSV = async () => {
    try {
      setDownloading(true)
      const orders = await getAdminOrdersApi()
      if (!orders || orders.length === 0) {
        setNotice('No orders found in database to export.')
        return
      }

      // Generate real CSV from database orders
      const headers = ['Order ID', 'Order Number', 'Date', 'Customer', 'Email', 'Amount', 'Payment Status', 'Fulfillment Status']
      const rows = orders.map((o) => [
        o.id,
        o.orderNumber || o.id,
        o.createdAt,
        o.user?.name || 'Guest',
        o.user?.email || 'N/A',
        o.totalPrice || 0,
        o.isPaid ? 'PAID' : 'PENDING',
        o.status,
      ])

      const csvContent = [headers.join(','), ...rows.map((r) => r.map((cell) => `"${cell}"`).join(','))].join('\n')
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.setAttribute('href', url)
      link.setAttribute('download', `orders-export-${Date.now()}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      setNotice('Orders CSV exported successfully from database.')
    } catch (err: unknown) {
      console.error('Export failed:', err)
      setNotice('Export failed: ' + (err instanceof Error ? err.message : 'Unknown error'))
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="eyebrow">Financial & Audit Exports</span>
          <h2 className="font-serif text-2xl font-bold text-foreground">Marketplace Reports Generator</h2>
        </div>
      </div>

      {notice && (
        <div className="rounded-xl border border-primary/30 bg-primary/10 p-4 text-xs font-semibold text-foreground flex items-center gap-2">
          <CheckCircle2 className="size-4 text-primary shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Real Dynamic Export */}
        <div className="rounded-xl border border-border bg-surface p-5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase">
              Live Database • CSV
            </span>
            <h3 className="font-serif text-base font-bold text-foreground">Orders & Transaction Register</h3>
            <p className="text-[11px] text-muted-foreground">Exports live orders, fulfillment status, and customer totals.</p>
          </div>
          <button
            type="button"
            onClick={handleExportOrdersCSV}
            disabled={downloading}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-bold text-foreground hover:bg-surface-muted transition-colors shadow-2xs shrink-0 disabled:opacity-50"
          >
            <Download className="size-3.5" /> {downloading ? 'Exporting...' : 'Export CSV'}
          </button>
        </div>

        {/* GST Audit Log */}
        <div className="rounded-xl border border-border bg-surface p-5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="rounded bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary uppercase">
              Tax Compliance • JSON/PDF
            </span>
            <h3 className="font-serif text-base font-bold text-foreground">GST Monthly Compliance Filing</h3>
            <p className="text-[11px] text-muted-foreground">B2C and B2B GST tax slab audit records.</p>
          </div>
          <a
            href="/api/v1/gst/status"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-bold text-foreground hover:bg-surface-muted transition-colors shadow-2xs shrink-0"
          >
            <Download className="size-3.5" /> View GST Feed
          </a>
        </div>
      </div>
    </div>
  )
}
