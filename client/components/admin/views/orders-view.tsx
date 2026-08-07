'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ShoppingCart, Clock, Truck, RotateCcw, FileText, CheckCircle2, AlertCircle } from 'lucide-react'
import { mockAdminOrders } from '@/data/admin/orders'
import { DataTable } from '../data-table'
import { AdminOrder } from '@/types/admin'

export function OrdersView() {
  const [orders, setOrders] = useState<AdminOrder[]>(mockAdminOrders)
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null)
  const [invoiceModalOrder, setInvoiceModalOrder] = useState<AdminOrder | null>(null)

  const columns = [
    {
      key: 'orderNumber',
      header: 'Order Ref & Date',
      accessor: (o: AdminOrder) => (
        <div>
          <span className="font-semibold text-foreground">{o.orderNumber}</span>
          <p className="text-[10px] text-muted-foreground">{o.date}</p>
        </div>
      ),
      sortable: true,
    },
    {
      key: 'customer',
      header: 'Customer Details',
      accessor: (o: AdminOrder) => (
        <div>
          <span className="font-medium text-foreground">{o.customerName}</span>
          <p className="text-[10px] text-muted-foreground">{o.customerPhone}</p>
        </div>
      ),
    },
    {
      key: 'producer',
      header: 'Fulfilling Producer',
      accessor: (o: AdminOrder) => <span className="text-xs text-muted-foreground">{o.producerName}</span>,
    },
    {
      key: 'amount',
      header: 'Total & Payment',
      accessor: (o: AdminOrder) => (
        <div>
          <span className="font-serif font-bold text-foreground">₹{o.totalAmount}</span>
          <p className="text-[10px] text-muted-foreground font-semibold">{o.paymentMethod} ({o.paymentStatus})</p>
        </div>
      ),
      sortable: true,
    },
    {
      key: 'status',
      header: 'Fulfillment Status',
      accessor: (o: AdminOrder) => (
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
            o.status === 'Delivered'
              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
              : o.status === 'Processing'
              ? 'bg-amber-500/10 text-amber-700'
              : o.status === 'Shipped'
              ? 'bg-indigo-500/10 text-indigo-700'
              : 'bg-rose-500/10 text-rose-700'
          }`}
        >
          {o.status}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      accessor: (o: AdminOrder) => (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSelectedOrder(o)}
            className="text-[11px] font-bold text-primary hover:underline"
          >
            Timeline
          </button>
          <button
            type="button"
            onClick={() => setInvoiceModalOrder(o)}
            className="text-[11px] font-bold text-secondary hover:underline"
          >
            Invoice
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="eyebrow">Logistics & Sales</span>
          <h2 className="font-serif text-2xl font-bold text-foreground">Order Management</h2>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          <span>Active Orders: 3,240</span>
          <span>•</span>
          <span className="text-emerald-700 font-bold">98.2% On-Time Delivery</span>
        </div>
      </div>

      <DataTable
        data={orders}
        columns={columns}
        searchPlaceholder="Search order ref, customer name or producer..."
        searchKey={(o) => `${o.orderNumber} ${o.customerName} ${o.producerName}`}
        keyExtractor={(o) => o.id}
      />

      {/* Order Timeline Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-surface p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div>
                <h3 className="font-serif text-xl font-bold text-foreground">{selectedOrder.orderNumber}</h3>
                <p className="text-xs text-muted-foreground">Placed on {selectedOrder.date}</p>
              </div>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                {selectedOrder.status}
              </span>
            </div>

            {/* Items Purchased */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">Order Items ({selectedOrder.items.length})</p>
              {selectedOrder.items.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between rounded-lg border border-border p-2 text-xs bg-surface-muted/20">
                  <div className="flex items-center gap-2">
                    <div className="relative size-8 rounded border border-border overflow-hidden shrink-0">
                      <Image src={item.image} alt={item.productName} fill className="object-cover" />
                    </div>
                    <span className="font-semibold text-foreground">{item.productName}</span>
                  </div>
                  <span className="font-bold text-foreground">
                    {item.quantity}x ₹{item.price}
                  </span>
                </div>
              ))}
            </div>

            {/* Shipping Address */}
            <div className="rounded-lg border border-border/80 p-3 text-xs bg-background/50 space-y-1">
              <p className="font-semibold text-foreground">Delivery Address</p>
              <p className="text-muted-foreground">{selectedOrder.shippingAddress}</p>
              {selectedOrder.trackingNumber && (
                <p className="text-[11px] font-bold text-secondary mt-1">
                  Carrier: {selectedOrder.carrier} • Tracking #{selectedOrder.trackingNumber}
                </p>
              )}
            </div>

            {/* Timeline */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">Fulfillment Activity History</p>
              <div className="space-y-3 border-l-2 border-primary/30 pl-3">
                {selectedOrder.timeline.map((step, idx) => (
                  <div key={idx} className="space-y-0.5">
                    <p className="text-xs font-bold text-foreground">{step.title} <span className="text-[10px] font-normal text-muted-foreground">({step.time})</span></p>
                    <p className="text-[11px] text-muted-foreground">{step.description}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="rounded-lg border border-border px-4 py-2 text-xs font-bold text-foreground hover:bg-surface-muted"
              >
                Close Timeline
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Modal Simulation */}
      {invoiceModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div>
                <p className="eyebrow">Tax Invoice</p>
                <h3 className="font-serif text-xl font-bold text-foreground">Invoice #{invoiceModalOrder.orderNumber}</h3>
              </div>
              <FileText className="size-6 text-primary" />
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Customer:</span>
                <span className="font-semibold text-foreground">{invoiceModalOrder.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">GST Status:</span>
                <span className="font-semibold text-emerald-600">5% GST Included</span>
              </div>
              <div className="flex justify-between font-bold border-t border-border pt-2 text-sm">
                <span>Total Amount Billed:</span>
                <span className="font-serif text-primary">₹{invoiceModalOrder.totalAmount}</span>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setInvoiceModalOrder(null)}
                className="rounded-lg border border-border px-4 py-2 text-xs font-bold text-muted-foreground hover:bg-surface-muted"
              >
                Close Preview
              </button>
              <button
                type="button"
                onClick={() => alert('Tax Invoice PDF downloaded successfully.')}
                className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90"
              >
                Download PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
