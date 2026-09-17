'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import Link from 'next/link'
import {
  AreaChart,
  Bell,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  FileText,
  Filter,
  Heart,
  Home,
  LifeBuoy,
  Menu,
  MoreHorizontal,
  Package,
  Plus,
  RefreshCw,
  Search,
  Send,
  Settings,
  ShoppingBag,
  SlidersHorizontal,
  Store,
  Tags,
  Truck,
  Users,
  Wallet,
  X,
} from 'lucide-react'
import {
  getVendorProfileApi,
  updateVendorProfileApi,
  getShopSettingsApi,
  updateShopSettingsApi,
  getVendorDashboardStatsApi,
  getVendorAnalyticsApi,
  getVendorCustomersApi,
  getVendorProductsApi,
  getVendorProductByIdApi,
  createVendorProductApi,
  updateVendorProductApi,
  getVendorInventoryApi,
  updateInventoryItemApi,
  getVendorOrdersApi,
  getVendorOrderByIdApi,
  updateVendorOrderStatusApi,
  shipVendorOrderApi,
  getVendorPayoutsApi,
  getVendorWalletApi,
  requestPayoutApi,
  getVendorReviewsApi,
  replyToReviewApi,
  getVendorComplianceApi,
  uploadComplianceDocApi,
  getVendorNotificationsApi,
  markAllNotificationsReadApi,
  type VendorProfile,
  type ShopSettings,
  type DashboardStats,
  type AnalyticsData,
  type VendorCustomer,
  type VendorProduct,
  type InventoryItem,
  type VendorOrder,
  type VendorTransfer,
  type VendorReview,
  type ComplianceDoc,
  type VendorNotification,
} from '@/lib/api/seller'
import type { SellerView } from '@/types/seller'
import { BackButton } from '@/components/ui/back-button'

type Props = { view?: SellerView; id?: string }

const money = (value: number) => `₹${(value || 0).toLocaleString('en-IN')}`

const navGroups = [
  {
    label: 'Workspace',
    items: [
      ['overview', 'Overview', Home],
      ['products', 'Products', Package],
      ['orders', 'Orders', ShoppingBag],
      ['inventory', 'Inventory', Tags],
    ],
  },
  {
    label: 'Relationships',
    items: [
      ['customers', 'Customers', Users],
      ['reviews', 'Reviews', Heart],
    ],
  },
  {
    label: 'Business',
    items: [
      ['profile', 'Producer profile', Store],
      ['documents', 'Documents', FileText],
      ['payouts', 'Payouts', Wallet],
      ['analytics', 'Analytics', AreaChart],
    ],
  },
] as const

function StatusBadge({ status }: { status: string }) {
  const normalized = (status || '').toLowerCase()
  let tone = 'bg-accent/15 text-accent-foreground'
  if (['published', 'approved', 'delivered', 'paid', 'completed', 'active', 'verified'].includes(normalized)) {
    tone = 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
  } else if (['out of stock', 'cancelled', 'rejected', 'failed', 'suspended'].includes(normalized)) {
    tone = 'bg-destructive/10 text-destructive border border-destructive/20'
  } else if (['processing', 'ready_to_ship', 'shipped', 'under_review', 'pending'].includes(normalized)) {
    tone = 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider ${tone}`}>
      {status ? status.replace(/_/g, ' ') : 'UNKNOWN'}
    </span>
  )
}

function Metric({ label, value, detail, trend }: { label: string; value: string; detail: string; trend?: string }) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <div className="mt-3 flex items-end justify-between gap-3">
        <p className="text-2xl font-bold tracking-tight">{value}</p>
        {trend && <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{trend}</span>}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{detail}</p>
    </div>
  )
}

function SectionHeader({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="text-xs font-bold uppercase tracking-wider text-primary mb-1">{eyebrow}</p>}
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
      </div>
      {action}
    </div>
  )
}

function LoadingCard({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-16 w-full animate-pulse rounded-xl bg-muted/60" />
      ))}
    </div>
  )
}

function EmptyState({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-10 text-center">
      <Package className="size-10 text-muted-foreground/50 mb-3" />
      <h3 className="text-lg font-bold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

function ErrorCard({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
      <p className="text-sm font-semibold text-destructive">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 inline-flex items-center gap-2 rounded-lg border border-destructive/40 bg-background px-4 py-2 text-xs font-bold text-destructive hover:bg-destructive/10"
        >
          <RefreshCw className="size-3.5" /> Try Again
        </button>
      )}
    </div>
  )
}

// ── 1. Overview View ──────────────────────────────────────────────────────────

function Overview() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [recentOrders, setRecentOrders] = useState<VendorOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const [statsRes, analyticsRes, ordersRes] = await Promise.all([
        getVendorDashboardStatsApi(),
        getVendorAnalyticsApi('30d'),
        getVendorOrdersApi({ limit: 5 }),
      ])
      setStats(statsRes)
      setAnalytics(analyticsRes)
      setRecentOrders(ordersRes?.orders || [])
    } catch (err: unknown) {
      const e = err as Error
      setError(e.message || 'Failed to load seller overview')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  if (loading) {
    return (
      <div className="space-y-6">
        <SectionHeader eyebrow="Dashboard" title="Your business at a glance" />
        <LoadingCard count={4} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <SectionHeader eyebrow="Dashboard" title="Your business at a glance" />
        <ErrorCard message={error} onRetry={loadData} />
      </div>
    )
  }

  const snapshot = analytics?.snapshot
  const maxTrend = analytics?.salesTrend?.length
    ? Math.max(...analytics.salesTrend.map((t) => t.revenue), 1)
    : 1

  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Dashboard"
        title="Your business at a glance"
        action={
          <Link
            href="/seller/products/new"
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground shadow transition hover:opacity-95"
          >
            <Plus className="size-4" /> Add product
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Revenue this month"
          value={money(analytics?.revenue ?? stats?.totalSales ?? 0)}
          detail={`₹${analytics?.commission ?? 0} platform commission`}
        />
        <Metric
          label="Orders"
          value={String(analytics?.orders ?? stats?.totalOrders ?? 0)}
          detail={`${stats?.pendingOrders ?? 0} awaiting dispatch`}
        />
        <Metric
          label="Products sold"
          value={String(analytics?.productsSold ?? 0)}
          detail={`Across ${snapshot?.totalProducts ?? stats?.totalProducts ?? 0} active products`}
        />
        <Metric
          label="Available Payout Balance"
          value={money(snapshot?.availableBalance ?? stats?.totalEarnings ?? 0)}
          detail="Delivered orders net earnings"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="rounded-xl border bg-card p-5">
          <p className="font-bold">Revenue overview</p>
          <p className="mt-1 text-sm text-muted-foreground">Last 30 days · All products</p>
          {analytics?.salesTrend && analytics.salesTrend.length > 0 ? (
            <div className="mt-7 flex h-52 items-end gap-2 border-b border-l px-3">
              {analytics.salesTrend.map((point, index) => {
                const heightPercent = Math.max(5, Math.min(100, Math.round((point.revenue / maxTrend) * 100)))
                return (
                  <div key={index} className="flex flex-1 flex-col items-center justify-end" title={`${point.date}: ₹${point.revenue}`}>
                    <div
                      className="w-full rounded-t bg-primary/80 transition-all hover:bg-primary"
                      style={{ height: `${heightPercent}%` }}
                    />
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex h-52 items-center justify-center text-sm text-muted-foreground">
              No sales records for this period.
            </div>
          )}
        </div>

        <div className="rounded-xl border bg-card p-5">
          <div className="mb-5 flex items-center justify-between">
            <p className="font-bold">Inventory summary</p>
            <Link href="/seller/inventory" className="text-sm font-bold text-primary hover:underline">
              View all
            </Link>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-3 text-sm">
              <span className="text-muted-foreground">Total stock on hand</span>
              <span className="font-bold">{snapshot?.totalUnits ?? 0} units</span>
            </div>
            <div className="flex items-center justify-between border-b pb-3 text-sm">
              <span className="text-muted-foreground">Low stock items (&lt;15 units)</span>
              <span className={`font-bold ${(snapshot?.lowStockCount ?? 0) > 0 ? 'text-destructive' : ''}`}>
                {snapshot?.lowStockCount ?? 0} items
              </span>
            </div>
            <div className="flex items-center justify-between border-b pb-3 text-sm">
              <span className="text-muted-foreground">Estimated inventory value</span>
              <span className="font-bold">{money(snapshot?.stockValue ?? 0)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Active listings</span>
              <span className="font-bold">{snapshot?.totalProducts ?? 0} products</span>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-5">
        <div className="mb-5 flex justify-between items-center">
          <p className="font-bold">Recent orders</p>
          <Link href="/seller/orders" className="text-sm font-bold text-primary hover:underline">
            See all
          </Link>
        </div>
        {recentOrders.length > 0 ? (
          <div className="overflow-hidden rounded-xl border">
            {recentOrders.map((order) => (
              <Link
                href={`/seller/orders/${order.id}`}
                key={order.id}
                className="grid gap-2 border-b px-5 py-4 last:border-0 hover:bg-muted/50 md:grid-cols-[1.2fr_1.5fr_1fr_1fr_1fr_auto] md:items-center"
              >
                <span className="font-semibold text-primary">{order.vendorOrderNumber}</span>
                <span className="text-sm">
                  {order.items?.length || 0} items · {order.order?.shippingAddress?.city || 'India'}
                </span>
                <span className="text-sm text-muted-foreground">
                  {new Date(order.createdAt).toLocaleDateString('en-IN')}
                </span>
                <span className="text-sm font-semibold">{money(order.subtotal)}</span>
                <StatusBadge status={order.status} />
                <ChevronRight className="size-4 text-muted-foreground" />
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-4 text-center">No orders have been placed yet.</p>
        )}
      </div>
    </div>
  )
}

// ── 2. Product Table View ─────────────────────────────────────────────────────

function ProductTable() {
  const [products, setProducts] = useState<VendorProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await getVendorProductsApi({
        status: statusFilter !== 'all' ? statusFilter : undefined,
      })
      setProducts(res?.products || [])
    } catch (err: unknown) {
      const e = err as Error
      setError(e.message || 'Failed to load products')
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  const filtered = products.filter((p) => {
    if (!search) return true
    const term = search.toLowerCase()
    return p.name.toLowerCase().includes(term) || (p.sku && p.sku.toLowerCase().includes(term))
  })

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Catalog"
        title="Products"
        action={
          <Link
            href="/seller/products/new"
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground shadow transition hover:opacity-95"
          >
            <Plus className="size-4" /> Add product
          </Link>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <label className="relative min-w-[240px] flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products by name or SKU"
            className="h-10 w-full rounded-lg border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </label>
        <div className="flex gap-1.5 overflow-x-auto">
          {['all', 'pending', 'approved', 'rejected'].map((item) => (
            <button
              key={item}
              onClick={() => setStatusFilter(item)}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-bold uppercase transition ${
                statusFilter === item
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {item === 'all' ? 'All' : item}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <LoadingCard count={4} />
      ) : error ? (
        <ErrorCard message={error} onRetry={loadProducts} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No products found"
          description={
            statusFilter !== 'all' || search
              ? 'No products match your search or status filter.'
              : 'You have not added any products to your catalog yet.'
          }
          action={
            <Link
              href="/seller/products/new"
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-xs font-bold text-primary-foreground"
            >
              <Plus className="size-3.5" /> Add Your First Product
            </Link>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] border-b bg-muted/40 px-5 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <span>Product</span>
            <span>Category</span>
            <span>Price</span>
            <span>Stock</span>
            <span>Status</span>
            <span>Action</span>
          </div>
          {filtered.map((product) => (
            <div
              key={product.id}
              className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] items-center gap-4 border-b px-5 py-4 last:border-0 hover:bg-muted/30"
            >
              <div className="flex items-center gap-3">
                {product.image ? (
                  <img src={product.image} alt={product.name} className="size-12 rounded-lg object-cover" />
                ) : (
                  <div className="flex size-12 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <Package className="size-6" />
                  </div>
                )}
                <div>
                  <Link href={`/seller/products/${product.id}`} className="font-semibold hover:text-primary">
                    {product.name}
                  </Link>
                  <p className="mt-0.5 text-xs text-muted-foreground">{product.sku || 'No SKU'}</p>
                </div>
              </div>
              <span className="text-sm text-muted-foreground">{product.category}</span>
              <span className="text-sm font-semibold">{money(product.price)}</span>
              <span
                className={`text-sm font-semibold ${
                  product.stockQuantity < 15 ? 'text-destructive font-bold' : ''
                }`}
              >
                {product.stockQuantity} units
              </span>
              <div>
                <StatusBadge status={product.vendorStatus} />
              </div>
              <Link
                href={`/seller/products/${product.id}`}
                className="rounded-lg border px-3 py-1.5 text-xs font-bold hover:bg-muted"
              >
                Edit
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── 3. Product Detail / Edit View ─────────────────────────────────────────────

function ProductDetail({ id }: { id?: string }) {
  const router = useRouter()
  const [product, setProduct] = useState<VendorProduct | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Form fields
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [stockQuantity, setStockQuantity] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [sku, setSku] = useState('')

  const loadProduct = useCallback(async () => {
    if (!id) return
    try {
      setLoading(true)
      setError(null)
      const data = await getVendorProductByIdApi(id)
      setProduct(data)
      setName(data.name || '')
      setPrice(String(data.price || ''))
      setStockQuantity(String(data.stockQuantity || '0'))
      setDescription(data.description || '')
      setCategory(data.category || 'General')
      setSku(data.sku || '')
    } catch (err: unknown) {
      const e = err as Error
      setError(e.message || 'Product not found or access denied')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadProduct()
  }, [loadProduct])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id) return
    try {
      setSaving(true)
      setError(null)
      setSuccess(false)

      const parsedPrice = parseFloat(price)
      const parsedStock = parseInt(stockQuantity, 10)

      if (isNaN(parsedPrice) || parsedPrice < 0) {
        throw new Error('Please enter a valid non-negative price')
      }
      if (isNaN(parsedStock) || parsedStock < 0) {
        throw new Error('Stock quantity must be a non-negative whole number')
      }

      await updateVendorProductApi(id, {
        name: name.trim(),
        price: parsedPrice,
        stockQuantity: parsedStock,
        description: description.trim(),
        category,
        sku: sku.trim() || undefined,
      })

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: unknown) {
      const e = err as Error
      setError(e.message || 'Failed to update product')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingCard count={3} />
  if (error && !product) return <ErrorCard message={error} onRetry={loadProduct} />
  if (!product) return <EmptyState title="Product Not Found" description="The requested product does not exist." />

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Product Editor"
        title={product.name}
        action={
          <div className="flex gap-2">
            <button
              onClick={() => router.push('/seller/products')}
              className="rounded-lg border bg-background px-4 py-2 text-sm font-bold hover:bg-muted"
            >
              Back to list
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        }
      />

      {success && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 p-4 text-sm font-semibold text-emerald-600">
          <CheckCircle2 className="size-5" /> Product updated successfully.
        </div>
      )}
      {error && <ErrorCard message={error} />}

      <form onSubmit={handleSave} className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <div className="space-y-4 rounded-xl border bg-card p-5">
          <p className="font-bold">Product Visual</p>
          {product.image ? (
            <img src={product.image} alt={product.name} className="aspect-square w-full rounded-lg object-cover" />
          ) : (
            <div className="flex aspect-square w-full items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <Package className="size-16" />
            </div>
          )}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Listing status:</span>
            <StatusBadge status={product.vendorStatus} />
          </div>
        </div>

        <div className="space-y-4 rounded-xl border bg-card p-5">
          <label className="block text-sm font-semibold">
            Product Name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="mt-1.5 h-11 w-full rounded-lg border bg-background px-3 font-normal"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold">
              Price (₹)
              <input
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
                className="mt-1.5 h-11 w-full rounded-lg border bg-background px-3 font-normal"
              />
            </label>
            <label className="text-sm font-semibold">
              Available Inventory (Units)
              <input
                type="number"
                step="1"
                min="0"
                value={stockQuantity}
                onChange={(e) => setStockQuantity(e.target.value)}
                required
                className="mt-1.5 h-11 w-full rounded-lg border bg-background px-3 font-normal"
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold">
              Category
              <input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
                className="mt-1.5 h-11 w-full rounded-lg border bg-background px-3 font-normal"
              />
            </label>
            <label className="text-sm font-semibold">
              SKU
              <input
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className="mt-1.5 h-11 w-full rounded-lg border bg-background px-3 font-normal"
              />
            </label>
          </div>

          <label className="block text-sm font-semibold">
            Description
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1.5 w-full rounded-lg border bg-background p-3 font-normal"
            />
          </label>
        </div>
      </form>
    </div>
  )
}

// ── 4. Product Creation View (Multi-Step Form) ────────────────────────────────

function ProductForm() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [category, setCategory] = useState('Oils & Ghee')
  const [sku, setSku] = useState('')
  const [price, setPrice] = useState('')
  const [stockQuantity, setStockQuantity] = useState('10')
  const [description, setDescription] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setSubmitting(true)
      setError(null)

      const parsedPrice = parseFloat(price)
      const parsedStock = parseInt(stockQuantity, 10)

      if (!name.trim()) throw new Error('Product name is required')
      if (isNaN(parsedPrice) || parsedPrice <= 0) throw new Error('Valid selling price is required')
      if (isNaN(parsedStock) || parsedStock < 0) throw new Error('Valid stock quantity is required')

      await createVendorProductApi({
        name: name.trim(),
        category,
        sku: sku.trim() || undefined,
        price: parsedPrice,
        stockQuantity: parsedStock,
        description: description.trim(),
      })

      router.push('/seller/products')
    } catch (err: unknown) {
      const e = err as Error
      setError(e.message || 'Failed to create product')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <SectionHeader eyebrow="Catalog" title="Add New Product" />

      {error && <ErrorCard message={error} />}

      <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border bg-card p-6 shadow-sm">
        <label className="block text-sm font-semibold">
          Product Name *
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Cold-Pressed Sesame Oil"
            required
            className="mt-1.5 h-11 w-full rounded-lg border bg-background px-3 font-normal"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold">
            Category *
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1.5 h-11 w-full rounded-lg border bg-background px-3 font-normal"
            >
              <option value="Oils & Ghee">Oils & Ghee</option>
              <option value="Spices">Spices</option>
              <option value="Grains & Flours">Grains & Flours</option>
              <option value="Pantry">Pantry</option>
              <option value="Heritage Rice">Heritage Rice</option>
              <option value="Artisan Salt">Artisan Salt</option>
            </select>
          </label>
          <label className="text-sm font-semibold">
            SKU
            <input
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              placeholder="e.g. VEND-SES-500"
              className="mt-1.5 h-11 w-full rounded-lg border bg-background px-3 font-normal"
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold">
            Price (₹) *
            <input
              type="number"
              step="0.01"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.00"
              required
              className="mt-1.5 h-11 w-full rounded-lg border bg-background px-3 font-normal"
            />
          </label>
          <label className="text-sm font-semibold">
            Initial Stock (Units) *
            <input
              type="number"
              step="1"
              min="0"
              value={stockQuantity}
              onChange={(e) => setStockQuantity(e.target.value)}
              placeholder="10"
              required
              className="mt-1.5 h-11 w-full rounded-lg border bg-background px-3 font-normal"
            />
          </label>
        </div>

        <label className="block text-sm font-semibold">
          Description
          <textarea
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your heritage process and product benefits..."
            className="mt-1.5 w-full rounded-lg border bg-background p-3 font-normal"
          />
        </label>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Link
            href="/seller/products"
            className="rounded-lg border bg-background px-4 py-2 text-sm font-bold hover:bg-muted"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-primary px-5 py-2 text-sm font-bold text-primary-foreground shadow disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Create Product'}
          </button>
        </div>
      </form>
    </div>
  )
}

// ── 5. Orders List View ───────────────────────────────────────────────────────

function Orders() {
  const [orders, setOrders] = useState<VendorOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await getVendorOrdersApi({
        status: statusFilter !== 'all' ? statusFilter : undefined,
      })
      setOrders(res?.orders || [])
    } catch (err: unknown) {
      const e = err as Error
      setError(e.message || 'Failed to load orders')
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    loadOrders()
  }, [loadOrders])

  const filtered = orders.filter((o) => {
    if (!search) return true
    const term = search.toLowerCase()
    return o.vendorOrderNumber.toLowerCase().includes(term) || (o.awbCode && o.awbCode.toLowerCase().includes(term))
  })

  return (
    <div className="space-y-6">
      <SectionHeader eyebrow="Fulfillment" title="Orders" />

      <div className="flex flex-wrap items-center gap-3">
        <label className="relative min-w-[240px] flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search orders by number or AWB"
            className="h-10 w-full rounded-lg border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </label>
        <div className="flex gap-1.5 overflow-x-auto">
          {['all', 'PENDING', 'PROCESSING', 'READY_TO_SHIP', 'SHIPPED', 'DELIVERED', 'CANCELLED'].map((item) => (
            <button
              key={item}
              onClick={() => setStatusFilter(item)}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-bold transition ${
                statusFilter === item
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {item === 'all' ? 'All' : item.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <LoadingCard count={4} />
      ) : error ? (
        <ErrorCard message={error} onRetry={loadOrders} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No orders found"
          description={
            statusFilter !== 'all' || search
              ? 'No orders match your filter criteria.'
              : 'You have not received any orders yet.'
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <div className="grid grid-cols-[1.5fr_1.5fr_1fr_1fr_1fr_auto] border-b bg-muted/40 px-5 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <span>Order Number</span>
            <span>Items & Location</span>
            <span>Date</span>
            <span>Subtotal</span>
            <span>Status</span>
            <span>Action</span>
          </div>
          {filtered.map((order) => (
            <Link
              href={`/seller/orders/${order.id}`}
              key={order.id}
              className="grid grid-cols-[1.5fr_1.5fr_1fr_1fr_1fr_auto] items-center gap-4 border-b px-5 py-4 last:border-0 hover:bg-muted/30"
            >
              <div>
                <span className="font-semibold text-primary">{order.vendorOrderNumber}</span>
                {order.awbCode && <p className="text-xs text-muted-foreground">AWB: {order.awbCode}</p>}
              </div>
              <span className="text-sm">
                {order.items?.length || 0} items · {order.order?.shippingAddress?.city || 'India'}
              </span>
              <span className="text-sm text-muted-foreground">
                {new Date(order.createdAt).toLocaleDateString('en-IN')}
              </span>
              <span className="text-sm font-semibold">{money(order.subtotal)}</span>
              <div>
                <StatusBadge status={order.status} />
              </div>
              <ChevronRight className="size-4 text-muted-foreground" />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

// ── 6. Order Detail & Dispatch View ───────────────────────────────────────────

function OrderDetailView({ id }: { id?: string }) {
  const router = useRouter()
  const [order, setOrder] = useState<VendorOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)

  const loadOrder = useCallback(async () => {
    if (!id) return
    try {
      setLoading(true)
      setError(null)
      const data = await getVendorOrderByIdApi(id)
      setOrder(data)
    } catch (err: unknown) {
      const e = err as Error
      setError(e.message || 'Failed to load order detail')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadOrder()
  }, [loadOrder])

  const handleShip = async () => {
    if (!id) return
    try {
      setActionLoading(true)
      setError(null)
      setActionSuccess(null)
      const res = await shipVendorOrderApi(id)
      setActionSuccess('Shipment created with Shiprocket!')
      if (res.vendorOrder) {
        setOrder(res.vendorOrder)
      } else {
        loadOrder()
      }
    } catch (err: unknown) {
      const e = err as Error
      setError(e.message || 'Failed to dispatch shipment')
    } finally {
      setActionLoading(false)
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    if (!id) return
    try {
      setActionLoading(true)
      setError(null)
      const updated = await updateVendorOrderStatusApi(id, newStatus)
      setOrder(updated)
      setActionSuccess(`Status updated to ${newStatus}`)
    } catch (err: unknown) {
      const e = err as Error
      setError(e.message || 'Status transition failed')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) return <LoadingCard count={3} />
  if (error && !order) return <ErrorCard message={error} onRetry={loadOrder} />
  if (!order) return <EmptyState title="Order Not Found" description="The requested order does not exist." />

  const canShip = !order.awbCode && !['CANCELLED', 'DELIVERED', 'SHIPPED'].includes(order.status)

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Order Fulfillment"
        title={order.vendorOrderNumber}
        action={
          <div className="flex gap-2">
            <button
              onClick={() => router.push('/seller/orders')}
              className="rounded-lg border bg-background px-4 py-2 text-sm font-bold hover:bg-muted"
            >
              Back to orders
            </button>
            {canShip && (
              <button
                onClick={handleShip}
                disabled={actionLoading}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50"
              >
                <Truck className="size-4" /> {actionLoading ? 'Creating AWB...' : 'Ship with Shiprocket'}
              </button>
            )}
          </div>
        }
      />

      {actionSuccess && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 p-4 text-sm font-semibold text-emerald-600">
          <CheckCircle2 className="size-5" /> {actionSuccess}
        </div>
      )}
      {error && <ErrorCard message={error} />}

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-5">
          <div className="rounded-xl border bg-card p-5">
            <p className="font-bold mb-4">Line Items</p>
            <div className="space-y-3">
              {(order.items || []).map((item, idx) => (
                <div key={idx} className="flex items-center justify-between border-b pb-3 last:border-0">
                  <div>
                    <p className="font-semibold text-sm">{item.name}</p>
                    <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                  </div>
                  <span className="font-bold text-sm">{money(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 border-t pt-3 flex justify-between font-bold">
              <span>Subtotal</span>
              <span>{money(order.subtotal)}</span>
            </div>
            {order.taxAmount !== undefined && (
              <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                <span>Tax</span>
                <span>{money(order.taxAmount)}</span>
              </div>
            )}
          </div>

          {/* Logistics tracking details */}
          <div className="rounded-xl border bg-card p-5">
            <p className="font-bold mb-3">Logistics & Tracking</p>
            <div className="grid gap-3 sm:grid-cols-2 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Courier</p>
                <p className="font-semibold">{order.courierName || 'Pending dispatch'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">AWB Code</p>
                <p className="font-semibold">{order.awbCode || 'Not generated'}</p>
              </div>
              {order.trackingUrl && (
                <div className="sm:col-span-2">
                  <a
                    href={order.trackingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-bold text-primary hover:underline"
                  >
                    Open Live Tracking Link →
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-xl border bg-card p-5">
            <p className="font-bold mb-3">Order Status & Transition</p>
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <span className="text-sm text-muted-foreground">Current Status:</span>
              <StatusBadge status={order.status} />
            </div>

            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
              Update Status
            </label>
            <select
              value={order.status}
              disabled={actionLoading || ['DELIVERED', 'CANCELLED'].includes(order.status)}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="h-10 w-full rounded-lg border bg-background px-3 text-sm"
            >
              <option value="PENDING">PENDING</option>
              <option value="ACCEPTED">ACCEPTED</option>
              <option value="PROCESSING">PROCESSING</option>
              <option value="READY_TO_SHIP">READY_TO_SHIP</option>
              <option value="SHIPPED">SHIPPED</option>
              <option value="DELIVERED">DELIVERED</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
          </div>

          <div className="rounded-xl border bg-card p-5">
            <p className="font-bold mb-3">Customer Destination</p>
            <p className="text-sm font-semibold">{order.order?.shippingAddress?.city || 'India'}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {order.order?.shippingAddress?.state} {order.order?.shippingAddress?.postalCode}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── 7. Inventory View ─────────────────────────────────────────────────────────

function Inventory() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [stockInput, setStockInput] = useState('')
  const [saveLoading, setSaveLoading] = useState(false)

  const loadInventory = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getVendorInventoryApi()
      setItems(data || [])
    } catch (err: unknown) {
      const e = err as Error
      setError(e.message || 'Failed to load inventory')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadInventory()
  }, [loadInventory])

  const totalUnits = items.reduce((sum, item) => sum + (item.stockQuantity || 0), 0)
  const lowStockCount = items.filter((item) => (item.stockQuantity || 0) < 15).length
  const stockValue = items.reduce((sum, item) => sum + (item.price || 0) * (item.stockQuantity || 0), 0)

  const handleUpdateStock = async (id: string) => {
    try {
      setSaveLoading(true)
      const parsed = parseInt(stockInput, 10)
      if (isNaN(parsed) || parsed < 0) {
        throw new Error('Stock must be a non-negative whole number')
      }
      await updateInventoryItemApi(id, parsed)
      setEditingId(null)
      loadInventory()
    } catch (err: unknown) {
      const e = err as Error
      alert(e.message || 'Failed to update stock')
    } finally {
      setSaveLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeader eyebrow="Operations" title="Inventory Management" />

      <div className="grid gap-4 sm:grid-cols-3">
        <Metric label="Total units" value={`${totalUnits}`} detail={`Across ${items.length} products`} />
        <Metric
          label="Low stock"
          value={`${lowStockCount}`}
          detail={lowStockCount > 0 ? 'Needs replenishment (<15 units)' : 'All stock levels healthy'}
        />
        <Metric label="Stock value" value={money(stockValue)} detail="At listed product prices" />
      </div>

      {loading ? (
        <LoadingCard count={3} />
      ) : error ? (
        <ErrorCard message={error} onRetry={loadInventory} />
      ) : items.length === 0 ? (
        <EmptyState
          title="No inventory records"
          description="Add products to your catalog to track real-time stock."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr] border-b bg-muted/40 px-5 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <span>Product Name</span>
            <span>SKU</span>
            <span>Stock on Hand</span>
            <span>Adjust</span>
          </div>
          {items.map((item) => (
            <div
              key={item.id}
              className="grid grid-cols-[2fr_1fr_1fr_1fr] items-center gap-4 border-b px-5 py-4 last:border-0 hover:bg-muted/30"
            >
              <span className="font-semibold text-sm">{item.name}</span>
              <span className="text-sm text-muted-foreground">{item.sku || 'N/A'}</span>
              <span className={`text-sm font-semibold ${item.stockQuantity < 15 ? 'text-destructive font-bold' : ''}`}>
                {item.stockQuantity} units
              </span>
              <div>
                {editingId === item.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      value={stockInput}
                      onChange={(e) => setStockInput(e.target.value)}
                      className="h-8 w-20 rounded border bg-background px-2 text-sm"
                    />
                    <button
                      onClick={() => handleUpdateStock(item.id)}
                      disabled={saveLoading}
                      className="rounded bg-primary px-2.5 py-1 text-xs font-bold text-primary-foreground disabled:opacity-50"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="rounded border px-2 py-1 text-xs font-bold"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setEditingId(item.id)
                      setStockInput(String(item.stockQuantity))
                    }}
                    className="text-xs font-bold text-primary hover:underline"
                  >
                    Adjust stock
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── 8. Customers View ─────────────────────────────────────────────────────────

function Customers() {
  const [customers, setCustomers] = useState<VendorCustomer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadCustomers = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getVendorCustomersApi()
      setCustomers(data?.customers || [])
    } catch (err: unknown) {
      const e = err as Error
      setError(e.message || 'Failed to load customers')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCustomers()
  }, [loadCustomers])

  return (
    <div className="space-y-6">
      <SectionHeader eyebrow="Relationships" title="Customers" />

      {loading ? (
        <LoadingCard count={3} />
      ) : error ? (
        <ErrorCard message={error} onRetry={loadCustomers} />
      ) : customers.length === 0 ? (
        <EmptyState
          title="No customers yet"
          description="Customer summaries are generated automatically as patrons place orders for your products."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {customers.map((c) => (
            <div key={c.id} className="rounded-xl border bg-card p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  {c.name ? c.name[0].toUpperCase() : 'C'}
                </div>
                <div>
                  <p className="font-bold text-sm">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.email}</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 border-t pt-3 text-xs">
                <div>
                  <p className="text-muted-foreground">Orders</p>
                  <p className="font-bold text-sm mt-0.5">{c.ordersCount}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Lifetime Spend</p>
                  <p className="font-bold text-sm mt-0.5">{money(c.totalSpend)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Last Order</p>
                  <p className="font-bold text-sm mt-0.5">
                    {c.lastOrderDate ? new Date(c.lastOrderDate).toLocaleDateString('en-IN') : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── 9. Reviews & Replies View ─────────────────────────────────────────────────

function Reviews() {
  const [reviews, setReviews] = useState<VendorReview[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [replyingId, setReplyingId] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [replyLoading, setReplyLoading] = useState(false)
  const [repliedSet, setRepliedSet] = useState<Set<string>>(new Set())

  const loadReviews = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getVendorReviewsApi()
      setReviews(data?.reviews || [])
    } catch (err: unknown) {
      const e = err as Error
      setError(e.message || 'Failed to load reviews')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadReviews()
  }, [loadReviews])

  const handleSendReply = async (reviewId: string) => {
    if (!replyText.trim() || replyText.trim().length < 10) {
      alert('Reply must be at least 10 characters long.')
      return
    }
    try {
      setReplyLoading(true)
      await replyToReviewApi(reviewId, replyText)
      setRepliedSet((prev) => new Set(prev).add(reviewId))
      setReplyingId(null)
      setReplyText('')
    } catch (err: unknown) {
      const e = err as Error
      alert(e.message || 'Failed to save reply')
    } finally {
      setReplyLoading(false)
    }
  }

  const avgRating = reviews.length
    ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10) / 10
    : 0

  return (
    <div className="space-y-6">
      <SectionHeader eyebrow="Customer Voice" title="Customer Reviews" />

      <div className="grid gap-4 sm:grid-cols-3">
        <Metric label="Average rating" value={`${avgRating} / 5`} detail={`From ${reviews.length} reviews`} />
        <Metric label="Total reviews" value={`${reviews.length}`} detail="On your products" />
        <Metric
          label="Verified patrons"
          value={`${reviews.filter((r) => r.isVerifiedPurchase).length}`}
          detail="Verified purchase reviews"
        />
      </div>

      {loading ? (
        <LoadingCard count={3} />
      ) : error ? (
        <ErrorCard message={error} onRetry={loadReviews} />
      ) : reviews.length === 0 ? (
        <EmptyState
          title="No customer reviews yet"
          description="Customer reviews on your products will appear here once submitted."
        />
      ) : (
        <div className="space-y-4">
          {reviews.map((r) => (
            <div key={r.id} className="rounded-xl border bg-card p-5 shadow-sm space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-bold text-sm">{r.user?.name || 'Customer'}</p>
                  <p className="text-xs text-primary font-medium">
                    {r.product?.name} · {new Date(r.createdAt).toLocaleDateString('en-IN')}
                  </p>
                </div>
                <span className="text-amber-500 font-bold">{'★'.repeat(r.rating)}</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{r.comment}</p>

              {repliedSet.has(r.id) ? (
                <p className="text-xs font-bold text-emerald-600">✓ Reply saved</p>
              ) : replyingId === r.id ? (
                <div className="space-y-2 border-t pt-3">
                  <textarea
                    rows={2}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Write a thoughtful reply (minimum 10 characters)..."
                    className="w-full rounded-lg border bg-background p-2.5 text-xs font-normal"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSendReply(r.id)}
                      disabled={replyLoading}
                      className="rounded bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground disabled:opacity-50"
                    >
                      {replyLoading ? 'Sending...' : 'Post Reply'}
                    </button>
                    <button
                      onClick={() => setReplyingId(null)}
                      className="rounded border px-3 py-1.5 text-xs font-bold"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setReplyingId(r.id)
                    setReplyText('')
                  }}
                  className="rounded-lg border px-3 py-1.5 text-xs font-bold hover:bg-muted"
                >
                  Reply
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── 10. Profile View ──────────────────────────────────────────────────────────

function Profile() {
  const [profile, setProfile] = useState<VendorProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Fields
  const [businessName, setBusinessName] = useState('')
  const [contactPerson, setContactPerson] = useState('')
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [story, setStory] = useState('')

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getVendorProfileApi()
      setProfile(data)
      setBusinessName(data.businessName || '')
      setContactPerson(data.contactPerson || '')
      setPhone(data.phone || '')
      setCity(data.addressCity || '')
      setState(data.addressState || '')
      setStory(data.producerStory || '')
    } catch (err: unknown) {
      const e = err as Error
      setError(e.message || 'Failed to load producer profile')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setSaving(true)
      setError(null)
      setSuccess(false)
      const updated = await updateVendorProfileApi({
        businessName: businessName.trim(),
        contactPerson: contactPerson.trim(),
        phone: phone.trim(),
        addressCity: city.trim(),
        addressState: state.trim(),
        producerStory: story.trim(),
      })
      setProfile(updated)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: unknown) {
      const e = err as Error
      setError(e.message || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingCard count={3} />
  if (error && !profile) return <ErrorCard message={error} onRetry={loadProfile} />

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Storefront"
        title="Producer Profile"
        action={
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        }
      />

      {success && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 p-4 text-sm font-semibold text-emerald-600">
          <CheckCircle2 className="size-5" /> Profile changes saved.
        </div>
      )}
      {error && <ErrorCard message={error} />}

      <form onSubmit={handleSave} className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <div className="space-y-4 rounded-xl border bg-card p-5 text-center">
          <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
            {businessName ? businessName[0].toUpperCase() : 'P'}
          </div>
          <div>
            <p className="font-bold text-lg">{businessName || 'Producer Store'}</p>
            <p className="text-xs text-muted-foreground">{city && state ? `${city}, ${state}` : 'India'}</p>
          </div>
          <div className="pt-2">
            <StatusBadge status={profile?.status || 'APPROVED'} />
          </div>
        </div>

        <div className="space-y-4 rounded-xl border bg-card p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold">
              Business Name *
              <input
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                required
                className="mt-1.5 h-11 w-full rounded-lg border bg-background px-3 font-normal"
              />
            </label>
            <label className="text-sm font-semibold">
              Contact Person *
              <input
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                required
                className="mt-1.5 h-11 w-full rounded-lg border bg-background px-3 font-normal"
              />
            </label>
            <label className="text-sm font-semibold">
              Phone Number *
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className="mt-1.5 h-11 w-full rounded-lg border bg-background px-3 font-normal"
              />
            </label>
            <label className="text-sm font-semibold">
              Email (Authoritative)
              <input
                disabled
                value={profile?.email || ''}
                className="mt-1.5 h-11 w-full rounded-lg border bg-muted px-3 text-muted-foreground font-normal"
              />
            </label>
            <label className="text-sm font-semibold">
              City
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="mt-1.5 h-11 w-full rounded-lg border bg-background px-3 font-normal"
              />
            </label>
            <label className="text-sm font-semibold">
              State
              <input
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="mt-1.5 h-11 w-full rounded-lg border bg-background px-3 font-normal"
              />
            </label>
          </div>

          <label className="block text-sm font-semibold">
            Producer Story & Heritage
            <textarea
              rows={4}
              value={story}
              onChange={(e) => setStory(e.target.value)}
              placeholder="Tell patrons about your heritage process, generational farming, or craft..."
              className="mt-1.5 w-full rounded-lg border bg-background p-3 font-normal"
            />
          </label>
        </div>
      </form>
    </div>
  )
}

// ── 11. Documents & Compliance View ───────────────────────────────────────────

function Documents() {
  const [docs, setDocs] = useState<ComplianceDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)

  const [docName, setDocName] = useState('')
  const [docType, setDocType] = useState('organic')
  const [fileUrl, setFileUrl] = useState('')

  const loadDocs = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getVendorComplianceApi()
      setDocs(data || [])
    } catch (err: unknown) {
      const e = err as Error
      setError(e.message || 'Failed to load compliance documents')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDocs()
  }, [loadDocs])

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setUploading(true)
      setError(null)
      if (!fileUrl.startsWith('https://')) {
        throw new Error('File URL must use HTTPS protocol')
      }
      await uploadComplianceDocApi({
        name: docName.trim(),
        type: docType,
        fileUrl: fileUrl.trim(),
      })
      setShowUploadModal(false)
      setDocName('')
      setFileUrl('')
      loadDocs()
    } catch (err: unknown) {
      const e = err as Error
      setError(e.message || 'Failed to save compliance document')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Verification"
        title="Compliance & Certifications"
        action={
          <button
            onClick={() => setShowUploadModal(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow"
          >
            <Plus className="size-4" /> Add Document
          </button>
        }
      />

      {showUploadModal && (
        <form onSubmit={handleUpload} className="rounded-xl border bg-card p-5 shadow-sm space-y-4 max-w-xl">
          <div className="flex items-center justify-between border-b pb-3">
            <p className="font-bold text-sm">Add Compliance Document</p>
            <button type="button" onClick={() => setShowUploadModal(false)} className="text-muted-foreground">
              <X className="size-4" />
            </button>
          </div>
          <label className="block text-sm font-semibold">
            Document Label *
            <input
              value={docName}
              onChange={(e) => setDocName(e.target.value)}
              placeholder="e.g. NPOP Organic Certificate"
              required
              className="mt-1.5 h-10 w-full rounded-lg border bg-background px-3 font-normal"
            />
          </label>
          <label className="block text-sm font-semibold">
            Type *
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              className="mt-1.5 h-10 w-full rounded-lg border bg-background px-3 font-normal"
            >
              <option value="organic">Organic Certification</option>
              <option value="fssai">FSSAI License</option>
              <option value="gst">GST Certificate</option>
              <option value="pan">PAN Card</option>
              <option value="trade_license">Trade License</option>
              <option value="certificate">Quality Certificate</option>
            </select>
          </label>
          <label className="block text-sm font-semibold">
            Secure File HTTPS URL *
            <input
              value={fileUrl}
              onChange={(e) => setFileUrl(e.target.value)}
              placeholder="https://res.cloudinary.com/.../doc.pdf"
              required
              className="mt-1.5 h-10 w-full rounded-lg border bg-background px-3 font-normal"
            />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowUploadModal(false)}
              className="rounded-lg border px-3 py-1.5 text-xs font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading}
              className="rounded-lg bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground disabled:opacity-50"
            >
              {uploading ? 'Saving...' : 'Save Document'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <LoadingCard count={3} />
      ) : error ? (
        <ErrorCard message={error} onRetry={loadDocs} />
      ) : docs.length === 0 ? (
        <EmptyState
          title="No documents uploaded"
          description="Upload your FSSAI, GST, or organic certifications to complete verification."
          action={
            <button
              onClick={() => setShowUploadModal(true)}
              className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground"
            >
              Add Document
            </button>
          }
        />
      ) : (
        <div className="space-y-3">
          {docs.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between rounded-xl border bg-card p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <FileText className="size-6 text-primary" />
                <div>
                  <p className="font-bold text-sm">{doc.name}</p>
                  <p className="text-xs text-muted-foreground uppercase">{doc.type}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={doc.status} />
                <a
                  href={doc.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border px-3 py-1.5 text-xs font-bold hover:bg-muted"
                >
                  View
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── 12. Payouts & Wallet View ─────────────────────────────────────────────────

function Payouts() {
  const [wallet, setWallet] = useState<{ availableBalance: number; pendingBalance: number; totalPaidOut: number } | null>(null)
  const [payouts, setPayouts] = useState<VendorTransfer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [payoutAmount, setPayoutAmount] = useState('')
  const [requestLoading, setRequestLoading] = useState(false)
  const [payoutSuccess, setPayoutSuccess] = useState<string | null>(null)

  const loadFinance = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const [walletRes, payoutsRes] = await Promise.all([
        getVendorWalletApi(),
        getVendorPayoutsApi(),
      ])
      setWallet(walletRes)
      setPayouts(payoutsRes?.payouts || [])
    } catch (err: unknown) {
      const e = err as Error
      setError(e.message || 'Failed to load wallet data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadFinance()
  }, [loadFinance])

  const handleRequestPayout = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setRequestLoading(true)
      setError(null)
      setPayoutSuccess(null)
      const amt = parseFloat(payoutAmount)
      if (isNaN(amt) || amt < 500) {
        throw new Error('Minimum payout request is ₹500')
      }
      if (wallet && amt > wallet.availableBalance) {
        throw new Error('Requested amount exceeds available balance')
      }
      await requestPayoutApi(amt)
      setPayoutSuccess('Payout request submitted successfully.')
      setPayoutAmount('')
      loadFinance()
    } catch (err: unknown) {
      const e = err as Error
      setError(e.message || 'Payout request failed')
    } finally {
      setRequestLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeader eyebrow="Finance" title="Wallet & Payouts" />

      {payoutSuccess && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 p-4 text-sm font-semibold text-emerald-600">
          <CheckCircle2 className="size-5" /> {payoutSuccess}
        </div>
      )}
      {error && <ErrorCard message={error} />}

      <div className="grid gap-4 sm:grid-cols-3">
        <Metric
          label="Available balance"
          value={money(wallet?.availableBalance ?? 0)}
          detail="Delivered orders ready for payout"
        />
        <Metric
          label="Pending / in-transit"
          value={money(wallet?.pendingBalance ?? 0)}
          detail="Orders currently in processing or shipment"
        />
        <Metric
          label="Total paid out"
          value={money(wallet?.totalPaidOut ?? 0)}
          detail="All-time completed transfers"
        />
      </div>

      <div className="rounded-xl border bg-card p-5">
        <p className="font-bold mb-2">Request Wallet Payout</p>
        <p className="text-xs text-muted-foreground mb-4">
          Minimum withdrawal amount is ₹500. Funds will be transferred to your verified bank account.
        </p>
        <form onSubmit={handleRequestPayout} className="flex flex-wrap items-center gap-3">
          <input
            type="number"
            min="500"
            step="1"
            value={payoutAmount}
            onChange={(e) => setPayoutAmount(e.target.value)}
            placeholder="Enter amount (min ₹500)"
            required
            className="h-10 w-64 rounded-lg border bg-background px-3 text-sm font-normal"
          />
          <button
            type="submit"
            disabled={requestLoading || (wallet?.availableBalance ?? 0) < 500}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-40"
          >
            {requestLoading ? 'Requesting...' : 'Request Payout'}
          </button>
        </form>
      </div>

      <div className="rounded-xl border bg-card p-5">
        <p className="font-bold mb-4">Payout History</p>
        {loading ? (
          <LoadingCard count={2} />
        ) : payouts.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No previous payouts recorded.</p>
        ) : (
          <div className="space-y-3">
            {payouts.map((t) => (
              <div key={t.id} className="flex items-center justify-between border-b pb-3 last:border-0 text-sm">
                <div>
                  <p className="font-semibold">{money(t.amount)}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(t.createdAt).toLocaleDateString('en-IN')} · {t.transferType || 'Transfer'}
                  </p>
                </div>
                <StatusBadge status={t.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── 13. Analytics View ────────────────────────────────────────────────────────

function Analytics() {
  const [period, setPeriod] = useState('30d')
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadAnalytics = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await getVendorAnalyticsApi(period)
      setData(res)
    } catch (err: unknown) {
      const e = err as Error
      setError(e.message || 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => {
    loadAnalytics()
  }, [loadAnalytics])

  const maxVal = data?.salesTrend?.length ? Math.max(...data.salesTrend.map((t) => t.revenue), 1) : 1

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Signals & Performance"
        title="Business Analytics"
        action={
          <div className="flex gap-1.5 overflow-x-auto rounded-lg border bg-card p-1">
            {['7d', '30d', '90d', '1y', 'all'].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`rounded px-3 py-1 text-xs font-bold uppercase transition ${
                  period === p ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        }
      />

      {loading ? (
        <LoadingCard count={4} />
      ) : error ? (
        <ErrorCard message={error} onRetry={loadAnalytics} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Metric label="Revenue in period" value={money(data?.revenue ?? 0)} detail="Gross order subtotal" />
            <Metric label="Net payout earnings" value={money(data?.payout ?? 0)} detail="After commission" />
            <Metric label="Commission deducted" value={money(data?.commission ?? 0)} detail="Aggregated order snapshots" />
            <Metric label="Average Order Value" value={money(data?.aov ?? 0)} detail={`Across ${data?.orders ?? 0} orders`} />
          </div>

          <div className="rounded-xl border bg-card p-5">
            <p className="font-bold">Sales Trend</p>
            <p className="mt-1 text-xs text-muted-foreground">Aggregated daily revenue for period ({period})</p>
            {data?.salesTrend && data.salesTrend.length > 0 ? (
              <div className="mt-8 flex h-52 items-end gap-2 border-b border-l px-3">
                {data.salesTrend.map((pt, idx) => {
                  const pct = Math.max(5, Math.min(100, Math.round((pt.revenue / maxVal) * 100)))
                  return (
                    <div key={idx} className="flex flex-1 flex-col items-center justify-end" title={`${pt.date}: ₹${pt.revenue}`}>
                      <div className="w-full rounded-t bg-primary/80 transition-all hover:bg-primary" style={{ height: `${pct}%` }} />
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
                No orders during this timeframe.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ── 14. Settings View ─────────────────────────────────────────────────────────

function SettingsView() {
  const [settings, setSettings] = useState<ShopSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [shopName, setShopName] = useState('')
  const [tagline, setTagline] = useState('')
  const [shopDescription, setShopDescription] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [isPublished, setIsPublished] = useState(true)

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getShopSettingsApi()
      setSettings(data)
      setShopName(data?.shopName || '')
      setTagline(data?.tagline || '')
      setShopDescription(data?.shopDescription || '')
      setEmail(data?.email || '')
      setPhone(data?.phone || '')
      setIsPublished(data?.isPublished !== false)
    } catch (err: unknown) {
      const e = err as Error
      setError(e.message || 'Failed to load shop settings')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setSaving(true)
      setError(null)
      setSuccess(false)
      const updated = await updateShopSettingsApi({
        shopName: shopName.trim(),
        tagline: tagline.trim(),
        shopDescription: shopDescription.trim(),
        email: email.trim(),
        phone: phone.trim(),
        isPublished,
      })
      setSettings(updated)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: unknown) {
      const e = err as Error
      setError(e.message || 'Failed to update settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingCard count={2} />

  return (
    <div className="max-w-2xl space-y-6">
      <SectionHeader
        eyebrow="Preferences"
        title="Shop Settings"
        action={
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        }
      />

      {success && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 p-4 text-sm font-semibold text-emerald-600">
          <CheckCircle2 className="size-5" /> Shop settings updated.
        </div>
      )}
      {error && <ErrorCard message={error} />}

      <form onSubmit={handleSave} className="space-y-4 rounded-xl border bg-card p-6 shadow-sm">
        <label className="block text-sm font-semibold">
          Store Front Name
          <input
            value={shopName}
            onChange={(e) => setShopName(e.target.value)}
            className="mt-1.5 h-11 w-full rounded-lg border bg-background px-3 font-normal"
          />
        </label>

        <label className="block text-sm font-semibold">
          Tagline
          <input
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            placeholder="e.g. Traditional cold-pressed oils from Bharatpur"
            className="mt-1.5 h-11 w-full rounded-lg border bg-background px-3 font-normal"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold">
            Support Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 h-11 w-full rounded-lg border bg-background px-3 font-normal"
            />
          </label>
          <label className="text-sm font-semibold">
            Support Phone
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1.5 h-11 w-full rounded-lg border bg-background px-3 font-normal"
            />
          </label>
        </div>

        <label className="block text-sm font-semibold">
          Shop Description
          <textarea
            rows={3}
            value={shopDescription}
            onChange={(e) => setShopDescription(e.target.value)}
            className="mt-1.5 w-full rounded-lg border bg-background p-3 font-normal"
          />
        </label>

        <label className="flex items-center justify-between border-t pt-4 text-sm font-semibold">
          <span>Publish Storefront to Marketplace</span>
          <input
            type="checkbox"
            checked={isPublished}
            onChange={(e) => setIsPublished(e.target.checked)}
            className="size-4 accent-primary"
          />
        </label>
      </form>
    </div>
  )
}

// ── 15. Support View ──────────────────────────────────────────────────────────

function Support() {
  const questions = [
    'How do I package fragile glass oil bottles for pickup?',
    'When are funds settled to my bank account?',
    'How do Shiprocket AWB labels get generated?',
  ]

  return (
    <div className="space-y-6">
      <SectionHeader eyebrow="Partner Desk" title="Support & Guidance" />
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border bg-card p-5">
          <CircleHelp className="size-6 text-primary mb-3" />
          <p className="font-bold">Knowledge Base</p>
          <p className="mt-1 text-xs text-muted-foreground">Logistics specifications and organic certification standards.</p>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <LifeBuoy className="size-6 text-primary mb-3" />
          <p className="font-bold">Partner Desk</p>
          <p className="mt-1 text-xs text-muted-foreground">Available Monday to Saturday, 10 AM – 6 PM IST.</p>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <FileText className="size-6 text-primary mb-3" />
          <p className="font-bold">Raise a Ticket</p>
          <p className="mt-1 text-xs text-muted-foreground">Fulfillment dispute and shipment exception assistance.</p>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-5">
        <p className="font-bold mb-3">Frequently Asked Questions</p>
        {questions.map((q, i) => (
          <div key={i} className="border-b py-3 last:border-0 text-sm flex items-center justify-between text-muted-foreground">
            <span>{q}</span>
            <ChevronRight className="size-4" />
          </div>
        ))}
      </div>
    </div>
  )
}

// ── 16. Notifications Component ───────────────────────────────────────────────

function Notifications() {
  const [notifications, setNotifications] = useState<VendorNotification[]>([])
  const [loading, setLoading] = useState(true)

  const loadNotifications = async () => {
    try {
      setLoading(true)
      const data = await getVendorNotificationsApi()
      setNotifications(data || [])
    } catch {
      setNotifications([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadNotifications()
  }, [])

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsReadApi()
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
    } catch {
      // ignore
    }
  }

  return (
    <div className="w-full max-w-sm rounded-xl border bg-card shadow-lg">
      <div className="flex items-center justify-between border-b p-4">
        <p className="font-bold text-sm">Notifications</p>
        <button onClick={handleMarkAllRead} className="text-xs font-bold text-primary hover:underline">
          Mark all read
        </button>
      </div>
      <div className="max-h-80 overflow-y-auto">
        {loading ? (
          <div className="p-4">
            <LoadingCard count={2} />
          </div>
        ) : notifications.length === 0 ? (
          <p className="text-xs text-muted-foreground p-5 text-center">No notifications.</p>
        ) : (
          notifications.map((item) => (
            <div key={item.id} className="border-b p-4 last:border-0 text-xs">
              <div className="flex items-center justify-between">
                <p className="font-bold text-sm">{item.title}</p>
                {!item.isRead && <span className="size-2 rounded-full bg-primary" />}
              </div>
              <p className="mt-1 text-muted-foreground">{item.message}</p>
              <p className="mt-2 text-[10px] text-muted-foreground">
                {new Date(item.createdAt).toLocaleDateString('en-IN')}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ── Main Shell ────────────────────────────────────────────────────────────────

export function SellerPortal({ view = 'overview', id }: Props) {
  const router = useRouter()
  const { isAuthenticated, rawUser, isLoading } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [vendorProfile, setVendorProfile] = useState<VendorProfile | null>(null)

  useEffect(() => {
    if (isAuthenticated) {
      getVendorProfileApi()
        .then(setVendorProfile)
        .catch(() => {})
    }
  }, [isAuthenticated])

  const role = (rawUser?.role || '').toLowerCase()
  const isAuthorizedSeller = Boolean(
    role === 'vendor' ||
    role === 'seller' ||
    role === 'producer_manager' ||
    rawUser?.isAdmin ||
    role === 'admin'
  )

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.replace('/auth/login')
      } else if (!isAuthorizedSeller) {
        router.replace('/account')
      }
    }
  }, [isLoading, isAuthenticated, isAuthorizedSeller, router])

  if (isLoading || !isAuthenticated || !isAuthorizedSeller) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-xs uppercase font-bold tracking-widest text-muted-foreground">Verifying partner portal access...</p>
        </div>
      </div>
    )
  }

  let content: React.ReactNode = <Overview />
  if (view === 'products') content = <ProductTable />
  if (view === 'new-product') content = <ProductForm />
  if (view === 'product-detail') content = <ProductDetail id={id} />
  if (view === 'orders') content = <Orders />
  if (view === 'order-detail') content = <OrderDetailView id={id} />
  if (view === 'inventory') content = <Inventory />
  if (view === 'customers') content = <Customers />
  if (view === 'reviews') content = <Reviews />
  if (view === 'profile') content = <Profile />
  if (view === 'documents') content = <Documents />
  if (view === 'payouts') content = <Payouts />
  if (view === 'analytics') content = <Analytics />
  if (view === 'settings') content = <SettingsView />
  if (view === 'support') content = <Support />

  const displayName = vendorProfile?.businessName || (rawUser as unknown as { businessName?: string })?.businessName || rawUser?.name || 'Producer Store'
  const displayInitial = displayName ? displayName[0].toUpperCase() : 'P'

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r bg-card transition-transform lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b px-5">
          <Link href="/seller" className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              FS
            </span>
            <span className="text-sm font-extrabold tracking-tight">FSO PARTNER</span>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden" aria-label="Close navigation">
            <X className="size-5" />
          </button>
        </div>

        <div className="border-b p-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-full bg-primary/20 text-primary text-xs font-bold">
              {displayInitial}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold truncate">{displayName}</p>
              <p className="text-xs text-muted-foreground">Producer Account</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-3">
          {navGroups.map((group) => (
            <div key={group.label} className="mb-6">
              <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {group.label}
              </p>
              {group.items.map(([key, label, Icon]) => (
                <Link
                  key={key}
                  href={key === 'overview' ? '/seller' : `/seller/${key}`}
                  onClick={() => setSidebarOpen(false)}
                  className={`mb-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                    view === key
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <Icon className="size-4" />
                  {label}
                </Link>
              ))}
            </div>
          ))}

          <div className="border-t pt-3">
            <Link
              href="/seller/settings"
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-muted"
            >
              <Settings className="size-4" /> Settings
            </Link>
            <Link
              href="/seller/support"
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-muted"
            >
              <LifeBuoy className="size-4" /> Support
            </Link>
          </div>
        </nav>

        <div className="border-t p-4">
          <Link href="/" className="text-xs font-semibold text-muted-foreground hover:text-primary">
            ← Back to marketplace
          </Link>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur md:px-8">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation"
              className="rounded-lg p-2 hover:bg-muted lg:hidden"
            >
              <Menu className="size-5" />
            </button>
            <BackButton fallbackHref="/" label="Marketplace" variant="subtle" className="text-xs mr-1" />
            <div className="hidden items-center gap-2 text-sm text-muted-foreground md:flex">
              <span>Seller portal</span>
              <ChevronRight className="size-4" />
              <span className="font-semibold capitalize text-foreground">{view.replace('-', ' ')}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setNotificationsOpen((open) => !open)}
              aria-label="Open notifications"
              className="relative size-9 rounded-lg hover:bg-muted flex items-center justify-center"
            >
              <Bell className="size-4" />
              <span className="absolute right-2 top-2 size-1.5 rounded-full bg-primary" />
            </button>
            <div className="ml-2 flex size-8 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
              {displayInitial}
            </div>
          </div>
        </header>

        <main className="relative mx-auto max-w-[1440px] p-4 md:p-8">
          {content}
          {notificationsOpen && (
            <div className="absolute right-4 top-4 z-20 md:right-8">
              <Notifications />
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
