'use client'

import { useState, useEffect } from 'react'
import { ShoppingCart, AlertCircle, RefreshCw, Eye, Truck, CheckCircle2, ChevronRight } from 'lucide-react'
import { DataTable } from '../data-table'
import {
  getAdminOrdersApi,
  updateAdminOrderStatusApi,
  type AdminOrderItem,
} from '@/lib/api/admin'

export function OrdersView() {
  const [orders, setOrders] = useState<AdminOrderItem[]>([])
  const [selectedOrder, setSelectedOrder] = useState<AdminOrderItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionNotice, setActionNotice] = useState<string | null>(null)

  const loadOrders = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getAdminOrdersApi()
      setOrders(data || [])
    } catch (err: unknown) {
      console.error('Failed to load orders:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch order records')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOrders()
  }, [])

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    try {
      setActionLoading(true)
      await updateAdminOrderStatusApi(orderId, newStatus)
      setActionNotice(`Order status updated to ${newStatus}`)
      await loadOrders()
      if (selectedOrder?.id === orderId) {
        setSelectedOrder((prev) => (prev ? { ...prev, status: newStatus } : null))
      }
    } catch (err: unknown) {
      console.error('Status update failed:', err)
      setActionNotice(err instanceof Error ? err.message : 'Failed to update order status')
    } finally {
      setActionLoading(false)
    }
  }

  const columns = [
    {
      key: 'orderNumber',
      header: 'Order Ref & Date',
      accessor: (o: AdminOrderItem) => (
        <div>
          <span className="font-semibold text-foreground">{o.orderNumber}</span>
          <p className="text-[10px] text-muted-foreground">
            {o.createdAt ? new Date(o.createdAt).toLocaleDateString() : 'N/A'}
          </p>
        </div>
      ),
      sortable: true,
    },
    {
      key: 'customer',
      header: 'Customer',
      accessor: (o: AdminOrderItem) => (
        <div>
          <span className="font-medium text-foreground">{o.user?.name || 'Customer'}</span>
          <p className="text-[10px] text-muted-foreground">{o.user?.email || 'N/A'}</p>
        </div>
      ),
      sortable: true,
    },
    {
      key: 'amount',
      header: 'Total & Payment',
      accessor: (o: AdminOrderItem) => (
        <div>
          <span className="font-serif font-bold text-foreground">₹{o.totalPrice}</span>
          <p className="text-[10px] text-muted-foreground font-semibold">
            {o.paymentMethod} ({o.isPaid ? 'PAID' : 'PENDING'})
          </p>
        </div>
      ),
      sortable: true,
    },
    {
      key: 'status',
      header: 'Order Status',
      accessor: (o: AdminOrderItem) => {
        const st = (o.status || '').toUpperCase()
        return (
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              st === 'DELIVERED'
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                : st === 'PROCESSING' || st === 'CONFIRMED'
                ? 'bg-amber-500/10 text-amber-700'
                : st === 'SHIPPED'
                ? 'bg-indigo-500/10 text-indigo-700'
                : 'bg-rose-500/10 text-rose-700'
            }`}
          >
            {st}
          </span>
        )
      },
      sortable: true,
    },
    {
      key: 'actions',
      header: 'Actions',
      accessor: (o: AdminOrderItem) => (
        <button
          type="button"
          onClick={() => setSelectedOrder(o)}
          className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1"
        >
          <Eye className="size-3" /> Inspect
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
          onClick={loadOrders}
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
          <span className="eyebrow">Logistics & Sales Operations</span>
          <h2 className="font-serif text-2xl font-bold text-foreground">Order Management</h2>
        </div>
        <div className="text-xs text-muted-foreground font-semibold">
          Total Orders: {orders.length}
        </div>
      </div>

      {actionNotice && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs font-semibold text-primary flex items-center justify-between">
          <span>{actionNotice}</span>
          <button type="button" onClick={() => setActionNotice(null)} className="underline ml-2">
            Dismiss
          </button>
        </div>
      )}

      {orders.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-12 text-center text-xs text-muted-foreground space-y-2">
          <ShoppingCart className="size-10 mx-auto text-muted-foreground/50 mb-2" />
          <h3 className="font-serif text-base font-bold text-foreground">No Orders Recorded</h3>
          <p>There are currently zero orders in the database. Customer checkouts and multi-vendor fulfillment operations will be tracked live here.</p>
        </div>
      ) : (
        <DataTable
          data={orders}
          columns={columns}
          searchKey={(o) => `${o.orderNumber || o.id} ${o.user?.name || ''}`}
          keyExtractor={(o) => o.id}
          searchPlaceholder="Search by order number or customer..."
        />
      )}

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-2xl rounded-xl border border-border bg-surface p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div>
                <h3 className="font-serif text-lg font-bold text-foreground">Order #{selectedOrder.orderNumber}</h3>
                <p className="text-muted-foreground">Placed on {new Date(selectedOrder.createdAt).toLocaleString()}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="text-xs font-bold text-muted-foreground hover:text-foreground"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border border-border/60 bg-surface-muted/30 p-3">
                <span className="text-muted-foreground block text-[10px] uppercase font-bold">Total Amount</span>
                <span className="font-serif text-lg font-bold text-foreground">₹{selectedOrder.totalPrice}</span>
              </div>
              <div className="rounded-lg border border-border/60 bg-surface-muted/30 p-3">
                <span className="text-muted-foreground block text-[10px] uppercase font-bold">Payment</span>
                <span className="font-semibold text-foreground">{selectedOrder.isPaid ? 'PAID' : 'UNPAID'} ({selectedOrder.paymentMethod})</span>
              </div>
              <div className="rounded-lg border border-border/60 bg-surface-muted/30 p-3">
                <span className="text-muted-foreground block text-[10px] uppercase font-bold">Status</span>
                <span className="font-semibold text-foreground uppercase">{selectedOrder.status}</span>
              </div>
            </div>

            {/* Multi-Vendor Order Breakdown */}
            <div className="space-y-2 pt-2 border-t border-border/60">
              <h4 className="font-serif font-bold text-foreground">Vendor Sub-Orders & Fulfillment</h4>
              {(!selectedOrder.vendorOrders || selectedOrder.vendorOrders.length === 0) ? (
                <p className="text-muted-foreground">Direct fulfillment (No split vendor orders).</p>
              ) : (
                <div className="space-y-2">
                  {selectedOrder.vendorOrders.map((vo) => (
                    <div key={vo.id} className="rounded-lg border border-border/60 p-3 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-foreground">{vo.vendor?.businessName || 'Vendor'}</p>
                        <p className="text-[10px] text-muted-foreground">Ref: {vo.vendorOrderNumber} • Status: {vo.status}</p>
                        {vo.awbCode && (
                          <p className="text-[10px] text-primary font-mono">AWB: {vo.awbCode} ({vo.courierName})</p>
                        )}
                      </div>
                      <span className="font-serif font-bold text-foreground">₹{vo.subtotal}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Line Items */}
            <div className="space-y-2 pt-2 border-t border-border/60">
              <h4 className="font-serif font-bold text-foreground">Purchased Items</h4>
              {(!selectedOrder.orderItems || selectedOrder.orderItems.length === 0) ? (
                <p className="text-muted-foreground">No item lines recorded.</p>
              ) : (
                <div className="space-y-1.5">
                  {selectedOrder.orderItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between py-1 border-b border-border/40 last:border-none">
                      <div>
                        <p className="font-semibold text-foreground">{item.name}</p>
                        <p className="text-[10px] text-muted-foreground">Qty: {item.quantity} × ₹{item.price}</p>
                      </div>
                      <span className="font-serif font-bold text-foreground">₹{item.quantity * item.price}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Administrative Status Override */}
            <div className="pt-2 border-t border-border/60 flex items-center justify-between">
              <span className="font-semibold text-foreground">Administrative Status:</span>
              <div className="flex items-center gap-2">
                {['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'].map((st) => (
                  <button
                    key={st}
                    type="button"
                    disabled={actionLoading || selectedOrder.status === st}
                    onClick={() => handleUpdateStatus(selectedOrder.id, st)}
                    className="rounded border border-border px-2 py-1 text-[10px] font-bold text-foreground hover:bg-surface-muted disabled:opacity-40"
                  >
                    Set {st}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
