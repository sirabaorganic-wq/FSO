'use client'

import { useState } from 'react'
import { UserCog, CheckCircle, XCircle, FileText, Calendar, ShieldAlert, AlertCircle, Sparkles } from 'lucide-react'
import { mockProducerApprovals } from '@/data/admin/producers'
import { ProducerApprovalItem } from '@/types/admin'

export function ProducerApprovalsView() {
  const [queue, setQueue] = useState<ProducerApprovalItem[]>(mockProducerApprovals)
  const [selectedItem, setSelectedItem] = useState<ProducerApprovalItem | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')

  const handleApprove = (id: string) => {
    setQueue(queue.map((item) => (item.id === id ? { ...item, status: 'Approved' } : item)))
    if (selectedItem?.id === id) {
      setSelectedItem(null)
    }
  }

  const handleReject = (id: string) => {
    setQueue(queue.map((item) => (item.id === id ? { ...item, status: 'Rejected' } : item)))
    if (selectedItem?.id === id) {
      setSelectedItem(null)
    }
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
            {queue.filter((q) => q.status !== 'Approved' && q.status !== 'Rejected').length} Applications Pending
          </span>
        </div>
      </div>

      {/* Cards Queue */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {queue.map((item) => (
          <div
            key={item.id}
            className={`rounded-xl border p-5 transition-all shadow-2xs ${
              item.status === 'Approved'
                ? 'border-emerald-500/30 bg-emerald-500/5'
                : item.status === 'Rejected'
                ? 'border-rose-500/30 bg-rose-500/5'
                : 'border-border bg-surface'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-secondary">
                  {item.state} • {item.craftType}
                </span>
                <h3 className="font-serif text-lg font-bold text-foreground mt-0.5">{item.businessName}</h3>
                <p className="text-xs text-muted-foreground">Applicant: {item.applicantName}</p>
              </div>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                  item.status === 'Approved'
                    ? 'bg-emerald-500 text-white'
                    : item.status === 'Rejected'
                    ? 'bg-rose-500 text-white'
                    : 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                }`}
              >
                {item.status}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 text-[11px] border-y border-border/60 py-3 my-3">
              <div>
                <span className="text-muted-foreground block">Submitted</span>
                <span className="font-semibold text-foreground">{item.submittedAt}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Documents</span>
                <span className="font-semibold text-foreground">{item.documentsCount} Files</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Risk Grade</span>
                <span className="font-bold text-emerald-700 dark:text-emerald-400">{item.riskLevel}</span>
              </div>
            </div>

            {item.notes && <p className="text-xs text-muted-foreground italic mb-4">&quot;{item.notes}&quot;</p>}

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => setSelectedItem(item)}
                className="text-xs font-bold text-primary hover:underline"
              >
                Inspect Documents & Compliance →
              </button>
              {item.status !== 'Approved' && item.status !== 'Rejected' && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleReject(item.id)}
                    className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-1 text-xs font-bold text-rose-700 hover:bg-rose-500 hover:text-white transition-colors"
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApprove(item.id)}
                    className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-bold text-white hover:bg-emerald-700 transition-colors shadow-xs"
                  >
                    Approve
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Inspector Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-surface p-6 shadow-2xl space-y-4">
            <div className="border-b border-border/60 pb-3">
              <span className="eyebrow">Document Audit</span>
              <h3 className="font-serif text-xl font-bold text-foreground">{selectedItem.businessName}</h3>
              <p className="text-xs text-muted-foreground">Submitted by {selectedItem.applicantName} ({selectedItem.state})</p>
            </div>

            <div className="space-y-2 text-xs">
              <div className="rounded-lg border border-border p-3 bg-surface-muted/30">
                <p className="font-semibold text-foreground mb-1">Uploaded Certificates & Lab Reports</p>
                <ul className="space-y-1.5 text-muted-foreground">
                  <li className="flex items-center justify-between">
                    <span>1. FSSAI Food Safety Manufacturing License</span>
                    <span className="font-bold text-emerald-600">✓ Verified</span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span>2. Heavy Metal & Pesticide Residue Analysis</span>
                    <span className="font-bold text-emerald-600">✓ Verified</span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span>3. Bank Account & GST Registration</span>
                    <span className="font-bold text-emerald-600">✓ Verified</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="rounded-lg border border-border px-4 py-2 text-xs font-bold text-muted-foreground hover:bg-surface-muted"
              >
                Close
              </button>
              {selectedItem.status !== 'Approved' && (
                <button
                  type="button"
                  onClick={() => handleApprove(selectedItem.id)}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700"
                >
                  Approve Producer
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
