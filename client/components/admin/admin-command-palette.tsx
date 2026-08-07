'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Command, ArrowRight, LayoutDashboard, Users, ShoppingBag, ShoppingCart, FileText, Settings, Bell, X } from 'lucide-react'

interface CommandPaletteProps {
  open: boolean
  onClose: () => void
}

const quickNavs = [
  { title: 'Dashboard Overview', href: '/admin', category: 'Pages', icon: LayoutDashboard },
  { title: 'Orders & Fulfillment', href: '/admin/orders', category: 'Pages', icon: ShoppingCart },
  { title: 'Product Catalog', href: '/admin/products', category: 'Pages', icon: ShoppingBag },
  { title: 'Producer Approvals', href: '/admin/producer-approvals', category: 'Pages', icon: Users },
  { title: 'Articles & CMS', href: '/admin/articles', category: 'Pages', icon: FileText },
  { title: 'Notification Composer', href: '/admin/notifications', category: 'Pages', icon: Bell },
  { title: 'System Settings', href: '/admin/system-settings', category: 'Pages', icon: Settings },
]

export function AdminCommandPalette({ open, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const router = useRouter()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        if (open) onClose()
        else setQuery('')
      }
      if (e.key === 'Escape' && open) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  const filteredNavs = quickNavs.filter((item) =>
    item.title.toLowerCase().includes(query.toLowerCase()) ||
    item.category.toLowerCase().includes(query.toLowerCase())
  )

  const handleSelect = (href: string) => {
    router.push(href)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-xl rounded-xl border border-border bg-surface shadow-2xl overflow-hidden">
        {/* Search Header */}
        <div className="flex items-center px-4 border-b border-border/80 bg-background/50">
          <Search className="size-4 text-muted-foreground mr-3" />
          <input
            type="text"
            placeholder="Type a command or search admin features... (Press ESC to close)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent py-3.5 text-sm outline-none placeholder:text-muted-foreground text-foreground"
            autoFocus
          />
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filteredNavs.length > 0 ? (
            filteredNavs.map((nav) => {
              const Icon = nav.icon
              return (
                <button
                  key={nav.href}
                  type="button"
                  onClick={() => handleSelect(nav.href)}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-xs text-left text-foreground hover:bg-surface-muted transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="grid size-7 place-items-center rounded-md border border-border/60 bg-background text-muted-foreground group-hover:text-primary group-hover:border-primary/40">
                      <Icon className="size-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground group-hover:text-primary">{nav.title}</p>
                      <p className="text-[10px] text-muted-foreground">{nav.category}</p>
                    </div>
                  </div>
                  <ArrowRight className="size-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              )
            })
          ) : (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No matching commands found for &quot;{query}&quot;.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border/60 px-4 py-2 bg-surface-muted/40 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Command className="size-3" /> Navigation Command Palette
          </span>
          <span>Use ARROW keys to navigate, ESC to exit</span>
        </div>
      </div>
    </div>
  )
}
