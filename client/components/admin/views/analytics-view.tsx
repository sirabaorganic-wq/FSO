'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, Users, ShoppingBag, Award, AlertCircle, RefreshCw } from 'lucide-react'
import { RevenueGraph, OrdersBarGraph, CategoryDonutChart, StateSalesMap } from '../admin-charts'
import {
  getAdminAnalyticsOverviewApi,
  getAdminVendorAnalyticsApi,
  getAdminOrderAnalyticsApi,
  type AdminAnalyticsOverview,
  type AdminVendorAnalytics,
  type AdminOrderAnalytics,
} from '@/lib/api/admin'

export function AnalyticsView() {
  const [overview, setOverview] = useState<AdminAnalyticsOverview | null>(null)
  const [vendorAnalytics, setVendorAnalytics] = useState<AdminVendorAnalytics | null>(null)
  const [orderAnalytics, setOrderAnalytics] = useState<AdminOrderAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadAnalytics = async () => {
    try {
      setLoading(true)
      setError(null)
      const [overRes, vendRes, ordRes] = await Promise.all([
        getAdminAnalyticsOverviewApi(),
        getAdminVendorAnalyticsApi().catch(() => null),
        getAdminOrderAnalyticsApi().catch(() => null),
      ])
      setOverview(overRes)
      setVendorAnalytics(vendRes)
      setOrderAnalytics(ordRes)
    } catch (err: unknown) {
      console.error('Failed to load analytics:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics metrics')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAnalytics()
  }, [])

  if (loading) {
    return (
      <div className="space-y-4 p-4 animate-pulse">
        <div className="h-8 w-48 bg-surface-muted rounded" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-surface-muted rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-64 bg-surface-muted rounded-xl" />
          <div className="h-64 bg-surface-muted rounded-xl" />
        </div>
      </div>
    )
  }

  if (error || !overview) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center space-y-4">
        <AlertCircle className="size-10 text-destructive mx-auto" />
        <p className="text-sm font-semibold text-foreground">{error || 'Failed to load analytics'}</p>
        <button
          type="button"
          onClick={loadAnalytics}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90"
        >
          <RefreshCw className="size-3.5" /> Retry
        </button>
      </div>
    )
  }

  const totalRevenue = orderAnalytics?.totalRevenue || 0
  const totalOrders = overview.totalOrders || 0
  const totalVendors = overview.totalVendors || 0
  const totalUsers = overview.totalUsers || 0
  const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="eyebrow">Deep Intelligence</span>
          <h2 className="font-serif text-2xl font-bold text-foreground">Marketplace Analytics</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-bold text-foreground">
            Authoritative Neon Ledger
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border bg-surface p-4 text-xs space-y-1">
          <p className="text-muted-foreground">Gross Merchandise Value (GMV)</p>
          <p className="font-serif text-2xl font-bold text-foreground">₹{totalRevenue.toLocaleString('en-IN')}</p>
          <p className="text-muted-foreground font-semibold">Persisted order revenue</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4 text-xs space-y-1">
          <p className="text-muted-foreground">Total Orders Recorded</p>
          <p className="font-serif text-2xl font-bold text-foreground">{totalOrders.toLocaleString('en-IN')}</p>
          <p className="text-muted-foreground font-semibold">Authoritative checkouts</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4 text-xs space-y-1">
          <p className="text-muted-foreground">Registered User Base</p>
          <p className="font-serif text-2xl font-bold text-foreground">{totalUsers.toLocaleString('en-IN')}</p>
          <p className="text-muted-foreground font-semibold">{totalVendors} Active Vendors</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4 text-xs space-y-1">
          <p className="text-muted-foreground">Average Order Value (AOV)</p>
          <p className="font-serif text-2xl font-bold text-foreground">₹{avgOrderValue}</p>
          <p className="text-muted-foreground font-semibold">Dynamic basket average</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RevenueGraph totalRevenue={totalRevenue} />
        <OrdersBarGraph totalOrders={totalOrders} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CategoryDonutChart />
        <StateSalesMap />
      </div>

      {/* Leaderboards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-border bg-surface p-5 shadow-xs space-y-3 text-xs">
          <div className="flex items-center justify-between border-b border-border/60 pb-2">
            <h3 className="font-serif text-lg font-bold text-foreground">Top Selling Products</h3>
            <Award className="size-4 text-accent" />
          </div>
          <div className="py-6 text-center text-muted-foreground">
            <p>No products ordered yet.</p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-5 shadow-xs space-y-3 text-xs">
          <div className="flex items-center justify-between border-b border-border/60 pb-2">
            <h3 className="font-serif text-lg font-bold text-foreground">Top Performing Producers</h3>
            <Award className="size-4 text-secondary" />
          </div>
          <div className="py-6 text-center text-muted-foreground">
            <p>{totalVendors > 0 ? `${totalVendors} vendors registered in system.` : 'No vendors registered.'}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
