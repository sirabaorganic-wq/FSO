'use client'

import { TrendingUp, Users, ShoppingBag, MapPin, Layers, Award } from 'lucide-react'
import { RevenueGraph, OrdersBarGraph, CategoryDonutChart, StateSalesMap } from '../admin-charts'
import { mockAnalyticsData } from '@/data/admin/analytics'

export function AnalyticsView() {
  const summary = mockAnalyticsData.summary

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="eyebrow">Deep Intelligence</span>
          <h2 className="font-serif text-2xl font-bold text-foreground">Marketplace Analytics</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-bold text-foreground">
            Period: 2026 Year-To-Date
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border bg-surface p-4 text-xs space-y-1">
          <p className="text-muted-foreground">Gross Merchandise Value (GMV)</p>
          <p className="font-serif text-2xl font-bold text-foreground">₹{(summary.totalRevenue / 100000).toFixed(2)} Lakhs</p>
          <p className="text-emerald-600 font-bold">{summary.revenueGrowth} vs prev period</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4 text-xs space-y-1">
          <p className="text-muted-foreground">Total Orders Shipped</p>
          <p className="font-serif text-2xl font-bold text-foreground">{summary.totalOrders}</p>
          <p className="text-emerald-600 font-bold">{summary.ordersGrowth} volume increase</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4 text-xs space-y-1">
          <p className="text-muted-foreground">Storefront Conversion Rate</p>
          <p className="font-serif text-2xl font-bold text-foreground">{summary.conversionRate}%</p>
          <p className="text-emerald-600 font-bold">+0.4% higher than industry benchmark</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4 text-xs space-y-1">
          <p className="text-muted-foreground">Average Order Value (AOV)</p>
          <p className="font-serif text-2xl font-bold text-foreground">₹{summary.avgOrderValue}</p>
          <p className="text-emerald-600 font-bold">+₹42 per basket</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RevenueGraph />
        <OrdersBarGraph />
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
          <div className="space-y-2">
            {mockAnalyticsData.topProducts.map((p, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded bg-surface-muted/30">
                <span className="font-semibold text-foreground">{p.name}</span>
                <span className="font-serif font-bold text-primary">₹{p.revenue.toLocaleString('en-IN')}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-5 shadow-xs space-y-3 text-xs">
          <div className="flex items-center justify-between border-b border-border/60 pb-2">
            <h3 className="font-serif text-lg font-bold text-foreground">Top Performing Producers</h3>
            <Award className="size-4 text-secondary" />
          </div>
          <div className="space-y-2">
            {mockAnalyticsData.topProducers.map((p, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded bg-surface-muted/30">
                <div>
                  <p className="font-semibold text-foreground">{p.business}</p>
                  <p className="text-[10px] text-muted-foreground">{p.name}</p>
                </div>
                <span className="font-serif font-bold text-emerald-700 dark:text-emerald-400">
                  ₹{p.revenue.toLocaleString('en-IN')}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
