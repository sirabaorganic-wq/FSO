'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  UserCheck,
  UserCog,
  ShoppingBag,
  FolderTree,
  Layers,
  ShoppingCart,
  Star,
  FileText,
  UtensilsCrossed,
  Sparkles,
  BookOpen,
  Home,
  Image as ImageIcon,
  Flag,
  Ticket,
  Bell,
  BarChart3,
  TrendingUp,
  Settings,
  ShieldCheck,
  Activity,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from 'lucide-react'
import { logoUrl } from '@/data/images'

interface NavGroup {
  label: string
  items: {
    label: string
    href: string
    icon: React.ElementType
    badge?: string | number
    badgeColor?: string
  }[]
}

const navGroups: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
      { label: 'Analytics', href: '/admin/analytics', icon: TrendingUp },
      { label: 'Reports', href: '/admin/reports', icon: BarChart3 },
    ],
  },
  {
    label: 'Marketplace Operations',
    items: [
      { label: 'Orders & Refunds', href: '/admin/orders', icon: ShoppingCart, badge: 4 },
      { label: 'Product Catalog', href: '/admin/products', icon: ShoppingBag },
      { label: 'Categories', href: '/admin/categories', icon: FolderTree },
      { label: 'Collections', href: '/admin/collections', icon: Layers },
      { label: 'Product Reviews', href: '/admin/reviews', icon: Star },
    ],
  },
  {
    label: 'Users & Producers',
    items: [
      { label: 'Producer Directory', href: '/admin/producers', icon: UserCheck },
      { label: 'Producer Approvals', href: '/admin/producer-approvals', icon: UserCog, badge: 2, badgeColor: 'bg-amber-500 text-white' },
      { label: 'Customer Directory', href: '/admin/customers', icon: Users },
      { label: 'Admin & Staff Users', href: '/admin/users', icon: ShieldCheck },
      { label: 'Roles & Matrix', href: '/admin/roles', icon: Settings },
    ],
  },
  {
    label: 'Content Management (CMS)',
    items: [
      { label: 'Homepage Editor', href: '/admin/homepage', icon: Home },
      { label: 'Articles & Stories', href: '/admin/articles', icon: FileText },
      { label: 'Recipes CMS', href: '/admin/recipes', icon: UtensilsCrossed },
      { label: 'Ingredient Library', href: '/admin/ingredients', icon: Sparkles },
      { label: 'Kitchen Wisdom', href: '/admin/kitchen-wisdom', icon: BookOpen },
      { label: 'Media Library', href: '/admin/media-library', icon: ImageIcon },
    ],
  },
  {
    label: 'Marketing & Comms',
    items: [
      { label: 'Promotional Banners', href: '/admin/banners', icon: Flag },
      { label: 'Coupons & Offers', href: '/admin/coupons', icon: Ticket },
      { label: 'Notifications', href: '/admin/notifications', icon: Bell },
    ],
  },
  {
    label: 'System & Control',
    items: [
      { label: 'System Settings', href: '/admin/system-settings', icon: Settings },
      { label: 'Activity & Audit Logs', href: '/admin/activity', icon: Activity },
      { label: 'Admin Documentation', href: '/admin/help', icon: HelpCircle },
    ],
  },
]

export function AdminSidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const pathname = usePathname()

  return (
    <aside
      className={`fixed top-0 bottom-0 left-0 z-30 flex flex-col border-r border-border/80 bg-surface/95 backdrop-blur-md transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="flex h-16 items-center justify-between border-b border-border/60 px-3.5">
        <Link href="/admin" className="flex items-center gap-2.5 overflow-hidden">
          <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-md border border-border bg-background p-0.5 shadow-sm">
            <Image src={logoUrl} alt="FSO Logo" fill className="object-cover" priority />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-serif text-base font-bold leading-tight tracking-tight text-foreground">
                FSO Admin
              </span>
              <span className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                Control Center
              </span>
            </div>
          )}
        </Link>
        <button
          type="button"
          onClick={onToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="grid size-7 place-items-center rounded-md border border-border/80 text-muted-foreground hover:bg-surface-muted hover:text-foreground transition-colors"
        >
          {collapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
        </button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-5 scrollbar-thin">
        {navGroups.map((group) => (
          <div key={group.label} className="space-y-1">
            {!collapsed && (
              <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 mb-1.5">
                {group.label}
              </p>
            )}
            {group.items.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href))
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className={`group relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                      : 'text-foreground/80 hover:bg-surface-muted hover:text-foreground'
                  }`}
                >
                  <Icon className={`size-4 shrink-0 ${isActive ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-foreground'}`} />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                  {!collapsed && item.badge && (
                    <span
                      className={`ml-auto flex h-4 min-w-4 items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${
                        item.badgeColor || 'bg-secondary/20 text-secondary'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                  {collapsed && item.badge && (
                    <span className="absolute top-1 right-1 size-2 rounded-full bg-secondary" />
                  )}
                </Link>
              )
            })}
          </div>
        ))}
      </div>

      {/* Footer / Storefront Link */}
      <div className="border-t border-border/60 p-2">
        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 rounded-lg border border-border/80 px-2.5 py-2 text-xs font-medium text-muted-foreground hover:border-border hover:bg-surface-muted hover:text-foreground transition-colors"
        >
          <ExternalLink className="size-4 shrink-0" />
          {!collapsed && <span>View Live Store</span>}
        </a>
      </div>
    </aside>
  )
}
