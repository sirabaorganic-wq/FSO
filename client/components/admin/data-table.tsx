'use client'

import { useState } from 'react'
import {
  Search,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Filter,
  CheckSquare,
  Square,
  Trash2,
  CheckCircle,
  XCircle,
  MoreVertical,
} from 'lucide-react'

export interface Column<T> {
  key: string
  header: string
  accessor: (item: T) => React.ReactNode
  sortable?: boolean
}

interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  searchPlaceholder?: string
  searchKey?: (item: T) => string
  filterOptions?: { label: string; value: string; filterFn: (item: T, val: string) => boolean }[]
  bulkActions?: { label: string; icon?: React.ElementType; onClick: (selectedItems: T[]) => void; variant?: 'default' | 'destructive' }[]
  keyExtractor: (item: T) => string
  pageSize?: number
}

export function DataTable<T>({
  data,
  columns,
  searchPlaceholder = 'Search records...',
  searchKey,
  filterOptions,
  bulkActions,
  keyExtractor,
  pageSize = 8,
}: DataTableProps<T>) {
  const [search, setSearch] = useState('')
  const [filterVal, setFilterVal] = useState('all')
  const [selectedKeys, setSelectedKeys] = useState<string[]>([])
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [currentPage, setCurrentPage] = useState(1)

  // 1. Filter
  let filtered = data
  if (search && searchKey) {
    filtered = filtered.filter((item) => searchKey(item).toLowerCase().includes(search.toLowerCase()))
  }
  if (filterVal !== 'all' && filterOptions) {
    const selectedFilter = filterOptions.find((f) => f.value === filterVal)
    if (selectedFilter) {
      filtered = filtered.filter((item) => selectedFilter.filterFn(item, filterVal))
    }
  }

  // 2. Sort
  if (sortKey) {
    const targetCol = columns.find((c) => c.key === sortKey)
    if (targetCol) {
      filtered = [...filtered].sort((a, b) => {
        const valA = String(targetCol.accessor(a))
        const valB = String(targetCol.accessor(b))
        if (valA < valB) return sortDir === 'asc' ? -1 : 1
        if (valA > valB) return sortDir === 'asc' ? 1 : -1
        return 0
      })
    }
  }

  // 3. Paginate
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const handleSelectAll = () => {
    if (selectedKeys.length === paginated.length) {
      setSelectedKeys([])
    } else {
      setSelectedKeys(paginated.map(keyExtractor))
    }
  }

  const handleSelectOne = (key: string) => {
    if (selectedKeys.includes(key)) {
      setSelectedKeys(selectedKeys.filter((k) => k !== key))
    } else {
      setSelectedKeys([...selectedKeys, key])
    }
  }

  const selectedItems = data.filter((item) => selectedKeys.includes(keyExtractor(item)))

  return (
    <div className="space-y-4">
      {/* Controls Bar: Search & Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-2 max-w-sm">
          <div className="relative w-full">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setCurrentPage(1)
              }}
              className="w-full rounded-lg border border-border/80 bg-surface pl-9 pr-3 py-1.5 text-xs outline-none focus:border-ring"
            />
          </div>
        </div>

        {filterOptions && filterOptions.length > 0 && (
          <div className="flex items-center gap-2">
            <Filter className="size-3.5 text-muted-foreground" />
            <select
              value={filterVal}
              onChange={(e) => {
                setFilterVal(e.target.value)
                setCurrentPage(1)
              }}
              className="rounded-lg border border-border/80 bg-surface px-2.5 py-1.5 text-xs outline-none focus:border-ring font-medium"
            >
              <option value="all">All Filter Statuses</option>
              {filterOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Bulk Action Bar Banner if items selected */}
      {selectedKeys.length > 0 && bulkActions && (
        <div className="flex items-center justify-between rounded-lg border border-secondary/40 bg-secondary/10 px-4 py-2 text-xs animate-in fade-in duration-150">
          <span className="font-semibold text-secondary">
            {selectedKeys.length} item{selectedKeys.length > 1 ? 's' : ''} selected
          </span>
          <div className="flex items-center gap-2">
            {bulkActions.map((action, i) => {
              const Icon = action.icon
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => action.onClick(selectedItems)}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-bold transition-colors ${
                    action.variant === 'destructive'
                      ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                      : 'bg-surface border border-border text-foreground hover:bg-surface-muted'
                  }`}
                >
                  {Icon && <Icon className="size-3.5" />}
                  <span>{action.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Table Container */}
      <div className="overflow-x-auto rounded-xl border border-border/80 bg-surface shadow-2xs">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="border-b border-border/60 bg-surface-muted/50 text-muted-foreground font-semibold uppercase text-[10px] tracking-wider">
            <tr>
              {bulkActions && (
                <th className="p-3.5 w-10 text-center">
                  <button type="button" onClick={handleSelectAll} aria-label="Select all rows">
                    {selectedKeys.length > 0 && selectedKeys.length === paginated.length ? (
                      <CheckSquare className="size-4 text-primary" />
                    ) : (
                      <Square className="size-4 text-muted-foreground" />
                    )}
                  </button>
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`p-3.5 ${col.sortable ? 'cursor-pointer hover:text-foreground select-none' : ''}`}
                  onClick={() => {
                    if (col.sortable) {
                      if (sortKey === col.key) {
                        setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
                      } else {
                        setSortKey(col.key)
                        setSortDir('asc')
                      }
                    }
                  }}
                >
                  <div className="flex items-center gap-1">
                    <span>{col.header}</span>
                    {col.sortable && sortKey === col.key && (
                      sortDir === 'asc' ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {paginated.length > 0 ? (
              paginated.map((item) => {
                const key = keyExtractor(item)
                const isSelected = selectedKeys.includes(key)
                return (
                  <tr
                    key={key}
                    className={`transition-colors ${
                      isSelected ? 'bg-primary/5' : 'hover:bg-surface-muted/30'
                    }`}
                  >
                    {bulkActions && (
                      <td className="p-3.5 text-center">
                        <button type="button" onClick={() => handleSelectOne(key)} aria-label="Select row">
                          {isSelected ? (
                            <CheckSquare className="size-4 text-primary" />
                          ) : (
                            <Square className="size-4 text-muted-foreground/60" />
                          )}
                        </button>
                      </td>
                    )}
                    {columns.map((col) => (
                      <td key={col.key} className="p-3.5 align-middle text-foreground">
                        {col.accessor(item)}
                      </td>
                    ))}
                  </tr>
                )
              })
            ) : (
              <tr>
                <td colSpan={columns.length + (bulkActions ? 1 : 0)} className="py-12 text-center text-muted-foreground">
                  No matching records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
        <span>
          Showing {filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{' '}
          {Math.min(currentPage * pageSize, filtered.length)} of {filtered.length} entries
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(currentPage - 1)}
            className="grid size-7 place-items-center rounded-lg border border-border bg-surface disabled:opacity-40 hover:bg-surface-muted"
          >
            <ChevronLeft className="size-4" />
          </button>
          <span className="font-semibold text-foreground px-2">
            Page {currentPage} of {totalPages}
          </span>
          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage(currentPage + 1)}
            className="grid size-7 place-items-center rounded-lg border border-border bg-surface disabled:opacity-40 hover:bg-surface-muted"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
