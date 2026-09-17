'use client'

import { useState } from 'react'
import { TrendingUp, Layers, MapPin } from 'lucide-react'

interface MonthlyPoint {
  month: string
  revenue: number
  orders: number
}

interface CategoryPoint {
  category: string
  percentage: number
  revenue: number
  color: string
}

interface StatePoint {
  state: string
  orders: number
  revenue: number
}

export function RevenueGraph({
  data = [],
  totalRevenue = 0,
}: {
  data?: MonthlyPoint[]
  totalRevenue?: number
}) {
  const [activePoint, setActivePoint] = useState<number | null>(null)

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug']
  const displayData: MonthlyPoint[] =
    data.length > 0
      ? data
      : months.map((m) => ({ month: m, revenue: 0, orders: 0 }))

  const maxRevenue = Math.max(...displayData.map((d) => d.revenue), 1000)
  const width = 600
  const height = 220
  const paddingX = 40
  const paddingY = 30

  const points = displayData.map((d, i) => {
    const x = paddingX + (i * (width - paddingX * 2)) / (displayData.length - 1)
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
          <span className="inline-flex items-center gap-1 rounded-full bg-surface-muted px-2.5 py-1 text-xs font-bold text-foreground">
            {totalRevenue > 0 ? `₹${totalRevenue.toLocaleString('en-IN')} Cumulative` : '₹0 Live Baseline'}
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

export function OrdersBarGraph({
  data = [],
  totalOrders = 0,
}: {
  data?: MonthlyPoint[]
  totalOrders?: number
}) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug']
  const displayData: MonthlyPoint[] =
    data.length > 0
      ? data
      : months.map((m) => ({ month: m, revenue: 0, orders: 0 }))

  const maxOrders = Math.max(...displayData.map((d) => d.orders), 10)

  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-xs">
      <div className="flex items-center justify-between border-b border-border/60 pb-4">
        <div>
          <p className="eyebrow">Fulfillment Volume</p>
          <h3 className="font-serif text-xl font-bold text-foreground">Monthly Orders Processed</h3>
        </div>
        <span className="text-xs font-bold text-secondary">{totalOrders.toLocaleString('en-IN')} Orders Total</span>
      </div>

      <div className="mt-5 flex h-48 items-end gap-3 pt-4">
        {displayData.map((item, idx) => {
          const heightPercent = maxOrders > 0 ? (item.orders / maxOrders) * 100 : 0
          return (
            <div key={idx} className="group flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-bold text-foreground bg-surface-muted px-1.5 py-0.5 rounded border border-border">
                {item.orders}
              </div>
              <div
                style={{ height: `${Math.max(heightPercent, 2)}%` }}
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

export function CategoryDonutChart({
  categories = [],
}: {
  categories?: CategoryPoint[]
}) {
  const displayCategories = categories.length > 0 ? categories : [
    { category: 'Vedic Ghee', percentage: 20, revenue: 0, color: '#c99b38' },
    { category: 'Cold Pressed Oils', percentage: 20, revenue: 0, color: '#a9582f' },
    { category: 'Wild Honey', percentage: 20, revenue: 0, color: '#356b48' },
    { category: 'Himalayan Spices', percentage: 20, revenue: 0, color: '#a33c2c' },
    { category: 'Heirloom Grains', percentage: 20, revenue: 0, color: '#173e28' },
  ]

  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-xs">
      <div className="flex items-center justify-between border-b border-border/60 pb-4">
        <div>
          <p className="eyebrow">Marketplace Mix</p>
          <h3 className="font-serif text-xl font-bold text-foreground">Category Share</h3>
        </div>
        <Layers className="size-4 text-muted-foreground" />
      </div>

      <div className="mt-4 flex flex-col sm:flex-row items-center gap-6">
        <div className="relative grid size-40 place-items-center shrink-0">
          <svg viewBox="0 0 100 100" className="size-full -rotate-90">
            {displayCategories.map((cat, i) => {
              const prevTotal = displayCategories.slice(0, i).reduce((sum, c) => sum + c.percentage, 0)
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
            <span className="font-serif text-xl font-bold text-foreground">5</span>
            <span className="text-[10px] text-muted-foreground font-semibold">Active Classes</span>
          </div>
        </div>

        <div className="w-full space-y-2.5">
          {displayCategories.map((cat) => (
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

export function StateSalesMap({
  states = [],
}: {
  states?: StatePoint[]
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-xs">
      <div className="flex items-center justify-between border-b border-border/60 pb-4">
        <div>
          <p className="eyebrow">Geographic Reach</p>
          <h3 className="font-serif text-xl font-bold text-foreground">State-wise Demand</h3>
        </div>
        <MapPin className="size-4 text-muted-foreground" />
      </div>

      {states.length === 0 ? (
        <div className="py-8 text-center text-xs text-muted-foreground">
          <p>No regional sales records currently dispatched.</p>
        </div>
      ) : (
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
      )}
    </div>
  )
}
