'use client'

import { Activity, Clock, Shield, Search } from 'lucide-react'
import { mockActivityLogs } from '@/data/admin/analytics'
import { DataTable } from '../data-table'
import { ActivityLog } from '@/types/admin'

export function ActivityView() {
  const columns = [
    {
      key: 'timestamp',
      header: 'Timestamp',
      accessor: (a: ActivityLog) => <span className="font-mono text-[11px] text-muted-foreground">{a.timestamp}</span>,
      sortable: true,
    },
    {
      key: 'actor',
      header: 'Actor & Role',
      accessor: (a: ActivityLog) => (
        <div>
          <span className="font-semibold text-foreground">{a.actor}</span>
          <p className="text-[10px] text-muted-foreground">{a.actorRole}</p>
        </div>
      ),
    },
    {
      key: 'action',
      header: 'Action & Target',
      accessor: (a: ActivityLog) => (
        <div>
          <span className="font-bold text-foreground">{a.action}</span>
          <p className="text-[10px] text-muted-foreground">{a.target}</p>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      accessor: (a: ActivityLog) => (
        <span className="rounded bg-surface-muted px-2 py-0.5 text-[10px] font-bold text-foreground">
          {a.category}
        </span>
      ),
    },
    {
      key: 'ip',
      header: 'IP Address',
      accessor: (a: ActivityLog) => <span className="font-mono text-xs text-muted-foreground">{a.ipAddress}</span>,
    },
    {
      key: 'severity',
      header: 'Severity',
      accessor: (a: ActivityLog) => (
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
            a.severity === 'Info'
              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
              : a.severity === 'Warning'
              ? 'bg-amber-500/10 text-amber-700'
              : 'bg-rose-500/10 text-rose-700'
          }`}
        >
          {a.severity}
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="eyebrow">Audit Trail</span>
          <h2 className="font-serif text-2xl font-bold text-foreground">System Audit Logs</h2>
        </div>
      </div>

      <DataTable
        data={mockActivityLogs}
        columns={columns}
        searchPlaceholder="Search action, actor name or IP address..."
        searchKey={(a) => `${a.actor} ${a.action} ${a.target} ${a.ipAddress}`}
        keyExtractor={(a) => a.id}
      />
    </div>
  )
}
