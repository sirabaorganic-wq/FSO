'use client'

import { useState } from 'react'
import { BarChart3, Download, FileText, Calendar } from 'lucide-react'
import { mockReports } from '@/data/admin/analytics'

export function ReportsView() {
  const [downloadNotice, setDownloadNotice] = useState<string | null>(null)

  const handleDownload = (title: string) => {
    setDownloadNotice(title)
    setTimeout(() => setDownloadNotice(null), 3000)
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="eyebrow">Financial & Audit Exports</span>
          <h2 className="font-serif text-2xl font-bold text-foreground">Marketplace Reports Generator</h2>
        </div>
      </div>

      {downloadNotice && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs font-bold text-emerald-700 dark:text-emerald-400 animate-in fade-in">
          ✓ Exporting &quot;{downloadNotice}&quot; (CSV/PDF)... Download started!
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {mockReports.map((rep) => (
          <div key={rep.id} className="rounded-xl border border-border bg-surface p-5 shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <span className="rounded bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary uppercase">
                {rep.category} • {rep.format}
              </span>
              <h3 className="font-serif text-base font-bold text-foreground">{rep.title}</h3>
              <p className="text-[11px] text-muted-foreground">Generated: {rep.generatedAt} ({rep.fileSize})</p>
            </div>
            <button
              type="button"
              onClick={() => handleDownload(rep.title)}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-bold text-foreground hover:bg-surface-muted transition-colors shadow-2xs shrink-0"
            >
              <Download className="size-3.5" /> Download
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
