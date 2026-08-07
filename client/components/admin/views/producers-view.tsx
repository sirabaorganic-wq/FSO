'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { UserCheck, Star, MapPin, CheckCircle2, AlertCircle, FileText, ShoppingBag } from 'lucide-react'
import { mockProducers } from '@/data/admin/producers'
import { DataTable } from '../data-table'
import { Producer } from '@/types/admin'

export function ProducersView() {
  const [selectedProd, setSelectedProd] = useState<Producer | null>(null)

  const columns = [
    {
      key: 'producer',
      header: 'Producer & Business',
      accessor: (p: Producer) => (
        <div className="flex items-center gap-3">
          <div className="relative size-10 rounded-lg overflow-hidden border border-border shrink-0">
            <Image src={p.avatar} alt={p.name} fill className="object-cover" />
          </div>
          <div>
            <p className="font-semibold text-foreground">{p.businessName}</p>
            <p className="text-[10px] text-muted-foreground">Master Artisan: {p.name}</p>
          </div>
        </div>
      ),
      sortable: true,
    },
    {
      key: 'location',
      header: 'Region & Category',
      accessor: (p: Producer) => (
        <div>
          <span className="text-xs font-semibold text-foreground">{p.category}</span>
          <p className="text-[10px] text-muted-foreground">{p.city}, {p.state}</p>
        </div>
      ),
    },
    {
      key: 'metrics',
      header: 'Performance',
      accessor: (p: Producer) => (
        <div>
          <span className="font-serif font-bold text-emerald-700 dark:text-emerald-400">
            ₹{p.totalSales.toLocaleString('en-IN')}
          </span>
          <p className="text-[10px] text-muted-foreground">{p.productsCount} Products Listed</p>
        </div>
      ),
    },
    {
      key: 'rating',
      header: 'Rating',
      accessor: (p: Producer) => (
        <div className="flex items-center gap-1 font-bold text-amber-600 text-xs">
          <Star className="size-3.5 fill-amber-500 text-amber-500" />
          <span>{p.rating}</span>
        </div>
      ),
    },
    {
      key: 'verification',
      header: 'Status',
      accessor: (p: Producer) => (
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
            p.verificationStatus === 'Verified'
              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
              : 'bg-amber-500/10 text-amber-700'
          }`}
        >
          <CheckCircle2 className="size-3" />
          {p.verificationStatus}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      accessor: (p: Producer) => (
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
          <span>View Pending Approvals (2)</span>
        </Link>
      </div>

      <DataTable
        data={mockProducers}
        columns={columns}
        searchPlaceholder="Search producer name, business or state..."
        searchKey={(p) => `${p.name} ${p.businessName} ${p.state} ${p.category}`}
        keyExtractor={(p) => p.id}
      />

      {/* Producer Profile Details Modal */}
      {selectedProd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-xl rounded-2xl border border-border bg-surface p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-4 border-b border-border/60 pb-4">
              <div className="relative size-14 rounded-lg overflow-hidden border border-border shrink-0">
                <Image src={selectedProd.avatar} alt={selectedProd.name} fill className="object-cover" />
              </div>
              <div>
                <h3 className="font-serif text-xl font-bold text-foreground">{selectedProd.businessName}</h3>
                <p className="text-xs text-muted-foreground">Founder: {selectedProd.name} • {selectedProd.city}, {selectedProd.state}</p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                    {selectedProd.verificationStatus}
                  </span>
                  <span className="text-[11px] text-muted-foreground">{selectedProd.email}</span>
                </div>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1">Craft Story</p>
              <p className="text-xs italic text-foreground leading-relaxed bg-surface-muted/30 p-3 rounded-lg border border-border/60">
                &quot;{selectedProd.storyExcerpt}&quot;
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">Compliance Documents ({selectedProd.documents.length})</p>
              <div className="space-y-1.5">
                {selectedProd.documents.map((doc, idx) => (
                  <div key={idx} className="flex items-center justify-between rounded-lg border border-border p-2.5 text-xs bg-background/60">
                    <div className="flex items-center gap-2">
                      <FileText className="size-4 text-primary" />
                      <span className="font-medium text-foreground">{doc.title}</span>
                    </div>
                    <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                      {doc.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedProd(null)}
                className="rounded-lg border border-border px-4 py-2 text-xs font-bold text-foreground hover:bg-surface-muted"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
