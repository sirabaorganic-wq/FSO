'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Users, Mail, Phone, MapPin, ShoppingBag, Award, Tag } from 'lucide-react'
import { mockCustomers } from '@/data/admin/customers'
import { DataTable } from '../data-table'
import { Customer } from '@/types/admin'

export function CustomersView() {
  const [selectedCust, setSelectedCust] = useState<Customer | null>(null)

  const columns = [
    {
      key: 'customer',
      header: 'Customer',
      accessor: (c: Customer) => (
        <div className="flex items-center gap-3">
          <div className="relative size-8 rounded-full overflow-hidden border border-border shrink-0">
            <Image src={c.avatar} alt={c.name} fill className="object-cover" />
          </div>
          <div>
            <p className="font-semibold text-foreground">{c.name}</p>
            <p className="text-[10px] text-muted-foreground">{c.email}</p>
          </div>
        </div>
      ),
      sortable: true,
    },
    {
      key: 'location',
      header: 'Location',
      accessor: (c: Customer) => (
        <span className="text-xs text-muted-foreground">
          {c.city}, {c.state}
        </span>
      ),
    },
    {
      key: 'orders',
      header: 'Orders & Spend',
      accessor: (c: Customer) => (
        <div>
          <span className="font-bold text-foreground">{c.totalOrders} Orders</span>
          <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-serif font-bold">
            ₹{c.totalSpent.toLocaleString('en-IN')}
          </p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      accessor: (c: Customer) => (
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
            c.status === 'VIP'
              ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30'
              : c.status === 'Active'
              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
              : 'bg-rose-500/10 text-rose-700'
          }`}
        >
          {c.status}
        </span>
      ),
    },
    {
      key: 'joined',
      header: 'Member Since',
      accessor: (c: Customer) => <span className="text-xs text-muted-foreground">{c.joinedDate}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      accessor: (c: Customer) => (
        <button
          type="button"
          onClick={() => setSelectedCust(c)}
          className="text-[11px] font-bold text-primary hover:underline"
        >
          View Profile
        </button>
      ),
    },
  ]

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="eyebrow">Customer Directory</span>
          <h2 className="font-serif text-2xl font-bold text-foreground">Registered Customers</h2>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          <span>Total Customers: 8,950</span>
          <span>•</span>
          <span className="text-amber-600 font-bold">VIP Cohort: 420</span>
        </div>
      </div>

      <DataTable
        data={mockCustomers}
        columns={columns}
        searchPlaceholder="Search customer name, email or city..."
        searchKey={(c) => `${c.name} ${c.email} ${c.city} ${c.state}`}
        keyExtractor={(c) => c.id}
      />

      {/* Customer Profile Drawer Modal */}
      {selectedCust && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-surface p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-4 border-b border-border/60 pb-4">
              <div className="relative size-14 rounded-full overflow-hidden border border-border shrink-0">
                <Image src={selectedCust.avatar} alt={selectedCust.name} fill className="object-cover" />
              </div>
              <div>
                <h3 className="font-serif text-xl font-bold text-foreground">{selectedCust.name}</h3>
                <p className="text-xs text-muted-foreground">{selectedCust.email}</p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="rounded bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                    {selectedCust.status} Member
                  </span>
                  <span className="text-[11px] text-muted-foreground">{selectedCust.phone}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg border border-border p-3 bg-surface-muted/30">
                <p className="text-muted-foreground">Total Orders</p>
                <p className="font-serif text-lg font-bold text-foreground">{selectedCust.totalOrders}</p>
              </div>
              <div className="rounded-lg border border-border p-3 bg-surface-muted/30">
                <p className="text-muted-foreground">Lifetime Spend</p>
                <p className="font-serif text-lg font-bold text-emerald-700 dark:text-emerald-400">
                  ₹{selectedCust.totalSpent.toLocaleString('en-IN')}
                </p>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1">Customer Tags</p>
              <div className="flex flex-wrap gap-1.5">
                {selectedCust.tags.map((t) => (
                  <span key={t} className="rounded-md border border-border bg-surface-muted px-2 py-0.5 text-[10px] font-semibold text-foreground">
                    {t}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedCust(null)}
                className="rounded-lg border border-border px-4 py-2 text-xs font-bold text-foreground hover:bg-surface-muted"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
