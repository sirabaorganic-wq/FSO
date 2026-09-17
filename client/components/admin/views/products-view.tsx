'use client'

import { useState, useEffect } from 'react'
import { ShoppingBag, Star, Trash2, AlertTriangle, AlertCircle, RefreshCw, Eye } from 'lucide-react'
import { DataTable } from '../data-table'
import {
  getAdminProductsApi,
  deleteAdminProductApi,
  type AdminProductItem,
} from '@/lib/api/admin'

export function ProductsView() {
  const [products, setProducts] = useState<AdminProductItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionNotice, setActionNotice] = useState<string | null>(null)

  const loadProducts = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getAdminProductsApi()
      setProducts(data?.products || [])
    } catch (err: unknown) {
      console.error('Failed to load products:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch product catalog')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProducts()
  }, [])

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product listing? This action cannot be undone.')) return
    try {
      setActionLoading(true)
      await deleteAdminProductApi(id)
      setActionNotice('Product deleted successfully.')
      await loadProducts()
    } catch (err: unknown) {
      console.error('Delete failed:', err)
      setActionNotice(err instanceof Error ? err.message : 'Failed to delete product')
    } finally {
      setActionLoading(false)
    }
  }

  const columns = [
    {
      key: 'product',
      header: 'Product Item',
      accessor: (p: AdminProductItem) => (
        <div>
          <p className="font-semibold text-foreground leading-tight">{p.name}</p>
          <p className="text-[10px] text-muted-foreground">
            Producer: {p.vendor?.businessName || 'Platform Direct'} • SKU: {p.sku || 'N/A'}
          </p>
        </div>
      ),
      sortable: true,
    },
    {
      key: 'category',
      header: 'Category',
      accessor: (p: AdminProductItem) => <span className="text-xs text-muted-foreground">{p.category}</span>,
      sortable: true,
    },
    {
      key: 'price',
      header: 'Listing Price',
      accessor: (p: AdminProductItem) => (
        <span className="font-serif font-bold text-foreground">₹{p.price}</span>
      ),
      sortable: true,
    },
    {
      key: 'stock',
      header: 'Stock Level',
      accessor: (p: AdminProductItem) => (
        <span
          className={`inline-flex items-center gap-1 font-bold text-xs ${
            p.stockQuantity === 0
              ? 'text-rose-600'
              : p.stockQuantity < 20
              ? 'text-amber-600'
              : 'text-emerald-700 dark:text-emerald-400'
          }`}
        >
          {p.stockQuantity === 0 ? <AlertTriangle className="size-3.5" /> : null}
          {p.stockQuantity} units
        </span>
      ),
      sortable: true,
    },
    {
      key: 'status',
      header: 'Status',
      accessor: (p: AdminProductItem) => {
        const st = (p.vendorStatus || 'APPROVED').toUpperCase()
        return (
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              st === 'APPROVED'
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                : st === 'PENDING'
                ? 'bg-amber-500/10 text-amber-700'
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
      accessor: (p: AdminProductItem) => (
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={actionLoading}
            onClick={() => handleDeleteProduct(p.id)}
            className="text-xs text-destructive hover:underline flex items-center gap-1 disabled:opacity-50"
          >
            <Trash2 className="size-3.5" /> Delete
          </button>
        </div>
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
          onClick={loadProducts}
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
          <span className="eyebrow">Inventory & Curation</span>
          <h2 className="font-serif text-2xl font-bold text-foreground">Product Catalog</h2>
        </div>
        <div className="text-xs text-muted-foreground font-semibold">
          Total Products: {products.length}
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

      {products.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-12 text-center text-xs text-muted-foreground space-y-2">
          <ShoppingBag className="size-10 mx-auto text-muted-foreground/50 mb-2" />
          <h3 className="font-serif text-base font-bold text-foreground">No Products in Catalog</h3>
          <p>The database currently contains zero listed products. As artisanal vendors list heritage food products, they will appear here for catalog curation.</p>
        </div>
      ) : (
        <DataTable
          data={products}
          columns={columns}
          searchKey={(p) => `${p.name} ${p.category || ''}`}
          keyExtractor={(p) => p.id}
          searchPlaceholder="Search product by name..."
        />
      )}
    </div>
  )
}
