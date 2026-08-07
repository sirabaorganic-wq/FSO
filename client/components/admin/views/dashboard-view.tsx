'use client'

import Image from 'next/image'
import Link from 'next/link'
import {
  IndianRupee,
  ShoppingCart,
  Users,
  UserCheck,
  UserCog,
  Star,
  TrendingUp,
  ArrowUpRight,
  Plus,
  ShieldCheck,
  AlertCircle,
  Eye,
  CheckCircle2,
  Clock,
  ChevronRight,
} from 'lucide-react'
import { mockAnalyticsData } from '@/data/admin/analytics'
import { mockAdminOrders } from '@/data/admin/orders'
import { mockProducerApprovals } from '@/data/admin/producers'
import { mockActivityLogs } from '@/data/admin/analytics'
import { RevenueGraph, OrdersBarGraph, CategoryDonutChart } from '../admin-charts'

export function DashboardView() {
  const summary = mockAnalyticsData.summary

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner / Welcome */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border/80 bg-gradient-to-r from-primary/10 via-surface to-surface p-6 shadow-xs">
        <div>
          <span className="eyebrow">Marketplace Health Overview</span>
          <h2 className="font-serif text-2xl font-bold text-foreground mt-1">
            Good afternoon, Aarav
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Everything is running smoothly across all 64 artisanal producer hubs.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/producer-approvals"
            className="flex items-center gap-2 rounded-xl bg-secondary px-4 py-2 text-xs font-bold text-secondary-foreground hover:bg-secondary/90 transition-all shadow-xs"
          >
            <UserCog className="size-4" />
            <span>Review 2 Producer Approvals</span>
          </Link>
          <Link
            href="/admin/homepage"
            className="flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2 text-xs font-bold text-foreground hover:bg-surface-muted transition-all"
          >
            <span>Edit Homepage Hero</span>
          </Link>
        </div>
      </div>

      {/* 6 Key Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <MetricCard
          title="Total Revenue"
          value={`₹${(summary.totalRevenue / 100000).toFixed(2)}L`}
          growth={summary.revenueGrowth}
          icon={IndianRupee}
          accent="text-emerald-700 dark:text-emerald-400"
        />
        <MetricCard
          title="Orders Processed"
          value={summary.totalOrders.toLocaleString()}
          growth={summary.ordersGrowth}
          icon={ShoppingCart}
          accent="text-secondary"
        />
        <MetricCard
          title="Active Customers"
          value={summary.activeCustomers.toLocaleString()}
          growth={summary.customerGrowth}
          icon={Users}
          accent="text-primary"
        />
        <MetricCard
          title="Active Producers"
          value={summary.activeProducers}
          growth={summary.producerGrowth}
          icon={UserCheck}
          accent="text-accent-foreground"
        />
        <MetricCard
          title="Pending Approvals"
          value="2 Queue"
          growth="Action Req."
          icon={UserCog}
          accent="text-amber-600"
        />
        <MetricCard
          title="Avg Order Value"
          value={`₹${summary.avgOrderValue}`}
          growth="+5.2%"
          icon={TrendingUp}
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
                <p className="eyebrow">Live Transactions</p>
                <h3 className="font-serif text-xl font-bold text-foreground">Latest Orders</h3>
              </div>
              <Link href="/admin/orders" className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
                View All Orders <ChevronRight className="size-3.5" />
              </Link>
            </div>
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
                  {mockAdminOrders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-surface-muted/40 transition-colors">
                      <td className="py-3 px-3 font-semibold text-foreground">{ord.orderNumber}</td>
                      <td className="py-3 px-3 text-muted-foreground">{ord.customerName}</td>
                      <td className="py-3 px-3 font-serif font-bold text-foreground">₹{ord.totalAmount}</td>
                      <td className="py-3 px-3">
                        <span className="rounded bg-surface-muted px-2 py-0.5 text-[10px] font-semibold">
                          {ord.paymentMethod}
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
          </div>

          <OrdersBarGraph />
        </div>

        {/* Right Sidebar: Pending Approvals & Activity Feed */}
        <div className="space-y-6">
          {/* Pending Approvals Widget */}
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-amber-500/20 pb-3">
              <div className="flex items-center gap-2">
                <UserCog className="size-4 text-amber-600" />
                <h3 className="font-serif text-lg font-bold text-foreground">Pending Approvals</h3>
              </div>
              <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                2 Pending
              </span>
            </div>
            <div className="mt-3 space-y-3">
              {mockProducerApprovals.slice(0, 2).map((appr) => (
                <div key={appr.id} className="rounded-lg border border-border/80 bg-surface p-3 text-xs space-y-1.5">
                  <div className="flex items-center justify-between font-bold text-foreground">
                    <span>{appr.businessName}</span>
                    <span className="text-[10px] text-muted-foreground">{appr.state}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{appr.craftType}</p>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">
                      {appr.documentsCount} Docs Verified
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
          </div>

          {/* System Activity Feed */}
          <div className="rounded-xl border border-border bg-surface p-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 className="font-serif text-lg font-bold text-foreground">Recent Audit Log</h3>
              <Link href="/admin/activity" className="text-xs font-bold text-primary hover:underline">
                Full Log
              </Link>
            </div>
            <div className="mt-3 space-y-3">
              {mockActivityLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-2.5 text-xs border-b border-border/40 pb-2.5 last:border-none">
                  <div className="grid size-6 shrink-0 place-items-center rounded-full bg-surface-muted text-muted-foreground mt-0.5">
                    <Clock className="size-3" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground leading-snug">{log.action}</p>
                    <p className="text-[11px] text-muted-foreground">{log.target}</p>
                    <span className="text-[10px] text-muted-foreground/80">{log.actor} • {log.timestamp.split(' ')[1]}</span>
                  </div>
                </div>
              ))}
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
        <span className="text-muted-foreground">vs last month</span>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    Placed: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20',
    Processing: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
    Shipped: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20',
    Delivered: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
    Returned: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20',
  }
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
        styles[status] || 'bg-surface-muted text-foreground'
      }`}
    >
      {status}
    </span>
  )
}
