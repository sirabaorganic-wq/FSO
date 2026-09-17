'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  IndianRupee,
  ShoppingCart,
  Users,
  UserCheck,
  UserCog,
  ShoppingBag,
  TrendingUp,
  AlertCircle,
  Clock,
  ChevronRight,
  RefreshCw,
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import {
  getAdminDashboardStatsApi,
  getAdminOrdersApi,
  type AdminDashboardData,
  type AdminOrderItem,
} from '@/lib/api/admin'
import { RevenueGraph, OrdersBarGraph, CategoryDonutChart } from '../admin-charts'

export function DashboardView() {
  const { rawUser } = useAuth()
  const [stats, setStats] = useState<AdminDashboardData | null>(null)
  const [orders, setOrders] = useState<AdminOrderItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      const [statsRes, ordersRes] = await Promise.all([
        getAdminDashboardStatsApi(),
        getAdminOrdersApi().catch(() => [] as AdminOrderItem[]),
      ])
      setStats(statsRes)
      setOrders(ordersRes || [])
    } catch (err: unknown) {
      console.error('Failed to fetch admin dashboard metrics:', err)
      setError(err instanceof Error ? err.message : 'Failed to connect to administrative metrics service')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse p-2">
        <div className="h-28 rounded-2xl bg-surface-muted/60" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-surface-muted/60" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-72 rounded-xl bg-surface-muted/60" />
          <div className="lg:col-span-1 h-72 rounded-xl bg-surface-muted/60" />
        </div>
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center space-y-4">
        <AlertCircle className="size-10 text-destructive mx-auto" />
        <div>
          <h3 className="text-lg font-serif font-bold text-foreground">Failed to Load Dashboard</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">{error || 'Server error occurred'}</p>
        </div>
        <button
          type="button"
          onClick={loadData}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-all shadow-xs"
        >
          <RefreshCw className="size-3.5" /> Retry Connection
        </button>
      </div>
    )
  }

  const adminName = rawUser?.name || 'Administrator'
  const pendingApprovalsCount = stats.pendingApprovalsCount || 0
  const totalRevenue = stats.totalRevenue || 0
  const avgOrderValue = stats.totalOrders > 0 ? Math.round(totalRevenue / stats.totalOrders) : 0

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner / Welcome */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border/80 bg-gradient-to-r from-primary/10 via-surface to-surface p-6 shadow-xs">
        <div>
          <span className="eyebrow">Marketplace Operations Command</span>
          <h2 className="font-serif text-2xl font-bold text-foreground mt-1">
            Welcome back, {adminName}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Platform synchronized live with Neon PostgreSQL database.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {pendingApprovalsCount > 0 && (
            <Link
              href="/admin/producer-approvals"
              className="flex items-center gap-2 rounded-xl bg-secondary px-4 py-2 text-xs font-bold text-secondary-foreground hover:bg-secondary/90 transition-all shadow-xs"
            >
              <UserCog className="size-4" />
              <span>Review {pendingApprovalsCount} Producer Approval{pendingApprovalsCount > 1 ? 's' : ''}</span>
            </Link>
          )}
          <Link
            href="/admin/system-settings"
            className="flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2 text-xs font-bold text-foreground hover:bg-surface-muted transition-all"
          >
            <span>Platform Settings</span>
          </Link>
        </div>
      </div>

      {/* 6 Key Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <MetricCard
          title="Total Revenue"
          value={`₹${totalRevenue.toLocaleString('en-IN')}`}
          growth={stats.totalOrders > 0 ? 'Live Captures' : '₹0 Invariant'}
          icon={IndianRupee}
          accent="text-emerald-700 dark:text-emerald-400"
        />
        <MetricCard
          title="Orders Processed"
          value={stats.totalOrders.toLocaleString('en-IN')}
          growth={stats.totalOrders > 0 ? 'Persisted' : 'Empty State'}
          icon={ShoppingCart}
          accent="text-secondary"
        />
        <MetricCard
          title="Registered Users"
          value={stats.totalUsers.toLocaleString('en-IN')}
          growth="Authoritative"
          icon={Users}
          accent="text-primary"
        />
        <MetricCard
          title="Registered Vendors"
          value={stats.totalVendors.toLocaleString('en-IN')}
          growth="Authoritative"
          icon={UserCheck}
          accent="text-accent-foreground"
        />
        <MetricCard
          title="Pending Approvals"
          value={`${pendingApprovalsCount} Queue`}
          growth={pendingApprovalsCount > 0 ? 'Action Req.' : 'Queue Clear'}
          icon={UserCog}
          accent="text-amber-600"
        />
        <MetricCard
          title="Catalog Products"
          value={stats.totalProducts.toLocaleString('en-IN')}
          growth={avgOrderValue > 0 ? `AOV: ₹${avgOrderValue}` : 'Prisma Stock'}
          icon={ShoppingBag}
          accent="text-emerald-600"
        />
      </div>

      {/* Graphs Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RevenueGraph />
        </div>
        <div className="lg:col-span-1">
          <CategoryDonutChart />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Latest Orders */}
          <div className="rounded-xl border border-border bg-surface p-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-border/60 pb-4">
              <div>
                <p className="eyebrow">Authoritative Transactions</p>
                <h3 className="font-serif text-xl font-bold text-foreground">Latest Orders</h3>
              </div>
              <Link href="/admin/orders" className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
                View All Orders <ChevronRight className="size-3.5" />
              </Link>
            </div>

            {orders.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground space-y-1">
                <ShoppingCart className="size-8 mx-auto text-muted-foreground/50 mb-2" />
                <p className="font-semibold text-foreground">No orders recorded in database</p>
                <p>As customers place orders, live transactions and financial settlements will appear here.</p>
              </div>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="border-b border-border/60 text-muted-foreground font-semibold uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">Order ID</th>
                      <th className="py-2.5 px-3">Customer</th>
                      <th className="py-2.5 px-3">Amount</th>
                      <th className="py-2.5 px-3">Payment</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {orders.slice(0, 5).map((ord) => (
                      <tr key={ord.id} className="hover:bg-surface-muted/40 transition-colors">
                        <td className="py-3 px-3 font-semibold text-foreground">{ord.orderNumber}</td>
                        <td className="py-3 px-3 text-muted-foreground">{ord.user?.name || 'Customer'}</td>
                        <td className="py-3 px-3 font-serif font-bold text-foreground">₹{ord.totalPrice}</td>
                        <td className="py-3 px-3">
                          <span className="rounded bg-surface-muted px-2 py-0.5 text-[10px] font-semibold">
                            {ord.paymentMethod} ({ord.isPaid ? 'PAID' : 'PENDING'})
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <StatusBadge status={ord.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <OrdersBarGraph />
        </div>

        {/* Right Sidebar: Pending Approvals & Status Widget */}
        <div className="space-y-6">
          {/* Pending Approvals Widget */}
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-amber-500/20 pb-3">
              <div className="flex items-center gap-2">
                <UserCog className="size-4 text-amber-600" />
                <h3 className="font-serif text-lg font-bold text-foreground">Pending Approvals</h3>
              </div>
              <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                {pendingApprovalsCount} Pending
              </span>
            </div>

            {stats.pendingVendors.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground">
                <p>No vendor applications currently pending review.</p>
              </div>
            ) : (
              <div className="mt-3 space-y-3">
                {stats.pendingVendors.slice(0, 3).map((appr) => (
                  <div key={appr.id} className="rounded-lg border border-border/80 bg-surface p-3 text-xs space-y-1.5">
                    <div className="flex items-center justify-between font-bold text-foreground">
                      <span>{appr.businessName}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">Contact: {appr.contactPerson} ({appr.email})</p>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-muted-foreground">
                        Submitted: {new Date(appr.createdAt).toLocaleDateString()}
                      </span>
                      <Link
                        href="/admin/producer-approvals"
                        className="text-[11px] font-bold text-primary hover:underline"
                      >
                        Inspect Details →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* System Status Card */}
          <div className="rounded-xl border border-border bg-surface p-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 className="font-serif text-lg font-bold text-foreground">Database Status</h3>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                Prisma 6.19.3
              </span>
            </div>
            <div className="mt-3 space-y-2.5 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-border/40">
                <span className="text-muted-foreground">Database Engine</span>
                <span className="font-semibold text-foreground">Neon PostgreSQL</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-border/40">
                <span className="text-muted-foreground">Security State</span>
                <span className="font-semibold text-foreground">Bearer JWT + HttpOnly Refresh</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-border/40">
                <span className="text-muted-foreground">Logistics Provider</span>
                <span className="font-semibold text-foreground">Shiprocket Authorized</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-muted-foreground">Payment Gateway</span>
                <span className="font-semibold text-foreground">Razorpay Authorized</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function MetricCard({
  title,
  value,
  growth,
  icon: Icon,
  accent,
}: {
  title: string
  value: string | number
  growth: string
  icon: React.ElementType
  accent: string
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4 shadow-2xs hover:border-border/80 transition-all">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-muted-foreground">{title}</span>
        <Icon className={`size-4 ${accent}`} />
      </div>
      <p className="font-serif text-2xl font-bold text-foreground mt-2">{value}</p>
      <div className="mt-1.5 flex items-center justify-between text-[10px]">
        <span className="font-bold text-emerald-700 dark:text-emerald-400">{growth}</span>
        <span className="text-muted-foreground">Live Neon Data</span>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const normalized = (status || '').toUpperCase()
  const styles: Record<string, string> = {
    CONFIRMED: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20',
    PROCESSING: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
    SHIPPED: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20',
    DELIVERED: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
    CANCELLED: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20',
  }
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
        styles[normalized] || 'bg-surface-muted text-foreground'
      }`}
    >
      {status}
    </span>
  )
}
