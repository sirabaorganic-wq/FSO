'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Heart, Menu, Search, ShoppingBag, UserRound, X, ShieldCheck, Store } from 'lucide-react'
import { logoUrl } from '@/data/images'

const links = [
  ['Shop', '/shop'],
  ['Stories', '/kitchen-wisdom/articles'],
  ['Producers', '/producers'],
  ['Kitchen Wisdom', '/kitchen-wisdom'],
] as const

export function SiteHeader() {
  const [open, setOpen] = useState(false)
  const [shopOpen, setShopOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [logoFailed, setLogoFailed] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={`fixed inset-x-0 top-0 z-20 transition-all duration-300 ${
        scrolled || open || shopOpen
          ? 'bg-background/95 text-foreground shadow-md backdrop-blur-md border-b border-border/60'
          : 'bg-gradient-to-b from-black/40 via-black/10 to-transparent text-primary-foreground'
      }`}
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-30 focus:bg-background focus:px-4 focus:py-3 focus:text-foreground focus:rounded-lg focus:shadow-lg"
      >
        Skip to content
      </a>
      <div className="container-shell flex min-h-20 items-center justify-between py-3">
        {/* Brand Logo & Title */}
        <Link href="/" aria-label="Flash Sales Online home" className="flex items-center gap-3 group">
          <span className="relative block h-11 w-11 rounded-lg overflow-hidden border border-current/30 bg-background p-0.5 shadow-sm shrink-0 transition-transform group-hover:scale-105">
            {logoFailed ? (
              <span className="grid h-full place-items-center px-1 text-center font-serif text-[10px] font-bold leading-none text-primary">
                FSO
              </span>
            ) : (
              <Image
                src={logoUrl}
                alt="Flash Sales Online Brand Logo"
                fill
                sizes="44px"
                className="object-cover"
                priority
                onError={() => setLogoFailed(true)}
              />
            )}
          </span>
          <div className="flex flex-col">
            <span className="font-serif text-lg font-bold leading-tight tracking-tight">
              FLASH SALES ONLINE
            </span>
            <span className="text-[9px] font-bold tracking-widest uppercase opacity-80">
              Heritage Marketplace
            </span>
          </div>
        </Link>

        {/* Desktop Primary Navigation */}
        <nav className="hidden items-center gap-7 lg:flex" aria-label="Primary navigation">
          <button
            type="button"
            onClick={() => setShopOpen((value) => !value)}
            aria-expanded={shopOpen}
            aria-controls="shop-menu"
            className="flex min-h-11 items-center gap-1.5 text-xs font-bold uppercase tracking-widest hover:text-accent transition-colors"
          >
            Shop <span aria-hidden="true" className="text-[10px]">⌄</span>
          </button>
          {links.slice(1).map(([label, href]) => (
            <Link
              key={label}
              href={href}
              className="flex min-h-11 items-center text-xs font-bold uppercase tracking-widest hover:text-accent transition-colors"
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Actions & Portals */}
        <div className="hidden items-center gap-1.5 lg:flex">
          <Link
            href="/seller"
            className="flex items-center gap-1.5 rounded-lg border border-current/30 px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider hover:bg-current/10 transition-colors mr-1"
          >
            <Store className="size-3.5" /> Seller
          </Link>
          <Link
            href="/admin"
            className="flex items-center gap-1.5 rounded-lg bg-accent/90 text-accent-foreground px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider hover:bg-accent transition-colors shadow-2xs mr-2"
          >
            <ShieldCheck className="size-3.5" /> Admin
          </Link>

          <Link href="/search" aria-label="Search items" className="grid size-9 place-items-center hover:text-accent transition-colors rounded-lg">
            <Search className="size-4" aria-hidden="true" />
          </Link>
          <Link href="/account/wishlist" aria-label="Wishlist" className="grid size-9 place-items-center hover:text-accent transition-colors rounded-lg">
            <Heart className="size-4" aria-hidden="true" />
          </Link>
          <Link href="/account" aria-label="Account" className="grid size-9 place-items-center hover:text-accent transition-colors rounded-lg">
            <UserRound className="size-4" aria-hidden="true" />
          </Link>
          <Link href="/cart" aria-label="Shopping Cart" className="grid size-9 place-items-center hover:text-accent transition-colors rounded-lg">
            <ShoppingBag className="size-4" aria-hidden="true" />
          </Link>
        </div>

        {/* Mobile Hamburger Toggle */}
        <button
          type="button"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((value) => !value)}
          className="grid size-11 place-items-center lg:hidden"
        >
          {open ? <X aria-hidden="true" className="size-6" /> : <Menu aria-hidden="true" className="size-6" />}
        </button>
      </div>

      {/* Shop Mega Menu */}
      {shopOpen && (
        <div id="shop-menu" className="hidden border-b border-border bg-background text-foreground lg:block animate-in fade-in duration-200">
          <div className="container-shell grid grid-cols-4 gap-8 py-8 text-xs">
            <div>
              <p className="eyebrow mb-3">Shop by Source</p>
              <Link className="block font-serif text-xl font-bold hover:text-secondary mb-1" href="/shop?category=vedic-ghee">
                Everyday Ingredients
              </Link>
              <p className="text-muted-foreground text-[11px]">A2 Bilona Ghee, Wild Honey, Flour</p>
            </div>
            <div>
              <p className="eyebrow mb-3">Shop by Method</p>
              <Link className="block font-serif text-xl font-bold hover:text-secondary mb-1" href="/shop?category=cold-pressed-oils">
                Traditional Extraction
              </Link>
              <p className="text-muted-foreground text-[11px]">Vaagai Wood-Pressed Cold Oils</p>
            </div>
            <div>
              <p className="eyebrow mb-3">Shop by Region</p>
              <Link className="block font-serif text-xl font-bold hover:text-secondary mb-1" href="/producers">
                Explore Regional India
              </Link>
              <p className="text-muted-foreground text-[11px]">Bundelkhand, Kumaon, Chettinad, Majuli</p>
            </div>
            <div className="border-l border-border/60 pl-6 space-y-2">
              <p className="font-serif text-base font-bold text-foreground">Traceable Food Philosophy</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Every ingredient is sourced directly from verified artisanal families with full chemical-free lab testing.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Navigation Drawer */}
      {open && (
        <div id="mobile-menu" className="border-b border-border bg-background text-foreground lg:hidden animate-in slide-in-from-top-5 duration-200">
          <nav className="container-shell flex flex-col gap-2 py-5" aria-label="Mobile navigation">
            {links.map(([label, href]) => (
              <Link
                key={label}
                href={href}
                onClick={() => setOpen(false)}
                className="flex min-h-12 items-center border-b border-border/60 py-2.5 font-serif text-xl font-bold"
              >
                {label}
              </Link>
            ))}
            <div className="grid grid-cols-2 gap-3 pt-3">
              <Link
                href="/admin"
                onClick={() => setOpen(false)}
                className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-accent text-accent-foreground px-4 text-xs font-bold uppercase tracking-wider"
              >
                <ShieldCheck className="size-4" /> Admin Portal
              </Link>
              <Link
                href="/seller"
                onClick={() => setOpen(false)}
                className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border px-4 text-xs font-bold uppercase tracking-wider"
              >
                <Store className="size-4" /> Seller Portal
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
