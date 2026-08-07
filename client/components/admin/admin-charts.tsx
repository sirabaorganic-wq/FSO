'use client'

import { useState } from 'react'
import { TrendingUp, ArrowUpRight, ShoppingBag, MapPin, Layers } from 'lucide-react'
import { mockAnalyticsData } from '@/data/admin/analytics'

export function RevenueGraph() {
  const [activePoint, setActivePoint] = useState<number | null>(7) // Default to latest month (Aug)
  const data = mockAnalyticsData.monthlyRevenue

  const maxRevenue = Math.max(...data.map((d) => d.revenue)) * 1.15
  const width = 600
  const height = 220
  const paddingX = 40
  const paddingY = 30

  const points = data.map((d, i) => {
    const x = paddingX + (i * (width - paddingX * 2)) / (data.length - 1)
    const y = height - paddingY - (d.revenue / maxRevenue) * (height - paddingY * 2)
    return { x, y, month: d.month, revenue: d.revenue, orders: d.orders }
  })

  const pathD = points.reduce(
    (acc, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`),
    ''
  )

  const areaD = `${pathD} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`

  const activeData = activePoint !== null ? points[activePoint] : points[points.length - 1]

  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-4">
        <div>
          <p className="eyebrow">Financial Trajectory</p>
          <h3 className="font-serif text-xl font-bold text-foreground">Monthly Revenue Growth</h3>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs font-semibold text-muted-foreground">
              {activeData.month} Revenue
            </p>
            <p className="font-serif text-lg font-bold text-primary">
              ₹{activeData.revenue.toLocaleString('en-IN')}
            </p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-400">
            <TrendingUp className="size-3.5" /> +18.4% YoY
          </span>
        </div>
      </div>

      {/* SVG Chart */}
      <div className="relative mt-4 w-full overflow-hidden">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-56 overflow-visible">
          <defs>
            <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0.25, 0.5, 0.75, 1].map((ratio, idx) => {
            const y = height - paddingY - ratio * (height - paddingY * 2)
            return (
              <line
                key={idx}
                x1={paddingX}
                y1={y}
                x2={width - paddingX}
                y2={y}
                stroke="currentColor"
                className="text-border/40"
                strokeDasharray="4 4"
              />
            )
          })}

          {/* Area fill */}
          <path d={areaD} fill="url(#revGradient)" />

          {/* Line */}
          <path
            d={pathD}
            fill="none"
            stroke="var(--primary)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data Points */}
          {points.map((p, idx) => (
            <g key={idx} className="cursor-pointer" onMouseEnter={() => setActivePoint(idx)}>
              <circle
                cx={p.x}
                cy={p.y}
                r={activePoint === idx ? 6 : 4}
                className={activePoint === idx ? 'fill-accent stroke-surface' : 'fill-primary stroke-surface'}
                strokeWidth={activePoint === idx ? 3 : 2}
              />
              <text
                x={p.x}
                y={height - 8}
                textAnchor="middle"
                className="text-[10px] fill-muted-foreground font-semibold"
              >
                {p.month}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  )
}

export function OrdersBarGraph() {
  const data = mockAnalyticsData.monthlyRevenue

  const maxOrders = Math.max(...data.map((d) => d.orders)) * 1.2

  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-xs">
      <div className="flex items-center justify-between border-b border-border/60 pb-4">
        <div>
          <p className="eyebrow">Fulfillment Volume</p>
          <h3 className="font-serif text-xl font-bold text-foreground">Monthly Orders Processed</h3>
        </div>
        <span className="text-xs font-bold text-secondary">3,240 Orders Total</span>
      </div>

      <div className="mt-5 flex h-48 items-end gap-3 pt-4">
        {data.map((item, idx) => {
          const heightPercent = (item.orders / maxOrders) * 100
          return (
            <div key={idx} className="group flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-bold text-foreground bg-surface-muted px-1.5 py-0.5 rounded border border-border">
                {item.orders}
              </div>
              <div
                style={{ height: `${heightPercent}%` }}
                className="w-full rounded-t-md bg-secondary/80 group-hover:bg-secondary transition-all"
              />
              <span className="text-[10px] font-semibold text-muted-foreground mt-1">{item.month}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function CategoryDonutChart() {
  const categories = mockAnalyticsData.categoryShare

  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-xs">
      <div className="flex items-center justify-between border-b border-border/60 pb-4">
        <div>
          <p className="eyebrow">Marketplace Mix</p>
          <h3 className="font-serif text-xl font-bold text-foreground">Category Sales Share</h3>
        </div>
        <Layers className="size-4 text-muted-foreground" />
      </div>

      <div className="mt-4 flex flex-col sm:flex-row items-center gap-6">
        <div className="relative grid size-40 place-items-center shrink-0">
          <svg viewBox="0 0 100 100" className="size-full -rotate-90">
            {categories.map((cat, i) => {
              const prevTotal = categories.slice(0, i).reduce((sum, c) => sum + c.percentage, 0)
              const strokeDasharray = `${cat.percentage} ${100 - cat.percentage}`
              const strokeDashoffset = -prevTotal
              return (
                <circle
                  key={cat.category}
                  cx="50"
                  cy="50"
                  r="38"
                  fill="transparent"
                  stroke={cat.color}
                  strokeWidth="14"
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  pathLength="100"
                />
              )
            })}
          </svg>
          <div className="absolute flex flex-col items-center justify-center text-center">
            <span className="font-serif text-xl font-bold text-foreground">100%</span>
            <span className="text-[10px] text-muted-foreground font-semibold">5 Categories</span>
          </div>
        </div>

        <div className="w-full space-y-2.5">
          {categories.map((cat) => (
            <div key={cat.category} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="size-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                <span className="font-semibold text-foreground">{cat.category}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground">₹{cat.revenue.toLocaleString('en-IN')}</span>
                <span className="font-bold text-foreground w-8 text-right">{cat.percentage}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function StateSalesMap() {
  const states = mockAnalyticsData.stateSales

  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-xs">
      <div className="flex items-center justify-between border-b border-border/60 pb-4">
        <div>
          <p className="eyebrow">Geographic Reach</p>
          <h3 className="font-serif text-xl font-bold text-foreground">State-wise Demand</h3>
        </div>
        <MapPin className="size-4 text-muted-foreground" />
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {states.map((st) => (
          <div
            key={st.state}
            className="flex items-center justify-between rounded-lg border border-border/60 bg-background/60 p-3 hover:border-border transition-colors"
          >
            <div>
              <p className="text-xs font-bold text-foreground">{st.state}</p>
              <p className="text-[11px] text-muted-foreground">{st.orders} Orders Delivered</p>
            </div>
            <div className="text-right">
              <p className="font-serif text-sm font-bold text-primary">₹{st.revenue.toLocaleString('en-IN')}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
