'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  Search,
  Command,
  Bell,
  Plus,
  CheckCircle2,
  ChevronDown,
  User,
  Shield,
  LogOut,
  Sparkles,
  FileText,
  ShoppingBag,
  Send,
  X,
  Menu,
} from 'lucide-react'
import { mockAdmins } from '@/data/admin/admins'
import { mockNotifications } from '@/data/admin/notifications'

interface TopbarProps {
  title: string
  subtitle?: string
  sidebarCollapsed: boolean
  onToggleSidebar: () => void
  onOpenCommandPalette: () => void
}

export function AdminTopbar({
  title,
  subtitle,
  sidebarCollapsed,
  onToggleSidebar,
  onOpenCommandPalette,
}: TopbarProps) {
  const [showNotifications, setShowNotifications] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [showQuickActions, setShowQuickActions] = useState(false)

  const currentAdmin = mockAdmins[0] // Aarav Sharma (Super Admin)

  return (
    <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-border/70 bg-surface/90 px-4 md:px-6 backdrop-blur-md">
      {/* Left: Mobile Toggle & Title */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="grid size-9 place-items-center rounded-lg border border-border/80 text-foreground md:hidden hover:bg-surface-muted"
          aria-label="Toggle navigation menu"
        >
          <Menu className="size-5" />
        </button>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-serif text-lg md:text-xl font-bold leading-tight text-foreground tracking-tight">
              {title}
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Marketplace
            </span>
          </div>
          {subtitle && <p className="text-[11px] text-muted-foreground hidden sm:block">{subtitle}</p>}
        </div>
      </div>

      {/* Right: Search, Quick Actions, Notifications, Profile */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Command Palette Search Launcher */}
        <button
          type="button"
          onClick={onOpenCommandPalette}
          className="flex items-center gap-3 rounded-lg border border-border/80 bg-background/80 px-3 py-1.5 text-xs text-muted-foreground hover:border-ring/60 hover:text-foreground transition-all shadow-2xs"
        >
          <Search className="size-3.5" />
          <span className="hidden md:inline font-medium">Search or jump to...</span>
          <kbd className="hidden md:inline-flex items-center gap-0.5 rounded border border-border bg-surface-muted px-1.5 py-0.5 text-[10px] font-semibold font-mono text-muted-foreground">
            <Command className="size-2.5" /> K
          </kbd>
        </button>

        {/* Quick Actions Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowQuickActions(!showQuickActions)
              setShowNotifications(false)
              setShowProfileMenu(false)
            }}
            className="hidden sm:flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-all shadow-xs"
          >
            <Plus className="size-3.5" />
            <span>Quick Action</span>
            <ChevronDown className="size-3 opacity-80" />
          </button>

          {showQuickActions && (
            <div className="absolute right-0 mt-2 w-52 rounded-xl border border-border bg-surface p-1.5 shadow-xl animate-in fade-in zoom-in-95 duration-150 z-30">
              <Link
                href="/admin/products"
                onClick={() => setShowQuickActions(false)}
                className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-foreground hover:bg-surface-muted transition-colors"
              >
                <ShoppingBag className="size-3.5 text-secondary" /> Add New Product
              </Link>
              <Link
                href="/admin/articles"
                onClick={() => setShowQuickActions(false)}
                className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-foreground hover:bg-surface-muted transition-colors"
              >
                <FileText className="size-3.5 text-primary" /> Create Article
              </Link>
              <Link
                href="/admin/notifications"
                onClick={() => setShowQuickActions(false)}
                className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-foreground hover:bg-surface-muted transition-colors"
              >
                <Send className="size-3.5 text-accent" /> Compose Notification
              </Link>
            </div>
          )}
        </div>

        {/* Notifications Drawer */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowNotifications(!showNotifications)
              setShowQuickActions(false)
              setShowProfileMenu(false)
            }}
            className="relative grid size-9 place-items-center rounded-lg border border-border/80 text-foreground hover:bg-surface-muted transition-colors"
            aria-label="View notifications"
          >
            <Bell className="size-4" />
            <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-secondary" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 md:w-96 rounded-xl border border-border bg-surface shadow-2xl animate-in fade-in zoom-in-95 duration-150 z-30 overflow-hidden">
              <div className="flex items-center justify-between border-b border-border/60 px-4 py-3 bg-surface-muted/30">
                <div className="flex items-center gap-2">
                  <h3 className="font-serif text-sm font-bold text-foreground">System Broadcasts</h3>
                  <span className="rounded-full bg-secondary/20 px-2 py-0.5 text-[10px] font-bold text-secondary">
                    {mockNotifications.length} Active
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowNotifications(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-border/60">
                {mockNotifications.map((notif) => (
                  <div key={notif.id} className="p-3 hover:bg-surface-muted/40 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-semibold text-foreground leading-snug">{notif.title}</p>
                      <span className="text-[10px] font-semibold text-muted-foreground shrink-0">
                        {notif.status}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground line-clamp-2">{notif.message}</p>
                    <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>Audience: {notif.audience}</span>
                      <span>{notif.sentTime || notif.scheduledTime}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-border/60 p-2 text-center bg-surface-muted/20">
                <Link
                  href="/admin/notifications"
                  onClick={() => setShowNotifications(false)}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  Manage All Notifications →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Admin Profile Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowProfileMenu(!showProfileMenu)
              setShowQuickActions(false)
              setShowNotifications(false)
            }}
            className="flex items-center gap-2.5 rounded-lg border border-border/80 p-1 pr-2.5 hover:bg-surface-muted transition-colors"
          >
            <div className="relative size-7 rounded-full overflow-hidden border border-border">
              <Image src={currentAdmin.avatar} alt={currentAdmin.name} fill className="object-cover" />
            </div>
            <div className="hidden text-left md:block">
              <p className="text-xs font-semibold text-foreground leading-none">{currentAdmin.name}</p>
              <p className="text-[10px] text-muted-foreground leading-none mt-0.5">{currentAdmin.role}</p>
            </div>
            <ChevronDown className="size-3 text-muted-foreground" />
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl border border-border bg-surface p-2 shadow-2xl animate-in fade-in zoom-in-95 duration-150 z-30">
              <div className="border-b border-border/60 px-3 py-2">
                <p className="text-xs font-bold text-foreground">{currentAdmin.name}</p>
                <p className="text-[11px] text-muted-foreground">{currentAdmin.email}</p>
                <div className="mt-1.5 flex items-center gap-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                  <Shield className="size-3" /> 2FA Security Enabled
                </div>
              </div>
              <div className="py-1 space-y-0.5">
                <Link
                  href="/admin/users"
                  onClick={() => setShowProfileMenu(false)}
                  className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-foreground hover:bg-surface-muted"
                >
                  <User className="size-3.5 text-muted-foreground" /> Admin Profile & Staff
                </Link>
                <Link
                  href="/admin/system-settings"
                  onClick={() => setShowProfileMenu(false)}
                  className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-foreground hover:bg-surface-muted"
                >
                  <Sparkles className="size-3.5 text-muted-foreground" /> Marketplace Settings
                </Link>
              </div>
              <div className="border-t border-border/60 pt-1">
                <button
                  type="button"
                  onClick={() => setShowProfileMenu(false)}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <LogOut className="size-3.5" /> Sign Out Admin
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
